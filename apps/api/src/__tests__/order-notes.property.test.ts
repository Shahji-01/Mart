import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fc from "fast-check";
import request from "supertest";
import {
  db,
  productsTable,
  categoriesTable,
  productVariantsTable,
  cartItemsTable,
  cartSessionsTable,
  ordersTable,
  orderItemsTable,
  usersTable,
  walletTransactionsTable,
  loyaltyTransactionsTable,
} from "@workspace/database";
import { eq } from "drizzle-orm";

// Property 11 is persistence-bound (the note must survive a round trip through
// the orders table), so it only runs against a real DB. Skipped locally (no
// DATABASE_URL); runs in CI.
const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)("Order note round-trip (Property 11)", () => {
  // `app` (and its eager env validation) is imported lazily inside beforeAll so
  // that, when this suite is skipped for lack of a DB, importing it never runs.
  let app: typeof import("../app").default;
  let userToken = "";
  let userId = 0;
  let categoryId = 0;
  let productId = 0;
  let variantId = 0;
  const userEmail = `notes_user_${Date.now()}@test.in`;

  beforeAll(async () => {
    app = (await import("../app")).default;

    await request(app).post("/api/auth/register").send({ email: userEmail, password: "Password1!", name: "Notes User", phone: "1234567890" });
    const login = await request(app).post("/api/auth/login").send({ email: userEmail, password: "Password1!" });
    userToken = login.body.token;
    userId = login.body.user.id;

    const [cat] = await db.insert(categoriesTable).values({ name: `NotesCat ${Date.now()}`, slug: `notescat-${Date.now()}` }).returning();
    categoryId = cat.id;
    const [prod] = await db.insert(productsTable).values({ name: `NotesProd ${Date.now()}`, slug: `notesprod-${Date.now()}`, categoryId: cat.id }).returning();
    productId = prod.id;
    const [varnt] = await db.insert(productVariantsTable).values({ productId: prod.id, unit: "kg", unitValue: "1", price: "100", mrp: "150", stock: 100000 }).returning();
    variantId = varnt.id;
  });

  async function addOneToCart() {
    await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ productId, variantId, quantity: 1 });
  }

  // Feature: codebase-remediation, Property 11: Order note round-trips through
  // persistence
  // Validates: Requirements 10.2, 10.4
  it("Property 11: a submitted note is persisted and returned unchanged on retrieval", async () => {
    // Safe character set: the XSS middleware escapes HTML metacharacters
    // (< > & " ') and Postgres text rejects null bytes, so a faithful
    // round-trip property is exercised over characters that pass through
    // untouched (letters, digits, spaces, common punctuation).
    const safeChars = (
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?-_():;/"
    ).split("");
    const noteArb = fc.string({ unit: fc.constantFrom(...safeChars), minLength: 1, maxLength: 1000 });

    await fc.assert(
      // Notes are bounded to 1000 chars by createOrderSchema; generate within bound.
      fc.asyncProperty(noteArb, async (note) => {
        await addOneToCart();
        const created = await request(app)
          .post("/api/orders")
          .set("Authorization", `Bearer ${userToken}`)
          .send({ address: "1 Test St, City 123456", paymentMethod: "cod", notes: note });
        expect(created.status).toBe(201);
        // R10.4: the note is included in the create response.
        expect(created.body.notes).toBe(note);

        // R10.2 / R10.4: the note round-trips on a subsequent retrieval.
        const fetched = await request(app)
          .get(`/api/orders/${created.body.id}`)
          .set("Authorization", `Bearer ${userToken}`);
        expect(fetched.status).toBe(200);
        expect(fetched.body.notes).toBe(note);
      }),
      { numRuns: 100 },
    );
  }, 120_000);

  afterAll(async () => {
    if (!hasDb) return;
    const orders = await db.select().from(ordersTable).where(eq(ordersTable.userId, userId));
    for (const o of orders) {
      await db.delete(loyaltyTransactionsTable).where(eq(loyaltyTransactionsTable.orderId, o.id));
      await db.delete(walletTransactionsTable).where(eq(walletTransactionsTable.orderId, o.id));
      await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, o.id));
      await db.delete(ordersTable).where(eq(ordersTable.id, o.id));
    }
    await db.delete(cartItemsTable).where(eq(cartItemsTable.userId, userId));
    await db.delete(cartSessionsTable).where(eq(cartSessionsTable.userId, userId));
    await db.delete(productVariantsTable).where(eq(productVariantsTable.id, variantId));
    await db.delete(productsTable).where(eq(productsTable.id, productId));
    await db.delete(categoriesTable).where(eq(categoriesTable.id, categoryId));
    await db.delete(usersTable).where(eq(usersTable.email, userEmail));
  });
});

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

// Property 4 is persistence-bound (it exercises the partial unique index and
// the createOrder idempotency lookup), so it can only run against a real DB.
// It is skipped locally (no DATABASE_URL) and runs in CI where Postgres exists.
const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)("Order idempotency (Property 4)", () => {
  // `app` (and its eager env validation) is imported lazily inside beforeAll so
  // that, when this suite is skipped for lack of a DB, importing it never runs.
  let app: typeof import("../app").default;
  let userToken = "";
  let userId = 0;
  let categoryId = 0;
  let productId = 0;
  let variantId = 0;
  const userEmail = `idem_user_${Date.now()}@test.in`;
  const INITIAL_STOCK = 100000;

  beforeAll(async () => {
    app = (await import("../app")).default;

    await request(app).post("/api/auth/register").send({ email: userEmail, password: "Password1!", name: "Idem User", phone: "1234567890" });
    const login = await request(app).post("/api/auth/login").send({ email: userEmail, password: "Password1!" });
    userToken = login.body.token;
    userId = login.body.user.id;

    const [cat] = await db.insert(categoriesTable).values({ name: `IdemCat ${Date.now()}`, slug: `idemcat-${Date.now()}` }).returning();
    categoryId = cat.id;
    const [prod] = await db.insert(productsTable).values({ name: `IdemProd ${Date.now()}`, slug: `idemprod-${Date.now()}`, categoryId: cat.id }).returning();
    productId = prod.id;
    const [varnt] = await db.insert(productVariantsTable).values({ productId: prod.id, unit: "kg", unitValue: "1", price: "100", mrp: "150", stock: INITIAL_STOCK }).returning();
    variantId = varnt.id;
  });

  async function addOneToCart() {
    await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ productId, variantId, quantity: 1 });
  }

  // Feature: codebase-remediation, Property 4: Order creation is idempotent
  // under a repeated idempotency key
  // Validates: Requirements 3.1, 3.2
  it("Property 4: repeating a request with the same idempotency key yields one order and no extra debits", async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (idempotencyKey) => {
        // Stock before this attempt.
        const [{ stock: stockBefore }] = await db.select({ stock: productVariantsTable.stock })
          .from(productVariantsTable).where(eq(productVariantsTable.id, variantId));

        await addOneToCart();
        const first = await request(app)
          .post("/api/orders")
          .set("Authorization", `Bearer ${userToken}`)
          .send({ address: "1 Test St, City 123456", paymentMethod: "cod", idempotencyKey });
        expect(first.status).toBe(201);

        // Re-submit with the SAME key. Must return the same order without any
        // additional stock decrement or new debits (R3.2).
        const second = await request(app)
          .post("/api/orders")
          .set("Authorization", `Bearer ${userToken}`)
          .send({ address: "1 Test St, City 123456", paymentMethod: "cod", idempotencyKey });
        expect(second.status === 200 || second.status === 201).toBe(true);
        expect(second.body.id).toBe(first.body.id);

        // Exactly one order exists for this key.
        const rows = await db.select().from(ordersTable)
          .where(eq(ordersTable.idempotencyKey, idempotencyKey));
        expect(rows.length).toBe(1);

        // Stock decremented exactly once (by the single quantity ordered).
        const [{ stock: stockAfter }] = await db.select({ stock: productVariantsTable.stock })
          .from(productVariantsTable).where(eq(productVariantsTable.id, variantId));
        expect(stockBefore - stockAfter).toBe(1);
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

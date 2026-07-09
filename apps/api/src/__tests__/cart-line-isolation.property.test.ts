import { describe, it, expect, beforeAll } from "vitest";
import fc from "fast-check";

// Property 9 is persistence-bound (it exercises the cart service's
// (userId, variantId) where-clause targeting against real rows), so it runs
// only against a real database. Gated on DATABASE_URL and using lazy imports
// so that, with no DB configured (e.g. locally), the suite skips instead of
// initializing a pool.
const HAS_DB = !!process.env.DATABASE_URL;

describe.skipIf(!HAS_DB)("Cart line isolation (Property 9)", () => {
  // Lazily-resolved modules (only imported when a DB is configured).
  let db: any;
  let cartItemsTable: any;
  let cartService: any;
  let eq: any;
  let and: any;

  let testUserId: number;
  let testProductId: number;
  let variantIds: number[] = [];
  const STOCK = 1000; // High stock so quantity clamping never interferes.
  const tag = Date.now();

  beforeAll(async () => {
    const database = await import("@workspace/database");
    const orm = await import("drizzle-orm");
    ({ db, cartItemsTable } = database);
    ({ eq, and } = orm);
    ({ cartService } = await import("../services/cart.service"));

    const { usersTable, categoriesTable, productsTable, productVariantsTable } = database;
    const [user] = await db.insert(usersTable).values({
      name: "Cart Isolation Test",
      email: `cart_isolation_${tag}@ntcmarket.in`,
      phone: `9${tag.toString().slice(-9)}`,
      passwordHash: "x",
      role: "customer" as const,
    }).returning();
    testUserId = user.id;

    const [cat] = await db.insert(categoriesTable).values({ name: `Cat ${tag}`, slug: `cat-isolation-${tag}` }).returning();
    const [prod] = await db.insert(productsTable).values({ name: `Prod ${tag}`, slug: `prod-isolation-${tag}`, categoryId: cat.id }).returning();
    testProductId = prod.id;

    // A fixed pool of distinct variants, each keying its own cart line.
    for (let i = 0; i < 5; i++) {
      const [variant] = await db.insert(productVariantsTable).values({
        productId: prod.id, unit: "kg", unitValue: String(i + 1), price: "100", mrp: "150", stock: STOCK,
      }).returning();
      variantIds.push(variant.id);
    }
  });

  // Feature: codebase-remediation, Property 9: Cart update by variant id affects
  // only the matching line
  // Validates: Requirements 8.2
  it("Property 9: updating a line by variantId changes only that line", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Initial positive quantity for each of the 5 cart lines.
        fc.array(fc.integer({ min: 1, max: 20 }), { minLength: 5, maxLength: 5 }),
        // Which line to update.
        fc.integer({ min: 0, max: 4 }),
        // New positive quantity for the targeted line.
        fc.integer({ min: 1, max: 50 }),
        async (initialQtys, targetIndex, newQty) => {
          // Reset to a known cart state for this run.
          await db.delete(cartItemsTable).where(eq(cartItemsTable.userId, testUserId));
          await db.insert(cartItemsTable).values(
            variantIds.map((variantId, i) => ({
              userId: testUserId,
              productId: testProductId,
              variantId,
              quantity: initialQtys[i],
            })),
          );

          const targetVariantId = variantIds[targetIndex];
          await cartService.updateItemQuantity(testUserId, targetVariantId, newQty);

          // Read the persisted rows directly, keyed by variantId.
          const rows = await db.select().from(cartItemsTable).where(eq(cartItemsTable.userId, testUserId));
          const byVariant = new Map<number, number>(rows.map((r: any) => [r.variantId, r.quantity]));

          // The targeted line reflects the new quantity (clamped by stock, which is high).
          expect(byVariant.get(targetVariantId)).toBe(Math.min(newQty, STOCK));

          // Every other line is left exactly as it was.
          variantIds.forEach((variantId, i) => {
            if (i === targetIndex) return;
            expect(byVariant.get(variantId)).toBe(initialQtys[i]);
          });
        },
      ),
      { numRuns: 100 },
    );
  });
});

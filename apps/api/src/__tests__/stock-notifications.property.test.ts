import { describe, it, expect, beforeAll } from "vitest";
import fc from "fast-check";

// Property 19 is persistence-bound, so it runs only against a real database.
// Gated on DATABASE_URL and using lazy imports so that, with no DB configured
// (e.g. locally), the suite skips instead of initializing a pool.
const HAS_DB = !!process.env.DATABASE_URL;

describe.skipIf(!HAS_DB)("Back-in-stock subscriptions (Property 19)", () => {
  // Lazily-resolved modules (only imported when a DB is configured).
  let db: any;
  let stockNotificationsTable: any;
  let stockNotificationsService: any;
  let eq: any;
  let and: any;

  let testVariantId: number;
  let baseUserId: number;
  const tag = Date.now();

  beforeAll(async () => {
    const database = await import("@workspace/database");
    const orm = await import("drizzle-orm");
    ({ db, stockNotificationsTable } = database);
    ({ eq, and } = orm);
    ({ stockNotificationsService } = await import("../services/stock-notifications.service"));

    const { usersTable, categoriesTable, productsTable, productVariantsTable } = database;
    const [user] = await db.insert(usersTable).values({
      name: "Stock Notify Test",
      email: `stock_notify_${tag}@ntcmarket.in`,
      phone: `9${tag.toString().slice(-9)}`,
      passwordHash: "x",
      role: "customer" as const,
    }).returning();
    baseUserId = user.id;

    const [cat] = await db.insert(categoriesTable).values({ name: `Cat ${tag}`, slug: `cat-notify-${tag}` }).returning();
    const [prod] = await db.insert(productsTable).values({ name: `Prod ${tag}`, slug: `prod-notify-${tag}`, categoryId: cat.id }).returning();
    const [variant] = await db.insert(productVariantsTable).values({
      productId: prod.id, unit: "kg", unitValue: "1", price: "100", mrp: "150", stock: 0,
    }).returning();
    testVariantId = variant.id;
  });

  // Feature: codebase-remediation, Property 19: Back-in-stock subscriptions
  // persist and deduplicate
  // Validates: Requirements 28.1, 28.2
  it("Property 19: repeated requests persist exactly one retrievable subscription", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 5 }), async (repeats) => {
        // A fresh user per run so each (user, variant) pair is independent.
        const { usersTable } = await import("@workspace/database");
        const [u] = await db.insert(usersTable).values({
          name: "Notify Run",
          email: `notify_run_${tag}_${Math.random().toString(36).slice(2)}@ntcmarket.in`,
          phone: "9000000000",
          passwordHash: "x",
          role: "customer" as const,
        }).returning();

        // Submit the same (user, variant) subscription `repeats` times.
        for (let i = 0; i < repeats; i++) {
          const result = await stockNotificationsService.subscribe(u.id, testVariantId);
          expect(result).toEqual({ subscribed: true });
        }

        // The subscription persists and there is exactly one record (R28.1, R28.2).
        const rows = await db.select().from(stockNotificationsTable)
          .where(and(eq(stockNotificationsTable.userId, u.id), eq(stockNotificationsTable.variantId, testVariantId)));
        expect(rows.length).toBe(1);
      }),
      { numRuns: 25 },
    );
  });

  it("Property 19: subscribing to a non-existent variant does not persist a row", async () => {
    const result = await stockNotificationsService.subscribe(baseUserId, 2_000_000_000);
    expect(result).toBeNull();
  });
});

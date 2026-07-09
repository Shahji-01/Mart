import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  db,
  usersTable,
  ordersTable,
  referralsTable,
} from "@workspace/database";
import { eq } from "drizzle-orm";

// These example tests exercise the referral reward-once advancement (R7.2,
// R7.3) against a real database, driving the same conditional-update mechanism
// `OrdersService.updateOrderStatus` uses inside the delivery transaction. They
// are skipped locally (no DATABASE_URL) and run in CI where Postgres exists.
const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)("Referral reward-once (Property 8)", () => {
  let advanceReferralOnDelivery: typeof import("../services/referrals.service").referralsService.advanceReferralOnDelivery;
  let referrerId = 0;
  let referredId = 0;
  let orderId = 0;
  let referralId = 0;
  const REWARD_POINTS = 100;
  const stamp = Date.now();

  beforeAll(async () => {
    const svc = await import("../services/referrals.service");
    advanceReferralOnDelivery = svc.referralsService.advanceReferralOnDelivery.bind(svc.referralsService);

    const [referrer] = await db.insert(usersTable).values({
      name: "Referrer", email: `ref_referrer_${stamp}@test.in`, phone: "1234567890", passwordHash: "x", loyaltyPoints: 0,
    }).returning();
    referrerId = referrer.id;

    const [referred] = await db.insert(usersTable).values({
      name: "Referred", email: `ref_referred_${stamp}@test.in`, phone: "1234567890", passwordHash: "x", loyaltyPoints: 0,
    }).returning();
    referredId = referred.id;

    const [order] = await db.insert(ordersTable).values({
      userId: referredId,
      status: "delivered",
      paymentMethod: "cod",
      subtotal: "100",
      total: "100",
      address: "1 Test St, City 123456",
    }).returning();
    orderId = order.id;

    const [referral] = await db.insert(referralsTable).values({
      referrerId, referredUserId: referredId, rewardPoints: REWARD_POINTS,
    }).returning();
    referralId = referral.id;
  });

  async function referrerPoints() {
    const [u] = await db.select({ p: usersTable.loyaltyPoints }).from(usersTable).where(eq(usersTable.id, referrerId));
    return u.p ?? 0;
  }

  // Feature: codebase-remediation, Property 8: A referral is rewarded and the
  // referrer credited exactly once
  // Validates: Requirements 7.2, 7.3
  it("Property 8: advancing twice rewards the referral and credits the referrer exactly once", async () => {
    const before = await referrerPoints();

    // First delivery transaction: advances pending -> rewarded and credits.
    const first = await db.transaction((tx) => advanceReferralOnDelivery(tx, referredId, orderId));
    expect(first?.status).toBe("rewarded");

    const afterFirst = await referrerPoints();
    expect(afterFirst - before).toBe(REWARD_POINTS);

    // Second (repeat) delivery transaction: conditional update is a no-op.
    const second = await db.transaction((tx) => advanceReferralOnDelivery(tx, referredId, orderId));
    expect(second).toBeNull();

    const afterSecond = await referrerPoints();
    expect(afterSecond).toBe(afterFirst);

    // Exactly one rewarded referral row for this user.
    const rows = await db.select().from(referralsTable).where(eq(referralsTable.referredUserId, referredId));
    const rewarded = rows.filter((r) => r.status === "rewarded");
    expect(rewarded.length).toBe(1);
  });

  afterAll(async () => {
    if (!hasDb) return;
    await db.delete(referralsTable).where(eq(referralsTable.id, referralId));
    await db.delete(ordersTable).where(eq(ordersTable.id, orderId));
    await db.delete(usersTable).where(eq(usersTable.id, referredId));
    await db.delete(usersTable).where(eq(usersTable.id, referrerId));
  });
});

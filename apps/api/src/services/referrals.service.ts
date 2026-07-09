import { db, referralsTable, usersTable } from "@workspace/database";
import { and, eq, sql } from "drizzle-orm";

// The transaction handle type passed by `db.transaction(async (tx) => ...)`,
// so the orders delivery transaction can drive referral completion atomically.
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class ReferralsService {
  private generateCode(name: string, id: number): string {
    const base = name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4).padEnd(4, "X");
    return `${base}${id}`;
  }

  async getMyReferrals(userId: number) {
    let [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user.referralCode) {
      const code = this.generateCode(user.name, user.id);
      [user] = await db.update(usersTable).set({ referralCode: code }).where(eq(usersTable.id, userId)).returning();
    }
    const referrals = await db.select().from(referralsTable).where(eq(referralsTable.referrerId, userId));
    return {
      referralCode: user.referralCode,
      totalReferrals: referrals.length,
      completedReferrals: referrals.filter(r => r.status === "completed" || r.status === "rewarded").length,
      rewardPointsEarned: referrals.filter(r => r.status === "rewarded").reduce((s, r) => s + r.rewardPoints, 0),
    };
  }

  async validateReferralCode(code: string) {
    const [user] = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(eq(usersTable.referralCode, code.toUpperCase()));
    if (!user) return null;
    return { valid: true, referrerName: user.name };
  }

  /**
   * Advance a referred user's referral from `pending` to `rewarded` and credit
   * the referrer's reward points exactly once, on the referred user's first
   * delivered order (R7.1–R7.4).
   *
   * Single advancement is enforced by a conditional update (`WHERE status =
   * 'pending'`): only the row still pending is advanced, so a concurrent or
   * repeated attempt updates zero rows and credits nothing. Because this runs
   * inside the caller's delivery transaction, a rolled-back delivery also rolls
   * back the advancement, and the next status write retries it (R7.6). A
   * referral that is already `rewarded` is terminal and left unchanged (R7.4).
   *
   * @param tx the active delivery transaction (or `db`)
   * @param referredUserId the user whose order reached `delivered`
   * @param orderId the delivered order id (linked onto the referral)
   */
  async advanceReferralOnDelivery(tx: DbTransaction, referredUserId: number, orderId: number) {
    // Conditionally advance ONLY a still-pending referral for this user.
    const advanced = await tx.update(referralsTable)
      .set({ status: "rewarded", orderId })
      .where(and(
        eq(referralsTable.referredUserId, referredUserId),
        eq(referralsTable.status, "pending"),
      ))
      .returning();

    // No pending referral (none exists, or already rewarded): nothing to do.
    for (const referral of advanced) {
      await tx.update(usersTable)
        .set({ loyaltyPoints: sql`${usersTable.loyaltyPoints} + ${referral.rewardPoints}` })
        .where(eq(usersTable.id, referral.referrerId));
    }

    return advanced.length > 0 ? advanced[0] : null;
  }
}

export const referralsService = new ReferralsService();

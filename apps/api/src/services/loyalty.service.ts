import { db, loyaltyTransactionsTable, usersTable } from "@workspace/database";
import { eq, desc } from "drizzle-orm";

export const POINTS_PER_RUPEE_SPENT = 0.1;
export const RUPEES_PER_POINT = 0.25;

export class LoyaltyService {
  async getLoyaltyDetails(userId: number) {
    const [user] = await db.select({ loyaltyPoints: usersTable.loyaltyPoints }).from(usersTable).where(eq(usersTable.id, userId));
    const transactions = await db.select().from(loyaltyTransactionsTable)
      .where(eq(loyaltyTransactionsTable.userId, userId))
      .orderBy(desc(loyaltyTransactionsTable.createdAt))
      .limit(50);
      
    const points = user?.loyaltyPoints ?? 0;
    return {
      balance: points,
      equivalentRupees: Math.round(points * RUPEES_PER_POINT * 100) / 100,
      transactions: transactions.map(t => ({ ...t, createdAt: t.createdAt.toISOString() })),
    };
  }

  async getLoyaltyBalance(userId: number) {
    const [user] = await db.select({ loyaltyPoints: usersTable.loyaltyPoints }).from(usersTable).where(eq(usersTable.id, userId));
    const points = user?.loyaltyPoints ?? 0;
    
    return {
      points,
      equivalentRupees: Math.round(points * RUPEES_PER_POINT * 100) / 100,
    };
  }
}

export const loyaltyService = new LoyaltyService();

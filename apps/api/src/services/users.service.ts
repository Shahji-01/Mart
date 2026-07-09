import { db, usersTable, walletTransactionsTable, loyaltyTransactionsTable } from "@workspace/database";
import { eq, ilike, sql } from "drizzle-orm";

export class UsersService {
  async getUsers(page: number, search?: string) {
    const limit = 20;
    const offset = (page - 1) * limit;

    let query = db.select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    }).from(usersTable).$dynamic();

    let countQuery = db.select({ total: sql<number>`count(*)::int` }).from(usersTable).$dynamic();

    if (search) {
      const safeSearch = search.replace(/[\\%_]/g, '\\$&');
      const pattern = `%${safeSearch}%`;
      query = query.where(ilike(usersTable.name, pattern));
      countQuery = countQuery.where(ilike(usersTable.name, pattern));
    }

    const [users, [{ total }]] = await Promise.all([
      query.limit(limit).offset(offset),
      countQuery,
    ]);

    return {
      data: users.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })),
      total,
      page,
      limit,
    };
  }

  async getUserById(id: number) {
    const [user] = await db.select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      role: usersTable.role,
      walletBalance: usersTable.walletBalance,
      loyaltyPoints: usersTable.loyaltyPoints,
      referralCode: usersTable.referralCode,
      createdAt: usersTable.createdAt,
    }).from(usersTable).where(eq(usersTable.id, id));
    
    if (!user) return null;
    return { ...user, createdAt: user.createdAt.toISOString() };
  }

  async creditWallet(id: number, amount: number, description?: string) {
    await db.update(usersTable)
      .set({ walletBalance: sql`${usersTable.walletBalance} + ${amount.toString()}` })
      .where(eq(usersTable.id, id));
      
    await db.insert(walletTransactionsTable).values({
      userId: id,
      type: "credit",
      amount: amount.toString(),
      description: description || `Admin credit`,
    });
    
    const [user] = await db.select({ walletBalance: usersTable.walletBalance }).from(usersTable).where(eq(usersTable.id, id));
    return parseFloat(user?.walletBalance ?? "0");
  }

  async creditLoyalty(id: number, points: number, description?: string) {
    await db.update(usersTable)
      .set({ loyaltyPoints: sql`${usersTable.loyaltyPoints} + ${points}` })
      .where(eq(usersTable.id, id));
      
    await db.insert(loyaltyTransactionsTable).values({
      userId: id,
      type: "bonus",
      points,
      description: description || `Admin bonus`,
    });
    
    const [user] = await db.select({ loyaltyPoints: usersTable.loyaltyPoints }).from(usersTable).where(eq(usersTable.id, id));
    return user?.loyaltyPoints ?? 0;
  }
}

export const usersService = new UsersService();

import { db, productQaTable, usersTable, productsTable } from "@workspace/database";
import { eq, desc } from "drizzle-orm";

export class ProductQaService {
  async formatQa(q: typeof productQaTable.$inferSelect, userName?: string, answererName?: string) {
    return {
      id: q.id,
      productId: q.productId,
      userId: q.userId,
      userName: userName ?? "Customer",
      question: q.question,
      answer: q.answer,
      answeredBy: q.answeredBy,
      answererName: answererName ?? null,
      isApproved: q.isApproved,
      createdAt: q.createdAt.toISOString(),
      answeredAt: q.answeredAt?.toISOString() ?? null,
    };
  }

  async getAllQas() {
    const qas = await db.select().from(productQaTable).orderBy(desc(productQaTable.createdAt));
    const users = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable);
    const products = await db.select({ id: productsTable.id, name: productsTable.name, imageUrl: productsTable.imageUrl }).from(productsTable);
    const userMap = new Map(users.map(u => [u.id, u.name]));
    const productMap = new Map(products.map(p => [p.id, { name: p.name, imageUrl: p.imageUrl }]));
    
    return qas.map(q => ({
      id: q.id, 
      productId: q.productId,
      productName: productMap.get(q.productId)?.name ?? "Unknown Product",
      productImage: productMap.get(q.productId)?.imageUrl ?? "",
      userId: q.userId,
      userName: userMap.get(q.userId) ?? "Customer",
      question: q.question, 
      answer: q.answer,
      answeredBy: q.answeredBy, 
      answererName: q.answeredBy ? (userMap.get(q.answeredBy) ?? null) : null,
      isApproved: q.isApproved,
      createdAt: q.createdAt.toISOString(), 
      answeredAt: q.answeredAt?.toISOString() ?? null,
    }));
  }

  async getProductQas(productId: number) {
    const qas = await db.select().from(productQaTable)
      .where(eq(productQaTable.productId, productId))
      .orderBy(desc(productQaTable.createdAt));
    const users = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable);
    const userMap = new Map(users.map(u => [u.id, u.name]));
    
    return qas.map(q => ({
      id: q.id, 
      productId: q.productId, 
      userId: q.userId,
      userName: userMap.get(q.userId) ?? "Customer",
      question: q.question, 
      answer: q.answer,
      answeredBy: q.answeredBy, 
      answererName: q.answeredBy ? (userMap.get(q.answeredBy) ?? null) : null,
      isApproved: q.isApproved,
      createdAt: q.createdAt.toISOString(), 
      answeredAt: q.answeredAt?.toISOString() ?? null,
    }));
  }

  async createQa(productId: number, userId: number, question: string) {
    const [qa] = await db.insert(productQaTable).values({ productId, userId, question }).returning();
    const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId));
    return await this.formatQa(qa, user?.name);
  }

  async answerQa(id: number, adminId: number, answer: string) {
    const [qa] = await db.update(productQaTable)
      .set({ answer, answeredBy: adminId, answeredAt: new Date() })
      .where(eq(productQaTable.id, id)).returning();
    if (!qa) return null;
    const users = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable);
    const userMap = new Map(users.map(u => [u.id, u.name]));
    return await this.formatQa(qa, userMap.get(qa.userId), userMap.get(qa.answeredBy ?? -1));
  }

  async deleteQa(id: number) {
    await db.delete(productQaTable).where(eq(productQaTable.id, id));
  }
}

export const productQaService = new ProductQaService();

import { db, reviewsTable, usersTable, ordersTable, orderItemsTable } from "@workspace/database";
import { eq, and, inArray } from "drizzle-orm";

export class ReviewsService {
  async getProductReviews(productId: number, isAdmin: boolean) {
    const reviews = await db.select().from(reviewsTable).where(
      isAdmin
        ? eq(reviewsTable.productId, productId)
        : and(eq(reviewsTable.productId, productId), eq(reviewsTable.isApproved, true))
    );
    const userIds = [...new Set(reviews.map(r => r.userId))];
    const users = userIds.length > 0 
      ? await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(inArray(usersTable.id, userIds))
      : [];
    const userMap = new Map(users.map(u => [u.id, u.name]));
    return reviews.map(r => ({
      id: r.id, 
      userId: r.userId, 
      userName: userMap.get(r.userId) ?? "Customer",
      productId: r.productId, 
      rating: r.rating, 
      comment: r.comment,
      images: r.images ? JSON.parse(r.images) : [],
      isApproved: r.isApproved,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async createReview(userId: number, productId: number, data: any) {
    const { rating, comment = "", images = [] } = data;
    
    const existing = await db.select().from(reviewsTable)
      .where(and(eq(reviewsTable.userId, userId), eq(reviewsTable.productId, productId))).limit(1);
    if (existing.length > 0) throw new Error("You have already reviewed this product");

    // Enforce verified purchase: user must have a delivered order containing this product
    const orders = await db.select({ id: ordersTable.id })
      .from(ordersTable)
      .innerJoin(orderItemsTable, eq(ordersTable.id, orderItemsTable.orderId))
      .where(and(
        eq(ordersTable.userId, userId),
        eq(ordersTable.status, "delivered"),
        eq(orderItemsTable.productId, productId)
      ))
      .limit(1);
      
    if (orders.length === 0) {
      throw new Error("You can only review products you have purchased and received.");
    }
    
    const [review] = await db.insert(reviewsTable).values({
      userId, 
      productId, 
      rating, 
      comment,
      images: images.length > 0 ? JSON.stringify(images) : null,
      isApproved: true,
    }).returning();
    
    const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId));
    return {
      id: review.id, 
      userId: review.userId, 
      userName: user?.name ?? "Customer",
      productId: review.productId, 
      rating: review.rating, 
      comment: review.comment,
      images: review.images ? JSON.parse(review.images) : [],
      isApproved: review.isApproved,
      createdAt: review.createdAt.toISOString(),
    };
  }

  async getAdminReviews(status?: string) {
    let reviews = await db.select().from(reviewsTable);
    if (status === "pending") reviews = reviews.filter(r => !r.isApproved);
    else if (status === "approved") reviews = reviews.filter(r => r.isApproved);
    
    const userIds = [...new Set(reviews.map(r => r.userId))];
    const users = userIds.length > 0 
      ? await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(inArray(usersTable.id, userIds))
      : [];
    const userMap = new Map(users.map(u => [u.id, u.name]));
    
    return reviews.map(r => ({
      id: r.id, 
      userId: r.userId, 
      userName: userMap.get(r.userId) ?? "Customer",
      productId: r.productId, 
      rating: r.rating, 
      comment: r.comment,
      images: r.images ? JSON.parse(r.images) : [],
      isApproved: r.isApproved,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async updateReviewStatus(id: number, isApproved: boolean) {
    const [review] = await db.update(reviewsTable).set({ isApproved }).where(eq(reviewsTable.id, id)).returning();
    if (!review) return null;
    return { id: review.id, isApproved: review.isApproved };
  }

  async deleteReview(id: number) {
    await db.delete(reviewsTable).where(eq(reviewsTable.id, id));
  }
}

export const reviewsService = new ReviewsService();

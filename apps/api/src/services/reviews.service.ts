import { db, reviewsTable, usersTable } from "@workspace/database";
import { eq, and } from "drizzle-orm";

export class ReviewsService {
  async getProductReviews(productId: number, isAdmin: boolean) {
    const reviews = await db.select().from(reviewsTable).where(
      isAdmin
        ? eq(reviewsTable.productId, productId)
        : and(eq(reviewsTable.productId, productId), eq(reviewsTable.isApproved, true))
    );
    const users = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable);
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
    
    const users = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable);
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

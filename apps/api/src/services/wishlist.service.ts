import { db, wishlistItemsTable, productsTable, productVariantsTable } from "@workspace/database";
import { eq, and } from "drizzle-orm";

export class WishlistService {
  async getWishlist(userId: number) {
    const items = await db.select().from(wishlistItemsTable).where(eq(wishlistItemsTable.userId, userId));
    return await Promise.all(items.map(async (item) => {
      const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
      const variants = await db.select().from(productVariantsTable).where(eq(productVariantsTable.productId, item.productId));
      const cheapest = variants.sort((a, b) => parseFloat(a.price) - parseFloat(b.price))[0];
      return {
        id: item.id,
        productId: item.productId,
        productName: product?.name ?? "",
        imageUrl: product?.imageUrl ?? "",
        price: cheapest ? parseFloat(cheapest.price) : 0,
        createdAt: item.createdAt.toISOString(),
      };
    }));
  }

  async addItem(userId: number, productId: number) {
    const existing = await db.select().from(wishlistItemsTable)
      .where(and(eq(wishlistItemsTable.userId, userId), eq(wishlistItemsTable.productId, productId))).limit(1);
      
    if (existing.length > 0) {
      const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
      const variants = await db.select().from(productVariantsTable).where(eq(productVariantsTable.productId, productId));
      const cheapest = variants.sort((a, b) => parseFloat(a.price) - parseFloat(b.price))[0];
      return { 
        id: existing[0].id, 
        productId, 
        productName: product?.name ?? "", 
        imageUrl: product?.imageUrl ?? "", 
        price: cheapest ? parseFloat(cheapest.price) : 0, 
        createdAt: existing[0].createdAt.toISOString() 
      };
    }
    
    const [item] = await db.insert(wishlistItemsTable).values({ userId, productId }).returning();
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
    const variants = await db.select().from(productVariantsTable).where(eq(productVariantsTable.productId, productId));
    const cheapest = variants.sort((a, b) => parseFloat(a.price) - parseFloat(b.price))[0];
    
    return { 
      id: item.id, 
      productId, 
      productName: product?.name ?? "", 
      imageUrl: product?.imageUrl ?? "", 
      price: cheapest ? parseFloat(cheapest.price) : 0, 
      createdAt: item.createdAt.toISOString() 
    };
  }

  async removeItem(userId: number, productId: number) {
    await db.delete(wishlistItemsTable).where(and(eq(wishlistItemsTable.userId, userId), eq(wishlistItemsTable.productId, productId)));
  }
}

export const wishlistService = new WishlistService();

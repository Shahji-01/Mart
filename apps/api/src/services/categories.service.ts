import { db, categoriesTable, productsTable } from "@workspace/database";
import { eq, sql } from "drizzle-orm";

export class CategoriesService {
  async getCategories() {
    const cats = await db.select().from(categoriesTable);
    return await Promise.all(cats.map(async (c) => {
      const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable).where(eq(productsTable.categoryId, c.id));
      return { id: c.id, name: c.name, slug: c.slug, imageUrl: c.imageUrl, description: c.description, productCount: count?.count ?? 0 };
    }));
  }

  async getCategoryById(id: number) {
    const [c] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id));
    if (!c) return null;
    const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable).where(eq(productsTable.categoryId, id));
    return { id: c.id, name: c.name, slug: c.slug, imageUrl: c.imageUrl, description: c.description, productCount: count?.count ?? 0 };
  }

  async createCategory(data: any) {
    const { name, slug, imageUrl, description } = data;
    const [c] = await db.insert(categoriesTable).values({ name, slug, imageUrl, description }).returning();
    return { id: c.id, name: c.name, slug: c.slug, imageUrl: c.imageUrl, description: c.description, productCount: 0 };
  }

  async updateCategory(id: number, updates: any) {
    const [c] = await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, id)).returning();
    if (!c) return null;
    const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable).where(eq(productsTable.categoryId, id));
    return { id: c.id, name: c.name, slug: c.slug, imageUrl: c.imageUrl, description: c.description, productCount: count?.count ?? 0 };
  }

  async deleteCategory(id: number) {
    await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  }
}

export const categoriesService = new CategoriesService();

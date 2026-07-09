import { db, productsTable, productVariantsTable, categoriesTable, stockNotificationsTable, notificationsTable, ordersTable, orderItemsTable } from "@workspace/database";
import { eq, ilike, and, sql, ne, isNull, desc, inArray } from "drizzle-orm";
import { cacheService } from "./cache.service";
import { pushService } from "./push.service";
import { logger } from "../lib/logger";

async function formatProduct(p: typeof productsTable.$inferSelect, categoryName: string) {
  const variants = await db.select().from(productVariantsTable).where(eq(productVariantsTable.productId, p.id));
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    imageUrl: p.imageUrl,
    images: p.images ? JSON.parse(p.images) : [],
    categoryId: p.categoryId,
    categoryName,
    isFeatured: p.isFeatured,
    tags: p.tags,
    createdAt: p.createdAt.toISOString(),
    variants: variants.map(v => ({
      id: v.id,
      unit: v.unit,
      unitValue: v.unitValue,
      price: parseFloat(v.price),
      mrp: parseFloat(v.mrp),
      sku: v.sku,
      stock: v.stock,
    })),
  };
}

export class ProductsService {
  async getProducts(params: { categoryId?: number; search?: string; inStock?: boolean; page: number; limit: number }) {
    const cacheKey = `products_${JSON.stringify(params)}`;
    return cacheService.getOrSet(cacheKey, async () => {
      const conditions: ReturnType<typeof eq>[] = [];
    if (params.categoryId) conditions.push(eq(productsTable.categoryId, params.categoryId));
    if (params.search) {
      conditions.push(sql`to_tsvector('english', ${productsTable.name} || ' ' || coalesce(${productsTable.description}, '')) @@ plainto_tsquery('english', ${params.search})`);
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (params.page - 1) * params.limit;
    
    const products = await db.select().from(productsTable).where(where).limit(params.limit).offset(offset);
    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(productsTable).where(where);

    const cats = await db.select().from(categoriesTable);
    const catMap = new Map(cats.map(c => [c.id, c.name]));

    const data = await Promise.all(products.map(p => formatProduct(p, catMap.get(p.categoryId) ?? "")));
    const filtered = params.inStock ? data.filter(p => p.variants.some(v => v.stock > 0)) : data;
    
      return { data: filtered, total, page: params.page, limit: params.limit };
    });
  }

  async getFeaturedProducts() {
    return cacheService.getOrSet("products_featured", async () => {
      const products = await db.select().from(productsTable).where(eq(productsTable.isFeatured, true)).limit(12);
    const cats = await db.select().from(categoriesTable);
    const catMap = new Map(cats.map(c => [c.id, c.name]));
      return await Promise.all(products.map(p => formatProduct(p, catMap.get(p.categoryId) ?? "")));
    });
  }

  async getSearchSuggestions(query: string) {
    const products = await db.select({ id: productsTable.id, name: productsTable.name, imageUrl: productsTable.imageUrl })
      .from(productsTable)
      .where(sql`to_tsvector('english', ${productsTable.name}) @@ plainto_tsquery('english', ${query})`)
      .limit(8);
    return products;
  }

  async getRelatedProducts(id: number) {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!product) return null;
    
    const related = await db.select().from(productsTable)
      .where(and(eq(productsTable.categoryId, product.categoryId), ne(productsTable.id, id)))
      .limit(6);
      
    const cats = await db.select().from(categoriesTable);
    const catMap = new Map(cats.map(c => [c.id, c.name]));
    return await Promise.all(related.map(p => formatProduct(p, catMap.get(p.categoryId) ?? "")));
  }

  async getProductById(id: number) {
    const [p] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!p) return null;
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, p.categoryId));
    return await formatProduct(p, cat?.name ?? "");
  }

  async createProduct(data: any) {
    const [p] = await db.insert(productsTable).values({
      name: data.name,
      slug: data.slug || data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      description: data.description || "",
      imageUrl: data.imageUrl || "",
      images: data.images ? JSON.stringify(data.images) : null,
      categoryId: data.categoryId,
      isFeatured: data.isFeatured ?? false,
      tags: data.tags,
    }).returning();

    if (data.variants?.length) {
      await db.insert(productVariantsTable).values(
        data.variants.map((v: any) => ({
          productId: p.id,
          unit: v.unit,
          unitValue: v.unitValue,
          price: v.price.toString(),
          mrp: (v.mrp || v.price).toString(),
          sku: v.sku,
          stock: v.stock ?? 0,
        }))
      );
    }
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, p.categoryId));
    cacheService.invalidate("products_");
    cacheService.invalidate("/api/products");
    return await formatProduct(p, cat?.name ?? "");
  }

  async duplicateProduct(id: number) {
    const [original] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!original) return null;
    
    const originalVariants = await db.select().from(productVariantsTable).where(eq(productVariantsTable.productId, id));
    const suffix = `-copy-${Date.now()}`;
    
    const [copy] = await db.insert(productsTable).values({
      name: original.name + " (Copy)",
      slug: original.slug + suffix,
      description: original.description,
      imageUrl: original.imageUrl,
      images: original.images,
      categoryId: original.categoryId,
      isFeatured: false,
      tags: original.tags,
    }).returning();
    
    if (originalVariants.length > 0) {
      await db.insert(productVariantsTable).values(
        originalVariants.map(v => ({
          productId: copy.id,
          unit: v.unit,
          unitValue: v.unitValue,
          price: v.price,
          mrp: v.mrp,
          sku: v.sku ? v.sku + suffix : null,
          stock: 0,
        }))
      );
    }
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, copy.categoryId));
    cacheService.invalidate("products_");
    cacheService.invalidate("/api/products");
    return await formatProduct(copy, cat?.name ?? "");
  }

  async updateProduct(id: number, updates: any) {
    const [p] = await db.update(productsTable).set(updates).where(eq(productsTable.id, id)).returning();
    if (!p) return null;
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, p.categoryId));
    cacheService.invalidate("products_");
    return await formatProduct(p, cat?.name ?? "");
  }

  async deleteProduct(id: number) {
    const result = await db.delete(productsTable).where(eq(productsTable.id, id));
    cacheService.invalidate("products_");
    cacheService.invalidate("/api/products");
    return result;
  }

  async getBuyAgain(userId: number) {
    // Distinct products the user has ordered before, most recent first.
    const rows = await db
      .select({ productId: orderItemsTable.productId, createdAt: ordersTable.createdAt })
      .from(orderItemsTable)
      .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
      .where(eq(ordersTable.userId, userId))
      .orderBy(desc(ordersTable.createdAt));
    const seen = new Set<number>();
    const ids: number[] = [];
    for (const r of rows) {
      if (!seen.has(r.productId)) { seen.add(r.productId); ids.push(r.productId); }
      if (ids.length >= 12) break;
    }
    if (ids.length === 0) return [];
    const products = await db.select().from(productsTable).where(inArray(productsTable.id, ids));
    const cats = await db.select().from(categoriesTable);
    const catMap = new Map(cats.map(c => [c.id, c.name]));
    const formatted = await Promise.all(products.map(p => formatProduct(p, catMap.get(p.categoryId) ?? "")));
    // Preserve recency order.
    formatted.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    return formatted;
  }

  async updateVariantStock(variantId: number, stock: number) {
    const [before] = await db.select({ stock: productVariantsTable.stock }).from(productVariantsTable).where(eq(productVariantsTable.id, variantId));
    const [v] = await db.update(productVariantsTable).set({ stock }).where(eq(productVariantsTable.id, variantId)).returning();
    if (!v) return null;
    cacheService.invalidate("products_");
    cacheService.invalidate("/api/products");
    // Back-in-stock notifier (R28): when a variant transitions from out-of-stock
    // to in-stock, alert everyone subscribed and mark them notified (once).
    if ((before?.stock ?? 0) <= 0 && stock > 0) {
      this.notifyBackInStock(variantId).catch(err =>
        logger.error({ err, variantId }, "Failed to send back-in-stock notifications"),
      );
    }
    return { id: v.id, productId: v.productId, unit: v.unit, unitValue: v.unitValue, price: parseFloat(v.price), mrp: parseFloat(v.mrp), sku: v.sku, stock: v.stock };
  }

  async updateVariantPrice(variantId: number, price: number, mrp?: number) {
    const updates: any = { price: price.toFixed(2) };
    if (mrp !== undefined) updates.mrp = mrp.toFixed(2);
    
    const [v] = await db.update(productVariantsTable).set(updates).where(eq(productVariantsTable.id, variantId)).returning();
    if (!v) return null;
    cacheService.invalidate("products_");
    cacheService.invalidate("/api/products");
    return { id: v.id, productId: v.productId, unit: v.unit, unitValue: v.unitValue, price: parseFloat(v.price), mrp: parseFloat(v.mrp), sku: v.sku, stock: v.stock };
  }

  async updateVariantDetails(variantId: number, unit: string, unitValue: string) {
    const [v] = await db.update(productVariantsTable).set({ unit, unitValue }).where(eq(productVariantsTable.id, variantId)).returning();
    if (!v) return null;
    cacheService.invalidate("products_");
    cacheService.invalidate("/api/products");
    return { id: v.id, productId: v.productId, unit: v.unit, unitValue: v.unitValue, price: parseFloat(v.price), mrp: parseFloat(v.mrp), sku: v.sku, stock: v.stock };
  }

  /** Notify all pending subscribers that a variant is back in stock (idempotent). */
  private async notifyBackInStock(variantId: number) {
    const subs = await db.select().from(stockNotificationsTable)
      .where(and(eq(stockNotificationsTable.variantId, variantId), isNull(stockNotificationsTable.notifiedAt)));
    if (subs.length === 0) return;

    const [variant] = await db.select().from(productVariantsTable).where(eq(productVariantsTable.id, variantId));
    const [product] = variant
      ? await db.select({ name: productsTable.name }).from(productsTable).where(eq(productsTable.id, variant.productId))
      : [undefined];
    const name = product?.name ?? "An item on your wishlist";

    await db.insert(notificationsTable).values(subs.map(s => ({
      userId: s.userId,
      title: "Back in stock!",
      message: `${name} is back in stock. Order now before it runs out again.`,
      type: "success",
    })));

    // Best-effort web push to each subscriber.
    for (const s of subs) {
      pushService.sendToUser(s.userId, {
        title: "Back in stock! 🎉",
        body: `${name} is back. Order now before it runs out again.`,
        url: "/",
        type: "success",
      }).catch(() => {});
    }

    await db.update(stockNotificationsTable)
      .set({ notifiedAt: new Date() })
      .where(and(eq(stockNotificationsTable.variantId, variantId), isNull(stockNotificationsTable.notifiedAt)));
  }

  async bulkUpdateVariantPrice(productId: number, priceMultiplier?: number, flatPrice?: number) {
    const variants = await db.select().from(productVariantsTable).where(eq(productVariantsTable.productId, productId));
    const updated = await Promise.all(variants.map(async v => {
      let newPrice: number;
      if (flatPrice !== undefined) {
        newPrice = flatPrice;
      } else if (priceMultiplier !== undefined) {
        newPrice = parseFloat(v.price) * priceMultiplier;
      } else {
        return v;
      }
      const [u] = await db.update(productVariantsTable).set({ price: newPrice.toFixed(2) }).where(eq(productVariantsTable.id, v.id)).returning();
      return u;
    }));
    cacheService.invalidate("products_");
    cacheService.invalidate("/api/products");
    return updated.map(v => ({ id: v?.id, price: v ? parseFloat(v.price) : 0 }));
  }
}

export const productsService = new ProductsService();

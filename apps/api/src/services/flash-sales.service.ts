import { db, flashSalesTable, productsTable, productVariantsTable } from "@workspace/database";
import { eq, and, lte, gte } from "drizzle-orm";

// Re-export the pure, DB-free pricing resolver so callers (cart/order services)
// can import the single source of per-variant pricing from the flash-sales
// service. The implementation lives in `lib/money.ts` so it stays importable
// and property-testable without a configured DATABASE_URL.
export {
  resolveVariantPricing,
  type PricedVariant,
  type ActiveSale,
  type ResolvedPricing,
} from "../lib/money";

export class FlashSalesService {
  async formatSale(s: typeof flashSalesTable.$inferSelect) {
    const [p] = await db.select({ id: productsTable.id, name: productsTable.name, imageUrl: productsTable.imageUrl }).from(productsTable).where(eq(productsTable.id, s.productId));
    const variants = await db.select().from(productVariantsTable).where(eq(productVariantsTable.productId, s.productId));
    const now = new Date();
    const isLive = s.isActive && s.startsAt <= now && s.endsAt >= now;
    return {
      id: s.id,
      label: s.label,
      productId: s.productId,
      productName: p?.name ?? "",
      productImage: p?.imageUrl ?? "",
      discountType: s.discountType,
      discountValue: parseFloat(s.discountValue),
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      isActive: s.isActive,
      isLive,
      variants: variants.map(v => {
        const originalPrice = parseFloat(v.price);
        const salePrice = s.discountType === "percentage"
          ? Math.round(originalPrice * (1 - parseFloat(s.discountValue) / 100))
          : Math.max(0, originalPrice - parseFloat(s.discountValue));
        return { id: v.id, unit: v.unit, unitValue: v.unitValue, price: originalPrice, salePrice, mrp: parseFloat(v.mrp), stock: v.stock };
      }),
      createdAt: s.createdAt.toISOString(),
    };
  }

  async getFlashSales(activeOnly: boolean) {
    let sales;
    if (activeOnly) {
      const now = new Date();
      sales = await db.select().from(flashSalesTable)
        .where(and(eq(flashSalesTable.isActive, true), lte(flashSalesTable.startsAt, now), gte(flashSalesTable.endsAt, now)));
    } else {
      sales = await db.select().from(flashSalesTable).orderBy(flashSalesTable.startsAt);
    }
    return await Promise.all(sales.map(s => this.formatSale(s)));
  }

  async getFlashSale(id: number) {
    const [sale] = await db.select().from(flashSalesTable).where(eq(flashSalesTable.id, id));
    if (!sale) return null;
    return await this.formatSale(sale);
  }

  async createFlashSale(data: any) {
    const { label, productId, discountType, discountValue, startsAt, endsAt, isActive = true } = data;
    const [sale] = await db.insert(flashSalesTable).values({
      label, 
      productId, 
      discountType: discountType || "percentage",
      discountValue: discountValue.toString(), 
      startsAt: new Date(startsAt), 
      endsAt: new Date(endsAt),
      isActive,
    }).returning();
    return await this.formatSale(sale);
  }

  async updateFlashSale(id: number, data: any) {
    const { label, discountType, discountValue, startsAt, endsAt, isActive } = data;
    const updates: Record<string, unknown> = {};
    if (label !== undefined) updates.label = label;
    if (discountType !== undefined) updates.discountType = discountType;
    if (discountValue !== undefined) updates.discountValue = discountValue.toString();
    if (startsAt !== undefined) updates.startsAt = new Date(startsAt);
    if (endsAt !== undefined) updates.endsAt = new Date(endsAt);
    if (isActive !== undefined) updates.isActive = isActive;
    
    const [sale] = await db.update(flashSalesTable).set(updates).where(eq(flashSalesTable.id, id)).returning();
    if (!sale) return null;
    return await this.formatSale(sale);
  }

  async deleteFlashSale(id: number) {
    await db.delete(flashSalesTable).where(eq(flashSalesTable.id, id));
  }
}

export const flashSalesService = new FlashSalesService();

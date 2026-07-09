import { db, couponsTable } from "@workspace/database";
import { eq } from "drizzle-orm";

function formatCoupon(c: typeof couponsTable.$inferSelect) {
  return {
    id: c.id,
    code: c.code,
    discountType: c.discountType,
    discountValue: parseFloat(c.discountValue),
    minOrderValue: c.minOrderValue ? parseFloat(c.minOrderValue) : null,
    maxDiscount: c.maxDiscount ? parseFloat(c.maxDiscount) : null,
    maxUsagePerUser: c.maxUsagePerUser ?? null,
    isActive: c.isActive,
    expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
    usageCount: c.usageCount,
  };
}

export class CouponsService {
  async getCoupons() {
    const coupons = await db.select().from(couponsTable);
    return coupons.map(formatCoupon);
  }

  async createCoupon(data: any) {
    const { code, discountType, discountValue, minOrderValue, maxDiscount, maxUsagePerUser, isActive = true, expiresAt } = data;
    const [c] = await db.insert(couponsTable).values({
      code: code.toUpperCase(),
      discountType,
      discountValue: discountValue.toString(),
      minOrderValue: minOrderValue ? minOrderValue.toString() : null,
      maxDiscount: maxDiscount ? maxDiscount.toString() : null,
      maxUsagePerUser: maxUsagePerUser ?? null,
      isActive,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    }).returning();

    return formatCoupon(c);
  }

  async updateCoupon(id: number, data: any) {
    const { code, discountType, discountValue, minOrderValue, maxDiscount, maxUsagePerUser, isActive, expiresAt } = data;
    const updates: Record<string, unknown> = {};
    if (code !== undefined) updates.code = code.toUpperCase();
    if (discountType !== undefined) updates.discountType = discountType;
    if (discountValue !== undefined) updates.discountValue = String(discountValue);
    if (minOrderValue !== undefined) updates.minOrderValue = minOrderValue ? String(minOrderValue) : null;
    if (maxDiscount !== undefined) updates.maxDiscount = maxDiscount ? String(maxDiscount) : null;
    if (maxUsagePerUser !== undefined) updates.maxUsagePerUser = maxUsagePerUser ?? null;
    if (isActive !== undefined) updates.isActive = isActive;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const [c] = await db.update(couponsTable).set(updates).where(eq(couponsTable.id, id)).returning();
    if (!c) return null;

    return formatCoupon(c);
  }

  async deleteCoupon(id: number) {
    await db.delete(couponsTable).where(eq(couponsTable.id, id));
  }
}

export const couponsService = new CouponsService();

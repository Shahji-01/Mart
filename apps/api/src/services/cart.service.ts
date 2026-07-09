import { db, cartItemsTable, productsTable, productVariantsTable, couponsTable, ordersTable, cartSessionsTable, flashSalesTable, deliveryZonesTable } from "@workspace/database";
import { eq, and, sql, inArray, lte, gte } from "drizzle-orm";
import { resolveVariantPricing, computeCartTotals, computeCouponDiscount, buildCouponSuggestion, FREE_DELIVERY_THRESHOLD, STANDARD_DELIVERY_FEE, type ActiveSale } from "../lib/money";

function isCouponExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

/**
 * Resolve the delivery fee + free-delivery threshold for a pincode from the
 * active delivery zones. Falls back to flat defaults when no pincode is set.
 */
async function resolveDeliveryRule(pincode?: string | null): Promise<{ fee: number; freeThreshold: number }> {
  const clean = (pincode ?? "").trim();
  if (!/^\d{6}$/.test(clean)) {
    return { fee: STANDARD_DELIVERY_FEE, freeThreshold: FREE_DELIVERY_THRESHOLD };
  }
  const zones = await db.select().from(deliveryZonesTable).where(eq(deliveryZonesTable.isActive, true));
  const zone = zones.find(z => z.pincodes.split(",").map(p => p.trim()).includes(clean));
  if (!zone) return { fee: STANDARD_DELIVERY_FEE, freeThreshold: FREE_DELIVERY_THRESHOLD };
  return { fee: parseFloat(zone.deliveryFee), freeThreshold: parseFloat(zone.minOrderForFree) };
}

export async function buildCart(userId: number, couponCode?: string | null, pincode?: string | null) {
  const items = await db.select().from(cartItemsTable).where(eq(cartItemsTable.userId, userId));

  // Fetch active flash sales for the cart's products in ONE bounded query, so
  // each line can be priced at its effective (flash-sale-resolved) price.
  const productIds = [...new Set(items.map((i) => i.productId))];
  let activeSales: ActiveSale[] = [];
  if (productIds.length > 0) {
    const now = new Date();
    const sales = await db.select().from(flashSalesTable).where(and(
      eq(flashSalesTable.isActive, true),
      lte(flashSalesTable.startsAt, now),
      gte(flashSalesTable.endsAt, now),
      inArray(flashSalesTable.productId, productIds),
    ));
    activeSales = sales.map((s) => ({
      id: s.id,
      productId: s.productId,
      discountType: s.discountType,
      discountValue: s.discountValue,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      isActive: s.isActive,
    }));
  }

  const cartItems = await Promise.all(items.map(async (item) => {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
    const [variant] = await db.select().from(productVariantsTable).where(eq(productVariantsTable.id, item.variantId));
    if (!product || !variant) return null;
    // Single source of per-variant pricing: charge the active flash-sale price
    // when one applies, otherwise the regular price.
    const { effectivePrice } = resolveVariantPricing(
      { id: variant.id, price: variant.price, productId: variant.productId },
      activeSales,
    );
    const price = effectivePrice;
    const stock = variant.stock ?? 0;
    const qty = Math.min(item.quantity, stock);
    return {
      id: item.id,
      productId: item.productId,
      productName: product.name,
      variantId: item.variantId,
      unit: variant.unit,
      unitValue: variant.unitValue,
      price,
      quantity: qty,
      stock,
      imageUrl: product.imageUrl,
      subtotal: price * qty,
    };
  }));

  const validItems = cartItems.filter(Boolean) as NonNullable<typeof cartItems[number]>[];
  const rawSubtotal = validItems.reduce((sum, i) => sum + i.subtotal, 0);

  let discount = 0;
  let appliedCoupon: string | null = couponCode || null;

  if (couponCode) {
    const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, couponCode));
    if (coupon && coupon.isActive && !isCouponExpired(coupon.expiresAt)) {
      const minVal = coupon.minOrderValue ? parseFloat(coupon.minOrderValue) : 0;
      if (rawSubtotal >= minVal) {
        // Bounded coupon math (R16.2): percentage discounts are capped at
        // maxDiscount when set and ALWAYS at the subtotal (never Infinity);
        // flat discounts are capped at the subtotal.
        discount = computeCouponDiscount({
          discountType: coupon.discountType,
          discountValue: parseFloat(coupon.discountValue),
          subtotal: rawSubtotal,
          maxDiscount: coupon.maxDiscount ? parseFloat(coupon.maxDiscount) : null,
        });
      } else {
        appliedCoupon = null;
        await db.update(cartSessionsTable).set({ couponCode: null }).where(eq(cartSessionsTable.userId, userId));
      }
    } else {
      appliedCoupon = null;
      await db.update(cartSessionsTable).set({ couponCode: null }).where(eq(cartSessionsTable.userId, userId));
    }
  }

  // Charged total is computed from the charged line prices (R2.4), with the
  // delivery fee / free-delivery threshold resolved from the selected pincode's
  // delivery zone (falls back to flat defaults when no zone applies).
  const rule = await resolveDeliveryRule(pincode);
  const totals = computeCartTotals({
    lines: validItems,
    discount,
    freeDeliveryThreshold: rule.freeThreshold,
    standardDeliveryFee: rule.fee,
  });

  return {
    items: validItems,
    subtotal: totals.subtotal,
    discount: totals.discount,
    deliveryFee: totals.deliveryFee,
    total: totals.total,
    couponCode: appliedCoupon,
  };
}

export class CartService {
  async getCart(userId: number) {
    const [session] = await db.select().from(cartSessionsTable).where(eq(cartSessionsTable.userId, userId));
    return await buildCart(userId, session?.couponCode, session?.pincode);
  }

  /** Persist the user's selected delivery pincode and return the recomputed cart. */
  async setPincode(userId: number, pincode: string) {
    const clean = (pincode ?? "").trim();
    await db.insert(cartSessionsTable)
      .values({ userId, pincode: clean })
      .onConflictDoUpdate({ target: cartSessionsTable.userId, set: { pincode: clean } });
    return await this.getCart(userId);
  }

  async getCouponSuggestions(userId: number) {
    const coupons = await db.select().from(couponsTable).where(eq(couponsTable.isActive, true));
    const valid = coupons.filter(c => !isCouponExpired(c.expiresAt));

    const suggestions = await Promise.all(valid.map(async c => {
      let usageCount = 0;
      if (c.maxUsagePerUser) {
        const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
          .from(ordersTable)
          .where(and(eq(ordersTable.userId, userId), eq(ordersTable.couponCode, c.code)));
        usageCount = count;
        if (usageCount >= c.maxUsagePerUser) return null;
      }
      // Shape into a display-ready suggestion with the required description and
      // canonical minOrderValue; omit any coupon missing either (R9.1, R9.2).
      return buildCouponSuggestion({
        code: c.code,
        discountType: c.discountType,
        discountValue: c.discountValue,
        maxDiscount: c.maxDiscount,
        minOrderValue: c.minOrderValue,
        description: c.description,
        expiresAt: c.expiresAt,
      });
    }));

    return suggestions.filter(Boolean);
  }

  async addItemToCart(userId: number, data: any) {
    const { productId, variantId, quantity } = data;
    const [variant] = await db.select().from(productVariantsTable).where(eq(productVariantsTable.id, variantId));
    if (!variant) throw new Error("Variant not found");
    
    const stock = variant.stock ?? 0;
    const existing = await db.select().from(cartItemsTable).where(and(eq(cartItemsTable.userId, userId), eq(cartItemsTable.variantId, variantId))).limit(1);
    
    if (existing.length > 0) {
      const newQty = Math.min(existing[0].quantity + quantity, stock);
      await db.update(cartItemsTable).set({ quantity: newQty }).where(eq(cartItemsTable.id, existing[0].id));
    } else {
      const clampedQty = Math.min(quantity, stock);
      if (clampedQty < 1) throw new Error("Item is out of stock");
      await db.insert(cartItemsTable).values({ userId, productId, variantId, quantity: clampedQty });
    }
    return await this.getCart(userId);
  }

  async updateItemQuantity(userId: number, variantId: number, quantity: number) {
    if (quantity <= 0) {
      await db.delete(cartItemsTable).where(and(eq(cartItemsTable.userId, userId), eq(cartItemsTable.variantId, variantId)));
    } else {
      const [variant] = await db.select().from(productVariantsTable).where(eq(productVariantsTable.id, variantId));
      const stock = variant?.stock ?? 0;
      const clampedQty = Math.min(quantity, stock);
      
      if (clampedQty < 1) {
        await db.delete(cartItemsTable).where(and(eq(cartItemsTable.userId, userId), eq(cartItemsTable.variantId, variantId)));
      } else {
        await db.update(cartItemsTable).set({ quantity: clampedQty }).where(and(eq(cartItemsTable.userId, userId), eq(cartItemsTable.variantId, variantId)));
      }
    }
    return await this.getCart(userId);
  }

  async removeItem(userId: number, variantId: number) {
    await db.delete(cartItemsTable).where(and(eq(cartItemsTable.userId, userId), eq(cartItemsTable.variantId, variantId)));
    return await this.getCart(userId);
  }

  async clearCart(userId: number) {
    await db.delete(cartItemsTable).where(eq(cartItemsTable.userId, userId));
    await db.delete(cartSessionsTable).where(eq(cartSessionsTable.userId, userId));
    return { items: [], subtotal: 0, discount: 0, deliveryFee: 0, total: 0, couponCode: null };
  }

  async applyCoupon(userId: number, code: string) {
    const uppercaseCode = code.toUpperCase();
    const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, uppercaseCode));
    
    if (!coupon || !coupon.isActive) throw new Error("Invalid or inactive coupon");
    if (isCouponExpired(coupon.expiresAt)) throw new Error("This coupon has expired");
    
    if (coupon.maxUsagePerUser) {
      const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
        .from(ordersTable)
        .where(and(eq(ordersTable.userId, userId), eq(ordersTable.couponCode, uppercaseCode)));
        
      if (count >= coupon.maxUsagePerUser) {
        throw new Error(`You've already used this coupon ${coupon.maxUsagePerUser} time${coupon.maxUsagePerUser > 1 ? "s" : ""}`);
      }
    }
    
    if (coupon.minOrderValue) {
      const minVal = parseFloat(coupon.minOrderValue);
      const currentCart = await buildCart(userId);
      if (currentCart.subtotal < minVal) {
        throw new Error(`Add items worth ₹${minVal - currentCart.subtotal} more to use this coupon`);
      }
    }
    
    await db.insert(cartSessionsTable)
      .values({ userId, couponCode: uppercaseCode })
      .onConflictDoUpdate({ target: cartSessionsTable.userId, set: { couponCode: uppercaseCode } });
      
    return await buildCart(userId, uppercaseCode);
  }

  async removeCoupon(userId: number) {
    await db.delete(cartSessionsTable).where(eq(cartSessionsTable.userId, userId));
    return await this.getCart(userId);
  }
}

export const cartService = new CartService();

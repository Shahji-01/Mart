// Pure, database-free money/pricing helpers.
//
// This module intentionally has NO imports from the database layer (or any
// side-effecting module) so that it can be imported and property-tested
// without a configured DATABASE_URL. Callers in the service layer fetch the
// rows (variants, active flash sales, user balances) and pass plain values in.

// ---------------------------------------------------------------------------
// Loyalty constants (single source of truth)
// ---------------------------------------------------------------------------
// Earn rate: 0.1 points per ₹1 spent (1 point per ₹10).
export const POINTS_PER_RUPEE_SPENT = 0.1;
// Redeem rate: 4 points = ₹1 (each point is worth ₹0.25).
export const RUPEES_PER_POINT = 0.25;

/** Round a monetary amount to 2 decimal places. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Flash-sale / variant pricing (R2)
// ---------------------------------------------------------------------------

export type DiscountType = "percentage" | "fixed" | "flat" | (string & {});

export interface PricedVariant {
  id: number;
  price: string | number;
  productId?: number;
}

export interface ActiveSale {
  /** Flash-sale id, surfaced as `flashSaleId` when this sale is applied. */
  id?: number;
  productId: number;
  discountType: DiscountType;
  discountValue: string | number;
  // Optional time window. When present, the sale is only considered active
  // while `startsAt <= now <= endsAt` (and `isActive !== false`). When absent,
  // the sale is assumed to be already filtered to "active" by the caller.
  startsAt?: Date;
  endsAt?: Date;
  isActive?: boolean;
}

export interface ResolvedPricing {
  regularPrice: number;
  effectivePrice: number;
  flashSaleId: number | null;
}

function toNumber(value: string | number): number {
  return typeof value === "number" ? value : parseFloat(value);
}

/**
 * Compute the sale price for a regular price using the exact discount math
 * shared with `FlashSalesService.formatSale`:
 *   - percentage -> Math.round(originalPrice * (1 - value / 100))
 *   - otherwise (fixed/flat) -> Math.max(0, originalPrice - value)
 */
function computeSalePrice(regularPrice: number, discountType: DiscountType, discountValue: number): number {
  if (discountType === "percentage") {
    return Math.round(regularPrice * (1 - discountValue / 100));
  }
  return Math.max(0, regularPrice - discountValue);
}

function isSaleActiveNow(sale: ActiveSale, now: Date): boolean {
  if (sale.isActive === false) return false;
  if (sale.startsAt && sale.startsAt > now) return false;
  if (sale.endsAt && sale.endsAt < now) return false;
  return true;
}

/**
 * Resolve the price a variant should be charged at.
 *
 * - When an active flash sale matches the variant's product, the effective
 *   price is the computed sale price (which may equal the regular price; in
 *   that case `effectivePrice === regularPrice` and the sale id is still
 *   reported).
 * - When no active sale matches, `effectivePrice === regularPrice` and
 *   `flashSaleId === null`.
 *
 * Pure: callers pass the already-fetched active sales (no DB access here).
 */
export function resolveVariantPricing(
  variant: PricedVariant,
  activeSales: ActiveSale[],
  now: Date = new Date(),
): ResolvedPricing {
  const regularPrice = toNumber(variant.price);

  if (variant.productId !== undefined && activeSales && activeSales.length > 0) {
    const sale = activeSales.find(
      (s) => s.productId === variant.productId && isSaleActiveNow(s, now),
    );
    if (sale) {
      const effectivePrice = computeSalePrice(regularPrice, sale.discountType, toNumber(sale.discountValue));
      return {
        regularPrice,
        effectivePrice,
        flashSaleId: sale.id ?? null,
      };
    }
  }

  return { regularPrice, effectivePrice: regularPrice, flashSaleId: null };
}

// ---------------------------------------------------------------------------
// Wallet / loyalty debit math (R1)
// ---------------------------------------------------------------------------

export interface ComputeDebitsInput {
  walletBalance: number;
  loyaltyPoints: number;
  cartTotal: number;
  useWallet?: boolean;
  useLoyaltyPoints?: boolean;
  rupeesPerPoint?: number;
}

export interface ComputeDebitsResult {
  walletUsed: number;
  loyaltyUsed: number;
  remainingTotal: number;
  newWalletBalance: number;
  newLoyaltyPoints: number;
}

/**
 * Pure replica of the wallet/loyalty debit math in `OrdersService.createOrder`.
 *
 * Wallet spend clamps to `min(balance, total)`; loyalty redemption converts
 * available points to rupees at `rupeesPerPoint`, clamps to the remaining
 * total, then converts back to points with `Math.ceil`. Resulting balances are
 * never driven below zero.
 */
export function computeDebits(input: ComputeDebitsInput): ComputeDebitsResult {
  const {
    walletBalance,
    loyaltyPoints,
    cartTotal,
    useWallet = false,
    useLoyaltyPoints = false,
    rupeesPerPoint = RUPEES_PER_POINT,
  } = input;

  let walletUsed = 0;
  let loyaltyUsed = 0;
  let remaining = cartTotal;

  if (useWallet && walletBalance > 0) {
    walletUsed = Math.min(walletBalance, remaining);
    remaining = Math.max(0, remaining - walletUsed);
  }

  if (useLoyaltyPoints && loyaltyPoints > 0) {
    const maxLoyaltyRupees = round2(loyaltyPoints * rupeesPerPoint);
    const loyaltyRupeesUsed = Math.min(maxLoyaltyRupees, remaining);
    loyaltyUsed = Math.ceil(loyaltyRupeesUsed / rupeesPerPoint);
    remaining = Math.max(0, remaining - loyaltyRupeesUsed);
  }

  walletUsed = round2(walletUsed);
  const remainingTotal = round2(remaining);

  // Balances can never go negative (R1.5). walletUsed/loyaltyUsed are bounded
  // by the available balance above, but clamp defensively to guarantee the
  // invariant under any rounding.
  const newWalletBalance = Math.max(0, round2(walletBalance - walletUsed));
  const newLoyaltyPoints = Math.max(0, loyaltyPoints - loyaltyUsed);

  return { walletUsed, loyaltyUsed, remainingTotal, newWalletBalance, newLoyaltyPoints };
}

// ---------------------------------------------------------------------------
// Cart / order totals (R2.4)
// ---------------------------------------------------------------------------

// Free-delivery threshold and standard delivery fee (single source of truth,
// matching the values used by Cart_Service.buildCart).
export const FREE_DELIVERY_THRESHOLD = 499;
export const STANDARD_DELIVERY_FEE = 40;

export interface CartLineInput {
  /** Per-unit charged price (the effective/flash-sale-resolved price). */
  price: number;
  quantity: number;
}

export interface ComputeCartTotalsInput {
  lines: CartLineInput[];
  /** Coupon discount (pre-clamp). Clamped to [0, subtotal]. */
  discount?: number;
  freeDeliveryThreshold?: number;
  standardDeliveryFee?: number;
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
}

/**
 * Compute order/cart totals from the charged line prices. Pure replica of the
 * total math in `CartService.buildCart`, so the charged total is always
 * consistent with the per-line charged prices:
 *
 *   subtotal     = sum(price * quantity)
 *   deliveryFee  = subtotal >= threshold ? 0 : standardFee
 *   discount     = clamp(discount, 0, subtotal)
 *   total        = max(0, subtotal - discount + deliveryFee)
 *
 * The delivery-fee threshold uses the raw (un-rounded) subtotal to match
 * existing behavior.
 */
export function computeCartTotals(input: ComputeCartTotalsInput): CartTotals {
  const {
    lines,
    discount = 0,
    freeDeliveryThreshold = FREE_DELIVERY_THRESHOLD,
    standardDeliveryFee = STANDARD_DELIVERY_FEE,
  } = input;

  const rawSubtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const deliveryFee = rawSubtotal >= freeDeliveryThreshold ? 0 : standardDeliveryFee;
  const clampedDiscount = Math.min(Math.max(0, discount), rawSubtotal);

  return {
    subtotal: round2(rawSubtotal),
    discount: round2(clampedDiscount),
    deliveryFee,
    total: Math.max(0, round2(rawSubtotal - clampedDiscount + deliveryFee)),
  };
}

// ---------------------------------------------------------------------------
// Coupon discount math (R16.2)
// ---------------------------------------------------------------------------

export interface ComputeCouponDiscountInput {
  /** Canonical discount type: "percentage" or "flat" (legacy "fixed" treated as flat). */
  discountType: DiscountType;
  discountValue: number;
  /** Cart subtotal the discount applies against. */
  subtotal: number;
  /** Optional per-coupon cap. When null/undefined, the upper bound is the subtotal. */
  maxDiscount?: number | null;
}

/**
 * Compute the (capped) coupon discount for a subtotal. Pure: no DB access, so
 * it is directly property-testable.
 *
 * Percentage coupons: `subtotal * value / 100`, capped at `maxDiscount` when
 * set and ALWAYS capped at the subtotal. When `maxDiscount` is null/undefined a
 * defined upper bound of the subtotal is applied (never `Infinity`), so a
 * percentage discount can never exceed the order subtotal (R16.2).
 *
 * Flat coupons: `min(value, subtotal)`.
 *
 * The returned discount is always within `[0, subtotal]`.
 */
export function computeCouponDiscount(input: ComputeCouponDiscountInput): number {
  const { discountType, discountValue } = input;
  const subtotal = Math.max(0, toNumber(input.subtotal as unknown as number));
  const value = toNumber(discountValue as unknown as number);

  if (!Number.isFinite(value) || value <= 0) return 0;

  if (discountType === "percentage") {
    const raw = (subtotal * value) / 100;
    // Upper bound is maxDiscount when set, otherwise the subtotal (never Infinity).
    const cap =
      input.maxDiscount != null && Number.isFinite(input.maxDiscount)
        ? Math.max(0, input.maxDiscount)
        : subtotal;
    return round2(Math.max(0, Math.min(raw, cap, subtotal)));
  }

  // flat (and legacy "fixed"): never exceed the subtotal.
  return round2(Math.max(0, Math.min(value, subtotal)));
}

// ---------------------------------------------------------------------------
// Coupon suggestion shaping (R9)
// ---------------------------------------------------------------------------

export interface CouponSuggestionInput {
  code: string;
  discountType: DiscountType;
  discountValue: string | number;
  minOrderValue?: string | number | null;
  maxDiscount?: string | number | null;
  /** Stored, human-authored description (preferred when present). */
  description?: string | null;
  expiresAt?: Date | string | null;
}

export interface CouponSuggestion {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number | null;
  minOrderValue: number;
  description: string;
  expiresAt: string | null;
}

/** Format a rupee amount without trailing ".00" for whole numbers. */
function formatRupees(amount: number): string {
  return Number.isInteger(amount) ? `₹${amount}` : `₹${amount.toFixed(2)}`;
}

/**
 * Derive a human-readable description for a coupon from its discount type and
 * value when no stored description is available. Returns null when the discount
 * cannot be described (unknown type or non-positive/non-finite value).
 */
function deriveCouponDescription(
  discountType: DiscountType,
  discountValue: number,
  maxDiscount: number | null,
): string | null {
  if (!Number.isFinite(discountValue) || discountValue <= 0) return null;

  if (discountType === "percentage") {
    let text = `${discountValue}% off`;
    if (maxDiscount != null && Number.isFinite(maxDiscount) && maxDiscount > 0) {
      text += ` up to ${formatRupees(maxDiscount)}`;
    }
    return text;
  }

  if (discountType === "flat" || discountType === "fixed") {
    return `${formatRupees(discountValue)} off`;
  }

  return null;
}

/**
 * Shape a coupon row into a display-ready suggestion (R9.1, R9.2). Pure: no DB
 * access, so it is directly property-testable.
 *
 * Guarantees the two required display fields are always present:
 *   - `description`: the stored description when non-empty, otherwise a derived
 *     human string from discount type/value.
 *   - `minOrderValue`: a single canonical number (defaults to 0 when unset).
 *
 * Returns `null` for any coupon that cannot supply BOTH required display fields
 * (e.g. an undescribable discount), so callers can omit it (R9.2).
 */
export function buildCouponSuggestion(input: CouponSuggestionInput): CouponSuggestion | null {
  const discountValue = toNumber(input.discountValue as unknown as number);
  // A coupon with no real, finite discount cannot be meaningfully displayed
  // (its description and "X% OFF" badge would be undefined) -> omit (R9.2).
  if (!Number.isFinite(discountValue) || discountValue <= 0) return null;

  const maxDiscount =
    input.maxDiscount != null && Number.isFinite(toNumber(input.maxDiscount as unknown as number))
      ? toNumber(input.maxDiscount as unknown as number)
      : null;

  const stored = typeof input.description === "string" ? input.description.trim() : "";
  const description = stored.length > 0 ? stored : deriveCouponDescription(input.discountType, discountValue, maxDiscount);

  // Cannot supply the required description display field -> omit (R9.2).
  if (!description) return null;

  const minRaw = input.minOrderValue;
  const minNum = minRaw != null ? toNumber(minRaw as unknown as number) : 0;
  // Cannot supply a valid canonical minimum-order amount -> omit (R9.2).
  if (!Number.isFinite(minNum) || minNum < 0) return null;

  let expiresAt: string | null = null;
  if (input.expiresAt instanceof Date) expiresAt = input.expiresAt.toISOString();
  else if (typeof input.expiresAt === "string") expiresAt = input.expiresAt;

  return {
    code: input.code,
    discountType: input.discountType,
    discountValue,
    maxDiscount,
    minOrderValue: round2(minNum),
    description,
    expiresAt,
  };
}

// ---------------------------------------------------------------------------
// Return refund validation (R5.3)
// ---------------------------------------------------------------------------

export interface RefundValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validate a return refund amount against the amount actually paid for the
 * order (its upper bound). Pure: callers derive `amountPaid` from the order
 * (e.g. `order.total`) and pass plain numbers in, so this can be
 * property-tested without a database.
 *
 * A refund is accepted only when `0 <= refundAmount <= amountPaid` (R5.3):
 *   - reject a negative refund,
 *   - reject a refund greater than the amount paid,
 *   - reject a non-finite refund (NaN / Infinity).
 */
export function validateRefundAmount(refundAmount: number, amountPaid: number): RefundValidationResult {
  if (!Number.isFinite(refundAmount)) {
    return { valid: false, reason: "Refund amount must be a finite number" };
  }
  if (refundAmount < 0) {
    return { valid: false, reason: "Refund amount cannot be negative" };
  }
  if (refundAmount > amountPaid) {
    return { valid: false, reason: "Refund amount cannot exceed the amount paid for the order" };
  }
  return { valid: true };
}

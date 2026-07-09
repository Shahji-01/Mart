import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { computeCouponDiscount } from "../lib/money";

// These tests exercise ONLY the pure coupon-discount math from `lib/money.ts`.
// They import no database layer and therefore run with no DATABASE_URL
// configured. The same function bounds the discount in `CartService.buildCart`.

const MIN_RUNS = 100;

describe("computeCouponDiscount", () => {
  // Feature: codebase-remediation, Property 13: Percentage-coupon discounts are bounded
  // Validates: Requirements 16.2
  it("Property 13: percentage discounts never exceed the subtotal or maxDiscount, and stay finite", () => {
    const moneyArb = fc.integer({ min: 0, max: 100_000_00 }).map((n) => n / 100); // 0..100000.00
    const percentArb = fc.double({ min: 0, max: 100, noNaN: true });
    const maxDiscountArb = fc.option(
      fc.integer({ min: 0, max: 100_000_00 }).map((n) => n / 100),
      { nil: null },
    );

    fc.assert(
      fc.property(moneyArb, percentArb, maxDiscountArb, (subtotal, discountValue, maxDiscount) => {
        const discount = computeCouponDiscount({
          discountType: "percentage",
          discountValue,
          subtotal,
          maxDiscount,
        });

        // Always a finite, non-negative number (never Infinity / NaN).
        expect(Number.isFinite(discount)).toBe(true);
        expect(discount).toBeGreaterThanOrEqual(0);

        // Defined upper bound: never exceeds the subtotal (R16.2).
        expect(discount).toBeLessThanOrEqual(subtotal + 1e-9);

        // When a maxDiscount is set, the discount is also capped by it.
        if (maxDiscount != null) {
          expect(discount).toBeLessThanOrEqual(maxDiscount + 1e-9);
        }
      }),
      { numRuns: MIN_RUNS },
    );
  });

  // Feature: codebase-remediation, Property 13: Percentage-coupon discounts are bounded
  // Validates: Requirements 16.2
  it("Property 13: flat discounts never exceed the subtotal", () => {
    const moneyArb = fc.integer({ min: 0, max: 100_000_00 }).map((n) => n / 100);
    const valueArb = fc.integer({ min: 1, max: 100_000_00 }).map((n) => n / 100);

    fc.assert(
      fc.property(moneyArb, valueArb, (subtotal, discountValue) => {
        const discount = computeCouponDiscount({
          discountType: "flat",
          discountValue,
          subtotal,
        });
        expect(Number.isFinite(discount)).toBe(true);
        expect(discount).toBeGreaterThanOrEqual(0);
        expect(discount).toBeLessThanOrEqual(subtotal + 1e-9);
      }),
      { numRuns: MIN_RUNS },
    );
  });
});

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { buildCouponSuggestion } from "../lib/money";

// These tests exercise ONLY the pure coupon-suggestion shaping from
// `lib/money.ts`. They import no database layer and therefore run with no
// DATABASE_URL configured. The same function shapes each suggestion in
// `CartService.getCouponSuggestions`.

const MIN_RUNS = 100;

describe("buildCouponSuggestion", () => {
  // Feature: codebase-remediation, Property 10: Coupon suggestions always carry description and minimum order amount
  // Validates: Requirements 9.1, 9.2
  it("Property 10: every returned suggestion carries a non-empty description and a numeric minOrderValue", () => {
    const codeArb = fc.string({ minLength: 1, maxLength: 12 });
    const discountTypeArb = fc.constantFrom("percentage", "flat", "fixed");
    const discountValueArb = fc.oneof(
      fc.integer({ min: 1, max: 100_00 }).map((n) => n / 100), // valid positive
      fc.constantFrom(0, -5, NaN),                              // invalid (undescribable)
    );
    const minOrderArb = fc.option(
      fc.oneof(
        fc.integer({ min: 0, max: 100_000_00 }).map((n) => n / 100),
        fc.constantFrom(-1, NaN),
      ),
      { nil: null },
    );
    const maxDiscountArb = fc.option(fc.integer({ min: 0, max: 100_00 }).map((n) => n / 100), { nil: null });
    const descriptionArb = fc.option(fc.string({ maxLength: 40 }), { nil: null });
    const expiresArb = fc.option(fc.date({ min: new Date(2020, 0, 1), max: new Date(2035, 0, 1) }), { nil: null });

    fc.assert(
      fc.property(
        codeArb, discountTypeArb, discountValueArb, minOrderArb, maxDiscountArb, descriptionArb, expiresArb,
        (code, discountType, discountValue, minOrderValue, maxDiscount, description, expiresAt) => {
          const suggestion = buildCouponSuggestion({
            code, discountType, discountValue, minOrderValue, maxDiscount, description, expiresAt,
          });

          // Any suggestion that cannot supply BOTH required display fields is
          // omitted (null) — the caller drops it (R9.2).
          if (suggestion === null) return;

          // R9.1: a returned suggestion always carries both required display
          // fields.
          expect(typeof suggestion.description).toBe("string");
          expect(suggestion.description.length).toBeGreaterThan(0);
          expect(typeof suggestion.minOrderValue).toBe("number");
          expect(Number.isFinite(suggestion.minOrderValue)).toBe(true);
          expect(suggestion.minOrderValue).toBeGreaterThanOrEqual(0);

          // The canonical numeric discount value is preserved and finite.
          expect(Number.isFinite(suggestion.discountValue)).toBe(true);
        },
      ),
      { numRuns: MIN_RUNS },
    );
  });

  // Feature: codebase-remediation, Property 10: Coupon suggestions always carry description and minimum order amount
  // Validates: Requirements 9.1, 9.2
  it("Property 10: a stored description is preferred and well-formed coupons are never dropped", () => {
    const discountTypeArb = fc.constantFrom("percentage", "flat");
    const discountValueArb = fc.integer({ min: 1, max: 100_00 }).map((n) => n / 100);
    const minOrderArb = fc.integer({ min: 0, max: 100_000_00 }).map((n) => n / 100);
    const storedDescArb = fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0);

    fc.assert(
      fc.property(discountTypeArb, discountValueArb, minOrderArb, storedDescArb, (discountType, discountValue, minOrderValue, description) => {
        const suggestion = buildCouponSuggestion({
          code: "SAVE", discountType, discountValue, minOrderValue, description,
        });
        // A well-formed coupon with a stored description is always kept.
        expect(suggestion).not.toBeNull();
        expect(suggestion!.description).toBe(description.trim());
        expect(suggestion!.minOrderValue).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: MIN_RUNS },
    );
  });
});

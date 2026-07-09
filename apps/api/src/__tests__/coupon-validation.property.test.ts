import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { createCouponSchema, updateCouponSchema } from "../schemas/coupons.schema";

// These tests exercise ONLY the pure zod validation from
// `schemas/coupons.schema.ts`. They import no database layer and therefore run
// with no DATABASE_URL configured.

const MIN_RUNS = 100;

describe("coupon validation: percentage value bound", () => {
  // Feature: codebase-remediation, Property 14: Percentage coupons with value over 100 are rejected
  // Validates: Requirements 16.3
  it("Property 14: a percentage coupon with discountValue > 100 is always rejected", () => {
    const overArb = fc.double({ min: 100.01, max: 1_000_000, noNaN: true });

    fc.assert(
      fc.property(overArb, (discountValue) => {
        const created = createCouponSchema.safeParse({
          body: { code: "SAVE", discountType: "percentage", discountValue },
        });
        expect(created.success).toBe(false);

        const updated = updateCouponSchema.safeParse({
          params: { id: "1" },
          body: { discountType: "percentage", discountValue },
        });
        expect(updated.success).toBe(false);
      }),
      { numRuns: MIN_RUNS },
    );
  });

  // Feature: codebase-remediation, Property 14: Percentage coupons with value over 100 are rejected
  // Validates: Requirements 16.3
  it("Property 14: a percentage coupon with 0 < discountValue <= 100 is accepted", () => {
    const okArb = fc.double({ min: 0.01, max: 100, noNaN: true });

    fc.assert(
      fc.property(okArb, (discountValue) => {
        const created = createCouponSchema.safeParse({
          body: { code: "SAVE", discountType: "percentage", discountValue },
        });
        expect(created.success).toBe(true);
      }),
      { numRuns: MIN_RUNS },
    );
  });

  // Feature: codebase-remediation, Property 14: Percentage coupons with value over 100 are rejected
  // Validates: Requirements 16.3
  it("Property 14: a flat coupon with value > 100 is accepted (bound applies only to percentage)", () => {
    const flatArb = fc.double({ min: 100.01, max: 1_000_000, noNaN: true });

    fc.assert(
      fc.property(flatArb, (discountValue) => {
        const created = createCouponSchema.safeParse({
          body: { code: "SAVE", discountType: "flat", discountValue },
        });
        expect(created.success).toBe(true);
      }),
      { numRuns: MIN_RUNS },
    );
  });
});

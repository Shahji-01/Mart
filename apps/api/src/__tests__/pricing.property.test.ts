import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  resolveVariantPricing,
  type ActiveSale,
  type PricedVariant,
} from "../lib/money";

// These tests exercise ONLY the pure pricing resolver from `lib/money.ts`.
// They import no database layer and therefore run with no DATABASE_URL.

const MIN_RUNS = 100;

// Mirror of the exact discount math shared with FlashSalesService.formatSale.
function expectedSalePrice(
  regularPrice: number,
  discountType: "percentage" | "fixed",
  discountValue: number,
): number {
  if (discountType === "percentage") {
    return Math.round(regularPrice * (1 - discountValue / 100));
  }
  return Math.max(0, regularPrice - discountValue);
}

describe("resolveVariantPricing", () => {
  // Feature: codebase-remediation, Property 2: Effective variant pricing resolves
  // to sale price when active, else regular
  // Validates: Requirements 2.1, 2.3, 2.5, 2.6
  it("Property 2: resolves to sale price when a sale is active, else the regular price", () => {
    const variantArb = fc.record({
      id: fc.integer({ min: 1, max: 100_000 }),
      productId: fc.integer({ min: 1, max: 500 }),
      price: fc.integer({ min: 0, max: 1_000_000 }).map((n) => n / 100),
    });

    const discountTypeArb = fc.constantFrom<"percentage" | "fixed">(
      "percentage",
      "fixed",
    );

    fc.assert(
      fc.property(
        variantArb,
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 100_000 }),
            productId: fc.integer({ min: 1, max: 500 }),
            discountType: discountTypeArb,
            discountValue: fc.oneof(
              fc.integer({ min: 0, max: 100 }), // percentage range
              fc.integer({ min: 0, max: 200_000 }).map((n) => n / 100), // fixed amount
            ),
          }),
          { maxLength: 8 },
        ),
        (variant: PricedVariant & { productId: number }, sales) => {
          const now = new Date();
          const activeSales: ActiveSale[] = sales.map((s) => ({ ...s, isActive: true }));

          const result = resolveVariantPricing(variant, activeSales, now);

          // regularPrice always reflects the variant's own price.
          expect(result.regularPrice).toBe(variant.price);

          // The resolver picks the FIRST sale matching the variant's product.
          const matched = activeSales.find((s) => s.productId === variant.productId);

          if (!matched) {
            // No active sale for this product -> regular pricing, null sale id.
            expect(result.flashSaleId).toBeNull();
            expect(result.effectivePrice).toBe(result.regularPrice);
            return;
          }

          const expected = expectedSalePrice(
            result.regularPrice,
            matched.discountType as "percentage" | "fixed",
            typeof matched.discountValue === "number"
              ? matched.discountValue
              : parseFloat(matched.discountValue),
          );

          // Effective price equals the exact sale math, and the sale id is reported.
          expect(result.effectivePrice).toBe(expected);
          expect(result.flashSaleId).toBe(matched.id ?? null);

          // R2.6: when the sale price equals the regular price, the result equals regular.
          if (expected === result.regularPrice) {
            expect(result.effectivePrice).toBe(result.regularPrice);
          }
        },
      ),
      { numRuns: MIN_RUNS },
    );
  });

  // Feature: codebase-remediation, Property 2: Effective variant pricing resolves
  // to sale price when active, else regular
  // Validates: Requirements 2.3, 2.5
  it("Property 2: expired or inactive sales are ignored (regular pricing applies)", () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 100_000 }),
          productId: fc.integer({ min: 1, max: 500 }),
          price: fc.integer({ min: 0, max: 1_000_000 }).map((n) => n / 100),
        }),
        fc.integer({ min: 1, max: 90 }),
        (variant, discountPct) => {
          const now = new Date("2024-06-15T12:00:00.000Z");
          // A sale window entirely in the past relative to `now`.
          const expiredSale: ActiveSale = {
            id: 7,
            productId: variant.productId,
            discountType: "percentage",
            discountValue: discountPct,
            startsAt: new Date("2024-01-01T00:00:00.000Z"),
            endsAt: new Date("2024-01-31T00:00:00.000Z"),
            isActive: true,
          };

          const result = resolveVariantPricing(variant, [expiredSale], now);

          // Sale is not active at `now` -> regular price, null sale id.
          expect(result.effectivePrice).toBe(result.regularPrice);
          expect(result.flashSaleId).toBeNull();
        },
      ),
      { numRuns: MIN_RUNS },
    );
  });
});

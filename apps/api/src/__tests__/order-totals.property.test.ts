import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { computeCartTotals, type CartLineInput } from "../lib/money";

// These tests exercise ONLY the pure order/cart total math from `lib/money.ts`.
// They import no database layer and therefore run with no DATABASE_URL. This is
// the same helper that `CartService.buildCart` uses to compute the charged
// total from the charged per-line prices, so "displayed price == charged
// price" is verified against the real computation.

const MIN_RUNS = 100;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

describe("computeCartTotals", () => {
  const lineArb = fc.record({
    // Charged per-unit price (e.g. flash-sale-resolved), 0..10000.00.
    price: fc.integer({ min: 0, max: 1_000_000 }).map((n) => n / 100),
    quantity: fc.integer({ min: 1, max: 50 }),
  });

  // Feature: codebase-remediation, Property 3: Displayed price equals charged
  // price and order total is consistent
  // Validates: Requirements 2.2, 2.4
  it("Property 3: order total is consistent with charged line prices, discount, and delivery", () => {
    fc.assert(
      fc.property(
        fc.array(lineArb, { minLength: 1, maxLength: 12 }),
        fc.integer({ min: 0, max: 2_000_000 }).map((n) => n / 100), // pre-clamp discount
        (lines: CartLineInput[], discount) => {
          const totals = computeCartTotals({ lines, discount });

          const rawSubtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);

          // Subtotal equals the sum of charged line prices (the charged price is
          // exactly what each line contributes — no separate "display" price).
          expect(totals.subtotal).toBeCloseTo(round2(rawSubtotal), 6);

          // Discount is clamped into [0, subtotal].
          expect(totals.discount).toBeGreaterThanOrEqual(0);
          expect(totals.discount).toBeLessThanOrEqual(totals.subtotal + 1e-9);

          // Delivery fee is free above the threshold, otherwise the standard fee.
          const expectedDelivery = rawSubtotal >= 499 ? 0 : 40;
          expect(totals.deliveryFee).toBe(expectedDelivery);

          // Total is exactly subtotal - discount + delivery (never negative), and
          // reconstructs from the recorded components.
          const expectedTotal = Math.max(
            0,
            round2(rawSubtotal - Math.min(Math.max(0, discount), rawSubtotal) + expectedDelivery),
          );
          expect(totals.total).toBeCloseTo(expectedTotal, 6);
          expect(totals.total).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: MIN_RUNS },
    );
  });

  // Feature: codebase-remediation, Property 3: Displayed price equals charged
  // price and order total is consistent
  // Validates: Requirements 2.2, 2.4
  it("Property 3: changing only the charged price moves the total by price * quantity", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000 }).map((n) => n / 100),
        fc.integer({ min: 0, max: 100_000 }).map((n) => n / 100),
        fc.integer({ min: 1, max: 50 }),
        (priceA, priceB, quantity) => {
          // Use a high base so delivery is free for both and does not confound.
          const base: CartLineInput = { price: 1000, quantity: 1 };
          const a = computeCartTotals({ lines: [base, { price: priceA, quantity }] });
          const b = computeCartTotals({ lines: [base, { price: priceB, quantity }] });

          expect(a.subtotal - b.subtotal).toBeCloseTo(round2((priceA - priceB) * quantity), 4);
        },
      ),
      { numRuns: MIN_RUNS },
    );
  });
});

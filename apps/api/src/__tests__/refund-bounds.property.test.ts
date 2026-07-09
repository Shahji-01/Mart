import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { validateRefundAmount } from "../lib/money";

// These tests exercise ONLY the pure refund-bounds validation from
// `lib/money.ts`. They import no database layer and therefore run with no
// DATABASE_URL configured. The same function gates `ReturnsService.updateReturn`.

const MIN_RUNS = 100;

describe("validateRefundAmount", () => {
  // Feature: codebase-remediation, Property 5: Refund amount is accepted only
  // within valid bounds
  // Validates: Requirements 5.3
  it("Property 5: a refund is accepted iff 0 <= refundAmount <= amountPaid", () => {
    const moneyArb = fc.integer({ min: -100_000_00, max: 100_000_00 }).map((n) => n / 100);
    const paidArb = fc.integer({ min: 0, max: 100_000_00 }).map((n) => n / 100);

    fc.assert(
      fc.property(moneyArb, paidArb, (refundAmount, amountPaid) => {
        const result = validateRefundAmount(refundAmount, amountPaid);
        const expectedValid = refundAmount >= 0 && refundAmount <= amountPaid;
        expect(result.valid).toBe(expectedValid);
        // A rejected refund always carries a reason.
        if (!result.valid) {
          expect(typeof result.reason).toBe("string");
          expect(result.reason!.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: MIN_RUNS },
    );
  });

  // Feature: codebase-remediation, Property 5: Refund amount is accepted only
  // within valid bounds
  // Validates: Requirements 5.3
  it("Property 5: negative refunds and refunds above amount paid are always rejected", () => {
    const paidArb = fc.integer({ min: 0, max: 100_000_00 }).map((n) => n / 100);

    fc.assert(
      fc.property(paidArb, fc.double({ min: 0.01, max: 10_000, noNaN: true }), (amountPaid, delta) => {
        // Any negative amount is rejected regardless of amount paid.
        expect(validateRefundAmount(-delta, amountPaid).valid).toBe(false);
        // Anything strictly above the amount paid is rejected.
        expect(validateRefundAmount(amountPaid + delta, amountPaid).valid).toBe(false);
        // Non-finite values are rejected.
        expect(validateRefundAmount(Number.NaN, amountPaid).valid).toBe(false);
        expect(validateRefundAmount(Number.POSITIVE_INFINITY, amountPaid).valid).toBe(false);
      }),
      { numRuns: MIN_RUNS },
    );
  });
});

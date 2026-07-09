import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { computeDebits, RUPEES_PER_POINT } from "../lib/money";

// These tests exercise ONLY the pure debit math from `lib/money.ts`.
// They import no database layer and therefore run with no DATABASE_URL.

const MIN_RUNS = 100;

describe("computeDebits", () => {
  // Feature: codebase-remediation, Property 1: Wallet and loyalty balances stay
  // non-negative through debits
  // Validates: Requirements 1.2, 1.3, 1.5
  it("Property 1: resulting balances stay >= 0 and debits never exceed starting balances", () => {
    const moneyArb = fc.integer({ min: 0, max: 100_000_00 }).map((n) => n / 100); // 0..100000.00
    const pointsArb = fc.integer({ min: 0, max: 1_000_000 });

    fc.assert(
      fc.property(
        moneyArb, // walletBalance
        pointsArb, // loyaltyPoints
        moneyArb, // cartTotal
        fc.boolean(), // useWallet
        fc.boolean(), // useLoyaltyPoints
        (walletBalance, loyaltyPoints, cartTotal, useWallet, useLoyaltyPoints) => {
          const result = computeDebits({
            walletBalance,
            loyaltyPoints,
            cartTotal,
            useWallet,
            useLoyaltyPoints,
          });

          // R1.5: balances are never driven below zero.
          expect(result.newWalletBalance).toBeGreaterThanOrEqual(0);
          expect(result.newLoyaltyPoints).toBeGreaterThanOrEqual(0);

          // R1.2 / R1.3: the amount debited never exceeds the (locked) starting balance.
          expect(result.walletUsed).toBeLessThanOrEqual(walletBalance + 1e-9);
          expect(result.loyaltyUsed).toBeLessThanOrEqual(loyaltyPoints);

          // Debits are non-negative.
          expect(result.walletUsed).toBeGreaterThanOrEqual(0);
          expect(result.loyaltyUsed).toBeGreaterThanOrEqual(0);

          // The remaining total to charge is never negative.
          expect(result.remainingTotal).toBeGreaterThanOrEqual(0);

          // New balances equal the starting balance minus what was used (clamped at 0).
          expect(result.newWalletBalance).toBeCloseTo(
            Math.max(0, walletBalance - result.walletUsed),
            6,
          );
          expect(result.newLoyaltyPoints).toBe(
            Math.max(0, loyaltyPoints - result.loyaltyUsed),
          );

          // When wallet is not requested (or balance is zero) nothing is debited.
          if (!useWallet || walletBalance <= 0) {
            expect(result.walletUsed).toBe(0);
          }
          if (!useLoyaltyPoints || loyaltyPoints <= 0) {
            expect(result.loyaltyUsed).toBe(0);
          }
        },
      ),
      { numRuns: MIN_RUNS },
    );
  });

  // Feature: codebase-remediation, Property 1: Wallet and loyalty balances stay
  // non-negative through debits
  // Validates: Requirements 1.2, 1.5
  it("Property 1: wallet spend clamps to min(balance, total)", () => {
    const moneyArb = fc.integer({ min: 0, max: 100_000_00 }).map((n) => n / 100);

    fc.assert(
      fc.property(moneyArb, moneyArb, (walletBalance, cartTotal) => {
        const result = computeDebits({
          walletBalance,
          loyaltyPoints: 0,
          cartTotal,
          useWallet: true,
          useLoyaltyPoints: false,
        });

        const expected = Math.round(Math.min(walletBalance, cartTotal) * 100) / 100;
        expect(result.walletUsed).toBeCloseTo(expected, 6);
        expect(result.loyaltyUsed).toBe(0);
      }),
      { numRuns: MIN_RUNS },
    );
  });

  // Feature: codebase-remediation, Property 1: Wallet and loyalty balances stay
  // non-negative through debits
  // Validates: Requirements 1.3, 1.5
  it("Property 1: loyalty redemption never spends more points than available", () => {
    const pointsArb = fc.integer({ min: 0, max: 1_000_000 });
    const moneyArb = fc.integer({ min: 0, max: 100_000_00 }).map((n) => n / 100);

    fc.assert(
      fc.property(pointsArb, moneyArb, (loyaltyPoints, cartTotal) => {
        const result = computeDebits({
          walletBalance: 0,
          loyaltyPoints,
          cartTotal,
          useWallet: false,
          useLoyaltyPoints: true,
          rupeesPerPoint: RUPEES_PER_POINT,
        });

        expect(result.loyaltyUsed).toBeLessThanOrEqual(loyaltyPoints);
        expect(result.newLoyaltyPoints).toBe(Math.max(0, loyaltyPoints - result.loyaltyUsed));
        expect(result.newLoyaltyPoints).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: MIN_RUNS },
    );
  });
});

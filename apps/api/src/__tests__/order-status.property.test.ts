import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  ALLOWED_ORDER_TRANSITIONS,
  isAllowedOrderTransition,
  shouldAwardLoyalty,
  type OrderStatus,
} from "../lib/order-status";

// These tests exercise ONLY the pure order-status state machine and the
// loyalty-award predicate from `lib/order-status.ts`. They import no database
// layer and therefore run with no DATABASE_URL configured. `OrdersService`
// consumes the same functions, so the gating logic is verified against the
// real implementation.

const MIN_RUNS = 100;

const ALL_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

const statusArb = fc.constantFrom(...ALL_STATUSES);

describe("order-status state machine", () => {
  // Feature: codebase-remediation, Property 6: Only allowed order-status
  // transitions succeed and others leave the order unchanged
  // Validates: Requirements 6.1, 6.2
  it("Property 6: isAllowedOrderTransition agrees exactly with the allowed-transition map", () => {
    fc.assert(
      fc.property(statusArb, statusArb, (from, to) => {
        const expected = ALLOWED_ORDER_TRANSITIONS[from].includes(to);
        expect(isAllowedOrderTransition(from, to)).toBe(expected);
      }),
      { numRuns: MIN_RUNS },
    );
  });

  // Feature: codebase-remediation, Property 6: Only allowed order-status
  // transitions succeed and others leave the order unchanged
  // Validates: Requirements 6.1, 6.2
  it("Property 6: terminal states (delivered, cancelled) permit no onward transition", () => {
    fc.assert(
      fc.property(statusArb, (to) => {
        expect(isAllowedOrderTransition("delivered", to)).toBe(false);
        expect(isAllowedOrderTransition("cancelled", to)).toBe(false);
      }),
      { numRuns: MIN_RUNS },
    );
  });

  // Feature: codebase-remediation, Property 7: Loyalty points are awarded
  // exactly once on reaching delivered
  // Validates: Requirements 6.4
  it("Property 7: loyalty is awarded only on the first delivered transition with no prior earn txn", () => {
    fc.assert(
      fc.property(statusArb, statusArb, fc.boolean(), (prev, next, hasPriorEarn) => {
        const award = shouldAwardLoyalty(prev, next, hasPriorEarn);
        // Award is possible only when reaching delivered from a non-delivered
        // state and no prior earn transaction exists.
        const expected = next === "delivered" && prev !== "delivered" && !hasPriorEarn;
        expect(award).toBe(expected);

        // Never award when not reaching delivered.
        if (next !== "delivered") expect(award).toBe(false);
        // Never award when a prior earn transaction already exists (idempotency).
        if (hasPriorEarn) expect(award).toBe(false);
        // Never re-award when already delivered.
        if (prev === "delivered") expect(award).toBe(false);
      }),
      { numRuns: MIN_RUNS },
    );
  });
});

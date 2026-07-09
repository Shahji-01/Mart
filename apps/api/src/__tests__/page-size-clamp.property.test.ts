import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { clampPageSize } from "../lib/pagination";

// These tests exercise ONLY the pure page-size clamp from `lib/pagination.ts`.
// They import no database layer and therefore run with no DATABASE_URL
// configured. The same helper bounds `OrdersService.getOrders`.

const MIN_RUNS = 100;
const MAX = 100;
const DEF = 20;

describe("clampPageSize", () => {
  // Feature: codebase-remediation, Property 16: Page size is clamped to the
  // defined maximum
  // Validates: Requirements 20.2
  it("Property 16: the effective page size never exceeds the defined maximum", () => {
    const requestedArb = fc.oneof(
      fc.integer({ min: -10_000, max: 1_000_000 }),
      fc.double({ min: -10_000, max: 1_000_000, noNaN: true }),
      fc.constant(undefined),
      fc.constant(null),
    );

    fc.assert(
      fc.property(requestedArb, (requested) => {
        const effective = clampPageSize(requested as number | undefined | null, { def: DEF, max: MAX });
        // The effective page size is always within [1, max].
        expect(effective).toBeLessThanOrEqual(MAX);
        expect(effective).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: MIN_RUNS },
    );
  });

  // Feature: codebase-remediation, Property 16: Page size is clamped to the
  // defined maximum
  // Validates: Requirements 20.2
  it("Property 16: requests within [1, max] are preserved (floored), omitted uses the default", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: MAX }), (n) => {
        expect(clampPageSize(n, { def: DEF, max: MAX })).toBe(n);
      }),
      { numRuns: MIN_RUNS },
    );

    // Omitted / non-finite requests fall back to the default.
    expect(clampPageSize(undefined, { def: DEF, max: MAX })).toBe(DEF);
    expect(clampPageSize(null, { def: DEF, max: MAX })).toBe(DEF);
    expect(clampPageSize(Number.NaN, { def: DEF, max: MAX })).toBe(DEF);

    // Requests above the maximum are clamped down to the maximum.
    expect(clampPageSize(MAX + 1, { def: DEF, max: MAX })).toBe(MAX);
    expect(clampPageSize(10_000, { def: DEF, max: MAX })).toBe(MAX);
  });
});

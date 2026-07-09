import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { addToCartSchema } from "../schemas/cart.schema";
import { createProductSchema } from "../schemas/products.schema";
import { createReviewSchema } from "../schemas/reviews.schema";

// These tests exercise ONLY the pure zod validation in the request schemas.
// They import no database layer and therefore run with no DATABASE_URL set.

const MIN_RUNS = 100;

describe("numeric input bounds", () => {
  // Feature: codebase-remediation, Property 15: Out-of-bounds numeric inputs are rejected
  // Validates: Requirements 18.1
  it("Property 15: cart quantity that is negative, zero, or fractional is rejected", () => {
    const badQtyArb = fc.oneof(
      fc.integer({ min: -1_000_000, max: 0 }), // negative or zero
      fc.double({ min: 0.01, max: 1_000_000, noNaN: true }).filter((n) => !Number.isInteger(n)), // fractional
    );

    fc.assert(
      fc.property(badQtyArb, (quantity) => {
        const result = addToCartSchema.safeParse({
          body: { productId: 1, variantId: 1, quantity },
        });
        expect(result.success).toBe(false);
      }),
      { numRuns: MIN_RUNS },
    );
  });

  // Feature: codebase-remediation, Property 15: Out-of-bounds numeric inputs are rejected
  // Validates: Requirements 18.1
  it("Property 15: a positive integer cart quantity is accepted", () => {
    const okQtyArb = fc.integer({ min: 1, max: 1_000_000 });

    fc.assert(
      fc.property(okQtyArb, (quantity) => {
        const result = addToCartSchema.safeParse({
          body: { productId: 1, variantId: 1, quantity },
        });
        expect(result.success).toBe(true);
      }),
      { numRuns: MIN_RUNS },
    );
  });

  // Feature: codebase-remediation, Property 15: Out-of-bounds numeric inputs are rejected
  // Validates: Requirements 18.2
  it("Property 15: a negative variant price is rejected", () => {
    const negPriceArb = fc.double({ min: -1_000_000, max: -0.01, noNaN: true });

    fc.assert(
      fc.property(negPriceArb, (price) => {
        const result = createProductSchema.safeParse({
          body: {
            name: "Test",
            categoryId: 1,
            variants: [{ unit: "kg", unitValue: "1", price, stock: 1 }],
          },
        });
        expect(result.success).toBe(false);
      }),
      { numRuns: MIN_RUNS },
    );
  });

  // Feature: codebase-remediation, Property 15: Out-of-bounds numeric inputs are rejected
  // Validates: Requirements 18.2
  it("Property 15: a negative or fractional variant stock is rejected", () => {
    const badStockArb = fc.oneof(
      fc.integer({ min: -1_000_000, max: -1 }), // negative
      fc.double({ min: 0.01, max: 1_000_000, noNaN: true }).filter((n) => !Number.isInteger(n)), // fractional
    );

    fc.assert(
      fc.property(badStockArb, (stock) => {
        const result = createProductSchema.safeParse({
          body: {
            name: "Test",
            categoryId: 1,
            variants: [{ unit: "kg", unitValue: "1", price: 10, stock }],
          },
        });
        expect(result.success).toBe(false);
      }),
      { numRuns: MIN_RUNS },
    );
  });

  // Feature: codebase-remediation, Property 15: Out-of-bounds numeric inputs are rejected
  // Validates: Requirements 18.2
  it("Property 15: a non-negative price and non-negative integer stock are accepted", () => {
    const priceArb = fc.double({ min: 0, max: 1_000_000, noNaN: true });
    const stockArb = fc.integer({ min: 0, max: 1_000_000 });

    fc.assert(
      fc.property(priceArb, stockArb, (price, stock) => {
        const result = createProductSchema.safeParse({
          body: {
            name: "Test",
            categoryId: 1,
            variants: [{ unit: "kg", unitValue: "1", price, stock }],
          },
        });
        expect(result.success).toBe(true);
      }),
      { numRuns: MIN_RUNS },
    );
  });

  // Feature: codebase-remediation, Property 15: Out-of-bounds numeric inputs are rejected
  // Validates: Requirements 18.3
  it("Property 15: a rating outside 1..5 or fractional is rejected", () => {
    const badRatingArb = fc.oneof(
      fc.integer({ min: -1_000, max: 0 }), // below 1
      fc.integer({ min: 6, max: 1_000 }), // above 5
      fc.double({ min: 1.01, max: 4.99, noNaN: true }).filter((n) => !Number.isInteger(n)), // fractional in-range
    );

    fc.assert(
      fc.property(badRatingArb, (rating) => {
        const result = createReviewSchema.safeParse({
          params: { id: "1" },
          body: { rating },
        });
        expect(result.success).toBe(false);
      }),
      { numRuns: MIN_RUNS },
    );
  });

  // Feature: codebase-remediation, Property 15: Out-of-bounds numeric inputs are rejected
  // Validates: Requirements 18.3
  it("Property 15: a rating of 1..5 is accepted", () => {
    const okRatingArb = fc.integer({ min: 1, max: 5 });

    fc.assert(
      fc.property(okRatingArb, (rating) => {
        const result = createReviewSchema.safeParse({
          params: { id: "1" },
          body: { rating },
        });
        expect(result.success).toBe(true);
      }),
      { numRuns: MIN_RUNS },
    );
  });
});

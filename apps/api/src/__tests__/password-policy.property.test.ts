import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { passwordSchema } from "../schemas/auth.schema";

// These tests exercise ONLY the pure zod password policy. They import no
// database layer and therefore run with no DATABASE_URL set.

const MIN_RUNS = 100;

// A password is compliant iff: length >= 8 AND contains a lowercase letter AND
// an uppercase letter AND a digit (symbol optional). Mirror the schema policy
// here so the generator can label inputs.
function isCompliant(pw: string): boolean {
  return (
    pw.length >= 8 &&
    /[a-z]/.test(pw) &&
    /[A-Z]/.test(pw) &&
    /[0-9]/.test(pw)
  );
}

describe("password policy", () => {
  // Feature: codebase-remediation, Property 18: Passwords below minimum length or complexity are rejected
  // Validates: Requirements 25.1, 25.2
  it("Property 18: passwords below minimum length or missing a required class are rejected", () => {
    // Generators that deliberately violate at least one rule.
    const tooShortArb = fc
      .string({ minLength: 0, maxLength: 7 })
      .filter((s) => s.length < 8);
    const charsFrom = (chars: string[]) =>
      fc.array(fc.constantFrom(...chars), { minLength: 8, maxLength: 20 }).map((a) => a.join(""));
    const noLowerArb = charsFrom(["A", "B", "C", "Z", "0", "1", "9", "!"]).filter((s) => !/[a-z]/.test(s));
    const noUpperArb = charsFrom(["a", "b", "c", "z", "0", "1", "9", "!"]).filter((s) => !/[A-Z]/.test(s));
    const noDigitArb = charsFrom(["a", "B", "c", "Z", "x", "Y", "!", "@"]).filter((s) => !/[0-9]/.test(s));

    const nonCompliantArb = fc
      .oneof(tooShortArb, noLowerArb, noUpperArb, noDigitArb)
      .filter((s) => !isCompliant(s));

    fc.assert(
      fc.property(nonCompliantArb, (password) => {
        const result = passwordSchema.safeParse(password);
        expect(result.success).toBe(false);
      }),
      { numRuns: MIN_RUNS },
    );
  });

  // Feature: codebase-remediation, Property 18: Passwords below minimum length or complexity are rejected
  // Validates: Requirements 25.1, 25.2
  it("Property 18: passwords meeting length and all complexity rules are accepted", () => {
    // Build a guaranteed-compliant password: at least one of each required
    // class plus arbitrary extra characters, length always >= 8.
    const compliantArb = fc
      .record({
        lower: fc.constantFrom("a", "b", "c", "d", "e", "z"),
        upper: fc.constantFrom("A", "B", "C", "D", "E", "Z"),
        digit: fc.constantFrom("0", "1", "2", "7", "9"),
        rest: fc.string({ minLength: 5, maxLength: 20 }),
      })
      .map(({ lower, upper, digit, rest }) => `${lower}${upper}${digit}${rest}`)
      .filter((s) => isCompliant(s));

    fc.assert(
      fc.property(compliantArb, (password) => {
        const result = passwordSchema.safeParse(password);
        expect(result.success).toBe(true);
      }),
      { numRuns: MIN_RUNS },
    );
  });
});

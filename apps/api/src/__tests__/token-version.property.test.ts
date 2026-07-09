import { describe, it, expect } from "vitest";
import fc from "fast-check";

// This test exercises ONLY the pure `tokenVersionMatches` predicate, which is
// shared by the socket auth handler and `requireAuth`. It imports no database
// layer and requires no environment configuration, so it runs DB-free.
import { tokenVersionMatches } from "../lib/token-version";

const MIN_RUNS = 100;

describe("Property 12: a token is accepted only when its token version matches the stored version", () => {
  // Feature: codebase-remediation, Property 12: A token is accepted only when
  // its token version matches the stored version
  // Validates: Requirements 13.4, 23.2
  it("Property 12: accepts iff the claimed version equals the stored version", () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (claimed, stored) => {
        // The predicate accepts exactly when the two concrete versions are equal.
        expect(tokenVersionMatches(claimed, stored)).toBe(claimed === stored);
      }),
      { numRuns: MIN_RUNS },
    );
  });

  // Feature: codebase-remediation, Property 12: A token is accepted only when
  // its token version matches the stored version
  // Validates: Requirements 13.4, 23.2
  it("Property 12: a matching version is always accepted", () => {
    fc.assert(
      fc.property(fc.integer(), (version) => {
        expect(tokenVersionMatches(version, version)).toBe(true);
      }),
      { numRuns: MIN_RUNS },
    );
  });

  // Feature: codebase-remediation, Property 12: A token is accepted only when
  // its token version matches the stored version
  // Validates: Requirements 13.4, 23.2
  it("Property 12: any mismatch (e.g. a bumped stored version after logout) is rejected", () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer({ min: 1 }),
        (claimed, delta) => {
          // A non-zero delta guarantees the stored version differs from the
          // claim, modeling a token issued before logout/credential change.
          expect(tokenVersionMatches(claimed, claimed + delta)).toBe(false);
        },
      ),
      { numRuns: MIN_RUNS },
    );
  });

  // Feature: codebase-remediation, Property 12: A token is accepted only when
  // its token version matches the stored version
  // Validates: Requirements 13.4, 23.2
  it("Property 12: absent (undefined/null) versions default to 1 on both sides", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<number | undefined | null>(undefined, null, 1),
        fc.constantFrom<number | undefined | null>(undefined, null, 1),
        (claimed, stored) => {
          // undefined/null/1 are all treated as version 1, so they all match.
          expect(tokenVersionMatches(claimed, stored)).toBe(true);
        },
      ),
      { numRuns: MIN_RUNS },
    );
  });
});

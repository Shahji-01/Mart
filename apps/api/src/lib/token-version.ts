/**
 * Pure predicate deciding whether a presented token's `tokenVersion` claim
 * matches the version currently stored for the user (R13.4, R23.2).
 *
 * Kept pure and dependency-free so it can be property-tested without a database
 * or environment validation. Both the socket auth handler and `requireAuth`
 * use it so revocation (logout / credential change) is enforced consistently.
 *
 * Tokens issued before tokenVersion existed default to version 1 (mirroring how
 * tokens are signed), so an absent claim is treated as version 1.
 */
export function tokenVersionMatches(
  tokenVersion: number | undefined | null,
  storedVersion: number | undefined | null,
): boolean {
  const claimed = tokenVersion ?? 1;
  const stored = storedVersion ?? 1;
  return claimed === stored;
}

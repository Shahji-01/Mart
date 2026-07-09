import crypto from "crypto";

/**
 * Constant-time string comparison used for reset-token verification (R24.2).
 * Pure and dependency-free so it can be unit/property tested in isolation
 * without loading environment validation or a database layer. Returns false on
 * any length mismatch (timingSafeEqual requires equal-length buffers).
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

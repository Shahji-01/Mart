// Pure, database-free pagination helpers (R20).
//
// This module has NO database imports so it can be property-tested without a
// configured DATABASE_URL. Services call `clampPageSize` to bound the page size
// of paginated list queries.

export interface ClampPageSizeOptions {
  /** Default page size applied when no size is requested. */
  def: number;
  /** Maximum page size the query will ever use. */
  max: number;
}

/**
 * Clamp a requested page size to a defined maximum, applying a default when the
 * size is omitted (R20.2, R20.3).
 *
 * - Omitted / non-finite request -> `min(def, max)`.
 * - Requested below 1 -> 1 (a list always returns at least one row's worth).
 * - Otherwise -> `min(floor(requested), max)`.
 *
 * The result is always in `[1, max]`, so the effective page size can never
 * exceed the defined maximum.
 */
export function clampPageSize(
  requested: number | undefined | null,
  { def, max }: ClampPageSizeOptions,
): number {
  if (requested === undefined || requested === null || !Number.isFinite(requested)) {
    return Math.min(def, max);
  }
  const floored = Math.floor(requested);
  if (floored < 1) return 1;
  return Math.min(floored, max);
}

// Shared page-size policy for list endpoints (R20.2).
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

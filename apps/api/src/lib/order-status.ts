// Pure, database-free order-status state machine (R6).
//
// This module has NO database imports so it can be imported and
// property-tested without a configured DATABASE_URL. `OrdersService`
// consumes the same transition map to gate `updateOrderStatus`.

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

/**
 * The defined set of allowed order-status transitions (R6.1).
 *
 *   pending          -> confirmed | cancelled
 *   confirmed        -> processing | cancelled
 *   processing       -> out_for_delivery | cancelled
 *   out_for_delivery -> delivered
 *   delivered        -> (terminal, aside from the separate return flow)
 *   cancelled        -> (terminal)
 */
export const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
};

/**
 * Returns true when moving `from -> to` is a member of the allowed-transition
 * set. A same-status move (`from === to`) is NOT an allowed *transition*; it is
 * handled separately by callers as an idempotent no-op that applies no side
 * effects (so re-saving a delivered order never re-awards loyalty).
 */
export function isAllowedOrderTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Pure predicate deciding whether reaching `delivered` should award loyalty
 * points (R6.4). Points are awarded exactly once: only on the FIRST transition
 * into `delivered` (previous status was not already delivered) and only when no
 * prior `earn` loyalty transaction exists for the order. Cancelled/returned
 * never reach this branch, so loyalty is never awarded for them (R6.5).
 */
export function shouldAwardLoyalty(
  prevStatus: OrderStatus,
  newStatus: OrderStatus,
  hasPriorEarnTxn: boolean,
): boolean {
  return newStatus === "delivered" && prevStatus !== "delivered" && !hasPriorEarnTxn;
}

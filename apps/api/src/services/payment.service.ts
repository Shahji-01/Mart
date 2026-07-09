// Payment provider seam (R4).
//
// No real payment gateway (Stripe/Razorpay/etc.) is integrated in this
// codebase, so we cannot truthfully confirm that an online charge succeeded.
// This module introduces a `PaymentProvider` interface plus a
// `NoopPaymentProvider` that never authorizes. Online orders therefore stay
// honestly `pending` until a real provider is wired in, instead of being
// incorrectly marked `paid`.
//
// This file is intentionally pure (no database imports) so the payment-status
// decision can be unit-tested without a configured DATABASE_URL.

export interface PaymentAuthorizationResult {
  authorized: boolean;
  reference?: string;
}

export interface PaymentContext {
  userId: number;
  orderId?: number;
}

export interface PaymentProvider {
  authorize(
    amount: number,
    ctx: PaymentContext,
  ): Promise<PaymentAuthorizationResult>;
}

/**
 * Default provider: never authorizes a charge. Wiring in a real gateway means
 * replacing this instance (or swapping it behind configuration).
 */
export class NoopPaymentProvider implements PaymentProvider {
  async authorize(
    _amount: number,
    _ctx: PaymentContext,
  ): Promise<PaymentAuthorizationResult> {
    return { authorized: false };
  }
}

/**
 * Simulated gateway used for demos / local + the in-app simulated card modal.
 * It authorizes every charge and returns a synthetic reference. This keeps the
 * frontend's simulated "successful payment" consistent with the recorded order
 * (online orders become `paid`). Swap to a real provider (Razorpay/Stripe) for
 * production by setting PAYMENT_PROVIDER and implementing the interface.
 */
export class SimulatedPaymentProvider implements PaymentProvider {
  async authorize(
    amount: number,
    ctx: PaymentContext,
  ): Promise<PaymentAuthorizationResult> {
    if (!Number.isFinite(amount) || amount < 0) return { authorized: false };
    const ref = `sim_${ctx.userId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    return { authorized: true, reference: ref };
  }
}

/**
 * Select the active provider from PAYMENT_PROVIDER (read directly from
 * process.env to keep this module free of the env/DB layer so it stays
 * unit-testable). Defaults to the simulated gateway, matching the app's
 * in-checkout simulated payment. Set PAYMENT_PROVIDER=none to refuse online
 * authorization (orders stay pending).
 */
export function createPaymentProvider(
  kind: string = process.env.PAYMENT_PROVIDER ?? "simulated",
): PaymentProvider {
  switch (kind.toLowerCase()) {
    case "none":
      return new NoopPaymentProvider();
    case "simulated":
    default:
      return new SimulatedPaymentProvider();
  }
}

export const paymentProvider: PaymentProvider = createPaymentProvider();

// ---------------------------------------------------------------------------
// Pure payment-status decision (R4.1–R4.5)
// ---------------------------------------------------------------------------

export type OrderPaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface ResolvePaymentStatusInput {
  paymentMethod: string;
  /** True when the wallet debit UPDATE ran successfully inside the committed transaction. */
  walletDebitApplied: boolean;
  /** True when the payment provider authorized the online charge. */
  onlineAuthorized: boolean;
}

/**
 * Decide an order's payment status from the payment method and the outcome of
 * the wallet debit / online authorization. Never returns `paid` for an order
 * whose funds were not actually captured:
 *   - wallet: `paid` only when the wallet debit was applied, else `pending`.
 *   - online: `paid` only when the provider authorized, else `pending`.
 *   - cod (and any other method): always `pending` at creation.
 */
export function resolvePaymentStatus(
  input: ResolvePaymentStatusInput,
): OrderPaymentStatus {
  if (input.paymentMethod === "wallet") {
    return input.walletDebitApplied ? "paid" : "pending";
  }
  if (input.paymentMethod === "online") {
    return input.onlineAuthorized ? "paid" : "pending";
  }
  return "pending";
}

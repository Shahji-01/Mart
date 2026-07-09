import { describe, it, expect } from "vitest";
import {
  resolvePaymentStatus,
  NoopPaymentProvider,
  type PaymentProvider,
  type PaymentContext,
} from "../services/payment.service";

// These tests exercise ONLY the pure payment-status decision and the payment
// provider seam (R4). They import no database layer and therefore run with no
// DATABASE_URL configured. The status decision is the same pure function that
// `OrdersService.createOrder` consumes, so wallet/online/cod behavior is
// verified against the real logic.

// A stub provider that authorizes online charges, used to verify the
// "online -> paid when authorized" branch without any real gateway.
class AuthorizingPaymentProvider implements PaymentProvider {
  async authorize(_amount: number, _ctx: PaymentContext) {
    return { authorized: true, reference: "stub-ref-1" };
  }
}

describe("resolvePaymentStatus (R4)", () => {
  // R4.1 / R4.2: wallet orders are paid ONLY when the wallet debit was applied.
  it("wallet: paid only after a successful wallet debit", () => {
    expect(
      resolvePaymentStatus({
        paymentMethod: "wallet",
        walletDebitApplied: true,
        onlineAuthorized: false,
      }),
    ).toBe("paid");
  });

  it("wallet: pending when no wallet debit was applied", () => {
    expect(
      resolvePaymentStatus({
        paymentMethod: "wallet",
        walletDebitApplied: false,
        onlineAuthorized: false,
      }),
    ).toBe("pending");
  });

  // R4.3 / R4.4: online orders stay pending unless an authorization succeeds.
  it("online: pending when the provider does not authorize (Noop default)", () => {
    expect(
      resolvePaymentStatus({
        paymentMethod: "online",
        walletDebitApplied: false,
        onlineAuthorized: false,
      }),
    ).toBe("pending");
  });

  it("online: paid when the provider authorizes", () => {
    expect(
      resolvePaymentStatus({
        paymentMethod: "online",
        walletDebitApplied: false,
        onlineAuthorized: true,
      }),
    ).toBe("paid");
  });

  // R4.5: cod orders are pending at creation.
  it("cod: always pending at creation", () => {
    expect(
      resolvePaymentStatus({
        paymentMethod: "cod",
        walletDebitApplied: false,
        onlineAuthorized: false,
      }),
    ).toBe("pending");
  });
});

describe("PaymentProvider seam (R4.3, R4.4)", () => {
  it("NoopPaymentProvider never authorizes, so online stays pending", async () => {
    const provider = new NoopPaymentProvider();
    const auth = await provider.authorize(500, { userId: 1 });
    expect(auth.authorized).toBe(false);

    const status = resolvePaymentStatus({
      paymentMethod: "online",
      walletDebitApplied: false,
      onlineAuthorized: auth.authorized,
    });
    expect(status).toBe("pending");
  });

  it("a stubbed authorizing provider flips online to paid", async () => {
    const provider = new AuthorizingPaymentProvider();
    const auth = await provider.authorize(500, { userId: 1, orderId: 42 });
    expect(auth.authorized).toBe(true);

    const status = resolvePaymentStatus({
      paymentMethod: "online",
      walletDebitApplied: false,
      onlineAuthorized: auth.authorized,
    });
    expect(status).toBe("paid");
  });
});

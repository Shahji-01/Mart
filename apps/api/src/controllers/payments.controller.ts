import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/database";
import { eq } from "drizzle-orm";
import { cartService } from "../services/cart.service";
import { ordersService } from "../services/orders.service";
import { computeDebits, RUPEES_PER_POINT } from "../lib/money";
import { isRazorpayConfigured, getRazorpayKeyId, createRazorpayOrder, verifyWebhookSignature, isWebhookConfigured } from "../services/razorpay.service";
import { logger } from "../lib/logger";

export class PaymentsController {
  /** Tell the client which online-payment provider is active. */
  async config(_req: Request, res: Response, next: NextFunction) {
    try {
      const provider = isRazorpayConfigured()
        ? "razorpay"
        : (process.env.PAYMENT_PROVIDER ?? "simulated").toLowerCase();
      res.json({ provider, razorpayKeyId: isRazorpayConfigured() ? getRazorpayKeyId() : null });
    } catch (err) { next(err); }
  }

  /**
   * Create a Razorpay order for the current cart's net payable (after the
   * wallet/loyalty the user chose to apply). The amount is computed server-side
   * so the client cannot tamper with it.
   */
  async createRazorpayOrder(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      if (!isRazorpayConfigured()) { res.status(400).json({ error: "Razorpay is not configured" }); return; }

      const { useWallet, useLoyaltyPoints } = (req.body ?? {}) as { useWallet?: boolean; useLoyaltyPoints?: boolean };

      const cart = await cartService.getCart(req.user.userId);
      if (!cart.items || cart.items.length === 0) { res.status(400).json({ error: "Cart is empty" }); return; }

      const [user] = await db.select({ walletBalance: usersTable.walletBalance, loyaltyPoints: usersTable.loyaltyPoints })
        .from(usersTable).where(eq(usersTable.id, req.user.userId));

      const debits = computeDebits({
        walletBalance: parseFloat(user?.walletBalance ?? "0"),
        loyaltyPoints: user?.loyaltyPoints ?? 0,
        cartTotal: cart.total,
        useWallet: !!useWallet,
        useLoyaltyPoints: !!useLoyaltyPoints,
        rupeesPerPoint: RUPEES_PER_POINT,
      });

      const payable = debits.remainingTotal;
      if (payable < 1) { res.status(400).json({ error: "Online payment not required for this amount" }); return; }

      const rzp = await createRazorpayOrder(payable * 100, `rcpt_${req.user.userId}_${Date.now()}`);
      res.json({
        keyId: getRazorpayKeyId(),
        orderId: rzp.id,
        amount: rzp.amount,
        currency: rzp.currency,
      });
    } catch (err) { next(err); }
  }

  /**
   * Razorpay webhook receiver. Verifies the signature over the raw body, then
   * reconciles the matching order's payment status. Handles the case where the
   * customer's browser closed before the success callback fired. Always returns
   * 200 quickly for accepted events so Razorpay doesn't retry needlessly.
   */
  async razorpayWebhook(req: Request, res: Response) {
    try {
      if (!isWebhookConfigured()) { res.status(503).json({ error: "Webhook not configured" }); return; }
      const signature = req.header("x-razorpay-signature") ?? "";
      const raw = (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
      if (!verifyWebhookSignature(raw, signature)) {
        res.status(400).json({ error: "Invalid signature" });
        return;
      }
      const event: string = req.body?.event ?? "";
      const payment = req.body?.payload?.payment?.entity as { id?: string; order_id?: string } | undefined;
      if (payment?.order_id) {
        if (event === "payment.captured" || event === "order.paid") {
          await ordersService.confirmRazorpayPayment(payment.order_id, payment.id, true);
        } else if (event === "payment.failed") {
          await ordersService.confirmRazorpayPayment(payment.order_id, payment.id, false);
        }
      }
      res.json({ received: true });
    } catch (err) {
      logger.error({ err }, "Razorpay webhook handling failed");
      res.status(500).json({ error: "Webhook error" });
    }
  }
}

export const paymentsController = new PaymentsController();

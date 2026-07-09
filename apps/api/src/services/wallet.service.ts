import { db, walletTransactionsTable, usersTable } from "@workspace/database";
import { eq, desc, sql } from "drizzle-orm";
import { createRazorpayOrder, verifyRazorpayPayment, isRazorpayConfigured } from "./razorpay.service";

export class WalletService {
  async getWalletDetails(userId: number) {
    const [user] = await db.select({ walletBalance: usersTable.walletBalance }).from(usersTable).where(eq(usersTable.id, userId));
    const transactions = await db.select().from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.userId, userId))
      .orderBy(desc(walletTransactionsTable.createdAt))
      .limit(50);
      
    return {
      balance: parseFloat(user?.walletBalance ?? "0"),
      transactions: transactions.map(t => ({ ...t, amount: parseFloat(t.amount), createdAt: t.createdAt.toISOString() })),
    };
  }

  async getWalletBalance(userId: number) {
    const [user] = await db.select({ walletBalance: usersTable.walletBalance }).from(usersTable).where(eq(usersTable.id, userId));
    return { balance: parseFloat(user?.walletBalance ?? "0") };
  }

  /** Create a Razorpay order to top up the wallet by `amount` rupees. */
  async createTopupOrder(userId: number, amount: number) {
    if (!isRazorpayConfigured()) throw new Error("Razorpay not configured");
    if (!Number.isFinite(amount) || amount < 1) throw new Error("Amount must be at least ₹1");
    const rzp = await createRazorpayOrder(Math.round(amount * 100), `wallet_${userId}_${Date.now()}`);
    return { orderId: rzp.id, amount: rzp.amount, currency: rzp.currency };
  }

  /** Verify a Razorpay top-up payment and credit the wallet atomically. */
  async confirmTopup(userId: number, params: { amount: number; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) {
    const { amount, razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;
    const ok = await verifyRazorpayPayment({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
      expectedAmountPaise: Math.round(amount * 100),
    });
    if (!ok) throw new Error("Payment verification failed");

    await db.transaction(async (tx) => {
      await tx.update(usersTable)
        .set({ walletBalance: sql`${usersTable.walletBalance} + ${amount}` })
        .where(eq(usersTable.id, userId));
      await tx.insert(walletTransactionsTable).values({
        userId,
        type: "credit",
        amount: amount.toString(),
        description: `Wallet top-up (Razorpay ${razorpayPaymentId})`,
      });
    });
    return this.getWalletBalance(userId);
  }
}

export const walletService = new WalletService();

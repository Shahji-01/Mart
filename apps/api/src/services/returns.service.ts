import { db, returnRequestsTable, ordersTable, usersTable, notificationsTable, walletTransactionsTable } from "@workspace/database";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { validateRefundAmount } from "../lib/money";
import { refundRazorpayPayment } from "./razorpay.service";
import { logger } from "../lib/logger";

// Marker error for refund-amount bounds violations (R5.3) so the controller can
// surface them as a 400 validation error rather than a 500.
export class RefundValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RefundValidationError";
  }
}

async function formatReturn(r: typeof returnRequestsTable.$inferSelect, userName?: string) {
  return {
    id: r.id,
    orderId: r.orderId,
    userId: r.userId,
    userName: userName ?? null,
    reason: r.reason,
    status: r.status,
    adminNote: r.adminNote,
    refundAmount: r.refundAmount ? parseFloat(r.refundAmount) : null,
    refundCredited: r.refundCredited,
    createdAt: r.createdAt.toISOString(),
  };
}

export class ReturnsService {
  async getReturns(userId: number, isAdmin: boolean) {
    const returns = isAdmin
      ? await db.select().from(returnRequestsTable).orderBy(desc(returnRequestsTable.createdAt))
      : await db.select().from(returnRequestsTable).where(eq(returnRequestsTable.userId, userId)).orderBy(desc(returnRequestsTable.createdAt));

    // Bounded lookups (R20.1): fetch only the users and orders referenced by the
    // returned rows instead of scanning the whole users and orders tables.
    const userIds = [...new Set(returns.map(r => r.userId))];
    const orderIds = [...new Set(returns.map(r => r.orderId))];

    const users = userIds.length > 0
      ? await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(inArray(usersTable.id, userIds))
      : [];
    const userMap = new Map(users.map(u => [u.id, u.name]));

    const orders = orderIds.length > 0
      ? await db.select({ id: ordersTable.id, total: ordersTable.total }).from(ordersTable).where(inArray(ordersTable.id, orderIds))
      : [];
    const orderMap = new Map(orders.map(o => [o.id, o.total]));

    return returns.map(r => ({
      id: r.id,
      orderId: r.orderId,
      userId: r.userId,
      userName: userMap.get(r.userId) ?? null,
      reason: r.reason,
      status: r.status,
      adminNote: r.adminNote,
      refundAmount: r.refundAmount ? parseFloat(r.refundAmount) : null,
      refundCredited: r.refundCredited,
      orderTotal: orderMap.has(r.orderId) ? parseFloat(orderMap.get(r.orderId)!) : null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async createReturn(userId: number, orderId: number, reason: string) {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    if (!order) throw new Error("Order not found");
    if (order.userId !== userId) throw new Error("Forbidden");
    if (order.status !== "delivered") throw new Error("Can only return delivered orders");

    const existingReturns = await db.select().from(returnRequestsTable).where(eq(returnRequestsTable.orderId, orderId));
    if (existingReturns.length > 0) throw new Error("Return request already exists for this order");

    const [returnReq] = await db.insert(returnRequestsTable).values({ orderId, userId, reason }).returning();

    await db.insert(notificationsTable).values({
      userId,
      title: "Return Request Submitted",
      message: `Your return request for Order #${orderId} has been received and is under review.`,
      type: "info",
    });

    const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId));
    return await formatReturn(returnReq, user?.name);
  }

  async updateReturn(id: number, data: any) {
    const { status, adminNote, refundAmount, creditWallet = true } = data;
    const [existing] = await db.select().from(returnRequestsTable).where(eq(returnRequestsTable.id, id));
    if (!existing) return null;

    const crediting = status === "approved" && !existing.refundCredited;

    // Derive the amount paid (refund upper bound) from the order total (R5.3).
    let amountPaid = 0;
    let orderDetails: any = null;
    if (crediting) {
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, existing.orderId));
      if (order) {
        amountPaid = parseFloat(order.total);
        orderDetails = order;
      }
    }

    // Resolve the refund amount: use the supplied value, otherwise default to
    // the amount paid (order total) — but never exceed it (R5.3).
    let actualRefundAmount: number | null = null;
    if (refundAmount !== undefined && refundAmount !== null && refundAmount !== "") {
      actualRefundAmount = typeof refundAmount === "number" ? refundAmount : parseFloat(refundAmount as string);
    } else if (crediting) {
      actualRefundAmount = amountPaid;
    }

    // Bounds-check the refund against the amount paid (R5.3). Reject (< 0) or
    // (> amountPaid) with a validation error before mutating any state.
    if (crediting && actualRefundAmount !== null) {
      const check = validateRefundAmount(actualRefundAmount, amountPaid);
      if (!check.valid) throw new RefundValidationError(check.reason ?? "Invalid refund amount");
    }

    // Apply the wallet credit, the wallet_transactions insert (type "refund"),
    // and the return status/refundCredited update inside ONE transaction so
    // they commit or roll back together (R5.1, R5.2).
    const returnReq = await db.transaction(async (tx) => {
      const updates: Partial<typeof returnRequestsTable.$inferInsert> = { status };
      if (adminNote !== undefined) updates.adminNote = adminNote;

      if (crediting && actualRefundAmount !== null) {
        updates.refundAmount = actualRefundAmount.toString();
        if (creditWallet && actualRefundAmount > 0) {
          updates.refundCredited = true;
          await tx.update(usersTable)
            .set({ walletBalance: sql`wallet_balance + ${actualRefundAmount}` })
            .where(eq(usersTable.id, existing.userId));
          await tx.insert(walletTransactionsTable).values({
            userId: existing.userId,
            orderId: existing.orderId,
            type: "refund",
            amount: actualRefundAmount.toString(),
            description: `Refund for return request #${id} (Order #${existing.orderId})`,
          });
        } else if (!creditWallet && actualRefundAmount > 0 && orderDetails?.paymentMethod === "online") {
          // If refunding to original payment method, we consider it credited here
          // and initiate the external refund post-commit.
          updates.refundCredited = true;
        }
      }

      const [updated] = await tx.update(returnRequestsTable).set(updates).where(eq(returnRequestsTable.id, id)).returning();
      return updated;
    });

    if (crediting && !creditWallet && actualRefundAmount !== null && actualRefundAmount > 0 && orderDetails?.paymentMethod === "online" && orderDetails?.razorpayPaymentId) {
      refundRazorpayPayment(orderDetails.razorpayPaymentId, actualRefundAmount * 100, `refund_return_${id}`).catch(err => {
        logger.error({ err, returnId: id }, "Failed to initiate Razorpay refund for return");
      });
    }

    const refundMsg = status === "approved" && creditWallet && actualRefundAmount
      ? ` ₹${actualRefundAmount.toFixed(2)} has been credited to your wallet.`
      : status === "approved"
        ? " Refund will be processed shortly."
        : "";

    const statusMsg = status === "approved"
      ? `Your return request for Order #${returnReq.orderId} has been approved.${refundMsg}`
      : status === "rejected"
        ? `Your return request for Order #${returnReq.orderId} has been reviewed.${adminNote ? ` Note: ${adminNote}` : ""}`
        : `Your return request for Order #${returnReq.orderId} has been updated.`;

    await db.insert(notificationsTable).values({
      userId: returnReq.userId,
      title: `Return ${status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Updated"}`,
      message: statusMsg,
      type: status === "approved" ? "success" : status === "rejected" ? "warning" : "info",
    });

    const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, returnReq.userId));
    return await formatReturn(returnReq, user?.name);
  }
}

export const returnsService = new ReturnsService();

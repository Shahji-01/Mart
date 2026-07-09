import { db, ordersTable, orderItemsTable, cartItemsTable, productsTable, productVariantsTable, usersTable, couponsTable, notificationsTable, walletTransactionsTable, loyaltyTransactionsTable, cartSessionsTable } from "@workspace/database";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { buildCart } from "./cart.service";
import { RUPEES_PER_POINT, POINTS_PER_RUPEE_SPENT } from "./loyalty.service";
import { computeDebits } from "../lib/money";
import { clampPageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../lib/pagination";
import { isAllowedOrderTransition, shouldAwardLoyalty, type OrderStatus } from "../lib/order-status";
import { paymentProvider, resolvePaymentStatus } from "./payment.service";
import { isRazorpayConfigured, verifyRazorpayPayment, refundRazorpayPayment } from "./razorpay.service";
import { socketService } from "./socket.service";
import { emailService } from "./email.service";
import { pushService } from "./push.service";
import { referralsService } from "./referrals.service";
import { logger } from "../lib/logger";

// Marker error for invalid order-status transitions (R6.2) so the controller
// can surface them as a 400 validation error rather than a 500.
export class OrderStatusTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderStatusTransitionError";
  }
}

// Postgres unique-violation SQLSTATE.
function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string }; message?: string } | undefined;
  return e?.code === "23505" || e?.cause?.code === "23505" || /duplicate key|unique constraint/i.test(e?.message ?? "");
}

async function formatOrder(order: typeof ordersTable.$inferSelect, userName?: string) {
  const items = await db.select({
    item: orderItemsTable,
    product: productsTable,
    variant: productVariantsTable,
  })
    .from(orderItemsTable)
    .leftJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
    .leftJoin(productVariantsTable, eq(orderItemsTable.variantId, productVariantsTable.id))
    .where(eq(orderItemsTable.orderId, order.id));
    
  const orderItems = items.map(({ item, product: p, variant: v }) => ({
    id: item.id,
    productId: item.productId,
    productName: p?.name ?? "Product",
    variantId: item.variantId,
    unit: v?.unit ?? "",
    unitValue: v?.unitValue ?? "",
    price: parseFloat(item.price),
    quantity: item.quantity,
    subtotal: parseFloat(item.subtotal),
    imageUrl: p?.imageUrl ?? "",
  }));
  return {
    id: order.id,
    userId: order.userId,
    userName: userName ?? null,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    subtotal: parseFloat(order.subtotal),
    discount: parseFloat(order.discount),
    deliveryFee: parseFloat(order.deliveryFee),
    total: parseFloat(order.total),
    walletAmountUsed: parseFloat(order.walletAmountUsed ?? "0"),
    loyaltyPointsUsed: order.loyaltyPointsUsed ?? 0,
    address: order.address,
    couponCode: order.couponCode,
    deliverySlot: order.deliverySlot ?? null,
    notes: order.notes ?? null,
    riderLat: order.riderLat != null ? parseFloat(order.riderLat) : null,
    riderLng: order.riderLng != null ? parseFloat(order.riderLng) : null,
    items: orderItems,
    createdAt: order.createdAt.toISOString(),
  };
}

export class OrdersService {
  async getOrders(userId: number, isAdmin: boolean, filters: any) {
    const { status } = filters;
    // Clamp the page size to a defined maximum with a default (R20.2, R20.3) so
    // an unbounded `limit` can never trigger an unbounded result set.
    const page = Math.max(1, filters.page ?? 1);
    const limit = clampPageSize(filters.limit, { def: DEFAULT_PAGE_SIZE, max: MAX_PAGE_SIZE });
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [];
    if (!isAdmin) {
      conditions.push(eq(ordersTable.userId, userId));
    }
    if (status) {
      conditions.push(eq(ordersTable.status, status));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    let query = db.select().from(ordersTable).$dynamic();
    if (where) query = query.where(where);

    const orders = await query.orderBy(desc(ordersTable.createdAt)).limit(limit).offset(offset);

    // Bounded user-name lookup (R20.1): fetch only the users referenced by the
    // page of orders instead of scanning the whole users table.
    const userIds = [...new Set(orders.map(o => o.userId))];
    const users = userIds.length > 0
      ? await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(inArray(usersTable.id, userIds))
      : [];
    const userMap = new Map(users.map(u => [u.id, u.name]));

    return await Promise.all(orders.map(o => formatOrder(o, userMap.get(o.userId))));
  }

  async createOrder(userId: number, data: any) {
    const { address, paymentMethod, couponCode, deliverySlot, useWallet, useLoyaltyPoints, idempotencyKey, notes, razorpayOrderId, razorpayPaymentId, razorpaySignature } = data;

    // Idempotency (R3): if a key was supplied and a matching order already
    // exists, return it WITHOUT performing any debits or stock changes.
    if (idempotencyKey) {
      const existing = await this.findOrderByIdempotencyKey(userId, idempotencyKey);
      if (existing) return existing;
    }

    const [session] = await db.select().from(cartSessionsTable).where(eq(cartSessionsTable.userId, userId));
    const cart = await buildCart(userId, couponCode || session?.couponCode, session?.pincode);
    if (cart.items.length === 0) throw new Error("Cart is empty");

    let orderId: number;
    try {
      orderId = await db.transaction(async (tx) => {
        // Enforce per-user coupon usage limit. buildCart only validates that the
        // coupon is active/unexpired/min-order-met; without this check a user can
        // bypass `maxUsagePerUser` by passing the code directly to checkout.
        if (cart.couponCode) {
          const [coupon] = await tx.select().from(couponsTable).where(eq(couponsTable.code, cart.couponCode));
          if (coupon?.maxUsagePerUser) {
            const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` })
              .from(ordersTable)
              .where(and(eq(ordersTable.userId, userId), eq(ordersTable.couponCode, cart.couponCode)));
            if (count >= coupon.maxUsagePerUser) {
              throw new Error(`Coupon usage limit reached for ${cart.couponCode}`);
            }
          }
        }

        for (const item of cart.items) {
          const [variant] = await tx.select().from(productVariantsTable).where(eq(productVariantsTable.id, item.variantId));
          if (!variant) throw new Error(`Variant not found for ${item.productName}`);
          if (variant.stock < item.quantity) {
            throw new Error(`Insufficient stock for ${item.productName}. Only ${variant.stock} available.`);
          }
        }

        // Row-level lock on the user row (R1): SELECT ... FOR UPDATE serializes
        // concurrent debits for the same user so balances never overspend.
        const [userRow] = await tx.select({ walletBalance: usersTable.walletBalance, loyaltyPoints: usersTable.loyaltyPoints })
          .from(usersTable)
          .where(eq(usersTable.id, userId))
          .for("update");
        const walletBal = parseFloat(userRow?.walletBalance ?? "0");
        const loyaltyPts = userRow?.loyaltyPoints ?? 0;

        // Debit math is computed from the LOCKED balances via the pure helper.
        const debits = computeDebits({
          walletBalance: walletBal,
          loyaltyPoints: loyaltyPts,
          cartTotal: cart.total,
          useWallet: !!useWallet,
          useLoyaltyPoints: !!useLoyaltyPoints,
          rupeesPerPoint: RUPEES_PER_POINT,
        });
        const walletUsed = debits.walletUsed;
        const loyaltyUsed = debits.loyaltyUsed;
        const finalTotal = debits.remainingTotal;

        // Online payment authorization (R4). When Razorpay is configured we
        // require a verified Razorpay payment (signature + amount) for online
        // orders; otherwise we fall back to the configured PaymentProvider
        // (simulated by default, Noop with PAYMENT_PROVIDER=none).
        let onlineAuthorized = false;
        if (paymentMethod === "online") {
          if (isRazorpayConfigured()) {
            if (razorpayOrderId && razorpayPaymentId && razorpaySignature) {
              onlineAuthorized = await verifyRazorpayPayment({
                orderId: razorpayOrderId,
                paymentId: razorpayPaymentId,
                signature: razorpaySignature,
                expectedAmountPaise: Math.round(finalTotal * 100),
              });
            }
          } else {
            const auth = await paymentProvider.authorize(finalTotal, { userId });
            onlineAuthorized = auth.authorized;
          }
        }

        // Honest payment status (R4): wallet -> paid only when the wallet debit
        // is actually applied below; online -> paid only when authorized; cod ->
        // pending. Never marks an unfunded order paid.
        const paymentStatus = resolvePaymentStatus({
          paymentMethod,
          walletDebitApplied: walletUsed > 0,
          onlineAuthorized,
        });

        const [order] = await tx.insert(ordersTable).values({
          userId,
          paymentMethod,
          paymentStatus,
          subtotal: cart.subtotal.toString(),
          discount: cart.discount.toString(),
          deliveryFee: cart.deliveryFee.toString(),
          total: finalTotal.toString(),
          walletAmountUsed: walletUsed.toString(),
          loyaltyPointsUsed: loyaltyUsed,
          address,
          couponCode: cart.couponCode,
          deliverySlot: deliverySlot ?? null,
          idempotencyKey: idempotencyKey ?? null,
          razorpayOrderId: (paymentMethod === "online" && razorpayOrderId) ? razorpayOrderId : null,
          razorpayPaymentId: (paymentMethod === "online" && razorpayPaymentId) ? razorpayPaymentId : null,
        }).returning();

        await tx.insert(orderItemsTable).values(cart.items.map(item => ({
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          // Charged price = effective (flash-sale-resolved) price (R2).
          price: item.price.toString(),
          subtotal: item.subtotal.toString(),
        })));

        for (const item of cart.items) {
          const [updatedVariant] = await tx.update(productVariantsTable)
            .set({ stock: sql`${productVariantsTable.stock} - ${item.quantity}` })
            .where(eq(productVariantsTable.id, item.variantId))
            .returning({ stock: productVariantsTable.stock });

          if (updatedVariant.stock < 0) {
            throw new Error(`Insufficient stock for ${item.productName}. Please try again.`);
          }
        }

        if (cart.couponCode) {
          await tx.update(couponsTable)
            .set({ usageCount: sql`${couponsTable.usageCount} + 1` })
            .where(eq(couponsTable.code, cart.couponCode));
        }

        if (walletUsed > 0) {
          await tx.update(usersTable)
            .set({ walletBalance: sql`${usersTable.walletBalance} - ${walletUsed.toString()}` })
            .where(eq(usersTable.id, userId));
          await tx.insert(walletTransactionsTable).values({
            userId,
            orderId: order.id,
            type: "debit",
            amount: walletUsed.toString(),
            description: `Used for Order #${order.id}`,
          });
        }

        if (loyaltyUsed > 0) {
          await tx.update(usersTable)
            .set({ loyaltyPoints: sql`${usersTable.loyaltyPoints} - ${loyaltyUsed}` })
            .where(eq(usersTable.id, userId));
          await tx.insert(loyaltyTransactionsTable).values({
            userId,
            orderId: order.id,
            type: "spend",
            points: -loyaltyUsed,
            description: `Redeemed for Order #${order.id}`,
          });
        }

        await tx.delete(cartItemsTable).where(eq(cartItemsTable.userId, userId));
        await tx.delete(cartSessionsTable).where(eq(cartSessionsTable.userId, userId));

        const savingsMsg = walletUsed > 0 || loyaltyUsed > 0
          ? ` You saved ₹${(walletUsed + loyaltyUsed * RUPEES_PER_POINT).toFixed(0)} using wallet/points.`
          : "";
        await tx.insert(notificationsTable).values({
          userId,
          title: "Order Placed Successfully",
          message: `Your order #${order.id} has been placed and is being processed. Total: ₹${finalTotal.toFixed(0)}.${savingsMsg}`,
          type: "success",
        });

        return order.id;
      });
    } catch (err) {
      // Concurrent request with the same idempotency key won the race (R3.3):
      // the unique index rejected this insert. Return the winner's order.
      if (idempotencyKey && isUniqueViolation(err)) {
        const winner = await this.findOrderByIdempotencyKey(userId, idempotencyKey);
        if (winner) return winner;
      }
      throw err;
    }

    // Order note persistence (R10) is best-effort and runs AFTER the order has
    // committed: if only the note write fails, the order still stands (R10.3).
    if (notes) {
      try {
        await db.update(ordersTable).set({ notes }).where(eq(ordersTable.id, orderId));
      } catch (err) {
        logger.error({ err, orderId }, "Failed to persist order note");
      }
    }

    const [finalOrder] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

    // Send order confirmation email asynchronously
    if (user && user.email) {
      emailService
        .sendOrderConfirmation(user.email, finalOrder.id, finalOrder.total)
        .catch((err) => logger.error({ err, orderId: finalOrder.id, userId }, "Failed to send order confirmation email"));
    }

    return await formatOrder(finalOrder, user?.name);
  }

  /**
   * Reconcile an order's payment status from a verified Razorpay webhook event.
   * Idempotent: only writes when the status actually changes. Correlates by the
   * Razorpay order id stored on the order at creation.
   */
  async confirmRazorpayPayment(razorpayOrderId: string, paymentId: string | undefined, captured: boolean) {
    if (!razorpayOrderId) return;
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.razorpayOrderId, razorpayOrderId));
    if (!order) return;
    const target: "paid" | "failed" = captured ? "paid" : "failed";
    if (order.paymentStatus === target) return; // idempotent no-op
    // Don't downgrade an already-paid order to failed.
    if (order.paymentStatus === "paid" && target === "failed") return;
    await db.update(ordersTable)
      .set({ paymentStatus: target, razorpayPaymentId: paymentId ?? order.razorpayPaymentId })
      .where(eq(ordersTable.id, order.id));
  }

  /** Update the live rider location for an order and push it to the customer. */
  async updateRiderLocation(orderId: number, lat: number, lng: number) {
    const [order] = await db.update(ordersTable)
      .set({ riderLat: lat.toString(), riderLng: lng.toString() })
      .where(eq(ordersTable.id, orderId))
      .returning({ userId: ordersTable.userId });
    if (!order) return null;
    socketService.notifyOrderLocation(order.userId, orderId, lat, lng);
    return { orderId, lat, lng };
  }

  private async findOrderByIdempotencyKey(userId: number, idempotencyKey: string) {
    const [order] = await db.select().from(ordersTable)
      .where(and(eq(ordersTable.userId, userId), eq(ordersTable.idempotencyKey, idempotencyKey)));
    if (!order) return null;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    return await formatOrder(order, user?.name);
  }

  async getOrderById(id: number, userId: number, isAdmin: boolean) {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order) return null;
    if (!isAdmin && order.userId !== userId) throw new Error("Forbidden");
    
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, order.userId));
    return await formatOrder(order, user?.name);
  }

  async updateOrderStatus(id: number, status: "pending" | "confirmed" | "processing" | "out_for_delivery" | "delivered" | "cancelled") {
    const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!existing) return null;

    const from = existing.status as OrderStatus;
    const to = status as OrderStatus;

    // Idempotent same-status write: a no-op that changes nothing and applies no
    // side effects, so re-saving a delivered order never re-awards loyalty.
    if (from === to) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, existing.userId));
      return await formatOrder(existing, user?.name);
    }

    // State machine (R6.1, R6.2): reject transitions not in the allowed set and
    // leave the order unchanged.
    if (!isAllowedOrderTransition(from, to)) {
      throw new OrderStatusTransitionError(`Invalid order status transition: ${from} -> ${to}`);
    }

    // Apply the status change and ALL its side effects inside one transaction
    // (R6.3): COD->paid on delivery, loyalty award, stock restore on cancel,
    // and referral completion commit or roll back together.
    const order = await db.transaction(async (tx) => {
      const updates: Partial<typeof ordersTable.$inferInsert> = { status };
      if (to === "delivered" && existing.paymentMethod === "cod") {
        updates.paymentStatus = "paid";
      }

      const [updated] = await tx.update(ordersTable).set(updates).where(eq(ordersTable.id, id)).returning();

      // Stock restore (and wallet/loyalty refund) when an order is cancelled via
      // a status change, mirroring cancelOrder, inside the same transaction.
      if (to === "cancelled") {
        const items = await tx.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
        for (const item of items) {
          await tx.update(productVariantsTable)
            .set({ stock: sql`${productVariantsTable.stock} + ${item.quantity}` })
            .where(eq(productVariantsTable.id, item.variantId));
        }

        const walletRefund = parseFloat(updated.walletAmountUsed ?? "0");
        if (walletRefund > 0) {
          await tx.update(usersTable)
            .set({ walletBalance: sql`${usersTable.walletBalance} + ${walletRefund.toString()}` })
            .where(eq(usersTable.id, updated.userId));
          await tx.insert(walletTransactionsTable).values({
            userId: updated.userId,
            orderId: updated.id,
            type: "refund",
            amount: walletRefund.toString(),
            description: `Refund for cancelled Order #${updated.id}`,
          });
        }

        const loyaltyRefund = updated.loyaltyPointsUsed ?? 0;
        if (loyaltyRefund > 0) {
          await tx.update(usersTable)
            .set({ loyaltyPoints: sql`${usersTable.loyaltyPoints} + ${loyaltyRefund}` })
            .where(eq(usersTable.id, updated.userId));
          await tx.insert(loyaltyTransactionsTable).values({
            userId: updated.userId,
            orderId: updated.id,
            type: "bonus",
            points: loyaltyRefund,
            description: `Points refunded for cancelled Order #${updated.id}`,
          });
        }
      }

      if (to === "cancelled" && updated.couponCode) {
        await tx.update(couponsTable)
          .set({ usageCount: sql`GREATEST(${couponsTable.usageCount} - 1, 0)` })
          .where(eq(couponsTable.code, updated.couponCode));
      }

      // Loyalty award exactly once on the first transition into delivered
      // (R6.4). Guard on prior status PLUS the absence of any prior `earn`
      // loyalty transaction for the order, all inside the transaction. Never
      // reached for cancelled/returned (R6.5).
      if (to === "delivered") {
        const [{ count: priorEarn }] = await tx.select({ count: sql<number>`count(*)::int` })
          .from(loyaltyTransactionsTable)
          .where(and(eq(loyaltyTransactionsTable.orderId, id), eq(loyaltyTransactionsTable.type, "earn")));

        if (shouldAwardLoyalty(from, to, priorEarn > 0)) {
          const orderTotal = parseFloat(updated.total);
          const pointsToEarn = Math.floor(orderTotal * POINTS_PER_RUPEE_SPENT);
          if (pointsToEarn > 0) {
            await tx.update(usersTable)
              .set({ loyaltyPoints: sql`${usersTable.loyaltyPoints} + ${pointsToEarn}` })
              .where(eq(usersTable.id, updated.userId));
            await tx.insert(loyaltyTransactionsTable).values({
              userId: updated.userId,
              orderId: updated.id,
              type: "earn",
              points: pointsToEarn,
              description: `Earned for Order #${updated.id} (₹${orderTotal.toFixed(0)})`,
            });
            await tx.insert(notificationsTable).values({
              userId: updated.userId,
              title: "Loyalty Points Earned!",
              message: `You earned ${pointsToEarn} loyalty points for Order #${updated.id}. Worth ₹${(pointsToEarn * RUPEES_PER_POINT).toFixed(2)}.`,
              type: "success",
            });
          }
        }

        // Referral completion (R7): advance the referred user's pending referral
        // to rewarded and credit the referrer exactly once, in this same
        // transaction. The conditional update makes repeats a no-op.
        await referralsService.advanceReferralOnDelivery(tx, updated.userId, updated.id);
      }

      // Status-change notification (persisted inside the transaction).
      const statusMessages: Record<string, string> = {
        confirmed: "Your order has been confirmed and is being prepared.",
        processing: "Your order is being packed and will be dispatched soon.",
        out_for_delivery: "Your order is out for delivery! Expect it soon.",
        delivered: "Your order has been delivered. Enjoy your purchase!",
        cancelled: "Your order has been cancelled.",
      };
      if (statusMessages[status]) {
        await tx.insert(notificationsTable).values({
          userId: updated.userId,
          title: `Order #${updated.id} Update`,
          message: statusMessages[status],
          type: status === "cancelled" ? "warning" : "info",
        });
      }

      return updated;
    });

    if (to === "cancelled" && existing.paymentMethod === "online" && existing.paymentStatus === "paid" && existing.razorpayPaymentId) {
      await db.update(ordersTable).set({ paymentStatus: "refunded" }).where(eq(ordersTable.id, id));
      const amountPaid = parseFloat(existing.total);
      if (amountPaid > 0) {
        refundRazorpayPayment(existing.razorpayPaymentId, amountPaid * 100, `refund_order_${id}`).catch(err => {
          logger.error({ err, orderId: id }, "Failed to initiate Razorpay refund");
        });
      }
    }

    // Real-time notification is a post-commit side effect (R6.3 covers DB state).
    socketService.notifyOrderStatus(order.userId, order.id, status);

    const statusPushMessages: Record<string, string> = {
      confirmed: "Your order has been confirmed and is being prepared.",
      processing: "Your order is being packed and will be dispatched soon.",
      out_for_delivery: "Your order is out for delivery! Track it live.",
      delivered: "Your order has been delivered. Enjoy!",
      cancelled: "Your order has been cancelled.",
    };
    if (statusPushMessages[status]) {
      pushService.sendToUser(order.userId, {
        title: `Order #${order.id} update`,
        body: statusPushMessages[status],
        url: `/orders/${order.id}`,
        type: status === "cancelled" ? "warning" : "info",
      }).catch(() => {});
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, order.userId));
    return await formatOrder(order, user?.name);
  }

  async cancelOrder(id: number, userId: number, isAdmin: boolean) {
    const orderId = await db.transaction(async (tx) => {
      const [order] = await tx.select().from(ordersTable).where(eq(ordersTable.id, id));
      if (!order) return null;
      if (!isAdmin && order.userId !== userId) throw new Error("Forbidden");
      if (order.status === "delivered" || order.status === "out_for_delivery") {
        throw new Error("Cannot cancel order that is out for delivery or delivered");
      }
      if (order.status === "cancelled") {
        throw new Error("Order is already cancelled");
      }

      const [updated] = await tx.update(ordersTable).set({ status: "cancelled" }).where(eq(ordersTable.id, id)).returning();

      const items = await tx.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
      for (const item of items) {
        await tx.update(productVariantsTable)
          .set({ stock: sql`${productVariantsTable.stock} + ${item.quantity}` })
          .where(eq(productVariantsTable.id, item.variantId));
      }

      const walletRefund = parseFloat(order.walletAmountUsed ?? "0");
      if (walletRefund > 0) {
        await tx.update(usersTable)
          .set({ walletBalance: sql`${usersTable.walletBalance} + ${walletRefund.toString()}` })
          .where(eq(usersTable.id, order.userId));
        await tx.insert(walletTransactionsTable).values({
          userId: order.userId,
          orderId: order.id,
          type: "refund",
          amount: walletRefund.toString(),
          description: `Refund for cancelled Order #${order.id}`,
        });
      }

      const loyaltyRefund = order.loyaltyPointsUsed ?? 0;
      if (loyaltyRefund > 0) {
        await tx.update(usersTable)
          .set({ loyaltyPoints: sql`${usersTable.loyaltyPoints} + ${loyaltyRefund}` })
          .where(eq(usersTable.id, order.userId));
        await tx.insert(loyaltyTransactionsTable).values({
          userId: order.userId,
          orderId: order.id,
          type: "bonus",
          points: loyaltyRefund,
          description: `Points refunded for cancelled Order #${order.id}`,
        });
      }

      if (updated.couponCode) {
        await tx.update(couponsTable)
          .set({ usageCount: sql`GREATEST(${couponsTable.usageCount} - 1, 0)` })
          .where(eq(couponsTable.code, updated.couponCode));
      }

      await tx.insert(notificationsTable).values({
        userId: order.userId,
        title: "Order Cancelled",
        message: `Your order #${order.id} has been cancelled. Stock and any wallet/loyalty deductions have been restored.`,
        type: "warning",
      });
      
      return updated.id;
    });

    if (!orderId) return null;
    const [finalOrder] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));

    if (finalOrder.paymentMethod === "online" && finalOrder.paymentStatus === "paid" && finalOrder.razorpayPaymentId) {
      await db.update(ordersTable).set({ paymentStatus: "refunded" }).where(eq(ordersTable.id, orderId));
      const amountPaid = parseFloat(finalOrder.total);
      if (amountPaid > 0) {
        refundRazorpayPayment(finalOrder.razorpayPaymentId, amountPaid * 100, `refund_order_${orderId}`).catch(err => {
          logger.error({ err, orderId }, "Failed to initiate Razorpay refund");
        });
      }
      finalOrder.paymentStatus = "refunded";
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, finalOrder.userId));
    return await formatOrder(finalOrder, user?.name);
  }

  async reorder(id: number, userId: number) {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order) return null;
    if (order.userId !== userId) throw new Error("Forbidden");
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
    if (items.length === 0) throw new Error("No items in order");
    
    for (const item of items) {
      const existing = await db.select().from(cartItemsTable).where(and(eq(cartItemsTable.userId, userId), eq(cartItemsTable.variantId, item.variantId)));
      if (existing.length > 0) {
        await db.update(cartItemsTable).set({ quantity: existing[0].quantity + item.quantity }).where(eq(cartItemsTable.id, existing[0].id));
      } else {
        await db.insert(cartItemsTable).values({ userId, productId: item.productId, variantId: item.variantId, quantity: item.quantity });
      }
    }
    return { message: "Items added to cart", count: items.length };
  }
}

export const ordersService = new OrdersService();

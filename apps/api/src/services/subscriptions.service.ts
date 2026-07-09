import { db, subscriptionsTable, cartItemsTable, productsTable, productVariantsTable, notificationsTable } from "@workspace/database";
import { eq, and, lte, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { pushService } from "./push.service";

type Frequency = "daily" | "weekly" | "monthly";

function nextRun(from: Date, frequency: Frequency): Date {
  const d = new Date(from);
  if (frequency === "daily") d.setDate(d.getDate() + 1);
  else if (frequency === "weekly") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

async function formatSubscription(s: typeof subscriptionsTable.$inferSelect) {
  const [variant] = await db.select().from(productVariantsTable).where(eq(productVariantsTable.id, s.variantId));
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, s.productId));
  return {
    id: s.id,
    productId: s.productId,
    variantId: s.variantId,
    productName: product?.name ?? "",
    imageUrl: product?.imageUrl ?? "",
    unit: variant?.unit ?? "",
    unitValue: variant?.unitValue ?? "",
    price: variant ? parseFloat(variant.price) : 0,
    quantity: s.quantity,
    frequency: s.frequency,
    nextRunAt: s.nextRunAt.toISOString(),
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
  };
}

export class SubscriptionsService {
  async list(userId: number) {
    const subs = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId)).orderBy(subscriptionsTable.createdAt);
    return Promise.all(subs.map(formatSubscription));
  }

  async create(userId: number, data: { productId: number; variantId: number; quantity?: number; frequency?: Frequency }) {
    const freq = (data.frequency ?? "weekly") as Frequency;
    const [sub] = await db.insert(subscriptionsTable).values({
      userId,
      productId: data.productId,
      variantId: data.variantId,
      quantity: data.quantity && data.quantity > 0 ? data.quantity : 1,
      frequency: freq,
      nextRunAt: nextRun(new Date(), freq),
    }).returning();
    return formatSubscription(sub);
  }

  async cancel(userId: number, id: number) {
    await db.delete(subscriptionsTable).where(and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.userId, userId)));
    return { ok: true };
  }

  async setActive(userId: number, id: number, isActive: boolean) {
    await db.update(subscriptionsTable).set({ isActive }).where(and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.userId, userId)));
    return { ok: true };
  }

  /**
   * Process all due, active subscriptions: add the item to the user's cart,
   * advance nextRunAt, and notify. Called periodically by the scheduler.
   */
  async runDue(now = new Date()) {
    const due = await db.select().from(subscriptionsTable)
      .where(and(eq(subscriptionsTable.isActive, true), lte(subscriptionsTable.nextRunAt, now)));
    for (const s of due) {
      try {
        const [variant] = await db.select().from(productVariantsTable).where(eq(productVariantsTable.id, s.variantId));
        if (!variant || (variant.stock ?? 0) < 1) {
          // Skip but still advance so we don't spam; try again next cycle.
          await db.update(subscriptionsTable)
            .set({ nextRunAt: nextRun(now, s.frequency as Frequency), lastRunAt: now })
            .where(eq(subscriptionsTable.id, s.id));
          continue;
        }
        const qty = Math.min(s.quantity, variant.stock ?? 0);
        const existing = await db.select().from(cartItemsTable)
          .where(and(eq(cartItemsTable.userId, s.userId), eq(cartItemsTable.variantId, s.variantId))).limit(1);
        if (existing.length > 0) {
          await db.update(cartItemsTable).set({ quantity: sql`${cartItemsTable.quantity} + ${qty}` }).where(eq(cartItemsTable.id, existing[0].id));
        } else {
          await db.insert(cartItemsTable).values({ userId: s.userId, productId: s.productId, variantId: s.variantId, quantity: qty });
        }
        const [product] = await db.select({ name: productsTable.name }).from(productsTable).where(eq(productsTable.id, s.productId));
        await db.insert(notificationsTable).values({
          userId: s.userId,
          title: "Subscription refill ready",
          message: `${product?.name ?? "Your item"} (x${qty}) was added to your cart from your subscription. Checkout when ready.`,
          type: "info",
        });
        pushService.sendToUser(s.userId, {
          title: "Subscription refill 🛒",
          body: `${product?.name ?? "Your item"} (x${qty}) is in your cart.`,
          url: "/cart",
        }).catch(() => {});
        await db.update(subscriptionsTable)
          .set({ nextRunAt: nextRun(now, s.frequency as Frequency), lastRunAt: now })
          .where(eq(subscriptionsTable.id, s.id));
      } catch (err) {
        logger.error({ err, subscriptionId: s.id }, "Subscription run failed");
      }
    }
    return { processed: due.length };
  }
}

export const subscriptionsService = new SubscriptionsService();

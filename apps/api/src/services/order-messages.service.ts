import { db, orderMessagesTable, ordersTable, usersTable } from "@workspace/database";
import { eq, asc } from "drizzle-orm";
import { socketService } from "./socket.service";

function format(m: typeof orderMessagesTable.$inferSelect) {
  return {
    id: m.id,
    orderId: m.orderId,
    sender: m.sender,
    message: m.message,
    createdAt: m.createdAt.toISOString(),
  };
}

export class OrderMessagesService {
  /** Verify the order exists and the user may access it (owner or admin). */
  private async assertAccess(orderId: number, userId: number, isAdmin: boolean) {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    if (!order) return null;
    if (!isAdmin && order.userId !== userId) return null;
    return order;
  }

  async list(orderId: number, userId: number, isAdmin: boolean) {
    const order = await this.assertAccess(orderId, userId, isAdmin);
    if (!order) return null;
    const msgs = await db.select().from(orderMessagesTable)
      .where(eq(orderMessagesTable.orderId, orderId))
      .orderBy(asc(orderMessagesTable.createdAt));
    return msgs.map(format);
  }

  async send(orderId: number, userId: number, isAdmin: boolean, message: string) {
    const order = await this.assertAccess(orderId, userId, isAdmin);
    if (!order) return null;
    const [m] = await db.insert(orderMessagesTable).values({
      orderId,
      userId,
      sender: isAdmin ? "admin" : "customer",
      message,
    }).returning();
    const formatted = format(m);
    // Notify the order's customer in real time (e.g. when an admin replies).
    socketService.notifyOrderMessage(order.userId, formatted);
    return formatted;
  }
}

export const orderMessagesService = new OrderMessagesService();

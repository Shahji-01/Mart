import { db, notificationsTable, usersTable } from "@workspace/database";
import { eq, and, desc } from "drizzle-orm";

export class NotificationsService {
  async getNotifications(userId: number) {
    const notes = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.userId, userId))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);
    return notes.map(n => ({ ...n, createdAt: n.createdAt.toISOString() }));
  }

  async markAllAsRead(userId: number) {
    await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.userId, userId));
  }

  async markAsRead(id: number, userId: number) {
    const [note] = await db.update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId)))
      .returning();
    if (!note) return null;
    return { ...note, createdAt: note.createdAt.toISOString() };
  }

  async deleteNotification(id: number, userId: number) {
    await db.delete(notificationsTable).where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId)));
  }

  async sendAdminNotifications(data: { message: string; type?: string; userIds?: number[] }) {
    const { message, type = "info", userIds } = data;
    let targetIds: number[] = [];
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      targetIds = userIds;
    } else {
      const allUsers = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "customer"));
      targetIds = allUsers.map(u => u.id);
    }
    const rows = targetIds.map(userId => ({ userId, title: "Notification", message, type }));
    if (rows.length > 0) {
      await db.insert(notificationsTable).values(rows);
    }
    return { sent: rows.length };
  }

  async registerNotifyMe(variantId: number, userId: number) {
    await db.insert(notificationsTable).values({
      userId,
      title: "Back in Stock Reminder",
      message: `You registered to be notified when variant #${variantId} is back in stock.`,
      type: "notify_me",
    });
  }
}

export const notificationsService = new NotificationsService();

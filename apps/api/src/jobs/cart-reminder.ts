import { db, cartItemsTable, notificationsTable } from "@workspace/database";
import { sql, eq, and, gt, lt } from "drizzle-orm";
import { logger } from "../lib/logger";

export async function checkAbandonedCarts() {
  logger.info("Running abandoned cart check...");
  
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const usersWithCartItems = await db
      .select({
        userId: cartItemsTable.userId,
        lastAdded: sql<Date>`max(${cartItemsTable.createdAt})`,
        itemCount: sql<number>`count(${cartItemsTable.id})`
      })
      .from(cartItemsTable)
      .groupBy(cartItemsTable.userId)
      .having(
        and(
          lt(sql`max(${cartItemsTable.createdAt})`, twentyFourHoursAgo),
          gt(sql`max(${cartItemsTable.createdAt})`, fortyEightHoursAgo)
        )
      );

    let sentCount = 0;

    for (const session of usersWithCartItems) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentReminders = await db
        .select()
        .from(notificationsTable)
        .where(
          and(
            eq(notificationsTable.userId, session.userId),
            eq(notificationsTable.title, "You left items in your cart!"),
            gt(notificationsTable.createdAt, sevenDaysAgo)
          )
        );

      if (recentReminders.length === 0) {
        await db.insert(notificationsTable).values({
          userId: session.userId,
          title: "You left items in your cart!",
          message: `You have ${session.itemCount} item(s) waiting for you in your cart. Complete your checkout before they sell out!`,
          type: "info"
        });
        sentCount++;
      }
    }

    logger.info(`Sent ${sentCount} abandoned cart reminders.`);
  } catch (error) {
    logger.error({ err: error }, "Error running abandoned cart check");
  }
}

export function startCartReminderJob() {
  setInterval(checkAbandonedCarts, 60 * 60 * 1000);
  setTimeout(checkAbandonedCarts, 10000);
}

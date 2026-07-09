import { pgTable, serial, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { productVariantsTable } from "./products";

// R28 — back-in-stock subscription persistence.
export const stockNotificationsTable = pgTable("stock_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  variantId: integer("variant_id").notNull().references(() => productVariantsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  notifiedAt: timestamp("notified_at"),
}, (table) => [
  // R28.2 — dedupe subscriptions per (user, variant).
  uniqueIndex("stock_notifications_user_variant_unique").on(table.userId, table.variantId),
]);

export type StockNotification = typeof stockNotificationsTable.$inferSelect;

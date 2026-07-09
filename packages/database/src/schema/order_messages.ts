import { pgTable, serial, integer, text, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { ordersTable } from "./orders";

export const messageSenderEnum = pgEnum("message_sender", ["customer", "admin"]);

// Per-order support chat between the customer and the store/admin.
export const orderMessagesTable = pgTable("order_messages", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  sender: messageSenderEnum("sender").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("order_messages_order_id_idx").on(table.orderId),
]);

export type OrderMessage = typeof orderMessagesTable.$inferSelect;

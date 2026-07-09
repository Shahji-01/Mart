import { pgTable, serial, integer, text, timestamp, pgEnum, numeric, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { ordersTable } from "./orders";

export const returnStatusEnum = pgEnum("return_status", ["pending", "approved", "rejected"]);

export const returnRequestsTable = pgTable("return_requests", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: returnStatusEnum("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  refundAmount: numeric("refund_amount", { precision: 10, scale: 2 }),
  refundCredited: boolean("refund_credited").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ReturnRequest = typeof returnRequestsTable.$inferSelect;

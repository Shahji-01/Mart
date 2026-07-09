import { pgTable, serial, integer, text, timestamp, numeric, pgEnum, uniqueIndex, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { productsTable } from "./products";
import { productVariantsTable } from "./products";

export const orderStatusEnum = pgEnum("order_status", [
  "pending", "confirmed", "processing", "out_for_delivery", "delivered", "cancelled"
]);
export const paymentMethodEnum = pgEnum("payment_method", ["cod", "online", "wallet"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "failed", "refunded"]);

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  status: orderStatusEnum("status").notNull().default("pending"),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  gstAmount: numeric("gst_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  walletAmountUsed: numeric("wallet_amount_used", { precision: 10, scale: 2 }).notNull().default("0"),
  loyaltyPointsUsed: integer("loyalty_points_used").notNull().default(0),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  address: text("address").notNull(),
  couponCode: text("coupon_code"),
  deliverySlot: text("delivery_slot"),
  referralCode: text("referral_code"),
  notes: text("notes"),
  idempotencyKey: text("idempotency_key"),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  riderLat: numeric("rider_lat", { precision: 10, scale: 7 }),
  riderLng: numeric("rider_lng", { precision: 10, scale: 7 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  // At-most-once order creation per (user, idempotency key). Partial so that
  // legacy/no-key orders (idempotency_key IS NULL) are unaffected.
  uniqueIndex("orders_user_idempotency_key_unique")
    .on(table.userId, table.idempotencyKey)
    .where(sql`${table.idempotencyKey} IS NOT NULL`),
  // R17.1 — index frequent lookup columns.
  index("orders_user_id_idx").on(table.userId),
  index("orders_status_idx").on(table.status),
]);

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  variantId: integer("variant_id").notNull().references(() => productVariantsTable.id),
  quantity: integer("quantity").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
}, (table) => [
  // R18.4 — quantity must be positive.
  check("order_items_quantity_positive", sql`${table.quantity} > 0`),
]);

export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;

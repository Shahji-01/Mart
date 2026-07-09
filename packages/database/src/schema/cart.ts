import { pgTable, serial, integer, timestamp, text, index, uniqueIndex, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { productsTable } from "./products";
import { productVariantsTable } from "./products";

export const cartItemsTable = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  variantId: integer("variant_id").notNull().references(() => productVariantsTable.id),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  // R17.1 — index frequent lookup columns.
  index("cart_items_user_id_idx").on(table.userId),
  index("cart_items_variant_id_idx").on(table.variantId),
  // R17.2 — at most one cart line per (user, variant); reinforces onConflict logic.
  uniqueIndex("cart_items_user_variant_unique").on(table.userId, table.variantId),
  // R18.4 — quantity must be positive.
  check("cart_items_quantity_positive", sql`${table.quantity} > 0`),
]);

export type CartItem = typeof cartItemsTable.$inferSelect;

export const cartSessionsTable = pgTable("cart_sessions", {
  userId: integer("user_id").notNull().primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  couponCode: text("coupon_code"),
  // Selected delivery pincode — drives zone-based delivery fee / serviceability.
  pincode: text("pincode"),
});

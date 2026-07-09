import { pgTable, serial, integer, text, timestamp, boolean, numeric, pgEnum } from "drizzle-orm/pg-core";
import { productsTable } from "./products";

export const flashSaleDiscountTypeEnum = pgEnum("flash_sale_discount_type", ["percentage", "fixed"]);

export const flashSalesTable = pgTable("flash_sales", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  discountType: flashSaleDiscountTypeEnum("discount_type").notNull().default("percentage"),
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }).notNull(),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FlashSale = typeof flashSalesTable.$inferSelect;

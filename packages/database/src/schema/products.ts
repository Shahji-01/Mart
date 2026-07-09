import { pgTable, serial, text, timestamp, boolean, integer, numeric, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  images: text("images"),
  categoryId: integer("category_id").notNull().references(() => categoriesTable.id),
  isFeatured: boolean("is_featured").notNull().default(false),
  tags: text("tags"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const productVariantsTable = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  unit: text("unit").notNull(),
  unitValue: text("unit_value").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  mrp: numeric("mrp", { precision: 10, scale: 2 }).notNull(),
  sku: text("sku"),
  stock: integer("stock").notNull().default(0),
}, (table) => [
  // R17.1 — index variant lookups by product.
  index("product_variants_product_id_idx").on(table.productId),
  // R18.4 — price and stock must be non-negative.
  check("product_variants_price_nonnegative", sql`${table.price} >= 0`),
  check("product_variants_stock_nonnegative", sql`${table.stock} >= 0`),
]);

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true });
export const insertProductVariantSchema = createInsertSchema(productVariantsTable).omit({ id: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;
export type Product = typeof productsTable.$inferSelect;
export type ProductVariant = typeof productVariantsTable.$inferSelect;

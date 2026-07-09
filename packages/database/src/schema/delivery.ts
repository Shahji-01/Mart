import { pgTable, serial, text, boolean, integer, numeric, timestamp } from "drizzle-orm/pg-core";

export const deliverySlotsTable = pgTable("delivery_slots", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  timeRange: text("time_range").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const deliveryZonesTable = pgTable("delivery_zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  pincodes: text("pincodes").notNull(),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }).notNull().default("40"),
  minOrderForFree: numeric("min_order_for_free", { precision: 10, scale: 2 }).notNull().default("499"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DeliverySlot = typeof deliverySlotsTable.$inferSelect;
export type DeliveryZone = typeof deliveryZonesTable.$inferSelect;

import { pgTable, serial, integer, boolean, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { productsTable, productVariantsTable } from "./products";

export const subscriptionFrequencyEnum = pgEnum("subscription_frequency", ["daily", "weekly", "monthly"]);

// Auto-reorder subscriptions ("deliver milk every morning").
export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  variantId: integer("variant_id").notNull().references(() => productVariantsTable.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
  frequency: subscriptionFrequencyEnum("frequency").notNull().default("weekly"),
  nextRunAt: timestamp("next_run_at").notNull(),
  lastRunAt: timestamp("last_run_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("subscriptions_user_id_idx").on(table.userId),
  index("subscriptions_next_run_idx").on(table.nextRunAt),
]);

export type Subscription = typeof subscriptionsTable.$inferSelect;

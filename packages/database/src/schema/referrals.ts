import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { ordersTable } from "./orders";

export const referralStatusEnum = pgEnum("referral_status", ["pending", "completed", "rewarded"]);

export const referralsTable = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull().references(() => usersTable.id),
  referredUserId: integer("referred_user_id").notNull().references(() => usersTable.id),
  orderId: integer("order_id").references(() => ordersTable.id),
  status: referralStatusEnum("status").notNull().default("pending"),
  rewardPoints: integer("reward_points").notNull().default(100),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Referral = typeof referralsTable.$inferSelect;

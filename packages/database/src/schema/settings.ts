import { pgTable, serial, jsonb } from "drizzle-orm/pg-core";

export const storeSettingsTable = pgTable("store_settings", {
  id: serial("id").primaryKey(),
  settings: jsonb("settings").notNull(),
});

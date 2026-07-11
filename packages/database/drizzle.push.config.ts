import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "packages/database/src/schema/index.ts",
  out: "packages/database/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});

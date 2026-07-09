import { defineConfig } from "drizzle-kit";

// Note: `drizzle-kit generate` only reads the schema files and does not need a
// database connection, so we tolerate a missing DATABASE_URL here. The runtime
// commands `migrate`/`push` still require a real connection string and will
// fail loudly if it is empty.
export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});

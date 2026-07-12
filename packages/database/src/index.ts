import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let _pool: pg.Pool | null = null;
let _db: DrizzleDb | null = null;

function getPool(): pg.Pool {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
      );
    }
    const isProd = process.env.NODE_ENV === "production";
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: parseInt(process.env.DB_MAX_CONNECTIONS || "20"),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: isProd ? { rejectUnauthorized: false } : undefined,
    });
  }
  return _pool;
}

function getDb(): DrizzleDb {
  if (!_db) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}

// Lazily-initialized proxies: importing this package never constructs a Pool
// or reads DATABASE_URL. Initialization is deferred to the first property
// access (i.e. the first actual query), so test collection works without a DB.
export const pool = new Proxy({} as pg.Pool, {
  get: (_t, prop) => {
    const value = (getPool() as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(getPool()) : value;
  },
});

export const db = new Proxy({} as DrizzleDb, {
  get: (_t, prop) => {
    const value = (getDb() as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(getDb()) : value;
  },
});

export * from "./schema";

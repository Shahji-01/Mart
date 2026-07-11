// Load apps/api/.env (if present) before anything reads process.env. Uses
// Node's built-in env-file loader (Node 20.6+); does NOT override variables
// already set on the command line (e.g. by the dev script). Safe no-op when
// the file is missing.
try {
  (process as NodeJS.Process & { loadEnvFile?: (p?: string) => void }).loadEnvFile?.();
} catch {
  /* no .env file present — fine */
}

import app from "./app";
import { logger } from "./lib/logger";
import { env } from "./lib/env";
import { pool } from "@workspace/database";
import { socketService } from "./services/socket.service";

const port = Number(env.PORT);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${env.PORT}"`);
}

const server = app.listen(port, () => {
  logger.info({ port }, "Server listening");
});

socketService.init(server);

// Periodic subscription runner (auto-reorder).
// In production, this is now triggered by Vercel Cron hitting /api/cron/subscriptions

server.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});

async function shutdown() {
  logger.info("Gracefully shutting down...");
  server.close(async () => {
    logger.info("HTTP server closed.");
    try {
      await pool.end();
      logger.info("DB pool closed.");
    } catch (err) {
      logger.error(err, "Error closing DB pool");
    }
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

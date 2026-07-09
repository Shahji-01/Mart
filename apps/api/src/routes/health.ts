import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/validation";
import { db } from "@workspace/database";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/healthz", async (_req, res, next) => {
  try {
    await db.execute(sql`SELECT 1`);
    const data = HealthCheckResponse.parse({ status: "ok" });
    res.json(data);
  } catch (error) {
    logger.error({ err: error }, "Health check failed");
    res.status(503).json({ status: "error", message: "Database connection failed" });
  }
});

export default router;

import { Router, type Request, type Response } from "express";
import { subscriptionsService } from "../services/subscriptions.service";
import { env } from "../lib/env";
import { logger } from "../lib/logger";

const router = Router();

router.get("/subscriptions", async (req: Request, res: Response) => {
  // Verify Vercel Cron Secret
  const authHeader = req.headers.authorization;
  if (env.CRON_SECRET) {
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      res.status(401).json({ error: "Unauthorized cron request" });
      return;
    }
  } else {
    logger.warn("CRON_SECRET is not set, cron endpoint is unprotected!");
  }

  try {
    await subscriptionsService.runDue();
    res.json({ success: true, message: "Subscription runner executed successfully" });
  } catch (error) {
    logger.error({ error }, "Subscription runner failed from cron");
    res.status(500).json({ error: "Subscription runner failed" });
  }
});

export default router;

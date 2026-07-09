import type { Request, Response, NextFunction } from "express";
import { pushService, getVapidPublicKey, isPushConfigured } from "../services/push.service";

export class PushController {
  /** Public VAPID key for the browser to create a subscription. */
  async key(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ publicKey: getVapidPublicKey(), enabled: isPushConfigured() });
    } catch (err) { next(err); }
  }

  async subscribe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const sub = req.body;
      if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
        res.status(400).json({ error: "Invalid subscription" });
        return;
      }
      await pushService.subscribe(req.user.userId, sub);
      res.json({ subscribed: true });
    } catch (err) { next(err); }
  }

  async unsubscribe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const { endpoint } = req.body ?? {};
      if (endpoint) await pushService.unsubscribe(endpoint);
      res.json({ unsubscribed: true });
    } catch (err) { next(err); }
  }
}

export const pushController = new PushController();

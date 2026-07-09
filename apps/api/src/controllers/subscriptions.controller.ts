import type { Request, Response, NextFunction } from "express";
import { subscriptionsService } from "../services/subscriptions.service";
import { getValidated } from "../lib/get-validated";

export class SubscriptionsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      res.json(await subscriptionsService.list(req.user.userId));
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      res.status(201).json(await subscriptionsService.create(req.user.userId, req.body));
    } catch (err) { next(err); }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const { id } = getValidated(req).params;
      res.json(await subscriptionsService.cancel(req.user.userId, parseInt(id as string)));
    } catch (err) { next(err); }
  }
}

export const subscriptionsController = new SubscriptionsController();

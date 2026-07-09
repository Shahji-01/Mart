import type { Request, Response, NextFunction } from "express";
import { loyaltyService } from "../services/loyalty.service";

export class LoyaltyController {
  async getLoyaltyDetails(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const result = await loyaltyService.getLoyaltyDetails(req.user.userId);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getLoyaltyBalance(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const result = await loyaltyService.getLoyaltyBalance(req.user.userId);
      res.json(result);
    } catch (err) { next(err); }
  }
}

export const loyaltyController = new LoyaltyController();

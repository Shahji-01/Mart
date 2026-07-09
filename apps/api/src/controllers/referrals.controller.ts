import type { Request, Response, NextFunction } from "express";
import { referralsService } from "../services/referrals.service";

export class ReferralsController {
  async getMyReferrals(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const result = await referralsService.getMyReferrals(req.user.userId);
      res.json(result);
    } catch (err) { next(err); }
  }

  async validateReferral(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.body;
      const result = await referralsService.validateReferralCode(code);
      if (!result) { res.status(404).json({ error: "Invalid referral code" }); return; }
      res.json(result);
    } catch (err) { next(err); }
  }
}

export const referralsController = new ReferralsController();

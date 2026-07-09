import type { Request, Response, NextFunction } from "express";
import { walletService } from "../services/wallet.service";

export class WalletController {
  async getWalletDetails(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const result = await walletService.getWalletDetails(req.user.userId);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getWalletBalance(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const result = await walletService.getWalletBalance(req.user.userId);
      res.json(result);
    } catch (err) { next(err); }
  }

  async createTopupOrder(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const result = await walletService.createTopupOrder(req.user.userId, Number(req.body?.amount));
      res.json(result);
    } catch (err: any) {
      if (/configured|at least/i.test(err?.message ?? "")) res.status(400).json({ error: err.message });
      else next(err);
    }
  }

  async confirmTopup(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const result = await walletService.confirmTopup(req.user.userId, req.body);
      res.json(result);
    } catch (err: any) {
      if (/verification/i.test(err?.message ?? "")) res.status(400).json({ error: err.message });
      else next(err);
    }
  }
}

export const walletController = new WalletController();

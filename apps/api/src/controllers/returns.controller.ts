import type { Request, Response, NextFunction } from "express";
import { returnsService, RefundValidationError } from "../services/returns.service";
import { getValidated } from "../lib/get-validated";

export class ReturnsController {
  async getReturns(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const isAdmin = req.user.role === "admin";
      const result = await returnsService.getReturns(req.user.userId, isAdmin);
      res.json(result);
    } catch (err) { next(err); }
  }

  async createReturn(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const { orderId, reason } = req.body;
      const result = await returnsService.createReturn(req.user.userId, orderId, reason);
      res.status(201).json(result);
    } catch (err: any) {
      if (err.message === "Order not found") res.status(404).json({ error: err.message });
      else if (err.message === "Forbidden") res.status(403).json({ error: err.message });
      else if (err.message.includes("already exists") || err.message.includes("delivered orders")) {
        res.status(400).json({ error: err.message });
      } else {
        next(err);
      }
    }
  }

  async updateReturn(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      const result = await returnsService.updateReturn(parseInt(id as string), req.body);
      if (!result) { res.status(404).json({ error: "Not found" }); return; }
      res.json(result);
    } catch (err) {
      if (err instanceof RefundValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  }
}

export const returnsController = new ReturnsController();

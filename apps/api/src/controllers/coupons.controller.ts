import type { Request, Response, NextFunction } from "express";
import { couponsService } from "../services/coupons.service";
import { getValidated } from "../lib/get-validated";

export class CouponsController {
  async getCoupons(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await couponsService.getCoupons();
      res.json(result);
    } catch (err) { next(err); }
  }

  async createCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await couponsService.createCoupon(req.body);
      res.status(201).json(result);
    } catch (err) { next(err); }
  }

  async updateCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      const result = await couponsService.updateCoupon(parseInt(id as string), req.body);
      if (!result) { res.status(404).json({ error: "Coupon not found" }); return; }
      res.json(result);
    } catch (err) { next(err); }
  }

  async deleteCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      await couponsService.deleteCoupon(parseInt(id as string));
      res.status(204).send();
    } catch (err) { next(err); }
  }
}

export const couponsController = new CouponsController();

import type { Request, Response, NextFunction } from "express";
import { flashSalesService } from "../services/flash-sales.service";
import { getValidated } from "../lib/get-validated";
import { clearCache } from "../middlewares/cache";

export class FlashSalesController {
  async getFlashSales(req: Request, res: Response, next: NextFunction) {
    try {
      const { active } = getValidated(req).query;
      const result = await flashSalesService.getFlashSales(active === "true");
      res.json(result);
    } catch (err) { next(err); }
  }

  async getFlashSale(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      const result = await flashSalesService.getFlashSale(parseInt(id as string));
      if (!result) { res.status(404).json({ error: "Not found" }); return; }
      res.json(result);
    } catch (err) { next(err); }
  }

  async createFlashSale(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await flashSalesService.createFlashSale(req.body);
      clearCache();
      res.status(201).json(result);
    } catch (err) { next(err); }
  }

  async updateFlashSale(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      const result = await flashSalesService.updateFlashSale(parseInt(id as string), req.body);
      if (!result) { res.status(404).json({ error: "Not found" }); return; }
      clearCache();
      res.json(result);
    } catch (err) { next(err); }
  }

  async deleteFlashSale(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      await flashSalesService.deleteFlashSale(parseInt(id as string));
      clearCache();
      res.status(204).send();
    } catch (err) { next(err); }
  }
}

export const flashSalesController = new FlashSalesController();

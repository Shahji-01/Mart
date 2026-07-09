import type { Request, Response, NextFunction } from "express";
import { exportService } from "../services/export.service";
import { getValidated } from "../lib/get-validated";

export class ExportController {
  async exportOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, to } = getValidated(req).query as { from?: string; to?: string };
      const csvData = await exportService.exportOrders(from, to);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=orders.csv");
      res.send(csvData);
    } catch (err) { next(err); }
  }

  async exportProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const csvData = await exportService.exportProducts();
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=products.csv");
      res.send(csvData);
    } catch (err) { next(err); }
  }

  async exportCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const csvData = await exportService.exportCustomers();
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=customers.csv");
      res.send(csvData);
    } catch (err) { next(err); }
  }

  async importProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { rows } = req.body;
      const result = await exportService.importProducts(rows);
      res.json(result);
    } catch (err) { next(err); }
  }
}

export const exportController = new ExportController();

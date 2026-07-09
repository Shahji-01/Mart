import type { Request, Response, NextFunction } from "express";
import { analyticsService } from "../services/analytics.service";
import { getValidated } from "../lib/get-validated";

export class AnalyticsController {
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await analyticsService.getSummary();
      res.json(result);
    } catch (err) { next(err); }
  }

  async getRecentOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await analyticsService.getRecentOrders();
      res.json(result);
    } catch (err) { next(err); }
  }

  async getTopProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await analyticsService.getTopProducts();
      res.json(result);
    } catch (err) { next(err); }
  }

  async getRevenueChart(req: Request, res: Response, next: NextFunction) {
    try {
      const { query } = getValidated(req);
      const days = parseInt((query["days"] as string) || "7") || 7;
      const result = await analyticsService.getRevenueChart(days);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getCategoryRevenue(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await analyticsService.getCategoryRevenue();
      res.json(result);
    } catch (err) { next(err); }
  }

  async getLowStock(req: Request, res: Response, next: NextFunction) {
    try {
      const { query } = getValidated(req);
      const threshold = parseInt((query["threshold"] as string) || "10") || 10;
      const result = await analyticsService.getLowStock(threshold);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getCustomerRetention(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await analyticsService.getCustomerRetention();
      res.json(result);
    } catch (err) { next(err); }
  }

  async getDemandByPincode(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await analyticsService.getDemandByPincode();
      res.json(result);
    } catch (err) { next(err); }
  }
}

export const analyticsController = new AnalyticsController();

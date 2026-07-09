import { Router } from "express";
import { requireAdmin } from "../lib/auth-middleware";
import { validateRequest } from "../middlewares/validateRequest";
import { analyticsController } from "../controllers/analytics.controller";
import {
  revenueChartSchema,
  lowStockSchema
} from "../schemas/analytics.schema";

const router = Router();

router.get("/analytics/summary", requireAdmin, analyticsController.getSummary);
router.get("/analytics/recent-orders", requireAdmin, analyticsController.getRecentOrders);
router.get("/analytics/top-products", requireAdmin, analyticsController.getTopProducts);
router.get("/analytics/revenue-chart", requireAdmin, validateRequest(revenueChartSchema), analyticsController.getRevenueChart);
router.get("/analytics/category-revenue", requireAdmin, analyticsController.getCategoryRevenue);
router.get("/analytics/low-stock", requireAdmin, validateRequest(lowStockSchema), analyticsController.getLowStock);
router.get("/analytics/customer-retention", requireAdmin, analyticsController.getCustomerRetention);
router.get("/analytics/demand-by-pincode", requireAdmin, analyticsController.getDemandByPincode);

export default router;

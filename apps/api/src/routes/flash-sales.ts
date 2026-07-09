import { Router } from "express";
import { requireAdmin } from "../lib/auth-middleware";
import { cacheMiddleware } from "../middlewares/cache";
import { validateRequest } from "../middlewares/validateRequest";
import { flashSalesController } from "../controllers/flash-sales.controller";
import {
  getFlashSalesSchema,
  flashSaleIdParamSchema,
  createFlashSaleSchema,
  updateFlashSaleSchema
} from "../schemas/flash-sales.schema";

const router = Router();

router.get("/flash-sales", validateRequest(getFlashSalesSchema), cacheMiddleware, flashSalesController.getFlashSales);
router.get("/flash-sales/:id", validateRequest(flashSaleIdParamSchema), flashSalesController.getFlashSale);
router.post("/flash-sales", requireAdmin, validateRequest(createFlashSaleSchema), flashSalesController.createFlashSale);
router.patch("/flash-sales/:id", requireAdmin, validateRequest(updateFlashSaleSchema), flashSalesController.updateFlashSale);
router.delete("/flash-sales/:id", requireAdmin, validateRequest(flashSaleIdParamSchema), flashSalesController.deleteFlashSale);

export default router;

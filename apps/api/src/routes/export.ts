import { Router } from "express";
import { requireAdmin } from "../lib/auth-middleware";
import { validateRequest } from "../middlewares/validateRequest";
import { exportController } from "../controllers/export.controller";
import {
  exportOrdersSchema,
  importProductsSchema
} from "../schemas/export.schema";

const router = Router();

router.get("/admin/export/orders", requireAdmin, validateRequest(exportOrdersSchema), exportController.exportOrders);
router.get("/admin/export/products", requireAdmin, exportController.exportProducts);
router.get("/admin/export/customers", requireAdmin, exportController.exportCustomers);
router.post("/admin/import/products", requireAdmin, validateRequest(importProductsSchema), exportController.importProducts);

export default router;

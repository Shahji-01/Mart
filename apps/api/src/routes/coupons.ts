import { Router } from "express";
import { requireAdmin } from "../lib/auth-middleware";
import { validateRequest } from "../middlewares/validateRequest";
import { couponsController } from "../controllers/coupons.controller";
import {
  createCouponSchema,
  updateCouponSchema,
  couponIdParamSchema
} from "../schemas/coupons.schema";

const router = Router();

router.get("/coupons", requireAdmin, couponsController.getCoupons);
router.post("/coupons", requireAdmin, validateRequest(createCouponSchema), couponsController.createCoupon);
router.patch("/coupons/:id", requireAdmin, validateRequest(updateCouponSchema), couponsController.updateCoupon);
router.delete("/coupons/:id", requireAdmin, validateRequest(couponIdParamSchema), couponsController.deleteCoupon);

export default router;

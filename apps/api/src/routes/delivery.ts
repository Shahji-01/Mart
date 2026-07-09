import { Router } from "express";
import { requireAdmin } from "../lib/auth-middleware";
import { validateRequest } from "../middlewares/validateRequest";
import { deliveryController } from "../controllers/delivery.controller";
import {
  createDeliverySlotSchema,
  updateDeliverySlotSchema,
  createDeliveryZoneSchema,
  updateDeliveryZoneSchema,
  deliveryIdParamSchema,
  checkPincodeSchema
} from "../schemas/delivery.schema";

const router = Router();

router.get("/delivery-slots", deliveryController.getDeliverySlots);
router.get("/delivery/check", validateRequest(checkPincodeSchema), deliveryController.checkPincode);
router.get("/admin/delivery-slots", requireAdmin, deliveryController.getAdminDeliverySlots);
router.post("/delivery-slots", requireAdmin, validateRequest(createDeliverySlotSchema), deliveryController.createDeliverySlot);
router.patch("/delivery-slots/:id", requireAdmin, validateRequest(updateDeliverySlotSchema), deliveryController.updateDeliverySlot);
router.delete("/delivery-slots/:id", requireAdmin, validateRequest(deliveryIdParamSchema), deliveryController.deleteDeliverySlot);

router.get("/delivery-zones", deliveryController.getDeliveryZones);
router.post("/delivery-zones", requireAdmin, validateRequest(createDeliveryZoneSchema), deliveryController.createDeliveryZone);
router.patch("/delivery-zones/:id", requireAdmin, validateRequest(updateDeliveryZoneSchema), deliveryController.updateDeliveryZone);
router.delete("/delivery-zones/:id", requireAdmin, validateRequest(deliveryIdParamSchema), deliveryController.deleteDeliveryZone);

export default router;

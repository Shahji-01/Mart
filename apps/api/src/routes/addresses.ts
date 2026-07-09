import { Router } from "express";
import { requireAuth } from "../lib/auth-middleware";
import { validateRequest } from "../middlewares/validateRequest";
import { addressesController } from "../controllers/addresses.controller";
import {
  addressIdParamSchema,
  createAddressSchema,
  updateAddressSchema
} from "../schemas/addresses.schema";

const router = Router();

router.get("/addresses", requireAuth, addressesController.getAddresses);
router.post("/addresses", requireAuth, validateRequest(createAddressSchema), addressesController.createAddress);
router.patch("/addresses/:id", requireAuth, validateRequest(updateAddressSchema), addressesController.updateAddress);
router.delete("/addresses/:id", requireAuth, validateRequest(addressIdParamSchema), addressesController.deleteAddress);

export default router;

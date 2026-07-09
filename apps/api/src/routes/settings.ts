import { Router } from "express";
import { requireAdmin } from "../lib/auth-middleware";
import { validateRequest } from "../middlewares/validateRequest";
import { settingsController } from "../controllers/settings.controller";
import { updateSettingsSchema } from "../schemas/settings.schema";
// Removed sync export of storeSettings

const router = Router();

router.get("/admin/settings", requireAdmin, settingsController.getSettings);
router.patch("/admin/settings", requireAdmin, validateRequest(updateSettingsSchema), settingsController.updateSettings);

export default router;

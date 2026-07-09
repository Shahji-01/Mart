import { Router } from "express";
import { requireAdmin } from "../lib/auth-middleware";
import { validateRequest } from "../middlewares/validateRequest";
import { bannersController } from "../controllers/banners.controller";
import {
  createBannerSchema,
  updateBannerSchema,
  bannerIdParamSchema
} from "../schemas/banners.schema";

const router = Router();

router.get("/banners", bannersController.getActiveBanners);
router.get("/banners/all", requireAdmin, bannersController.getAllBanners);
router.post("/banners", requireAdmin, validateRequest(createBannerSchema), bannersController.createBanner);
router.patch("/banners/:id", requireAdmin, validateRequest(updateBannerSchema), bannersController.updateBanner);
router.delete("/banners/:id", requireAdmin, validateRequest(bannerIdParamSchema), bannersController.deleteBanner);

export default router;

import { Router } from "express";
import { requireAuth } from "../lib/auth-middleware";
import { loyaltyController } from "../controllers/loyalty.controller";
export { POINTS_PER_RUPEE_SPENT, RUPEES_PER_POINT } from "../services/loyalty.service";

const router = Router();

router.get("/loyalty", requireAuth, loyaltyController.getLoyaltyDetails);
router.get("/loyalty/balance", requireAuth, loyaltyController.getLoyaltyBalance);

export default router;

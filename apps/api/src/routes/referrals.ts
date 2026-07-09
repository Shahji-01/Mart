import { Router } from "express";
import { requireAuth } from "../lib/auth-middleware";
import { validateRequest } from "../middlewares/validateRequest";
import { referralsController } from "../controllers/referrals.controller";
import { validateReferralSchema } from "../schemas/referrals.schema";

const router = Router();

router.get("/referrals/my", requireAuth, referralsController.getMyReferrals);
router.post("/referrals/validate", validateRequest(validateReferralSchema), referralsController.validateReferral);

export default router;

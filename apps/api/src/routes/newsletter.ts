import { Router } from "express";
import { requireAdmin } from "../lib/auth-middleware";
import { validateRequest } from "../middlewares/validateRequest";
import { newsletterController } from "../controllers/newsletter.controller";
import {
  subscribeSchema,
  unsubscribeSchema
} from "../schemas/newsletter.schema";

const router = Router();

router.post("/newsletter/subscribe", validateRequest(subscribeSchema), newsletterController.subscribe);
router.post("/newsletter/unsubscribe", validateRequest(unsubscribeSchema), newsletterController.unsubscribe);
router.get("/newsletter/subscribers", requireAdmin, newsletterController.getSubscribers);

export default router;

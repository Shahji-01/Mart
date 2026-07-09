import { Router } from "express";
import { requireAuth } from "../lib/auth-middleware";
import { pushController } from "../controllers/push.controller";

const router = Router();

router.get("/push/key", pushController.key);
router.post("/push/subscribe", requireAuth, pushController.subscribe);
router.post("/push/unsubscribe", requireAuth, pushController.unsubscribe);

export default router;

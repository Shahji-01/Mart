import { Router } from "express";
import { requireAuth } from "../lib/auth-middleware";
import { paymentsController } from "../controllers/payments.controller";

const router = Router();

router.get("/payments/config", paymentsController.config);
router.post("/payments/razorpay/order", requireAuth, paymentsController.createRazorpayOrder);
router.post("/payments/razorpay/webhook", paymentsController.razorpayWebhook);

export default router;

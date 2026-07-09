import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../lib/auth-middleware";
import { validateRequest } from "../middlewares/validateRequest";
import { walletController } from "../controllers/wallet.controller";

const router = Router();

const topupOrderSchema = z.object({ body: z.object({ amount: z.number().positive() }) });
const topupConfirmSchema = z.object({
  body: z.object({
    amount: z.number().positive(),
    razorpayOrderId: z.string().min(1),
    razorpayPaymentId: z.string().min(1),
    razorpaySignature: z.string().min(1),
  }),
});

router.get("/wallet", requireAuth, walletController.getWalletDetails);
router.get("/wallet/balance", requireAuth, walletController.getWalletBalance);
router.post("/wallet/topup/order", requireAuth, validateRequest(topupOrderSchema), walletController.createTopupOrder);
router.post("/wallet/topup/confirm", requireAuth, validateRequest(topupConfirmSchema), walletController.confirmTopup);

export default router;

import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../lib/auth-middleware";
import { validateRequest } from "../middlewares/validateRequest";
import { subscriptionsController } from "../controllers/subscriptions.controller";

const createSchema = z.object({
  body: z.object({
    productId: z.number().int().positive(),
    variantId: z.number().int().positive(),
    quantity: z.number().int().positive().optional(),
    frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
  }),
});
const idParamSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/, "ID must be a number") }),
});

const router = Router();
router.get("/subscriptions", requireAuth, subscriptionsController.list);
router.post("/subscriptions", requireAuth, validateRequest(createSchema), subscriptionsController.create);
router.delete("/subscriptions/:id", requireAuth, validateRequest(idParamSchema), subscriptionsController.cancel);

export default router;

import { Router } from "express";
import { requireAuth, requireAdmin } from "../lib/auth-middleware";
import { validateRequest } from "../middlewares/validateRequest";
import { returnsController } from "../controllers/returns.controller";
import {
  createReturnSchema,
  updateReturnSchema
} from "../schemas/returns.schema";

const router = Router();

router.get("/returns", requireAuth, returnsController.getReturns);
router.post("/returns", requireAuth, validateRequest(createReturnSchema), returnsController.createReturn);
router.patch("/returns/:id", requireAdmin, validateRequest(updateReturnSchema), returnsController.updateReturn);

export default router;

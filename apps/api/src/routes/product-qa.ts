import { Router } from "express";
import { requireAuth, requireAdmin } from "../lib/auth-middleware";
import { validateRequest } from "../middlewares/validateRequest";
import { productQaController } from "../controllers/product-qa.controller";
import {
  productIdParamSchema,
  qaIdParamSchema,
  createQaSchema,
  answerQaSchema
} from "../schemas/product-qa.schema";

const router = Router();

router.get("/products/qa/all", requireAdmin, productQaController.getAllQas);
router.get("/products/:productId/qa", validateRequest(productIdParamSchema), productQaController.getProductQas);
router.post("/products/:productId/qa", requireAuth, validateRequest(createQaSchema), productQaController.createQa);
router.patch("/products/qa/:id/answer", requireAdmin, validateRequest(answerQaSchema), productQaController.answerQa);
router.delete("/products/qa/:id", requireAdmin, validateRequest(qaIdParamSchema), productQaController.deleteQa);

export default router;

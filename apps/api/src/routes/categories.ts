import { Router } from "express";
import { requireAdmin } from "../lib/auth-middleware";
import { validateRequest } from "../middlewares/validateRequest";
import { cacheMiddleware } from "../middlewares/cache";
import { categoriesController } from "../controllers/categories.controller";
import {
  categoryIdParamSchema,
  createCategorySchema,
  updateCategorySchema
} from "../schemas/categories.schema";

const router = Router();

router.get("/categories", cacheMiddleware, categoriesController.getCategories);
router.get("/categories/:id", validateRequest(categoryIdParamSchema), cacheMiddleware, categoriesController.getCategoryById);
router.post("/categories", requireAdmin, validateRequest(createCategorySchema), categoriesController.createCategory);
router.patch("/categories/:id", requireAdmin, validateRequest(updateCategorySchema), categoriesController.updateCategory);
router.delete("/categories/:id", requireAdmin, validateRequest(categoryIdParamSchema), categoriesController.deleteCategory);

export default router;

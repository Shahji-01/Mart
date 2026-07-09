import { Router } from "express";
import { requireAuth, requireAdmin } from "../lib/auth-middleware";
import { validateRequest } from "../middlewares/validateRequest";
import { reviewsController } from "../controllers/reviews.controller";
import {
  productIdParamSchema,
  createReviewSchema,
  getAdminReviewsSchema,
  reviewIdParamSchema,
  updateReviewStatusSchema
} from "../schemas/reviews.schema";

const router = Router();

router.get("/products/:id/reviews", validateRequest(productIdParamSchema), reviewsController.getProductReviews);
router.post("/products/:id/reviews", requireAuth, validateRequest(createReviewSchema), reviewsController.createReview);

router.get("/admin/reviews", requireAdmin, validateRequest(getAdminReviewsSchema), reviewsController.getAdminReviews);
router.patch("/admin/reviews/:id", requireAdmin, validateRequest(updateReviewStatusSchema), reviewsController.updateReviewStatus);
router.delete("/admin/reviews/:id", requireAdmin, validateRequest(reviewIdParamSchema), reviewsController.deleteReview);

export default router;

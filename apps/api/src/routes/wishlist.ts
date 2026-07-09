import { Router } from "express";
import { requireAuth } from "../lib/auth-middleware";
import { validateRequest } from "../middlewares/validateRequest";
import { wishlistController } from "../controllers/wishlist.controller";
import {
  addWishlistItemSchema,
  removeWishlistItemSchema
} from "../schemas/wishlist.schema";

const router = Router();

router.get("/wishlist", requireAuth, wishlistController.getWishlist);
router.post("/wishlist/items", requireAuth, validateRequest(addWishlistItemSchema), wishlistController.addItem);
router.delete("/wishlist/items/:productId", requireAuth, validateRequest(removeWishlistItemSchema), wishlistController.removeItem);

export default router;

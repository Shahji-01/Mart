import { Router } from "express";
import { requireAuth } from "../lib/auth-middleware";
import { validateRequest } from "../middlewares/validateRequest";
import { cartController } from "../controllers/cart.controller";
import {
  addToCartSchema,
  updateCartItemSchema,
  applyCouponSchema,
  cartItemParamSchema,
  setPincodeSchema
} from "../schemas/cart.schema";
// Exporting for orders module backwards compatibility
export { buildCart } from "../services/cart.service";

const router = Router();

router.get("/cart", requireAuth, cartController.getCart);
router.get("/cart/coupon-suggestions", requireAuth, cartController.getCouponSuggestions);
router.post("/cart/items", requireAuth, validateRequest(addToCartSchema), cartController.addItemToCart);
router.patch("/cart/items/:variantId", requireAuth, validateRequest(updateCartItemSchema), cartController.updateItemQuantity);
router.delete("/cart/items/:variantId", requireAuth, validateRequest(cartItemParamSchema), cartController.removeItem);
router.delete("/cart/clear", requireAuth, cartController.clearCart);
router.post("/cart/apply-coupon", requireAuth, validateRequest(applyCouponSchema), cartController.applyCoupon);
router.post("/cart/remove-coupon", requireAuth, cartController.removeCoupon);
router.post("/cart/pincode", requireAuth, validateRequest(setPincodeSchema), cartController.setPincode);

export default router;

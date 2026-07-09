import { Router } from "express";
import { requireAuth, requireAdmin } from "../lib/auth-middleware";
import { validateRequest } from "../middlewares/validateRequest";
import { cacheMiddleware } from "../middlewares/cache";
import { productsController } from "../controllers/products.controller";
import {
  getProductsQuerySchema,
  searchSuggestionsQuerySchema,
  productIdParamSchema,
  variantIdParamSchema,
  createProductSchema,
  updateProductSchema,
  updateVariantStockSchema,
  updateVariantPriceSchema,
  updateVariantDetailsSchema,
  bulkUpdatePriceSchema
} from "../schemas/products.schema";

const router = Router();

router.get("/products", validateRequest(getProductsQuerySchema), cacheMiddleware, productsController.getProducts);
router.get("/products/buy-again", requireAuth, productsController.getBuyAgain);
router.get("/products/featured", cacheMiddleware, productsController.getFeaturedProducts);
router.get("/products/search-suggestions", validateRequest(searchSuggestionsQuerySchema), productsController.getSearchSuggestions);
router.get("/products/:id/related", validateRequest(productIdParamSchema), productsController.getRelatedProducts);
router.get("/products/:id", validateRequest(productIdParamSchema), productsController.getProductById);

router.post("/products", requireAdmin, validateRequest(createProductSchema), productsController.createProduct);
router.post("/products/:id/duplicate", requireAdmin, validateRequest(productIdParamSchema), productsController.duplicateProduct);
router.patch("/products/:id", requireAdmin, validateRequest(updateProductSchema), productsController.updateProduct);
router.delete("/products/:id", requireAdmin, validateRequest(productIdParamSchema), productsController.deleteProduct);

router.patch("/products/variants/:variantId/stock", requireAdmin, validateRequest(updateVariantStockSchema), productsController.updateVariantStock);
router.patch("/products/variants/:variantId/price", requireAdmin, validateRequest(updateVariantPriceSchema), productsController.updateVariantPrice);
router.patch("/products/variants/:variantId/details", requireAdmin, validateRequest(updateVariantDetailsSchema), productsController.updateVariantDetails);
router.patch("/products/:id/variants/bulk-price", requireAdmin, validateRequest(bulkUpdatePriceSchema), productsController.bulkUpdateVariantPrice);

router.post("/products/variants/:variantId/notify-me", requireAuth, validateRequest(variantIdParamSchema), productsController.notifyMe);

export default router;

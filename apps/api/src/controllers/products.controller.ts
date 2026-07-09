import type { Request, Response, NextFunction } from "express";
import { productsService } from "../services/products.service";
import { stockNotificationsService } from "../services/stock-notifications.service";
import { getValidated } from "../lib/get-validated";

export class ProductsController {
  async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { categoryId, search, inStock, page, limit } = getValidated(req).query as any;
      const result = await productsService.getProducts({
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        search,
        inStock: inStock === "true",
        page: Math.max(1, parseInt(page)),
        limit: Math.min(100, Math.max(1, parseInt(limit))) // Cap limit to 100
      });
      res.json(result);
    } catch (err) { next(err); }
  }

  async getFeaturedProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productsService.getFeaturedProducts();
      res.json(result);
    } catch (err) { next(err); }
  }

  async getBuyAgain(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      res.json(await productsService.getBuyAgain(req.user.userId));
    } catch (err) { next(err); }
  }

  async getSearchSuggestions(req: Request, res: Response, next: NextFunction) {
    try {
      const { q } = getValidated(req).query as any;
      const result = await productsService.getSearchSuggestions(q);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getRelatedProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      const result = await productsService.getRelatedProducts(parseInt(id as string));
      if (!result) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      res.json(result);
    } catch (err) { next(err); }
  }

  async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      const result = await productsService.getProductById(parseInt(id as string));
      if (!result) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      res.json(result);
    } catch (err) { next(err); }
  }

  async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productsService.createProduct(req.body);
      res.status(201).json(result);
    } catch (err) { next(err); }
  }

  async duplicateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      const result = await productsService.duplicateProduct(parseInt(id as string));
      if (!result) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      res.status(201).json(result);
    } catch (err) { next(err); }
  }

  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      if (Object.keys(req.body).length === 0) {
        res.status(400).json({ error: "No fields to update" });
        return;
      }
      
      const updates = { ...req.body };
      if (updates.images) {
        updates.images = JSON.stringify(updates.images);
      }
      
      const result = await productsService.updateProduct(parseInt(id as string), updates);
      if (!result) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      res.json(result);
    } catch (err) { next(err); }
  }

  async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      await productsService.deleteProduct(parseInt(id as string));
      res.status(204).send();
    } catch (err) { next(err); }
  }

  async updateVariantStock(req: Request, res: Response, next: NextFunction) {
    try {
      const { variantId } = getValidated(req).params;
      const { stock } = req.body;
      const result = await productsService.updateVariantStock(parseInt(variantId as string), stock);
      if (!result) {
        res.status(404).json({ error: "Variant not found" });
        return;
      }
      res.json(result);
    } catch (err) { next(err); }
  }

  async updateVariantPrice(req: Request, res: Response, next: NextFunction) {
    try {
      const { variantId } = getValidated(req).params;
      const { price, mrp } = req.body;
      const result = await productsService.updateVariantPrice(parseInt(variantId as string), price, mrp);
      if (!result) {
        res.status(404).json({ error: "Variant not found" });
        return;
      }
      res.json(result);
    } catch (err) { next(err); }
  }

  async updateVariantDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { variantId } = getValidated(req).params;
      const { unit, unitValue } = req.body;
      const result = await productsService.updateVariantDetails(parseInt(variantId as string), unit, unitValue);
      if (!result) {
        res.status(404).json({ error: "Variant not found" });
        return;
      }
      res.json(result);
    } catch (err) { next(err); }
  }

  async bulkUpdateVariantPrice(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      const { priceMultiplier, flatPrice } = req.body;
      const result = await productsService.bulkUpdateVariantPrice(parseInt(id as string), priceMultiplier, flatPrice);
      res.json(result);
    } catch (err) { next(err); }
  }

  // R28 — back-in-stock subscription. Persists a (user, variant) subscription,
  // deduped per the unique (user_id, variant_id) index via onConflictDoNothing.
  async notifyMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const { variantId } = getValidated(req).params;
      const result = await stockNotificationsService.subscribe(req.user.userId, parseInt(variantId as string));
      if (!result) { res.status(404).json({ error: "Variant not found" }); return; }
      res.status(201).json({
        message: "You'll be notified when this item is back in stock.",
        subscribed: true,
      });
    } catch (err) { next(err); }
  }
}

export const productsController = new ProductsController();

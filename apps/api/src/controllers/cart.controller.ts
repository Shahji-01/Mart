import type { Request, Response, NextFunction } from "express";
import { cartService } from "../services/cart.service";
import { getValidated } from "../lib/get-validated";

export class CartController {
  async getCart(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const result = await cartService.getCart(req.user.userId);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getCouponSuggestions(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const result = await cartService.getCouponSuggestions(req.user.userId);
      res.json(result);
    } catch (err) { next(err); }
  }

  async addItemToCart(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const result = await cartService.addItemToCart(req.user.userId, req.body);
      res.json(result);
    } catch (err: any) {
      if (err.message === "Variant not found") res.status(404).json({ error: err.message });
      else if (err.message === "Item is out of stock") res.status(400).json({ error: err.message });
      else next(err);
    }
  }

  async updateItemQuantity(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const { variantId } = getValidated(req).params;
      const { quantity } = req.body;
      const result = await cartService.updateItemQuantity(req.user.userId, parseInt(variantId as string), quantity);
      res.json(result);
    } catch (err) { next(err); }
  }

  async removeItem(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const { variantId } = getValidated(req).params;
      const result = await cartService.removeItem(req.user.userId, parseInt(variantId as string));
      res.json(result);
    } catch (err) { next(err); }
  }

  async clearCart(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const result = await cartService.clearCart(req.user.userId);
      res.json(result);
    } catch (err) { next(err); }
  }

  async applyCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const { code } = req.body;
      const result = await cartService.applyCoupon(req.user.userId, code);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to apply coupon" });
    }
  }

  async removeCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const result = await cartService.removeCoupon(req.user.userId);
      res.json(result);
    } catch (err) { next(err); }
  }

  async setPincode(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const { pincode } = req.body;
      const result = await cartService.setPincode(req.user.userId, pincode);
      res.json(result);
    } catch (err) { next(err); }
  }
}

export const cartController = new CartController();

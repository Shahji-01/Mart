import type { Request, Response, NextFunction } from "express";
import { wishlistService } from "../services/wishlist.service";
import { getValidated } from "../lib/get-validated";

export class WishlistController {
  async getWishlist(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const result = await wishlistService.getWishlist(req.user.userId);
      res.json(result);
    } catch (err) { next(err); }
  }

  async addItem(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const { productId } = req.body;
      const result = await wishlistService.addItem(req.user.userId, productId);
      res.json(result);
    } catch (err) { next(err); }
  }

  async removeItem(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const { productId } = getValidated(req).params;
      await wishlistService.removeItem(req.user.userId, parseInt(productId as string));
      res.status(204).send();
    } catch (err) { next(err); }
  }
}

export const wishlistController = new WishlistController();

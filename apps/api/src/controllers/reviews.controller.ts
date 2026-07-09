import type { Request, Response, NextFunction } from "express";
import { reviewsService } from "../services/reviews.service";
import { getValidated } from "../lib/get-validated";

export class ReviewsController {
  async getProductReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      const isAdmin = req.headers.authorization ? true : false;
      const result = await reviewsService.getProductReviews(parseInt(id as string), isAdmin);
      res.json(result);
    } catch (err) { next(err); }
  }

  async createReview(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const { id } = getValidated(req).params;
      const result = await reviewsService.createReview(req.user.userId, parseInt(id as string), req.body);
      res.status(201).json(result);
    } catch (err: any) {
      if (err.message.includes("already reviewed")) {
        res.status(400).json({ error: err.message });
      } else {
        next(err);
      }
    }
  }

  async getAdminReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = getValidated(req).query as any;
      const result = await reviewsService.getAdminReviews(status);
      res.json(result);
    } catch (err) { next(err); }
  }

  async updateReviewStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      const { isApproved } = req.body;
      const result = await reviewsService.updateReviewStatus(parseInt(id as string), isApproved);
      if (!result) { res.status(404).json({ error: "Review not found" }); return; }
      res.json(result);
    } catch (err) { next(err); }
  }

  async deleteReview(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      await reviewsService.deleteReview(parseInt(id as string));
      res.status(204).send();
    } catch (err) { next(err); }
  }
}

export const reviewsController = new ReviewsController();

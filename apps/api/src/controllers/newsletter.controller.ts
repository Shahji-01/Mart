import type { Request, Response, NextFunction } from "express";
import { newsletterService } from "../services/newsletter.service";

export class NewsletterController {
  async subscribe(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name } = req.body;
      const result = await newsletterService.subscribe(email, name);
      res.status(result.message === "Subscribed successfully" ? 201 : 200).json(result);
    } catch (err) { next(err); }
  }

  async unsubscribe(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const result = await newsletterService.unsubscribe(email);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getSubscribers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await newsletterService.getSubscribers();
      res.json(result);
    } catch (err) { next(err); }
  }
}

export const newsletterController = new NewsletterController();

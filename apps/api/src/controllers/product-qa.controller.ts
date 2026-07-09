import type { Request, Response, NextFunction } from "express";
import { productQaService } from "../services/product-qa.service";
import { getValidated } from "../lib/get-validated";

export class ProductQaController {
  async getAllQas(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productQaService.getAllQas();
      res.json(result);
    } catch (err) { next(err); }
  }

  async getProductQas(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId } = getValidated(req).params;
      const result = await productQaService.getProductQas(parseInt(productId as string));
      res.json(result);
    } catch (err) { next(err); }
  }

  async createQa(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const { productId } = getValidated(req).params;
      const { question } = req.body;
      const result = await productQaService.createQa(parseInt(productId as string), req.user.userId, question);
      res.status(201).json(result);
    } catch (err) { next(err); }
  }

  async answerQa(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const { id } = getValidated(req).params;
      const { answer } = req.body;
      const result = await productQaService.answerQa(parseInt(id as string), req.user.userId, answer);
      if (!result) { res.status(404).json({ error: "Not found" }); return; }
      res.json(result);
    } catch (err) { next(err); }
  }

  async deleteQa(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      await productQaService.deleteQa(parseInt(id as string));
      res.status(204).send();
    } catch (err) { next(err); }
  }
}

export const productQaController = new ProductQaController();

import type { Request, Response, NextFunction } from "express";
import { categoriesService } from "../services/categories.service";
import { getValidated } from "../lib/get-validated";

export class CategoriesController {
  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await categoriesService.getCategories();
      res.json(result);
    } catch (err) { next(err); }
  }

  async getCategoryById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      const result = await categoriesService.getCategoryById(parseInt(id as string));
      if (!result) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json(result);
    } catch (err) { next(err); }
  }

  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await categoriesService.createCategory(req.body);
      res.status(201).json(result);
    } catch (err) { next(err); }
  }

  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      if (Object.keys(req.body).length === 0) {
        res.status(400).json({ error: "No fields to update" });
        return;
      }
      const result = await categoriesService.updateCategory(parseInt(id as string), req.body);
      if (!result) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json(result);
    } catch (err) { next(err); }
  }

  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      await categoriesService.deleteCategory(parseInt(id as string));
      res.status(204).send();
    } catch (err) { next(err); }
  }
}

export const categoriesController = new CategoriesController();

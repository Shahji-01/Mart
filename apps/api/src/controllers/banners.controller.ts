import type { Request, Response, NextFunction } from "express";
import { bannersService } from "../services/banners.service";
import { getValidated } from "../lib/get-validated";

export class BannersController {
  async getActiveBanners(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await bannersService.getActiveBanners();
      res.json(result);
    } catch (err) { next(err); }
  }

  async getAllBanners(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await bannersService.getAllBanners();
      res.json(result);
    } catch (err) { next(err); }
  }

  async createBanner(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await bannersService.createBanner(req.body);
      res.status(201).json(result);
    } catch (err) { next(err); }
  }

  async updateBanner(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      const result = await bannersService.updateBanner(parseInt(id as string), req.body);
      if (!result) { res.status(404).json({ error: "Not found" }); return; }
      res.json(result);
    } catch (err) { next(err); }
  }

  async deleteBanner(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      await bannersService.deleteBanner(parseInt(id as string));
      res.status(204).send();
    } catch (err) { next(err); }
  }
}

export const bannersController = new BannersController();

import type { Request, Response, NextFunction } from "express";
import { settingsService } from "../services/settings.service";

export class SettingsController {
  async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await settingsService.getSettings());
    } catch (err) { next(err); }
  }

  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await settingsService.updateSettings(req.body);
      res.json(result);
    } catch (err) { next(err); }
  }
}

export const settingsController = new SettingsController();

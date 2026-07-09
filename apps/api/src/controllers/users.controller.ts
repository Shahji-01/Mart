import type { Request, Response, NextFunction } from "express";
import { usersService } from "../services/users.service";
import { getValidated } from "../lib/get-validated";

export class UsersController {
  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, search } = getValidated(req).query as any;
      const result = await usersService.getUsers(parseInt(page), search);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      const result = await usersService.getUserById(parseInt(id as string));
      if (!result) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json(result);
    } catch (err) { next(err); }
  }

  async creditWallet(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      const { amount, description } = req.body;
      const balance = await usersService.creditWallet(parseInt(id as string), amount, description);
      res.json({ balance });
    } catch (err) { next(err); }
  }

  async creditLoyalty(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      const { points, description } = req.body;
      const loyaltyPoints = await usersService.creditLoyalty(parseInt(id as string), points, description);
      res.json({ loyaltyPoints });
    } catch (err) { next(err); }
  }

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const result = await usersService.getUserById(req.user.userId);
      if (!result) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json(result);
    } catch (err) { next(err); }
  }
}

export const usersController = new UsersController();

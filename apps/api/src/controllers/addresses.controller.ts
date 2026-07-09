import type { Request, Response, NextFunction } from "express";
import { addressesService } from "../services/addresses.service";
import { getValidated } from "../lib/get-validated";

export class AddressesController {
  async getAddresses(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const result = await addressesService.getAddresses(req.user.userId);
      res.json(result);
    } catch (err) { next(err); }
  }

  async createAddress(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const result = await addressesService.createAddress(req.user.userId, req.body);
      res.status(201).json(result);
    } catch (err) { next(err); }
  }

  async updateAddress(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const { id } = getValidated(req).params;
      const result = await addressesService.updateAddress(req.user.userId, parseInt(id as string), req.body);
      if (!result) { res.status(404).json({ error: "Not found" }); return; }
      res.json(result);
    } catch (err) { next(err); }
  }

  async deleteAddress(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const { id } = getValidated(req).params;
      await addressesService.deleteAddress(req.user.userId, parseInt(id as string));
      res.status(204).send();
    } catch (err) { next(err); }
  }
}

export const addressesController = new AddressesController();

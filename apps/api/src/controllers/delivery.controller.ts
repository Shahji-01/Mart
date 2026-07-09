import type { Request, Response, NextFunction } from "express";
import { deliveryService } from "../services/delivery.service";
import { getValidated } from "../lib/get-validated";

export class DeliveryController {
  async getDeliverySlots(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await deliveryService.getDeliverySlots(true);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getAdminDeliverySlots(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await deliveryService.getDeliverySlots(false);
      res.json(result);
    } catch (err) { next(err); }
  }

  async createDeliverySlot(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await deliveryService.createDeliverySlot(req.body);
      res.status(201).json(result);
    } catch (err) { next(err); }
  }

  async updateDeliverySlot(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      const result = await deliveryService.updateDeliverySlot(parseInt(id as string), req.body);
      if (!result) { res.status(404).json({ error: "Not found" }); return; }
      res.json(result);
    } catch (err) { next(err); }
  }

  async deleteDeliverySlot(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      await deliveryService.deleteDeliverySlot(parseInt(id as string));
      res.status(204).send();
    } catch (err) { next(err); }
  }

  async getDeliveryZones(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await deliveryService.getDeliveryZones();
      res.json(result);
    } catch (err) { next(err); }
  }

  async createDeliveryZone(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await deliveryService.createDeliveryZone(req.body);
      res.status(201).json(result);
    } catch (err) { next(err); }
  }

  async updateDeliveryZone(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      const result = await deliveryService.updateDeliveryZone(parseInt(id as string), req.body);
      if (!result) { res.status(404).json({ error: "Not found" }); return; }
      res.json(result);
    } catch (err) { next(err); }
  }

  async deleteDeliveryZone(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      await deliveryService.deleteDeliveryZone(parseInt(id as string));
      res.status(204).send();
    } catch (err) { next(err); }
  }

  async checkPincode(req: Request, res: Response, next: NextFunction) {
    try {
      const { pincode } = getValidated(req).query;
      const result = await deliveryService.checkPincode(String(pincode ?? ""));
      res.json(result);
    } catch (err) { next(err); }
  }
}

export const deliveryController = new DeliveryController();

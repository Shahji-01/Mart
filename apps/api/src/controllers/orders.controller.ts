import type { Request, Response, NextFunction } from "express";
import { ordersService, OrderStatusTransitionError } from "../services/orders.service";
import { orderMessagesService } from "../services/order-messages.service";
import { invoiceService } from "../services/invoice.service";
import { getValidated } from "../lib/get-validated";

export class OrdersController {
  async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const isAdmin = req.user.role === "admin";
      const { status, page, limit } = getValidated(req).query as any;
      
      const filters = {
        status,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      };
      
      const result = await ordersService.getOrders(req.user.userId, isAdmin, filters);
      res.json(result);
    } catch (err) { next(err); }
  }

  async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const result = await ordersService.createOrder(req.user.userId, req.body);
      res.status(201).json(result);
    } catch (err: any) {
      if (err.message.includes("is empty") || err.message.includes("Insufficient stock") || err.message.includes("not found") || err.message.includes("usage limit")) {
        res.status(400).json({ error: err.message });
      } else {
        next(err);
      }
    }
  }

  async getOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const isAdmin = req.user.role === "admin";
      const { id } = getValidated(req).params;
      
      const result = await ordersService.getOrderById(parseInt(id as string), req.user.userId, isAdmin);
      if (!result) { res.status(404).json({ error: "Not found" }); return; }
      res.json(result);
    } catch (err: any) {
      if (err.message === "Forbidden") {
        res.status(403).json({ error: err.message });
        return;
      }
      next(err);
    }
  }

  async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      const { status } = req.body;
      const result = await ordersService.updateOrderStatus(parseInt(id as string), status);
      if (!result) { res.status(404).json({ error: "Not found" }); return; }
      res.json(result);
    } catch (err: any) {
      if (err instanceof OrderStatusTransitionError) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  }

  async cancelOrder(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const isAdmin = req.user.role === "admin";
      const { id } = getValidated(req).params;
      
      const result = await ordersService.cancelOrder(parseInt(id as string), req.user.userId, isAdmin);
      if (!result) { res.status(404).json({ error: "Not found" }); return; }
      res.json(result);
    } catch (err: any) {
      if (err.message === "Forbidden") res.status(403).json({ error: err.message });
      else if (err.message.includes("Cannot cancel") || err.message.includes("already cancelled")) res.status(400).json({ error: err.message });
      else next(err);
    }
  }

  async reorder(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const { id } = getValidated(req).params;
      const result = await ordersService.reorder(parseInt(id as string), req.user.userId);
      if (!result) { res.status(404).json({ error: "Order not found" }); return; }
      res.json(result);
    } catch (err: any) {
      if (err.message === "Forbidden") res.status(403).json({ error: err.message });
      else if (err.message === "No items in order") res.status(400).json({ error: err.message });
      else next(err);
    }
  }

  async getInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const isAdmin = req.user.role === "admin";
      const { id } = getValidated(req).params;
      const order = await ordersService.getOrderById(parseInt(id as string), req.user.userId, isAdmin);
      if (!order) { res.status(404).json({ error: "Not found" }); return; }

      await invoiceService.generateInvoice(order, res);
    } catch (err: any) { next(err); }
  }

  async updateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getValidated(req).params;
      const { lat, lng } = req.body;
      const result = await ordersService.updateRiderLocation(parseInt(id as string), lat, lng);
      if (!result) { res.status(404).json({ error: "Order not found" }); return; }
      res.json(result);
    } catch (err) { next(err); }
  }

  async listMessages(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const { id } = getValidated(req).params;
      const result = await orderMessagesService.list(parseInt(id as string), req.user.userId, req.user.role === "admin");
      if (result === null) { res.status(404).json({ error: "Order not found" }); return; }
      res.json(result);
    } catch (err) { next(err); }
  }

  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const { id } = getValidated(req).params;
      const { message } = req.body;
      const result = await orderMessagesService.send(parseInt(id as string), req.user.userId, req.user.role === "admin", message);
      if (result === null) { res.status(404).json({ error: "Order not found" }); return; }
      res.status(201).json(result);
    } catch (err) { next(err); }
  }
}

export const ordersController = new OrdersController();

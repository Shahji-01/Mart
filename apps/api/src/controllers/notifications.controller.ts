import type { Request, Response, NextFunction } from "express";
import { notificationsService } from "../services/notifications.service";
import { getValidated } from "../lib/get-validated";

export class NotificationsController {
  async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const result = await notificationsService.getNotifications(req.user.userId);
      res.json(result);
    } catch (err) { next(err); }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      await notificationsService.markAllAsRead(req.user.userId);
      res.json({ message: "All notifications marked as read" });
    } catch (err) { next(err); }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const { id } = getValidated(req).params;
      const result = await notificationsService.markAsRead(parseInt(id as string), req.user.userId);
      if (!result) { res.status(404).json({ error: "Not found" }); return; }
      res.json(result);
    } catch (err) { next(err); }
  }

  async deleteNotification(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const { id } = getValidated(req).params;
      await notificationsService.deleteNotification(parseInt(id as string), req.user.userId);
      res.status(204).send();
    } catch (err) { next(err); }
  }

  async sendAdminNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await notificationsService.sendAdminNotifications(req.body);
      res.json(result);
    } catch (err) { next(err); }
  }

  async notifyMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const { id } = getValidated(req).params;
      await notificationsService.registerNotifyMe(parseInt(id as string), req.user.userId);
      res.json({ message: "You'll be notified when this item is back in stock!" });
    } catch (err) { next(err); }
  }
}

export const notificationsController = new NotificationsController();

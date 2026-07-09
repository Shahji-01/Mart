import { Router } from "express";
import { requireAuth, requireAdmin } from "../lib/auth-middleware";
import { validateRequest } from "../middlewares/validateRequest";
import { notificationsController } from "../controllers/notifications.controller";
import {
  notificationIdParamSchema,
  sendNotificationSchema,
  variantIdParamSchema
} from "../schemas/notifications.schema";

const router = Router();

router.get("/notifications", requireAuth, notificationsController.getNotifications);
router.patch("/notifications/read-all", requireAuth, notificationsController.markAllAsRead);
router.patch("/notifications/:id/read", requireAuth, validateRequest(notificationIdParamSchema), notificationsController.markAsRead);
router.delete("/notifications/:id", requireAuth, validateRequest(notificationIdParamSchema), notificationsController.deleteNotification);

router.post("/admin/notifications/send", requireAdmin, validateRequest(sendNotificationSchema), notificationsController.sendAdminNotifications);
router.post("/products/variants/:id/notify-me", requireAuth, validateRequest(variantIdParamSchema), notificationsController.notifyMe);

export default router;

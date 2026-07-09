import { Router } from "express";
import { requireAuth, requireAdmin } from "../lib/auth-middleware";
import { validateRequest } from "../middlewares/validateRequest";
import { ordersController } from "../controllers/orders.controller";
import {
  getOrdersQuerySchema,
  createOrderSchema,
  orderIdParamSchema,
  updateOrderStatusSchema,
  updateOrderLocationSchema,
  orderMessageSchema
} from "../schemas/orders.schema";

const router = Router();

router.get("/orders", requireAuth, validateRequest(getOrdersQuerySchema), ordersController.getOrders);
router.post("/orders", requireAuth, validateRequest(createOrderSchema), ordersController.createOrder);
router.get("/orders/:id", requireAuth, validateRequest(orderIdParamSchema), ordersController.getOrderById);
router.patch("/orders/:id/status", requireAdmin, validateRequest(updateOrderStatusSchema), ordersController.updateOrderStatus);
router.post("/orders/:id/location", requireAdmin, validateRequest(updateOrderLocationSchema), ordersController.updateLocation);
router.post("/orders/:id/cancel", requireAuth, validateRequest(orderIdParamSchema), ordersController.cancelOrder);
router.post("/orders/:id/reorder", requireAuth, validateRequest(orderIdParamSchema), ordersController.reorder);
router.get("/orders/:id/invoice", requireAuth, validateRequest(orderIdParamSchema), ordersController.getInvoice);
router.get("/orders/:id/messages", requireAuth, validateRequest(orderIdParamSchema), ordersController.listMessages);
router.post("/orders/:id/messages", requireAuth, validateRequest(orderMessageSchema), ordersController.sendMessage);

export default router;

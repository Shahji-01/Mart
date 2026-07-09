import { z } from "zod";

export const getOrdersQuerySchema = z.object({
  query: z.object({
    status: z.string().optional(),
    page: z.string().optional().default("1"),
    limit: z.string().optional().default("50"),
  }),
});

export const createOrderSchema = z.object({
  body: z.object({
    address: z.string().min(1, "Address is required"),
    paymentMethod: z.string().min(1, "Payment method is required"),
    couponCode: z.string().optional().nullable(),
    deliverySlot: z.string().optional().nullable(),
    useWallet: z.boolean().optional(),
    useLoyaltyPoints: z.boolean().optional(),
    idempotencyKey: z.string().uuid().optional(),
    notes: z.string().max(1000, "Note is too long").optional(),
    // Razorpay payment proof (verified server-side for online orders).
    razorpayOrderId: z.string().optional(),
    razorpayPaymentId: z.string().optional(),
    razorpaySignature: z.string().optional(),
  }),
});

export const orderIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
});

export const updateOrderLocationSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
  body: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
});

export const orderMessageSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
  body: z.object({
    message: z.string().min(1, "Message is required").max(1000),
  }),
});

export const updateOrderStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
  body: z.object({
    status: z.enum(["pending", "confirmed", "processing", "out_for_delivery", "delivered", "cancelled"]),
  }),
});

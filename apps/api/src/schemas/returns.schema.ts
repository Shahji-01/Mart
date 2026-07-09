import { z } from "zod";

export const createReturnSchema = z.object({
  body: z.object({
    orderId: z.number().int().positive("Order ID is required"),
    reason: z.string().min(1, "Reason is required"),
  }),
});

export const updateReturnSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
  body: z.object({
    status: z.enum(["pending", "approved", "rejected", "processed"]),
    adminNote: z.string().optional(),
    // Refund amount must be non-negative when supplied (R5.3). The upper bound
    // (<= amount paid) is enforced in the service against the order total.
    refundAmount: z.union([
      z.number().nonnegative("Refund amount cannot be negative"),
      z.string().regex(/^\d+(\.\d+)?$/, "Refund amount must be a non-negative number"),
    ]).optional(),
    creditWallet: z.boolean().optional(),
  }),
});

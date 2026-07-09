import { z } from "zod";

export const createDeliverySlotSchema = z.object({
  body: z.object({
    label: z.string().min(1, "Label is required"),
    timeRange: z.string().min(1, "Time range is required"),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  }),
});

export const updateDeliverySlotSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
  body: z.object({
    label: z.string().optional(),
    timeRange: z.string().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  }),
});

export const createDeliveryZoneSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    pincodes: z.string().min(1, "Pincodes are required"),
    deliveryFee: z.number().nonnegative().optional(),
    minOrderForFree: z.number().nonnegative().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateDeliveryZoneSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
  body: z.object({
    name: z.string().optional(),
    pincodes: z.string().optional(),
    deliveryFee: z.number().nonnegative().optional(),
    minOrderForFree: z.number().nonnegative().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const deliveryIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
});

export const checkPincodeSchema = z.object({
  query: z.object({
    pincode: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  }),
});

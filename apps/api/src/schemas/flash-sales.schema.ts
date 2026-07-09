import { z } from "zod";

export const getFlashSalesSchema = z.object({
  query: z.object({
    active: z.string().optional(),
  }),
});

export const flashSaleIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
});

export const createFlashSaleSchema = z.object({
  body: z.object({
    label: z.string().min(1, "Label is required"),
    productId: z.number().int().positive("Product ID is required"),
    discountType: z.enum(["percentage", "fixed"]).optional(),
    discountValue: z.number().positive("Discount value must be positive"),
    startsAt: z.string().min(1, "startsAt is required"),
    endsAt: z.string().min(1, "endsAt is required"),
    isActive: z.boolean().optional(),
  }),
});

export const updateFlashSaleSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
  body: z.object({
    label: z.string().optional(),
    discountType: z.enum(["percentage", "fixed"]).optional(),
    discountValue: z.number().positive().optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

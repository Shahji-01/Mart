import { z } from "zod";

export const addToCartSchema = z.object({
  body: z.object({
    productId: z.number().int().positive(),
    variantId: z.number().int().positive(),
    quantity: z.number().int().positive("Quantity must be at least 1"),
  }),
});

export const updateCartItemSchema = z.object({
  params: z.object({
    variantId: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
  body: z.object({
    quantity: z.number().int().nonnegative(),
  }),
});

export const applyCouponSchema = z.object({
  body: z.object({
    code: z.string().min(1, "Coupon code is required"),
  }),
});

export const cartItemParamSchema = z.object({
  params: z.object({
    variantId: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
});

export const setPincodeSchema = z.object({
  body: z.object({
    pincode: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  }),
});

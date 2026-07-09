import { z } from "zod";

export const addWishlistItemSchema = z.object({
  body: z.object({
    productId: z.number().int().positive("productId must be a positive integer"),
  }),
});

export const removeWishlistItemSchema = z.object({
  params: z.object({
    productId: z.string().regex(/^\d+$/, "productId must be a number"),
  }),
});

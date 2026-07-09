import { z } from "zod";

export const productIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "productId must be a number"),
  }),
});

export const createReviewSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "productId must be a number"),
  }),
  body: z.object({
    rating: z.number().int().min(1).max(5, "Rating must be 1–5"),
    comment: z.string().optional(),
    images: z.array(z.string().url("Must be valid URLs")).optional(),
  }),
});

export const getAdminReviewsSchema = z.object({
  query: z.object({
    status: z.enum(["pending", "approved"]).optional(),
  }),
});

export const reviewIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "review ID must be a number"),
  }),
});

export const updateReviewStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "review ID must be a number"),
  }),
  body: z.object({
    isApproved: z.boolean(),
  }),
});

import { z } from "zod";

export const categoryIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
});

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    slug: z.string().min(1, "Slug is required"),
    imageUrl: z.string().url("Must be a valid URL").optional().nullable(),
    description: z.string().optional().nullable(),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
  body: z.object({
    name: z.string().optional(),
    slug: z.string().optional(),
    imageUrl: z.string().url("Must be a valid URL").optional().nullable(),
    description: z.string().optional().nullable(),
  }),
});

import { z } from "zod";

export const createBannerSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required"),
    imageUrl: z.string().url("Must be a valid URL"),
    linkUrl: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
    startsAt: z.string().optional().nullable(),
    endsAt: z.string().optional().nullable(),
  }),
});

export const updateBannerSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
  body: z.object({
    title: z.string().optional(),
    imageUrl: z.string().url("Must be a valid URL").optional(),
    linkUrl: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
    startsAt: z.string().optional().nullable(),
    endsAt: z.string().optional().nullable(),
  }),
});

export const bannerIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
});

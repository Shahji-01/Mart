import { z } from "zod";

export const notificationIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
});

export const sendNotificationSchema = z.object({
  body: z.object({
    message: z.string().min(1, "Message is required"),
    type: z.string().optional(),
    userIds: z.array(z.number().int()).optional(),
  }),
});

export const variantIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Variant ID must be a number"),
  }),
});

import { z } from "zod";

export const addressIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
});

export const createAddressSchema = z.object({
  body: z.object({
    label: z.string().optional(),
    recipientName: z.string().min(1, "Recipient name is required"),
    phone: z.string().min(1, "Phone is required"),
    street: z.string().min(1, "Street is required"),
    landmark: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().min(1, "Pincode is required"),
    isDefault: z.boolean().optional(),
  }),
});

export const updateAddressSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
  body: z.object({
    label: z.string().optional(),
    recipientName: z.string().optional(),
    phone: z.string().optional(),
    street: z.string().optional(),
    landmark: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    isDefault: z.boolean().optional(),
  }),
});

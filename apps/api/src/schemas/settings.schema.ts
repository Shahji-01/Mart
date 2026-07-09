import { z } from "zod";

export const updateSettingsSchema = z.object({
  body: z.object({
    storeName: z.string().optional(),
    fullName: z.string().optional(),
    gstin: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email("Must be a valid email").optional(),
    address: z.string().optional(),
    openingHours: z.string().optional(),
    deliveryCutoff: z.string().optional(),
    lowStockThreshold: z.number().int().nonnegative().optional(),
    freeDeliveryAbove: z.number().nonnegative().optional(),
    deliveryFee: z.number().nonnegative().optional(),
    socialInstagram: z.string().optional(),
    socialFacebook: z.string().optional(),
    socialWhatsapp: z.string().optional(),
  }),
});

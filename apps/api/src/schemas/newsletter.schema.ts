import { z } from "zod";

export const subscribeSchema = z.object({
  body: z.object({
    email: z.string().email("Valid email required"),
    name: z.string().optional(),
  }),
});

export const unsubscribeSchema = z.object({
  body: z.object({
    email: z.string().email("Valid email required"),
  }),
});

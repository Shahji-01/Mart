import { z } from "zod";

export const exportOrdersSchema = z.object({
  query: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});

export const importProductsSchema = z.object({
  body: z.object({
    rows: z.array(z.any()).min(1, "rows array is required and must not be empty"),
  }),
});

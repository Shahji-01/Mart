import { z } from "zod";

export const revenueChartSchema = z.object({
  query: z.object({
    days: z.string().regex(/^\d+$/).optional(),
  }),
});

export const lowStockSchema = z.object({
  query: z.object({
    threshold: z.string().regex(/^\d+$/).optional(),
  }),
});

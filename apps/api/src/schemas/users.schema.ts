import { z } from "zod";

export const getUsersQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().default("1"),
    search: z.string().optional(),
  }),
});

export const userIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
});

export const walletCreditSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
  body: z.object({
    amount: z.number().positive("Amount must be positive"),
    description: z.string().optional(),
  }),
});

export const loyaltyCreditSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
  body: z.object({
    points: z.number().int().positive("Points must be a positive integer"),
    description: z.string().optional(),
  }),
});

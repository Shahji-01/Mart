import { z } from "zod";

export const productIdParamSchema = z.object({
  params: z.object({
    productId: z.string().regex(/^\d+$/, "Product ID must be a number"),
  }),
});

export const qaIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "QA ID must be a number"),
  }),
});

export const createQaSchema = z.object({
  params: z.object({
    productId: z.string().regex(/^\d+$/, "Product ID must be a number"),
  }),
  body: z.object({
    question: z.string().min(1, "Question is required"),
  }),
});

export const answerQaSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "QA ID must be a number"),
  }),
  body: z.object({
    answer: z.string().min(1, "Answer is required"),
  }),
});

import { z } from "zod";

export const validateReferralSchema = z.object({
  body: z.object({
    code: z.string().min(1, "code required"),
  }),
});

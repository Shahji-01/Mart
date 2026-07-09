import { z } from "zod";

// Canonical discount-type enum, aligned with the DB enum
// `discount_type ("percentage","flat")` and the generated OpenAPI contract.
const discountTypeEnum = z.enum(["percentage", "flat"]);

// A percentage coupon's value cannot exceed 100 (R16.3). Applied as a refine so
// it works whether `discountType`/`discountValue` are required (create) or
// optional (update).
function rejectPercentageOver100<T extends { discountType?: string; discountValue?: number }>(
  data: T,
  ctx: z.RefinementCtx,
): void {
  if (
    data.discountType === "percentage" &&
    typeof data.discountValue === "number" &&
    data.discountValue > 100
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["discountValue"],
      message: "Percentage discount cannot exceed 100",
    });
  }
}

export const createCouponSchema = z.object({
  body: z
    .object({
      code: z.string().min(1, "Code is required"),
      discountType: discountTypeEnum,
      discountValue: z.number().positive("Discount value must be positive"),
      minOrderValue: z.number().nonnegative().optional().nullable(),
      maxDiscount: z.number().positive().optional().nullable(),
      maxUsagePerUser: z.number().int().positive().optional().nullable(),
      isActive: z.boolean().optional(),
      expiresAt: z.string().optional().nullable(),
    })
    .superRefine(rejectPercentageOver100),
});

export const updateCouponSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
  body: z
    .object({
      code: z.string().optional(),
      discountType: discountTypeEnum.optional(),
      discountValue: z.number().positive().optional(),
      minOrderValue: z.number().nonnegative().optional().nullable(),
      maxDiscount: z.number().positive().optional().nullable(),
      maxUsagePerUser: z.number().int().positive().optional().nullable(),
      isActive: z.boolean().optional(),
      expiresAt: z.string().optional().nullable(),
    })
    .superRefine(rejectPercentageOver100),
});

export const couponIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
});

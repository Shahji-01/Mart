import { z } from "zod";

export const getProductsQuerySchema = z.object({
  query: z.object({
    categoryId: z.string().optional(),
    search: z.string().optional(),
    inStock: z.string().optional(),
    page: z.string().optional().default("1"),
    limit: z.string().optional().default("20"),
  }),
});

export const searchSuggestionsQuerySchema = z.object({
  query: z.object({
    q: z.string().min(2, "Search query must be at least 2 characters"),
  }),
});

export const productIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
});

export const variantIdParamSchema = z.object({
  params: z.object({
    variantId: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
});

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    slug: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    images: z.array(z.string()).optional(),
    categoryId: z.number().int().positive(),
    isFeatured: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    variants: z.array(
      z.object({
        unit: z.string(),
        unitValue: z.string(),
        price: z.number().nonnegative(),
        mrp: z.number().positive().optional(),
        sku: z.string().optional(),
        stock: z.number().int().nonnegative().optional(),
      })
    ).optional(),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
  body: z.object({
    name: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    images: z.array(z.string()).nullable().optional(),
    categoryId: z.number().int().positive().optional(),
    isFeatured: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const updateVariantStockSchema = z.object({
  params: z.object({
    variantId: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
  body: z.object({
    stock: z.number().int().nonnegative(),
  }),
});

export const bulkUpdatePriceSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number"),
  }),
  body: z.object({
    priceMultiplier: z.number().positive().optional(),
    flatPrice: z.number().positive().optional(),
  }).refine((data) => data.priceMultiplier !== undefined || data.flatPrice !== undefined, {
    message: "Either priceMultiplier or flatPrice must be provided",
  }),
});

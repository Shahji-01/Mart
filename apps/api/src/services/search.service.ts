import { Meilisearch } from "meilisearch";
import { env } from "../lib/env";
import { logger } from "../lib/logger";

let meilisearch: Meilisearch | null = null;
if (env.MEILISEARCH_HOST) {
  meilisearch = new Meilisearch({
    host: env.MEILISEARCH_HOST,
    apiKey: env.MEILISEARCH_API_KEY,
  });
}

export class SearchService {
  isConfigured() {
    return meilisearch !== null;
  }

  async indexProduct(product: any, categoryName: string) {
    if (!meilisearch) return;
    try {
      const index = meilisearch.index("products");
      await index.addDocuments([{
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        imageUrl: product.imageUrl,
        categoryId: product.categoryId,
        categoryName,
        isFeatured: product.isFeatured,
        tags: product.tags,
      }]);
    } catch (err) {
      logger.error({ err }, "Meilisearch index error");
    }
  }

  async removeProduct(id: number) {
    if (!meilisearch) return;
    try {
      await meilisearch.index("products").deleteDocument(id);
    } catch (err) {
      logger.error({ err }, "Meilisearch delete error");
    }
  }

  async search(query: string, options: { limit?: number; offset?: number; categoryId?: number } = {}) {
    if (!meilisearch) return null;
    try {
      const filters = [];
      if (options.categoryId) filters.push(`categoryId = ${options.categoryId}`);
      
      const searchRes = await meilisearch.index("products").search(query, {
        limit: options.limit || 20,
        offset: options.offset || 0,
        filter: filters.length > 0 ? filters : undefined,
      });
      return searchRes.hits.map((hit: any) => hit.id as number);
    } catch (err) {
      logger.error({ err }, "Meilisearch search error");
      return null;
    }
  }
}

export const searchService = new SearchService();

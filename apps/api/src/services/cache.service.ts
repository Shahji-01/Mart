import { LRUCache } from "lru-cache";

const options = {
  max: 500, // Maximum number of items in cache
  ttl: 1000 * 60 * 15, // Items live for 15 minutes
  allowStale: false,
};

export const cache = new LRUCache<string, any>(options);

export class CacheService {
  async getOrSet<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    const cached = cache.get(key);
    if (cached) return cached as T;

    const data = await fetchFn();
    cache.set(key, data);
    return data;
  }

  invalidate(keyPrefix: string) {
    for (const key of cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        cache.delete(key);
      }
    }
  }

  clear() {
    cache.clear();
  }
}

export const cacheService = new CacheService();

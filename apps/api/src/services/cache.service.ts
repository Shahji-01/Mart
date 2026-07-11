import { Redis } from "ioredis";
import { env } from "../lib/env";
import { logger } from "../lib/logger";

let redis: Redis | null = null;
if (env.REDIS_URL) {
  redis = new Redis(env.REDIS_URL);
  redis.on("error", (err) => logger.error({ err }, "Redis Client Error"));
  redis.on("connect", () => logger.info("Redis Client Connected"));
} else {
  logger.warn("REDIS_URL not set, falling back to in-memory cache");
}

// Simple in-memory fallback if Redis is not available
const memoryCache = new Map<string, { value: any; expiry: number }>();

export class CacheService {
  private ttlSeconds = 15 * 60; // 15 minutes

  async get(key: string): Promise<any> {
    if (redis) {
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } else {
      const cached = memoryCache.get(key);
      if (cached && cached.expiry > Date.now()) return cached.value;
      return null;
    }
  }

  async set(key: string, value: any): Promise<void> {
    if (redis) {
      await redis.set(key, JSON.stringify(value), "EX", this.ttlSeconds);
    } else {
      memoryCache.set(key, { value, expiry: Date.now() + this.ttlSeconds * 1000 });
    }
  }

  async getOrSet<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    if (redis) {
      const cached = await redis.get(key);
      if (cached) return JSON.parse(cached) as T;

      const data = await fetchFn();
      await redis.set(key, JSON.stringify(data), "EX", this.ttlSeconds);
      return data;
    } else {
      const cached = memoryCache.get(key);
      if (cached && cached.expiry > Date.now()) return cached.value as T;

      const data = await fetchFn();
      memoryCache.set(key, { value: data, expiry: Date.now() + this.ttlSeconds * 1000 });
      return data;
    }
  }

  async invalidate(keyPrefix: string) {
    if (redis) {
      const keys = await redis.keys(`${keyPrefix}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } else {
      for (const key of memoryCache.keys()) {
        if (key.startsWith(keyPrefix)) {
          memoryCache.delete(key);
        }
      }
    }
  }

  async clear() {
    if (redis) {
      await redis.flushdb();
    } else {
      memoryCache.clear();
    }
  }
}

export const cacheService = new CacheService();

import { LRUCache } from "lru-cache";
import type { Request, Response, NextFunction } from "express";

const cache = new LRUCache<string, any>({
  max: 100, // Maximum number of items
  ttl: 1000 * 60 * 5, // 5 minutes TTL
});

export const cacheMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.method !== "GET") {
    next();
    return;
  }

  const key = req.originalUrl;
  const cachedResponse = cache.get(key);

  if (cachedResponse) {
    res.json(cachedResponse);
    return;
  }

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    // Only cache successful responses
    if (res.statusCode >= 200 && res.statusCode < 300) {
      cache.set(key, body);
    }
    return originalJson(body);
  };

  next();
};

export const clearCache = () => {
  cache.clear();
};

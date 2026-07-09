import type { Request, Response, NextFunction } from "express";
import { cacheService, cache } from "../services/cache.service";

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
  cacheService.clear();
};

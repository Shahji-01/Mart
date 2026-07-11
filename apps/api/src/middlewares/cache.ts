import type { Request, Response, NextFunction } from "express";
import { cacheService } from "../services/cache.service";

export const cacheMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (req.method !== "GET") {
    next();
    return;
  }

  const key = req.originalUrl;
  const cachedResponse = await cacheService.get(key);

  if (cachedResponse) {
    res.json(cachedResponse);
    return;
  }

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    // Only cache successful responses
    if (res.statusCode >= 200 && res.statusCode < 300) {
      cacheService.set(key, body).catch(err => console.error("Cache set error", err));
    }
    return originalJson(body);
  };

  next();
};

export const clearCache = () => {
  cacheService.clear();
};

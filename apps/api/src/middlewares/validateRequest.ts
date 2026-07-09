import type { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { logger } from "../lib/logger";

export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // R22.4 — parse from the already-sanitized source when `xssMiddleware`
      // populated `req.validated`, otherwise fall back to the raw getters. This
      // makes the final `req.validated` hold sanitized + validated values.
      const parsed = schema.parse({
        body: req.body,
        query: req.validated?.query ?? req.query,
        params: req.validated?.params ?? req.params,
      }) as { body?: unknown; query?: unknown; params?: unknown };

      // R22.1 — store validated query/params on `req.validated` instead of
      // mutating `req.query`/`req.params` in place (no setter under Express 5).
      req.validated = req.validated ?? {};

      if (parsed.body !== undefined) {
        // `req.body` has a setter, so keep assigning it; also mirror it onto
        // `req.validated` so `getValidated` returns a consistent shape.
        req.body = parsed.body;
        req.validated.body = parsed.body;
      }
      if (parsed.query !== undefined) req.validated.query = parsed.query;
      if (parsed.params !== undefined) req.validated.params = parsed.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: "Validation Error", details: error.errors });
        return;
      } else {
        logger.error(error);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }
    }
  };
};

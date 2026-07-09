import type { Request } from "express";

/**
 * R22 — typed accessor for validated/sanitized request data.
 *
 * Under Express 5, `req.query` and `req.params` are read-only getters, so the
 * `validateRequest` and `xss` middlewares write their results onto a dedicated
 * `req.validated` property instead of mutating the request in place. This helper
 * centralizes reading those values, falling back to the raw request members
 * (`req.body` / `req.query` / `req.params`) when a part was not populated (for
 * example on routes without a `validateRequest` schema). The fallback keeps
 * behavior identical for routes that never run validation. (R22.2, R22.3)
 */
export function getValidated(req: Request): { body: any; query: any; params: any } {
  const validated = req.validated ?? {};
  return {
    body: validated.body ?? req.body,
    query: validated.query ?? req.query,
    params: validated.params ?? req.params,
  };
}

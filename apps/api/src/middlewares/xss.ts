import type { Request, Response, NextFunction } from "express";
import xss from "xss";

const sanitize = (obj: any): any => {
  if (typeof obj === "string") {
    return xss(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitize(item));
  }
  if (obj !== null && typeof obj === "object") {
    const sanitizedObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitizedObj[key] = sanitize(obj[key]);
      }
    }
    return sanitizedObj;
  }
  return obj;
};

// R22.4 — Under Express 5, `req.query`/`req.params` are read-only getters, so we
// no longer mutate them in place. `req.body` has a setter and is sanitized in
// place; sanitized query/params are written onto `req.validated` (merging) so
// downstream handlers consume the sanitized values via `getValidated(req)`.
// This runs globally before route matching, so `validateRequest` later parses
// from the already-sanitized `req.validated` source.
export const xssMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body) req.body = sanitize(req.body);

  req.validated = req.validated ?? {};

  if (req.query && Object.keys(req.query).length > 0) {
    req.validated.query = sanitize(req.query);
  }

  if (req.params && Object.keys(req.params).length > 0) {
    req.validated.params = sanitize(req.params);
  }

  next();
};

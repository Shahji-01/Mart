// R22 — Express 5 request validation persistence.
// Under Express 5, `req.query` (and `req.params`) are getters with no setter,
// so validated/sanitized values cannot be written back in place. Instead they
// are stored on a dedicated `req.validated` property. This augmentation types
// that property on the Express Request. It merges with the `req.user`
// augmentation declared in `lib/auth-middleware.ts`.
import "express";

declare global {
  namespace Express {
    interface Request {
      /**
       * Validated and/or sanitized request data, populated by `xssMiddleware`
       * and `validateRequest`. Read it through the `getValidated(req)` helper,
       * which falls back to the raw request members when a part is absent.
       */
      validated?: {
        body?: any;
        query?: any;
        params?: any;
      };
    }
  }
}

export {};

import { describe, it, expect, vi } from "vitest";
import fc from "fast-check";
import { z } from "zod";
import xss from "xss";

// The request middlewares transitively import `lib/env`, which validates a few
// env vars at module load. Provide harmless defaults (only when unset) before
// those imports are evaluated so this test runs with no real configuration.
// No database connection is opened.
vi.hoisted(() => {
  process.env.DATABASE_URL ||= "postgres://localhost:5432/test";
  process.env.SESSION_SECRET ||= "test-session-secret-please-change-0123456789";
});

import { xssMiddleware } from "../middlewares/xss";
import { validateRequest } from "../middlewares/validateRequest";
import { getValidated } from "../lib/get-validated";

// This test exercises ONLY the request middlewares (`xss` + `validateRequest`)
// and the pure `getValidated` accessor. It imports no database layer and runs
// with no DATABASE_URL configured.

const MIN_RUNS = 100;

// A schema that passes query string fields through validation unchanged, so the
// only transformation applied to the value is sanitization.
const schema = z.object({
  body: z.any().optional(),
  query: z.object({ q: z.string() }).passthrough().optional(),
  params: z.any().optional(),
});

type Middleware = (req: any, res: any, next: (err?: unknown) => void) => void;

// Drive a middleware to completion. Resolves when `next()` is called and
// rejects if `next(err)` is called or the response is short-circuited.
function run(mw: Middleware, req: any): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const res = {
      status() { return res; },
      json(payload: unknown) { reject(new Error(`response short-circuited: ${JSON.stringify(payload)}`)); return res; },
    };
    try {
      mw(req, res, (err?: unknown) => (err ? reject(err) : resolve()));
    } catch (e) {
      reject(e);
    }
  });
}

describe("Property 17: sanitized request values are the values used downstream", () => {
  // Feature: codebase-remediation, Property 17: Sanitized request values are the
  // values used downstream
  // Validates: Requirements 22.4
  it("Property 17: getValidated returns the sanitized query value after xss + validateRequest", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (raw) => {
        // Simulate an Express 5 request: query is the parsed query object.
        const req: any = { body: {}, query: { q: raw }, params: {}, headers: {} };

        // Global xss runs first, then the per-route validateRequest.
        await run(xssMiddleware, req);
        await run(validateRequest(schema), req);

        // The downstream handler reads through getValidated, which must return
        // the sanitized value, never the raw input.
        const { query } = getValidated(req);
        expect(query.q).toBe(xss(raw));
      }),
      { numRuns: MIN_RUNS },
    );
  });

  // Feature: codebase-remediation, Property 17: Sanitized request values are the
  // values used downstream
  // Validates: Requirements 22.4
  it("Property 17: HTML metacharacter inputs are sanitized (not passed through raw)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        async (inner) => {
          const raw = `<script>${inner}</script>`;
          const req: any = { body: {}, query: { q: raw }, params: {}, headers: {} };

          await run(xssMiddleware, req);
          await run(validateRequest(schema), req);

          const { query } = getValidated(req);
          // The downstream value matches the sanitized output and the dangerous
          // raw markup is not what the handler consumes.
          expect(query.q).toBe(xss(raw));
          expect(query.q).not.toContain("<script>");
        },
      ),
      { numRuns: MIN_RUNS },
    );
  });
});

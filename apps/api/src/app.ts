import express, { type Express } from "express";
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { env } from "./lib/env";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";
import { xssMiddleware } from "./middlewares/xss";
import cookieParser from "cookie-parser";
import { startCartReminderJob } from "./jobs/cart-reminder";

const app: Express = express();
startCartReminderJob();

// Honor X-Forwarded-* only when explicitly configured (e.g. behind Nginx/LB),
// so rate limiting keys on the real client IP without enabling IP spoofing
// when the server is directly exposed. Accepts a hop count ("1") or "true".
if (env.TRUST_PROXY) {
  const numericHops = Number(env.TRUST_PROXY);
  app.set("trust proxy", Number.isNaN(numericHops) ? env.TRUST_PROXY : numericHops);
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP, please try again after 15 minutes" },
});

app.use(helmet());
const allowedOrigins = env.ALLOWED_ORIGIN.split(',').map(o => o.trim());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(limiter);
app.use("/api/auth", authLimiter);
app.use(express.json({
  // Capture the raw body so webhook handlers (e.g. Razorpay) can verify
  // signatures computed over the exact bytes received.
  verify: (req, _res, buf) => { (req as Request & { rawBody?: Buffer }).rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(xssMiddleware);

app.use("/api", router);

Sentry.setupExpressErrorHandler(app);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(err);
  res.status(500).json({ error: "Internal Server Error", requestId: req.id });
});

export default app;

import { z } from "zod/v4";

const envSchema = z.object({
  PORT: z.string().default("5000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().min(1, "SESSION_SECRET is required"),
  ALLOWED_ORIGIN: z.string().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.string().default("info"),
  // When set (e.g. "1" for a single reverse proxy), Express trusts the
  // X-Forwarded-* headers so rate limiting keys on the real client IP.
  // Left unset by default so an exposed server can't be tricked into
  // trusting spoofed X-Forwarded-For headers to bypass rate limits.
  TRUST_PROXY: z.string().optional(),
  // Active payment gateway: "simulated" (default, approves the in-app simulated
  // card payment) or "none" (never authorizes online; orders stay pending).
  // A real provider (e.g. "razorpay") can be added behind the PaymentProvider seam.
  PAYMENT_PROVIDER: z.string().optional(),
  // Razorpay credentials. When both are set, online checkout uses Razorpay
  // (Checkout + server-side signature verification) instead of the simulated
  // gateway. Get these from the Razorpay Dashboard → Settings → API Keys.
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  // Webhook signing secret (Razorpay Dashboard → Settings → Webhooks). When set,
  // /api/payments/razorpay/webhook verifies and reconciles payment events.
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  // Web Push (VAPID). Generate with `npx web-push generate-vapid-keys`.
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
});

export const env = envSchema.parse(process.env);

// Refuse to start with a weak/placeholder JWT signing secret in ANY
// environment. A guessable secret lets an attacker forge admin tokens, so we
// fail fast rather than run insecurely. Dev/test/CI must supply a strong
// committed secret (≥ 32 chars, not in WEAK_SECRETS) too (R26.1, R26.2).
const WEAK_SECRETS = new Set([
  "supersecret",
  "supersecretkey_change_in_prod",
  "secret",
  "changeme",
]);
if (env.SESSION_SECRET.length < 32 || WEAK_SECRETS.has(env.SESSION_SECRET)) {
  throw new Error(
    "SESSION_SECRET is too weak: use a random value of at least 32 characters that is not a known placeholder.",
  );
}

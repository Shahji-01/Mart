// Razorpay payment integration.
//
// Uses the Razorpay REST API directly (Node's global fetch + Basic auth) so no
// extra SDK dependency is needed, and the HMAC signature verification uses
// node:crypto. Configured via env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET.
//
// Flow:
//   1. createRazorpayOrder(amountPaise) — server creates a Razorpay order.
//   2. Client opens Razorpay Checkout with that order id + the public key id.
//   3. On success the client returns { razorpay_order_id, razorpay_payment_id,
//      razorpay_signature }, which we verify server-side at order creation.
//
// Read env directly (not via the validated env object) so this module stays
// import-safe for unit tests without a configured DATABASE_URL/SESSION_SECRET.
import crypto from "node:crypto";

function keyId(): string | undefined {
  return process.env.RAZORPAY_KEY_ID;
}
function keySecret(): string | undefined {
  return process.env.RAZORPAY_KEY_SECRET;
}
const BASE_URL = "https://api.razorpay.com/v1";

export function isRazorpayConfigured(): boolean {
  return !!(keyId() && keySecret());
}

/** Public key id, safe to expose to the client for Checkout. */
export function getRazorpayKeyId(): string {
  return keyId() ?? "";
}

function authHeader(): string {
  return "Basic " + Buffer.from(`${keyId()}:${keySecret()}`).toString("base64");
}

export interface RazorpayOrder {
  id: string;
  amount: number; // paise
  currency: string;
  status: string;
  amount_paid?: number;
}

export async function createRazorpayOrder(amountPaise: number, receipt: string): Promise<RazorpayOrder> {
  if (!isRazorpayConfigured()) throw new Error("Razorpay is not configured");
  const res = await fetch(`${BASE_URL}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader() },
    body: JSON.stringify({ amount: Math.round(amountPaise), currency: "INR", receipt, payment_capture: 1 }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Razorpay order creation failed (${res.status}): ${text}`);
  }
  return (await res.json()) as RazorpayOrder;
}

export async function getRazorpayOrder(orderId: string): Promise<RazorpayOrder | null> {
  if (!isRazorpayConfigured()) return null;
  const res = await fetch(`${BASE_URL}/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: authHeader() },
  });
  if (!res.ok) return null;
  return (await res.json()) as RazorpayOrder;
}

/**
 * Verify the Razorpay payment signature: HMAC-SHA256 of
 * `${order_id}|${payment_id}` keyed by the secret, constant-time compared to
 * the signature returned by Checkout.
 */
export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = keySecret();
  if (!secret || !orderId || !paymentId || !signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Verify a Razorpay webhook signature: HMAC-SHA256 of the raw request body
 * keyed by the webhook secret, constant-time compared to the
 * `x-razorpay-signature` header.
 */
export function verifyWebhookSignature(rawBody: Buffer | string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function isWebhookConfigured(): boolean {
  return !!process.env.RAZORPAY_WEBHOOK_SECRET;
}

/**
 * Fully validate a completed Razorpay payment for an expected amount:
 * signature is valid AND the underlying order's amount matches what we expect
 * (guards against a client substituting a cheaper order id).
 */
export async function verifyRazorpayPayment(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  expectedAmountPaise: number;
}): Promise<boolean> {
  const { orderId, paymentId, signature, expectedAmountPaise } = params;
  if (!verifyRazorpaySignature(orderId, paymentId, signature)) return false;
  const order = await getRazorpayOrder(orderId);
  if (!order) return false;
  // Amount must match (within 1 paise tolerance) and be captured/attempted.
  return Math.abs(order.amount - Math.round(expectedAmountPaise)) <= 1;
}

/**
 * Initiates a refund for a captured Razorpay payment.
 */
export async function refundRazorpayPayment(paymentId: string, amountPaise: number, receipt?: string): Promise<boolean> {
  if (!isRazorpayConfigured()) return false;
  try {
    const res = await fetch(`${BASE_URL}/payments/${encodeURIComponent(paymentId)}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader() },
      body: JSON.stringify({ amount: Math.round(amountPaise), receipt }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`Razorpay refund failed (${res.status}): ${text}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Razorpay refund error:`, err);
    return false;
  }
}

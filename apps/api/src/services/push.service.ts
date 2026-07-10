import webpush from "web-push";
import { db, pushSubscriptionsTable } from "@workspace/database";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@shankeshwartraders.in";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function isPushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function getVapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY ?? "";
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  type?: string;
}

export const pushService = {
  async subscribe(userId: number, sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    await db.insert(pushSubscriptionsTable)
      .values({ userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth })
      .onConflictDoUpdate({
        target: pushSubscriptionsTable.endpoint,
        set: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      });
  },

  async unsubscribe(endpoint: string) {
    await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, endpoint));
  },

  /** Send a push notification to all of a user's subscribed devices (best-effort). */
  async sendToUser(userId: number, payload: PushPayload) {
    if (!ensureConfigured()) return;
    const subs = await db.select().from(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.userId, userId));
    if (subs.length === 0) return;
    const body = JSON.stringify(payload);
    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
      } catch (err: unknown) {
        // 404/410 mean the subscription is gone — clean it up.
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, s.endpoint));
        } else {
          logger.error({ err, userId }, "Failed to send push notification");
        }
      }
    }));
  },
};

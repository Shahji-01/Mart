import { db, newsletterSubscribersTable } from "@workspace/database";
import { eq } from "drizzle-orm";

export class NewsletterService {
  async subscribe(email: string, name?: string) {
    const existing = await db.select().from(newsletterSubscribersTable).where(eq(newsletterSubscribersTable.email, email.toLowerCase()));
    if (existing.length > 0) {
      if (!existing[0].isActive) {
        await db.update(newsletterSubscribersTable).set({ isActive: true }).where(eq(newsletterSubscribersTable.email, email.toLowerCase()));
        return { message: "Resubscribed successfully" };
      }
      return { message: "Already subscribed" };
    }
    await db.insert(newsletterSubscribersTable).values({ email: email.toLowerCase(), name });
    return { message: "Subscribed successfully" };
  }

  async unsubscribe(email: string) {
    await db.update(newsletterSubscribersTable).set({ isActive: false }).where(eq(newsletterSubscribersTable.email, email.toLowerCase()));
    return { message: "Unsubscribed successfully" };
  }

  async getSubscribers() {
    const subs = await db.select().from(newsletterSubscribersTable).orderBy(newsletterSubscribersTable.createdAt);
    return subs.map(s => ({ ...s, createdAt: s.createdAt.toISOString() }));
  }
}

export const newsletterService = new NewsletterService();

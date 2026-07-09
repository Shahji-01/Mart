import { db, bannersTable } from "@workspace/database";
import { eq } from "drizzle-orm";

function formatBanner(b: typeof bannersTable.$inferSelect) {
  return {
    id: b.id, title: b.title, imageUrl: b.imageUrl, linkUrl: b.linkUrl,
    isActive: b.isActive, sortOrder: b.sortOrder,
    startsAt: b.startsAt?.toISOString() ?? null,
    endsAt: b.endsAt?.toISOString() ?? null,
  };
}

export class BannersService {
  async getActiveBanners() {
    const now = new Date();
    const banners = await db.select().from(bannersTable).where(eq(bannersTable.isActive, true));
    const active = banners.filter(b => {
      const startOk = !b.startsAt || b.startsAt <= now;
      const endOk = !b.endsAt || b.endsAt >= now;
      return startOk && endOk;
    });
    return active.sort((a, b) => a.sortOrder - b.sortOrder).map(formatBanner);
  }

  async getAllBanners() {
    const banners = await db.select().from(bannersTable);
    return banners.sort((a, b) => a.sortOrder - b.sortOrder).map(formatBanner);
  }

  async createBanner(data: any) {
    const { title, imageUrl, linkUrl, isActive = true, sortOrder = 0, startsAt, endsAt } = data;
    const [b] = await db.insert(bannersTable).values({
      title, imageUrl, linkUrl, isActive, sortOrder,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
    }).returning();
    return formatBanner(b);
  }

  async updateBanner(id: number, data: any) {
    const { title, imageUrl, linkUrl, isActive, sortOrder, startsAt, endsAt } = data;
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl;
    if (linkUrl !== undefined) updates.linkUrl = linkUrl;
    if (isActive !== undefined) updates.isActive = isActive;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;
    if (startsAt !== undefined) updates.startsAt = startsAt ? new Date(startsAt) : null;
    if (endsAt !== undefined) updates.endsAt = endsAt ? new Date(endsAt) : null;
    
    const [b] = await db.update(bannersTable).set(updates).where(eq(bannersTable.id, id)).returning();
    if (!b) return null;
    return formatBanner(b);
  }

  async deleteBanner(id: number) {
    await db.delete(bannersTable).where(eq(bannersTable.id, id));
  }
}

export const bannersService = new BannersService();

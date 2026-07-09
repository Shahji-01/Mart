import { db, stockNotificationsTable, productVariantsTable } from "@workspace/database";
import { eq } from "drizzle-orm";

// R28 — back-in-stock subscription persistence.
export class StockNotificationsService {
  /**
   * Subscribe a user to a back-in-stock notification for a variant (R28.1).
   *
   * The insert uses `.onConflictDoNothing()` against the unique
   * `(user_id, variant_id)` index so repeat submissions never create a second
   * row (R28.2). Returns `null` when the variant does not exist so the
   * controller can surface a 404.
   */
  async subscribe(userId: number, variantId: number): Promise<{ subscribed: true } | null> {
    const [variant] = await db
      .select({ id: productVariantsTable.id })
      .from(productVariantsTable)
      .where(eq(productVariantsTable.id, variantId));
    if (!variant) return null;

    await db
      .insert(stockNotificationsTable)
      .values({ userId, variantId })
      .onConflictDoNothing();

    return { subscribed: true };
  }
}

export const stockNotificationsService = new StockNotificationsService();

import { db, storeSettingsTable } from "@workspace/database";
import { eq } from "drizzle-orm";

const DEFAULT_SETTINGS = {
  storeName: "Shankeshwar Traders",
  fullName: "Shankeshwar Traders",
  gstin: "",
  phone: "+91 98765 43210",
  email: "contact@shankeshwartraders.in",
  address: "Banswara, Rajasthan – 327001",
  openingHours: "Mon – Sun: 7:00 AM – 9:00 PM",
  deliveryCutoff: "5:00 PM",
  lowStockThreshold: 10,
  freeDeliveryAbove: 499,
  deliveryFee: 40,
  socialInstagram: "",
  socialFacebook: "",
  socialWhatsapp: "",
};

type StoreSettings = typeof DEFAULT_SETTINGS;

export class SettingsService {
  private inMemoryCache: StoreSettings = { ...DEFAULT_SETTINGS };
  private initialized = false;

  private async init() {
    if (this.initialized) return;
    const [row] = await db.select().from(storeSettingsTable).where(eq(storeSettingsTable.id, 1));
    if (row) {
      this.inMemoryCache = { ...DEFAULT_SETTINGS, ...(row.settings as any) };
    } else {
      await db.insert(storeSettingsTable).values({ id: 1, settings: DEFAULT_SETTINGS });
    }
    this.initialized = true;
  }

  async getSettings() {
    await this.init();
    return this.inMemoryCache;
  }

  async updateSettings(data: Partial<StoreSettings>) {
    await this.init();
    const newSettings = { ...this.inMemoryCache, ...data };
    this.inMemoryCache = newSettings;
    await db.insert(storeSettingsTable)
      .values({ id: 1, settings: newSettings })
      .onConflictDoUpdate({ target: storeSettingsTable.id, set: { settings: newSettings } });
    return this.inMemoryCache;
  }
}

export const settingsService = new SettingsService();

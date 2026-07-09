import { db, deliverySlotsTable, deliveryZonesTable } from "@workspace/database";
import { eq } from "drizzle-orm";

export class DeliveryService {
  async getDeliverySlots(isActiveOnly = false) {
    const slots = await db.select().from(deliverySlotsTable).orderBy(deliverySlotsTable.sortOrder);
    if (isActiveOnly) return slots.filter(s => s.isActive);
    return slots;
  }

  async createDeliverySlot(data: any) {
    const { label, timeRange, isActive = true, sortOrder = 0 } = data;
    const [slot] = await db.insert(deliverySlotsTable).values({ 
      label, timeRange, isActive, sortOrder 
    }).returning();
    return slot;
  }

  async updateDeliverySlot(id: number, data: any) {
    const { label, timeRange, isActive, sortOrder } = data;
    const updates: Record<string, unknown> = {};
    if (label !== undefined) updates.label = label;
    if (timeRange !== undefined) updates.timeRange = timeRange;
    if (isActive !== undefined) updates.isActive = isActive;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;
    
    const [slot] = await db.update(deliverySlotsTable).set(updates).where(eq(deliverySlotsTable.id, id)).returning();
    if (!slot) return null;
    return slot;
  }

  async deleteDeliverySlot(id: number) {
    await db.delete(deliverySlotsTable).where(eq(deliverySlotsTable.id, id));
  }

  async getDeliveryZones() {
    const zones = await db.select().from(deliveryZonesTable);
    return zones.map(z => ({ 
      ...z, 
      deliveryFee: parseFloat(z.deliveryFee), 
      minOrderForFree: parseFloat(z.minOrderForFree), 
      createdAt: z.createdAt.toISOString() 
    }));
  }

  async createDeliveryZone(data: any) {
    const { name, pincodes, deliveryFee = 40, minOrderForFree = 499, isActive = true } = data;
    const [zone] = await db.insert(deliveryZonesTable).values({
      name, pincodes, deliveryFee: deliveryFee.toString(),
      minOrderForFree: minOrderForFree.toString(), isActive,
    }).returning();
    
    return { 
      ...zone, 
      deliveryFee: parseFloat(zone.deliveryFee), 
      minOrderForFree: parseFloat(zone.minOrderForFree), 
      createdAt: zone.createdAt.toISOString() 
    };
  }

  async updateDeliveryZone(id: number, data: any) {
    const { name, pincodes, deliveryFee, minOrderForFree, isActive } = data;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (pincodes !== undefined) updates.pincodes = pincodes;
    if (deliveryFee !== undefined) updates.deliveryFee = deliveryFee.toString();
    if (minOrderForFree !== undefined) updates.minOrderForFree = minOrderForFree.toString();
    if (isActive !== undefined) updates.isActive = isActive;
    
    const [zone] = await db.update(deliveryZonesTable).set(updates).where(eq(deliveryZonesTable.id, id)).returning();
    if (!zone) return null;
    
    return { 
      ...zone, 
      deliveryFee: parseFloat(zone.deliveryFee), 
      minOrderForFree: parseFloat(zone.minOrderForFree), 
      createdAt: zone.createdAt.toISOString() 
    };
  }

  async deleteDeliveryZone(id: number) {
    await db.delete(deliveryZonesTable).where(eq(deliveryZonesTable.id, id));
  }

  /**
   * Find the active delivery zone serving a pincode. Zone `pincodes` is a
   * comma-separated list. Returns the parsed zone or null when unserviceable.
   */
  async findZoneByPincode(pincode: string) {
    const clean = (pincode ?? "").trim();
    if (!/^\d{6}$/.test(clean)) return null;
    const zones = await db.select().from(deliveryZonesTable).where(eq(deliveryZonesTable.isActive, true));
    const zone = zones.find(z =>
      z.pincodes.split(",").map(p => p.trim()).includes(clean)
    );
    if (!zone) return null;
    return {
      id: zone.id,
      name: zone.name,
      deliveryFee: parseFloat(zone.deliveryFee),
      minOrderForFree: parseFloat(zone.minOrderForFree),
    };
  }

  /** Serviceability check for a pincode (used by the location picker). */
  async checkPincode(pincode: string) {
    const zone = await this.findZoneByPincode(pincode);
    return {
      pincode: (pincode ?? "").trim(),
      serviceable: !!zone,
      zone: zone ?? null,
    };
  }
}

export const deliveryService = new DeliveryService();

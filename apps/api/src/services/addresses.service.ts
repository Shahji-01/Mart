import { db, addressesTable } from "@workspace/database";
import { eq, and } from "drizzle-orm";

export class AddressesService {
  async getAddresses(userId: number) {
    const addresses = await db.select().from(addressesTable).where(eq(addressesTable.userId, userId));
    return addresses.map(a => ({ ...a, createdAt: a.createdAt.toISOString() }));
  }

  async createAddress(userId: number, data: any) {
    const { label = "Home", recipientName, phone, street, landmark = "", city = "Banswara", state = "Rajasthan", pincode, isDefault = false } = data;
    
    if (isDefault) {
      await db.update(addressesTable).set({ isDefault: false }).where(eq(addressesTable.userId, userId));
    }
    
    const [address] = await db.insert(addressesTable).values({ 
      userId, label, recipientName, phone, street, landmark, city, state, pincode, isDefault 
    }).returning();
    
    return { ...address, createdAt: address.createdAt.toISOString() };
  }

  async updateAddress(userId: number, addressId: number, data: any) {
    const { label, recipientName, phone, street, landmark, city, state, pincode, isDefault } = data;
    
    if (isDefault) {
      await db.update(addressesTable).set({ isDefault: false }).where(eq(addressesTable.userId, userId));
    }
    
    const [address] = await db.update(addressesTable)
      .set({ label, recipientName, phone, street, landmark, city, state, pincode, isDefault })
      .where(and(eq(addressesTable.id, addressId), eq(addressesTable.userId, userId)))
      .returning();
      
    if (!address) return null;
    return { ...address, createdAt: address.createdAt.toISOString() };
  }

  async deleteAddress(userId: number, addressId: number) {
    await db.delete(addressesTable).where(and(eq(addressesTable.id, addressId), eq(addressesTable.userId, userId)));
  }
}

export const addressesService = new AddressesService();

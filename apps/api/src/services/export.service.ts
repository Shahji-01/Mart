import { db, ordersTable, productsTable, productVariantsTable, usersTable } from "@workspace/database";
import { eq, desc, gte, lte, and } from "drizzle-orm";

export class ExportService {
  toCSV(headers: string[], rows: string[][]): string {
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    return [headers.map(escape).join(","), ...rows.map(r => r.map(escape).join(","))].join("\n");
  }

  async exportOrders(from?: string, to?: string) {
    let query = db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).$dynamic();
    if (from || to) {
      const conditions = [];
      if (from) conditions.push(gte(ordersTable.createdAt, new Date(from)));
      if (to) conditions.push(lte(ordersTable.createdAt, new Date(to + "T23:59:59")));
      if (conditions.length === 2) query = query.where(and(conditions[0]!, conditions[1]!));
      else if (conditions.length === 1) query = query.where(conditions[0]!);
    }
    const orders = await query;
    const users = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email }).from(usersTable);
    const userMap = new Map(users.map(u => [u.id, u]));
    
    const headers = ["Order ID", "Customer", "Email", "Status", "Payment Method", "Subtotal", "Discount", "GST", "Delivery Fee", "Wallet Used", "Total", "Address", "Coupon", "Delivery Slot", "Date"];
    const rows = orders.map(o => {
      const u = userMap.get(o.userId);
      return [
        o.id.toString(), u?.name ?? "", u?.email ?? "", o.status, o.paymentMethod,
        parseFloat(o.subtotal).toFixed(2), parseFloat(o.discount).toFixed(2),
        parseFloat(o.gstAmount).toFixed(2), parseFloat(o.deliveryFee).toFixed(2),
        parseFloat(o.walletAmountUsed).toFixed(2), parseFloat(o.total).toFixed(2),
        o.address, o.couponCode ?? "", o.deliverySlot ?? "",
        new Date(o.createdAt).toISOString(),
      ];
    });
    return this.toCSV(headers, rows);
  }

  async exportProducts() {
    const products = await db.select().from(productsTable);
    const variants = await db.select().from(productVariantsTable);
    const varMap = new Map<number, typeof variants>();
    for (const v of variants) {
      if (!varMap.has(v.productId)) varMap.set(v.productId, []);
      varMap.get(v.productId)!.push(v);
    }
    
    const headers = ["Product ID", "Name", "Slug", "Category ID", "Description", "Tax Rate", "Is Featured", "Variant ID", "Unit", "Unit Value", "Price", "MRP", "SKU", "Stock", "Created At"];
    const rows: string[][] = [];
    
    for (const p of products) {
      const pvs = varMap.get(p.id) ?? [];
      if (pvs.length === 0) {
        rows.push([p.id.toString(), p.name, p.slug, p.categoryId.toString(), p.description ?? "", p.taxRate ?? "", p.isFeatured?.toString() ?? "false", "", "", "", "", "", "", "", p.createdAt.toISOString()]);
      } else {
        for (const v of pvs) {
          rows.push([p.id.toString(), p.name, p.slug, p.categoryId.toString(), p.description ?? "", p.taxRate ?? "", p.isFeatured?.toString() ?? "false", v.id.toString(), v.unit, v.unitValue, parseFloat(v.price).toFixed(2), parseFloat(v.mrp).toFixed(2), v.sku ?? "", v.stock.toString(), p.createdAt.toISOString()]);
        }
      }
    }
    return this.toCSV(headers, rows);
  }

  async exportCustomers() {
    const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
    const headers = ["ID", "Name", "Email", "Phone", "Role", "Wallet Balance", "Loyalty Points", "Referral Code", "Joined At"];
    const rows = users.map(u => [
      u.id.toString(), u.name, u.email, u.phone ?? "", u.role ?? "",
      parseFloat(u.walletBalance ?? "0").toFixed(2), u.loyaltyPoints?.toString() ?? "0",
      u.referralCode ?? "", u.createdAt.toISOString(),
    ]);
    return this.toCSV(headers, rows);
  }

  async importProducts(rows: any[]) {
    const results: { success: number; errors: string[] } = { success: 0, errors: [] };
    for (const row of rows) {
      try {
        const { name, slug, categoryId, description, price, mrp, unit, unitValue, stock, imageUrl, isFeatured } = row;
        if (!name || !categoryId || !price || !unit || !unitValue) { 
          results.errors.push(`Row missing required fields: ${JSON.stringify(row)}`); 
          continue; 
        }
        const [p] = await db.insert(productsTable).values({
          name, 
          slug: slug || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
          categoryId: parseInt(categoryId), 
          description: description || "", 
          imageUrl: imageUrl || "",
          isFeatured: isFeatured === "true" || isFeatured === true,
        }).returning();
        
        await db.insert(productVariantsTable).values({ 
          productId: p.id, 
          unit, 
          unitValue, 
          price: price.toString(), 
          mrp: (mrp || price).toString(), 
          stock: parseInt(stock) || 0 
        });
        results.success++;
      } catch (e) { results.errors.push(`Row error: ${e}`); }
    }
    return results;
  }
}

export const exportService = new ExportService();

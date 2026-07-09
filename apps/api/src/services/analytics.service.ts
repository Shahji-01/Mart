import { db, ordersTable, orderItemsTable, productsTable, usersTable, categoriesTable, productVariantsTable } from "@workspace/database";
import { sql, eq, and, gte, lte } from "drizzle-orm";

export class AnalyticsService {
  async getSummary() {
    const [{ totalRevenue }] = await db.select({ totalRevenue: sql<number>`coalesce(sum(total::numeric), 0)` }).from(ordersTable).where(sql`status != 'cancelled'`);
    const [{ totalOrders }] = await db.select({ totalOrders: sql<number>`count(*)::int` }).from(ordersTable);
    const [{ totalProducts }] = await db.select({ totalProducts: sql<number>`count(*)::int` }).from(productsTable);
    const [{ totalCustomers }] = await db.select({ totalCustomers: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.role, "customer"));
    const [{ pendingOrders }] = await db.select({ pendingOrders: sql<number>`count(*)::int` }).from(ordersTable).where(eq(ordersTable.status, "pending"));
    
    const today = new Date(); 
    today.setHours(0, 0, 0, 0);
    const [{ todayRevenue }] = await db.select({ todayRevenue: sql<number>`coalesce(sum(total::numeric), 0)` }).from(ordersTable).where(and(gte(ordersTable.createdAt, today), sql`status != 'cancelled'`));
    const [{ todayOrders }] = await db.select({ todayOrders: sql<number>`count(*)::int` }).from(ordersTable).where(gte(ordersTable.createdAt, today));
    
    return { 
      totalRevenue: Number(totalRevenue), 
      totalOrders, 
      totalProducts, 
      totalCustomers, 
      pendingOrders, 
      todayRevenue: Number(todayRevenue), 
      todayOrders 
    };
  }

  async getRecentOrders() {
    const orders = await db.select().from(ordersTable).orderBy(sql`created_at desc`).limit(10);
    const users = await db.select().from(usersTable);
    const userMap = new Map(users.map(u => [u.id, u.name]));
    
    return orders.map(o => ({
      id: o.id, 
      userId: o.userId, 
      userName: userMap.get(o.userId) ?? null,
      status: o.status, 
      paymentMethod: o.paymentMethod, 
      paymentStatus: o.paymentStatus,
      subtotal: parseFloat(o.subtotal), 
      discount: parseFloat(o.discount),
      deliveryFee: parseFloat(o.deliveryFee), 
      total: parseFloat(o.total),
      address: o.address, 
      couponCode: o.couponCode, 
      items: [], 
      createdAt: o.createdAt.toISOString(),
    }));
  }

  async getTopProducts() {
    const rows = await db.select({
      productId: orderItemsTable.productId,
      totalSold: sql<number>`sum(quantity)::int`,
      revenue: sql<number>`sum(subtotal::numeric)`,
    }).from(orderItemsTable).groupBy(orderItemsTable.productId).orderBy(sql`sum(quantity) desc`).limit(8);

    return await Promise.all(rows.map(async (r) => {
      const [p] = await db.select().from(productsTable).where(eq(productsTable.id, r.productId));
      return {
        productId: r.productId,
        productName: p?.name ?? "Unknown",
        imageUrl: p?.imageUrl ?? "",
        totalSold: r.totalSold,
        revenue: Number(r.revenue),
      };
    }));
  }

  async getRevenueChart(daysCount: number) {
    const days = Math.min(Math.max(daysCount, 1), 90);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    const rows = await db.select({
      dateStr: sql<string>`to_char(created_at, 'YYYY-MM-DD')`,
      revenue: sql<number>`sum(case when status != 'cancelled' then total::numeric else 0 end)`,
      orders: sql<number>`count(*)::int`,
    })
      .from(ordersTable)
      .where(gte(ordersTable.createdAt, startDate))
      .groupBy(sql`to_char(created_at, 'YYYY-MM-DD')`);

    const rowsByDate = new Map(rows.map(r => [r.dateStr, r]));

    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const r = rowsByDate.get(dateStr);
      result.push({
        date: dateStr,
        revenue: Number(r?.revenue ?? 0),
        orders: Number(r?.orders ?? 0),
      });
    }
    return result;
  }

  async getCategoryRevenue() {
    const rows = await db.select({
      categoryId: productsTable.categoryId,
      revenue: sql<number>`coalesce(sum(${orderItemsTable.subtotal}::numeric), 0)`,
      orders: sql<number>`count(distinct ${orderItemsTable.orderId})::int`,
    })
      .from(orderItemsTable)
      .leftJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
      .groupBy(productsTable.categoryId);

    const cats = await db.select().from(categoriesTable);
    const catMap = new Map(cats.map(c => [c.id, c.name]));
    
    return rows.map(r => ({
      categoryId: r.categoryId,
      categoryName: catMap.get(r.categoryId ?? 0) ?? "Unknown",
      revenue: Number(r.revenue),
      orders: Number(r.orders),
    })).sort((a, b) => b.revenue - a.revenue);
  }

  async getLowStock(threshold: number) {
    const variants = await db.select().from(productVariantsTable).where(lte(productVariantsTable.stock, threshold));
    const products = await db.select().from(productsTable);
    const prodMap = new Map(products.map(p => [p.id, p]));
    
    return variants.map(v => {
      const p = prodMap.get(v.productId);
      return {
        variantId: v.id,
        productId: v.productId,
        productName: p?.name ?? "Unknown",
        imageUrl: p?.imageUrl ?? "",
        unit: v.unit,
        unitValue: v.unitValue,
        stock: v.stock,
        sku: v.sku,
      };
    }).sort((a, b) => a.stock - b.stock);
  }

  async getCustomerRetention() {
    const rows = await db.select({
      userId: ordersTable.userId,
      orderCount: sql<number>`count(*)::int`,
    }).from(ordersTable).groupBy(ordersTable.userId);

    const newCustomers = rows.filter(r => r.orderCount === 1).length;
    const returning = rows.filter(r => r.orderCount > 1).length;

    return { newCustomers, returningCustomers: returning, total: rows.length };
  }

  /** Order demand grouped by the 6-digit pincode parsed from the order address. */
  async getDemandByPincode() {
    const rows = await db.select({
      pincode: sql<string>`coalesce(substring(${ordersTable.address} from '\\d{6}'), 'unknown')`,
      orders: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(case when ${ordersTable.status} != 'cancelled' then ${ordersTable.total}::numeric else 0 end), 0)`,
    })
      .from(ordersTable)
      .groupBy(sql`coalesce(substring(${ordersTable.address} from '\\d{6}'), 'unknown')`)
      .orderBy(sql`count(*) desc`)
      .limit(50);
    return rows.map(r => ({ pincode: r.pincode, orders: Number(r.orders), revenue: Number(r.revenue) }));
  }
}

export const analyticsService = new AnalyticsService();

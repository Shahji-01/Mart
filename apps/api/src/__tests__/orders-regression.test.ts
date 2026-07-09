import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import {
  db,
  productsTable,
  categoriesTable,
  productVariantsTable,
  cartItemsTable,
  cartSessionsTable,
  ordersTable,
  orderItemsTable,
  couponsTable,
  usersTable,
  loyaltyTransactionsTable,
} from '@workspace/database';
import { eq } from 'drizzle-orm';

// Regression tests for two backend fixes:
//  1. Loyalty points must be awarded only on the FIRST transition to "delivered".
//  2. Per-user coupon usage limit must be enforced at checkout (not bypassable
//     by passing couponCode directly in the order body).
describe('Orders regression', () => {
  let userToken = '';
  let adminToken = '';
  let userId = 0;
  let categoryId = 0;
  let productId = 0;
  let variantId = 0;
  const couponCode = `REGRESS${Date.now()}`;
  const userEmail = `reg_user_${Date.now()}@test.in`;
  const adminEmail = `reg_admin_${Date.now()}@test.in`;
  const createdOrderIds: number[] = [];

  beforeAll(async () => {
    await request(app).post('/api/auth/register').send({ email: userEmail, password: 'Password1!', name: 'Reg User', phone: '1234567890' });
    const ul = await request(app).post('/api/auth/login').send({ email: userEmail, password: 'Password1!' });
    userToken = ul.body.token;
    userId = ul.body.user.id;

    await request(app).post('/api/auth/register').send({ email: adminEmail, password: 'Adminpassword1!', name: 'Reg Admin', phone: '1234567890' });
    await db.update(usersTable).set({ role: 'admin' }).where(eq(usersTable.email, adminEmail));
    const al = await request(app).post('/api/auth/login').send({ email: adminEmail, password: 'Adminpassword1!' });
    adminToken = al.body.token;

    const [cat] = await db.insert(categoriesTable).values({ name: `RegCat ${Date.now()}`, slug: `regcat-${Date.now()}` }).returning();
    categoryId = cat.id;
    const [prod] = await db.insert(productsTable).values({ name: `RegProd ${Date.now()}`, slug: `regprod-${Date.now()}`, categoryId: cat.id }).returning();
    productId = prod.id;
    const [varnt] = await db.insert(productVariantsTable).values({ productId: prod.id, unit: 'kg', unitValue: '1', price: '100', mrp: '150', stock: 1000 }).returning();
    variantId = varnt.id;

    // Single-use coupon: flat ₹10 off, no minimum.
    await db.insert(couponsTable).values({
      code: couponCode,
      discountType: 'flat',
      discountValue: '10',
      isActive: true,
      maxUsagePerUser: 1,
    });
  });

  async function addOneToCart() {
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId, variantId, quantity: 1 });
  }

  // Walk an order through the valid status chain up to (and including) delivered.
  async function deliver(orderId: number) {
    for (const status of ['confirmed', 'processing', 'out_for_delivery', 'delivered']) {
      await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status });
    }
  }

  it('awards loyalty points only on the first transition to delivered', async () => {
    await addOneToCart();
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ address: '1 Test St, City 123456', paymentMethod: 'cod' });
    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.id;
    createdOrderIds.push(orderId);

    const before = (await db.select().from(usersTable).where(eq(usersTable.id, userId)))[0];
    const pointsBefore = before.loyaltyPoints ?? 0;

    // First delivery (via the valid transition chain) -> points awarded.
    await deliver(orderId);
    const afterFirst = (await db.select().from(usersTable).where(eq(usersTable.id, userId)))[0];
    const expectedEarned = Math.floor(parseFloat(orderRes.body.total) * 0.1);
    expect((afterFirst.loyaltyPoints ?? 0) - pointsBefore).toBe(expectedEarned);

    // Re-saving as delivered must NOT award again.
    await request(app).patch(`/api/orders/${orderId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'delivered' });
    const afterSecond = (await db.select().from(usersTable).where(eq(usersTable.id, userId)))[0];
    expect(afterSecond.loyaltyPoints ?? 0).toBe(afterFirst.loyaltyPoints ?? 0);
  });

  it('enforces per-user coupon usage limit at checkout', async () => {
    // First order with the single-use coupon succeeds.
    await addOneToCart();
    const first = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ address: '1 Test St, City 123456', paymentMethod: 'cod', couponCode });
    expect(first.status).toBe(201);
    expect(first.body.couponCode).toBe(couponCode);
    createdOrderIds.push(first.body.id);

    // Second order reusing the same coupon via the body must be rejected (was a bypass before).
    await addOneToCart();
    const second = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ address: '1 Test St, City 123456', paymentMethod: 'cod', couponCode });
    expect(second.status).toBe(400);
    expect(String(second.body.error)).toMatch(/usage limit/i);
  });

  afterAll(async () => {
    for (const id of createdOrderIds) {
      await db.delete(loyaltyTransactionsTable).where(eq(loyaltyTransactionsTable.orderId, id));
      await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, id));
      await db.delete(ordersTable).where(eq(ordersTable.id, id));
    }
    await db.delete(cartItemsTable).where(eq(cartItemsTable.userId, userId));
    await db.delete(cartSessionsTable).where(eq(cartSessionsTable.userId, userId));
    await db.delete(couponsTable).where(eq(couponsTable.code, couponCode));
    await db.delete(productVariantsTable).where(eq(productVariantsTable.id, variantId));
    await db.delete(productsTable).where(eq(productsTable.id, productId));
    await db.delete(categoriesTable).where(eq(categoriesTable.id, categoryId));
    await db.delete(usersTable).where(eq(usersTable.email, userEmail));
    await db.delete(usersTable).where(eq(usersTable.email, adminEmail));
  });
});

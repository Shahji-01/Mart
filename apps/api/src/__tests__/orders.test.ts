import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { db, productsTable, categoriesTable, productVariantsTable, cartItemsTable, ordersTable, orderItemsTable } from '@workspace/database';
import { eq } from 'drizzle-orm';

describe('Orders Endpoints', () => {
  let userToken = '';
  let adminToken = '';
  let testUserId: number;
  let testCategoryId: number;
  let testProductId: number;
  let testVariantId: number;
  let createdOrderId: number;
  const userEmail = `user_test_order_${Date.now()}@ntcmarket.in`;
  const adminEmail = `admin_test_order_${Date.now()}@ntcmarket.in`;

  beforeAll(async () => {
    // 1. Create standard user
    await request(app).post('/api/auth/register').send({
      email: userEmail,
      password: 'Password1!',
      name: 'User Test',
      phone: '1234567890'
    });
    const loginRes = await request(app).post('/api/auth/login').send({ email: userEmail, password: 'Password1!' });
    userToken = loginRes.body.token;
    testUserId = loginRes.body.user.id;

    // 2. Create admin user
    await request(app).post('/api/auth/register').send({
      email: adminEmail,
      password: 'Adminpassword1!',
      name: 'Admin Test',
      phone: '1234567890'
    });
    const { usersTable } = await import('@workspace/database');
    await db.update(usersTable).set({ role: 'admin' }).where(eq(usersTable.email, adminEmail));
    const adminLoginRes = await request(app).post('/api/auth/login').send({ email: adminEmail, password: 'Adminpassword1!' });
    adminToken = adminLoginRes.body.token;

    // 3. Create dummy product & variant
    const [cat] = await db.insert(categoriesTable).values({ name: `Cat ${Date.now()}`, slug: `cat-${Date.now()}` }).returning();
    testCategoryId = cat.id;
    const [prod] = await db.insert(productsTable).values({ name: `Prod ${Date.now()}`, slug: `prod-order-${Date.now()}`, categoryId: cat.id }).returning();
    testProductId = prod.id;
    const [varnt] = await db.insert(productVariantsTable).values({ productId: prod.id, unit: 'kg', unitValue: '1', price: '100', mrp: '150', stock: 50 }).returning();
    testVariantId = varnt.id;

    // 4. Add to cart
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: testProductId, variantId: testVariantId, quantity: 1 });
  });

  it('should place an order (COD)', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        address: '123 Test St, Test City 123456',
        paymentMethod: 'cod',
        notes: 'Test order notes'
      });
    
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.status).toBe('pending');
    createdOrderId = res.body.id;
  });

  it('should get user orders', async () => {
    const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].id).toBe(createdOrderId);
  });

  it('should update order status (admin)', async () => {
    const res = await request(app)
      .patch(`/api/orders/${createdOrderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'confirmed' });
    
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('confirmed');
  });

  afterAll(async () => {
    // Cleanup
    if (createdOrderId) {
      await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, createdOrderId));
      await db.delete(ordersTable).where(eq(ordersTable.id, createdOrderId));
    }
    await db.delete(cartItemsTable).where(eq(cartItemsTable.userId, testUserId)); // clear this test user's cart items
    await db.delete(productVariantsTable).where(eq(productVariantsTable.id, testVariantId));
    await db.delete(productsTable).where(eq(productsTable.id, testProductId));
    await db.delete(categoriesTable).where(eq(categoriesTable.id, testCategoryId));
    const { usersTable } = await import('@workspace/database');
    await db.delete(usersTable).where(eq(usersTable.email, userEmail));
    await db.delete(usersTable).where(eq(usersTable.email, adminEmail));
  });
});

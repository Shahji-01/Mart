import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { db, productsTable, categoriesTable, productVariantsTable, cartItemsTable } from '@workspace/database';
import { eq } from 'drizzle-orm';

describe('Cart Endpoints', () => {
  let userToken = '';
  let testUserId: number;
  let testCategoryId: number;
  let testProductId: number;
  let testVariantId: number;
  const userEmail = `user_test_cart_${Date.now()}@shankeshwartraders.in`;

  beforeAll(async () => {
    await request(app).post('/api/auth/register').send({
      email: userEmail,
      password: 'Password1!',
      name: 'User Test',
      phone: '1234567890'
    });

    const loginRes = await request(app).post('/api/auth/login').send({ email: userEmail, password: 'Password1!' });
    userToken = loginRes.body.token;
    testUserId = loginRes.body.user.id;

    // Create a dummy product for testing
    const [cat] = await db.insert(categoriesTable).values({ name: `Cat ${Date.now()}`, slug: `cat-${Date.now()}` }).returning();
    testCategoryId = cat.id;

    const [prod] = await db.insert(productsTable).values({
      name: `Prod ${Date.now()}`,
      slug: `prod-${Date.now()}`,
      categoryId: cat.id
    }).returning();
    testProductId = prod.id;

    const [varnt] = await db.insert(productVariantsTable).values({
      productId: prod.id,
      unit: 'kg',
      unitValue: '1',
      price: '100',
      mrp: '150',
      stock: 50
    }).returning();
    testVariantId = varnt.id;
  });

  it('should fetch empty cart', async () => {
    const res = await request(app).get('/api/cart').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toBeInstanceOf(Array);
  });

  it('should add item to cart', async () => {
    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        productId: testProductId,
        variantId: testVariantId,
        quantity: 2
      });
    
    expect(res.status).toBe(200);
    const cart = await request(app).get('/api/cart').set('Authorization', `Bearer ${userToken}`);
    expect(cart.body.items.length).toBeGreaterThan(0);
    expect(cart.body.items[0].quantity).toBe(2);
  });

  it('should update item quantity', async () => {
    const res = await request(app)
      .patch(`/api/cart/items/${testVariantId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        quantity: 5
      });
    
    expect(res.status).toBe(200);
    const cart = await request(app).get('/api/cart').set('Authorization', `Bearer ${userToken}`);
    expect(cart.body.items[0].quantity).toBe(5);
  });

  it('should remove item from cart', async () => {
    const res = await request(app)
      .delete(`/api/cart/items/${testVariantId}`)
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(res.status).toBe(200);
    const cart = await request(app).get('/api/cart').set('Authorization', `Bearer ${userToken}`);
    expect(cart.body.items.length).toBe(0);
  });

  afterAll(async () => {
    // Cleanup (scoped to this test's own user)
    await db.delete(cartItemsTable).where(eq(cartItemsTable.userId, testUserId));
    await db.delete(productVariantsTable).where(eq(productVariantsTable.id, testVariantId));
    await db.delete(productsTable).where(eq(productsTable.id, testProductId));
    await db.delete(categoriesTable).where(eq(categoriesTable.id, testCategoryId));
    const { usersTable } = await import('@workspace/database');
    await db.delete(usersTable).where(eq(usersTable.email, userEmail));
  });
});

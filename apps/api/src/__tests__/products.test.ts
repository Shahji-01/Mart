import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { db, productsTable, categoriesTable } from '@workspace/database';
import { eq } from 'drizzle-orm';

describe('Products Endpoints', () => {
  let adminToken = '';
  let testCategoryId: number;
  let testProductId: number;
  const adminEmail = `admin_test_${Date.now()}@ntcmarket.in`;

  beforeAll(async () => {
    // Register and login an admin
    await request(app).post('/api/auth/register').send({
      email: adminEmail,
      password: 'Adminpassword1!',
      name: 'Admin Test',
      phone: '1234567890',
      role: 'admin' // The register endpoint might override this, so let's mock it if needed.
    });

    // We can directly update the DB to make it an admin
    const { usersTable } = await import('@workspace/database');
    await db.update(usersTable).set({ role: 'admin' }).where(eq(usersTable.email, adminEmail));

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: 'Adminpassword1!' });
    adminToken = loginRes.body.token;

    // Create a category
    const catRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Test Category ${Date.now()}`, slug: `test-cat-${Date.now()}`, description: 'Testing category' });
    
    testCategoryId = catRes.body.id;
  });

  it('should fetch products (pagination)', async () => {
    const res = await request(app).get('/api/products?page=1&limit=10');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
  });

  it('should create a new product (admin)', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Test Product ${Date.now()}`,
        slug: `test-prod-${Date.now()}`,
        categoryId: testCategoryId,
        description: 'A product for testing',
        imageUrl: 'http://example.com/img.jpg',
        isFeatured: true,
        variants: [
          { unit: 'kg', unitValue: '1', price: 100, mrp: 120, stock: 10, sku: 'TEST-SKU-1' }
        ]
      });
    
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    testProductId = res.body.id;
  });

  it('should fetch the created product by ID', async () => {
    const res = await request(app).get(`/api/products/${testProductId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(testProductId);
  });

  it('should fail to create product without admin token', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ name: 'Hack Product', categoryId: testCategoryId });
    
    expect(res.status).toBe(401);
  });

  afterAll(async () => {
    // Cleanup
    if (testProductId) {
      await db.delete(productsTable).where(eq(productsTable.id, testProductId));
    }
    if (testCategoryId) {
      await db.delete(categoriesTable).where(eq(categoriesTable.id, testCategoryId));
    }
    const { usersTable } = await import('@workspace/database');
    await db.delete(usersTable).where(eq(usersTable.email, adminEmail));
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { db, categoriesTable } from '@workspace/database';
import { eq } from 'drizzle-orm';

describe('Categories Endpoints', () => {
  let adminToken = '';
  let testCategoryId: number;
  const adminEmail = `admin_test_cat_${Date.now()}@ntcmarket.in`;

  beforeAll(async () => {
    await request(app).post('/api/auth/register').send({
      email: adminEmail,
      password: 'Adminpassword1!',
      name: 'Admin Test',
      phone: '1234567890'
    });

    const { usersTable } = await import('@workspace/database');
    await db.update(usersTable).set({ role: 'admin' }).where(eq(usersTable.email, adminEmail));

    const loginRes = await request(app).post('/api/auth/login').send({ email: adminEmail, password: 'Adminpassword1!' });
    adminToken = loginRes.body.token;
  });

  it('should fetch all categories', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should create a new category (admin)', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Test Cat ${Date.now()}`,
        slug: `test-cat-${Date.now()}`,
        description: 'New category'
      });
    
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    testCategoryId = res.body.id;
  });

  it('should delete the category (admin)', async () => {
    const res = await request(app)
      .delete(`/api/categories/${testCategoryId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(204);
  });

  afterAll(async () => {
    const { usersTable } = await import('@workspace/database');
    await db.delete(usersTable).where(eq(usersTable.email, adminEmail));
    if (testCategoryId) {
      await db.delete(categoriesTable).where(eq(categoriesTable.id, testCategoryId));
    }
  });
});

import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { db, usersTable } from '@workspace/database';
import { eq } from 'drizzle-orm';

describe('Auth Endpoints', () => {
  const testUser = {
    email: `test_${Date.now()}@test.com`,
    password: 'Password1!',
    name: 'Test User',
    phone: '1234567890'
  };

  let token = '';

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(testUser.email);
  });

  it('should not register the same user twice', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    expect(res.status).toBe(400);
  });

  it('should login the user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    token = res.body.token;
  });

  it('should get current user profile with token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(testUser.email);
  });

  afterAll(async () => {
    // Cleanup the test user
    await db.delete(usersTable).where(eq(usersTable.email, testUser.email));
  });
});

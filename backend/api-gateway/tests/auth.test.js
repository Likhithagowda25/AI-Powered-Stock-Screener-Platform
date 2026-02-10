const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

describe('Authentication API', () => {
  let testUserId;
  let authToken;
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'Test1234';

  afterAll(async () => {
    // Clean up test user
    if (testUserId) {
      await db.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
    await db.pool.end();
  });

  describe('POST /api/v1/auth/signup', () => {
    it('should register a new user with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('user_id');
      expect(res.body.data).toHaveProperty('email', testEmail.toLowerCase());
      
      testUserId = res.body.data.user_id;
    });

    it('should reject signup with invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'invalid-email',
          password: testPassword,
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should reject signup with weak password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'test2@example.com',
          password: 'weak',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });

    it('should reject duplicate email registration', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.error_code).toBe('USER_EXISTS');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('userId');
      expect(res.body.data).toHaveProperty('email', testEmail.toLowerCase());

      authToken = res.body.data.token;
    });

    it('should reject login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123',
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error_code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testPassword,
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error_code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid-email',
          password: testPassword,
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error_code).toBe('VALIDATION_ERROR');
    });
  });
});

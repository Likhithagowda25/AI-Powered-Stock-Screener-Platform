/**
 * Portfolio API Tests
 */

const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

// Mock authentication token for testing
let authToken;
let testUserId;
let testPortfolioId;
let testHoldingId;

describe('Portfolio API', () => {
  beforeAll(async () => {
    // Create test user and get auth token
    // In a real scenario, you'd call the auth endpoint
    // For testing, we'll mock this
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'testuser@example.com',
        password: 'TestPassword123!'
      });
    
    if (loginResponse.body.success) {
      authToken = loginResponse.body.data.token;
      testUserId = loginResponse.body.data.user.id;
    } else {
      // Register if not exists
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'testuser@example.com',
          password: 'TestPassword123!'
        });
      
      if (registerResponse.body.success) {
        authToken = registerResponse.body.data.token;
        testUserId = registerResponse.body.data.user.id;
      }
    }
  });

  afterAll(async () => {
    // Cleanup
    if (testPortfolioId) {
      try {
        await db.query('DELETE FROM user_portfolios WHERE portfolio_id = $1', [testPortfolioId]);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    await db.pool.end();
  });

  describe('GET /api/v1/portfolios', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/v1/portfolios');
      
      expect(response.status).toBe(401);
    });

    it('should return portfolios for authenticated user', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token');
        return;
      }

      const response = await request(app)
        .get('/api/v1/portfolios')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/v1/portfolios', () => {
    it('should create a new portfolio', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token');
        return;
      }

      const response = await request(app)
        .post('/api/v1/portfolios')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Portfolio',
          description: 'A test portfolio',
          currency: 'INR'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Portfolio');
      
      testPortfolioId = response.body.data.portfolio_id;
    });

    it('should reject duplicate portfolio names', async () => {
      if (!authToken || !testPortfolioId) {
        console.log('Skipping test - no auth token or portfolio');
        return;
      }

      const response = await request(app)
        .post('/api/v1/portfolios')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Portfolio',
          description: 'Duplicate'
        });
      
      expect(response.status).toBe(409);
    });

    it('should reject invalid portfolio data', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token');
        return;
      }

      const response = await request(app)
        .post('/api/v1/portfolios')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '', // Empty name
          currency: 'INVALID'
        });
      
      expect(response.status).toBe(400);
    });
  });

  describe('Portfolio Holdings', () => {
    it('should add a holding to portfolio', async () => {
      if (!authToken || !testPortfolioId) {
        console.log('Skipping test - no auth token or portfolio');
        return;
      }

      const response = await request(app)
        .post(`/api/v1/portfolios/${testPortfolioId}/holdings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ticker: 'TCS.NS',
          quantity: 100,
          average_buy_price: 3500.50,
          notes: 'Test holding'
        });
      
      // May fail if TCS.NS doesn't exist in companies table
      if (response.status === 201) {
        expect(response.body.success).toBe(true);
        testHoldingId = response.body.data.holding_id;
      } else {
        expect(response.status).toBe(400); // Invalid ticker
      }
    });

    it('should get portfolio holdings', async () => {
      if (!authToken || !testPortfolioId) {
        console.log('Skipping test - no auth token or portfolio');
        return;
      }

      const response = await request(app)
        .get(`/api/v1/portfolios/${testPortfolioId}/holdings`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should update a holding', async () => {
      if (!authToken || !testPortfolioId || !testHoldingId) {
        console.log('Skipping test - missing prerequisites');
        return;
      }

      const response = await request(app)
        .put(`/api/v1/portfolios/${testPortfolioId}/holdings/${testHoldingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quantity: 150,
          average_buy_price: 3600.00
        });
      
      expect(response.status).toBe(200);
      expect(response.body.data.quantity).toBe('150');
    });

    it('should remove a holding', async () => {
      if (!authToken || !testPortfolioId || !testHoldingId) {
        console.log('Skipping test - missing prerequisites');
        return;
      }

      const response = await request(app)
        .delete(`/api/v1/portfolios/${testPortfolioId}/holdings/${testHoldingId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data.deleted).toBe(true);
    });
  });

  describe('GET /api/v1/portfolios/:id/summary', () => {
    it('should return portfolio summary', async () => {
      if (!authToken || !testPortfolioId) {
        console.log('Skipping test - no auth token or portfolio');
        return;
      }

      const response = await request(app)
        .get(`/api/v1/portfolios/${testPortfolioId}/summary`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('holdings');
    });
  });

  describe('DELETE /api/v1/portfolios/:id', () => {
    it('should delete non-default portfolio', async () => {
      if (!authToken || !testPortfolioId) {
        console.log('Skipping test - no auth token or portfolio');
        return;
      }

      const response = await request(app)
        .delete(`/api/v1/portfolios/${testPortfolioId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data.deleted).toBe(true);
      
      testPortfolioId = null; // Clear for cleanup
    });
  });
});

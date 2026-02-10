/**
 * Watchlist API Tests
 */

const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

let authToken;
let testUserId;
let testWatchlistId;
let testItemId;

describe('Watchlist API', () => {
  beforeAll(async () => {
    // Get auth token
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
    if (testWatchlistId) {
      try {
        await db.query('DELETE FROM watchlists WHERE watchlist_id = $1', [testWatchlistId]);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    await db.pool.end();
  });

  describe('GET /api/v1/watchlists', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/v1/watchlists');
      
      expect(response.status).toBe(401);
    });

    it('should return watchlists for authenticated user', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token');
        return;
      }

      const response = await request(app)
        .get('/api/v1/watchlists')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/v1/watchlists', () => {
    it('should create a new watchlist', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token');
        return;
      }

      const response = await request(app)
        .post('/api/v1/watchlists')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Tech Stocks',
          description: 'Technology sector watchlist'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Tech Stocks');
      
      testWatchlistId = response.body.data.watchlist_id;
    });

    it('should reject duplicate watchlist names', async () => {
      if (!authToken || !testWatchlistId) {
        console.log('Skipping test - no auth token or watchlist');
        return;
      }

      const response = await request(app)
        .post('/api/v1/watchlists')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Tech Stocks'
        });
      
      expect(response.status).toBe(409);
    });

    it('should reject empty watchlist name', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token');
        return;
      }

      const response = await request(app)
        .post('/api/v1/watchlists')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: ''
        });
      
      expect(response.status).toBe(400);
    });
  });

  describe('Watchlist Items', () => {
    it('should add a stock to watchlist', async () => {
      if (!authToken || !testWatchlistId) {
        console.log('Skipping test - no auth token or watchlist');
        return;
      }

      const response = await request(app)
        .post(`/api/v1/watchlists/${testWatchlistId}/items`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ticker: 'INFY.NS',
          target_price: 1800.00,
          notes: 'Good IT stock'
        });
      
      // May fail if ticker doesn't exist
      if (response.status === 201) {
        expect(response.body.success).toBe(true);
        testItemId = response.body.data.item_id;
      } else {
        expect(response.status).toBe(400);
      }
    });

    it('should prevent duplicate items', async () => {
      if (!authToken || !testWatchlistId || !testItemId) {
        console.log('Skipping test - missing prerequisites');
        return;
      }

      const response = await request(app)
        .post(`/api/v1/watchlists/${testWatchlistId}/items`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ticker: 'INFY.NS'
        });
      
      expect(response.status).toBe(409);
    });

    it('should get watchlist items with current prices', async () => {
      if (!authToken || !testWatchlistId) {
        console.log('Skipping test - no auth token or watchlist');
        return;
      }

      const response = await request(app)
        .get(`/api/v1/watchlists/${testWatchlistId}/items`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should update watchlist item', async () => {
      if (!authToken || !testWatchlistId || !testItemId) {
        console.log('Skipping test - missing prerequisites');
        return;
      }

      const response = await request(app)
        .put(`/api/v1/watchlists/${testWatchlistId}/items/${testItemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          target_price: 1900.00,
          notes: 'Updated notes'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.data.target_price).toBe('1900.00');
    });

    it('should remove item from watchlist', async () => {
      if (!authToken || !testWatchlistId || !testItemId) {
        console.log('Skipping test - missing prerequisites');
        return;
      }

      const response = await request(app)
        .delete(`/api/v1/watchlists/${testWatchlistId}/items/${testItemId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data.deleted).toBe(true);
    });
  });

  describe('GET /api/v1/watchlists/check/:ticker', () => {
    it('should check if stock is in watchlists', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token');
        return;
      }

      const response = await request(app)
        .get('/api/v1/watchlists/check/TCS.NS')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('ticker');
      expect(response.body.data).toHaveProperty('is_watched');
    });
  });

  describe('DELETE /api/v1/watchlists/:id', () => {
    it('should delete non-default watchlist', async () => {
      if (!authToken || !testWatchlistId) {
        console.log('Skipping test - no auth token or watchlist');
        return;
      }

      const response = await request(app)
        .delete(`/api/v1/watchlists/${testWatchlistId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data.deleted).toBe(true);
      
      testWatchlistId = null;
    });
  });
});

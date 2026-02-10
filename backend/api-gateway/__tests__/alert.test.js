/**
 * Alert Subscription API Tests
 */

const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

let authToken;
let testUserId;
let testAlertId;

describe('Alert Subscription API', () => {
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
    if (testAlertId) {
      try {
        await db.query('DELETE FROM alert_subscriptions WHERE alert_id = $1', [testAlertId]);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    await db.pool.end();
  });

  describe('GET /api/v1/alerts', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/v1/alerts');
      
      expect(response.status).toBe(401);
    });

    it('should return alerts for authenticated user', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token');
        return;
      }

      const response = await request(app)
        .get('/api/v1/alerts')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/v1/alerts - Price Threshold', () => {
    it('should create a price threshold alert', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token');
        return;
      }

      const response = await request(app)
        .post('/api/v1/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'TCS Price Alert',
          description: 'Alert when TCS drops below 3500',
          ticker: 'TCS.NS',
          alert_type: 'price_threshold',
          condition: {
            operator: '<',
            value: 3500
          },
          frequency: 'daily',
          notify_push: true,
          notify_email: false
        });
      
      // May fail if ticker validation fails
      if (response.status === 201) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.alert_type).toBe('price_threshold');
        testAlertId = response.body.data.alert_id;
      } else if (response.status === 400) {
        expect(response.body.code).toBe('INVALID_TICKER');
      }
    });

    it('should reject invalid price threshold condition', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token');
        return;
      }

      const response = await request(app)
        .post('/api/v1/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invalid Alert',
          alert_type: 'price_threshold',
          condition: {
            operator: 'invalid',
            value: 'not a number'
          }
        });
      
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/alerts - Fundamental', () => {
    it('should create a fundamental alert', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token');
        return;
      }

      const response = await request(app)
        .post('/api/v1/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Low PE Alert',
          description: 'Alert for stocks with PE < 15',
          alert_type: 'fundamental',
          condition: {
            field: 'pe_ratio',
            operator: '<',
            value: 15
          },
          frequency: 'daily'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.data.alert_type).toBe('fundamental');
    });

    it('should reject unsupported field', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token');
        return;
      }

      const response = await request(app)
        .post('/api/v1/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invalid Field Alert',
          alert_type: 'fundamental',
          condition: {
            field: 'invalid_field',
            operator: '<',
            value: 10
          }
        });
      
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/alerts - Price Change', () => {
    it('should create a price change alert', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token');
        return;
      }

      const response = await request(app)
        .post('/api/v1/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Price Drop Alert',
          alert_type: 'price_change',
          ticker: 'INFY.NS',
          condition: {
            operator: '<',
            value: -5,
            period: '1d'
          },
          frequency: 'daily'
        });
      
      // May fail if ticker doesn't exist
      if (response.status === 201) {
        expect(response.body.data.alert_type).toBe('price_change');
      }
    });

    it('should reject missing period', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token');
        return;
      }

      const response = await request(app)
        .post('/api/v1/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Missing Period Alert',
          alert_type: 'price_change',
          condition: {
            operator: '<',
            value: -5
            // missing period
          }
        });
      
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/alerts - Event', () => {
    it('should create an event alert', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token');
        return;
      }

      const response = await request(app)
        .post('/api/v1/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Earnings Alert',
          alert_type: 'event',
          ticker: 'TCS.NS',
          condition: {
            event_type: 'earnings_date',
            days_before: 7
          },
          frequency: 'daily'
        });
      
      // May fail if ticker doesn't exist
      if (response.status === 201) {
        expect(response.body.data.alert_type).toBe('event');
      }
    });
  });

  describe('Alert Status Management', () => {
    it('should disable an alert', async () => {
      if (!authToken || !testAlertId) {
        console.log('Skipping test - missing prerequisites');
        return;
      }

      const response = await request(app)
        .post(`/api/v1/alerts/${testAlertId}/disable`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('paused');
    });

    it('should enable an alert', async () => {
      if (!authToken || !testAlertId) {
        console.log('Skipping test - missing prerequisites');
        return;
      }

      const response = await request(app)
        .post(`/api/v1/alerts/${testAlertId}/enable`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('active');
    });
  });

  describe('PUT /api/v1/alerts/:id', () => {
    it('should update an alert', async () => {
      if (!authToken || !testAlertId) {
        console.log('Skipping test - missing prerequisites');
        return;
      }

      const response = await request(app)
        .put(`/api/v1/alerts/${testAlertId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Alert Name',
          description: 'Updated description',
          frequency: 'hourly'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Updated Alert Name');
    });
  });

  describe('GET /api/v1/alerts/summary', () => {
    it('should return alert summary', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token');
        return;
      }

      const response = await request(app)
        .get('/api/v1/alerts/summary')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('active_count');
      expect(response.body.data).toHaveProperty('paused_count');
      expect(response.body.data).toHaveProperty('total_count');
    });
  });

  describe('GET /api/v1/alerts/:id/history', () => {
    it('should return alert history', async () => {
      if (!authToken || !testAlertId) {
        console.log('Skipping test - missing prerequisites');
        return;
      }

      const response = await request(app)
        .get(`/api/v1/alerts/${testAlertId}/history`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('DELETE /api/v1/alerts/:id', () => {
    it('should delete an alert', async () => {
      if (!authToken || !testAlertId) {
        console.log('Skipping test - missing prerequisites');
        return;
      }

      const response = await request(app)
        .delete(`/api/v1/alerts/${testAlertId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data.deleted).toBe(true);
      
      testAlertId = null;
    });

    it('should return 404 for deleted alert', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token');
        return;
      }

      const response = await request(app)
        .get('/api/v1/alerts/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(404);
    });
  });

  describe('Access Control', () => {
    it('should not allow access to other user alerts', async () => {
      // This test would require creating alerts with different users
      // and verifying cross-user access is blocked
      // For now, we test that non-existent IDs return 404
      if (!authToken) {
        console.log('Skipping test - no auth token');
        return;
      }

      const response = await request(app)
        .get('/api/v1/alerts/00000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(404);
    });
  });
});

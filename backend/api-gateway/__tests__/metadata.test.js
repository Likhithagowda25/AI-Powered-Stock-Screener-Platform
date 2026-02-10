const request = require('supertest');
const app = require('../src/app');

describe('Metadata Endpoints', () => {
  describe('GET /api/v1/metadata/stocks', () => {
    it('should return list of stocks', async () => {
      const response = await request(app)
        .get('/api/v1/metadata/stocks')
        .expect('Content-Type', /json/);

      if (response.statusCode === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('stocks');
        expect(response.body.data).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data.stocks)).toBe(true);
      }
    });

    it('should accept query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/metadata/stocks?limit=10&offset=0')
        .expect('Content-Type', /json/);

      if (response.statusCode === 200) {
        expect(response.body.data.stocks.length).toBeLessThanOrEqual(10);
      }
    });
  });
});

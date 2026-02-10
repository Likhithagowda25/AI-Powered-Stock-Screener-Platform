require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const cors = require('cors');
const app = express();

// Use the centralized router that includes ALL routes
const apiRoutes = require('./src/routes/index');

// Middleware imports
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');

app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Stock Screener API Gateway',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      screener: '/api/screener',
      metadata: '/api/metadata',
      portfolios: '/api/portfolios',
      watchlists: '/api/watchlists',
      alerts: '/api/alerts',
      company: '/api/company',
      market: '/api/market',
      notifications: '/api/notifications'
    }
  });
});

// Mount all routes under /api (and /health at root)
app.use('/health', require('./src/routes/healthRoutes'));
app.use('/api', apiRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
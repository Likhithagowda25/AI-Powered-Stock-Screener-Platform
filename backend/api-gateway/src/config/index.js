const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 8080,
  apiVersion: process.env.API_VERSION || 'v1',
  apiPrefix: process.env.API_PREFIX || '/api',
  
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    poolMin: parseInt(process.env.DB_POOL_MIN, 10) || 2,
    poolMax: parseInt(process.env.DB_POOL_MAX, 10) || 10,
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 1000, // Increased for development
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET_KEY || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d', // 7 days default
  },
  
  pythonServices: {
    ingestion: process.env.PYTHON_INGESTION_SERVICE,
    validation: process.env.PYTHON_VALIDATION_SERVICE,
    screener: process.env.PYTHON_SCREENER_SERVICE,
  },
};

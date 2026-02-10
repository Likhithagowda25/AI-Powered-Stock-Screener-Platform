const { Pool } = require('pg');
const logger = require('./logger');

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 5433,
  database: process.env.DB_NAME || 'stock_screener',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
  max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased from 2000 to 10000
});

// Test database connection
pool.on('connect', () => {
  logger.info('Database connection established');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error', { error: err.message });
});

// Query helper with error handling
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Database query error', { text, error: error.message });
    throw error;
  }
};

// Get a client from the pool
const getClient = async () => {
  try {
    return await pool.connect();
  } catch (error) {
    logger.error('Failed to get database client', { error: error.message });
    throw error;
  }
};

module.exports = {
  query,
  getClient,
  pool,
};

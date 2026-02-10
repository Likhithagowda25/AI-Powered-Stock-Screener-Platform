const db = require('../config/database');
const logger = require('../config/logger');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Health check endpoint
 * Returns server status and environment info
 */
const healthCheck = asyncHandler(async (req, res) => {
  const healthStatus = {
    status: 'UP',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || 'v1',
    uptime: process.uptime(),
  };

  // Check database connection
  try {
    await db.query('SELECT 1');
    healthStatus.database = 'UP';
  } catch (error) {
    logger.error('Database health check failed', { error: error.message });
    healthStatus.database = 'DOWN';
    healthStatus.status = 'DEGRADED';
  }

  const statusCode = healthStatus.status === 'UP' ? 200 : 503;
  
  res.status(statusCode).json({
    success: true,
    data: healthStatus,
  });
});

/**
 * Readiness probe endpoint
 * Checks if service is ready to accept traffic
 */
const readinessCheck = asyncHandler(async (req, res) => {
  try {
    // Check database connectivity
    await db.query('SELECT 1');
    
    res.status(200).json({
      success: true,
      message: 'Service is ready',
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Service is not ready',
      error: error.message,
    });
  }
});

/**
 * Liveness probe endpoint
 * Checks if service is alive
 */
const livenessCheck = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Service is alive',
  });
});

module.exports = {
  healthCheck,
  readinessCheck,
  livenessCheck,
};

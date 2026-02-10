const app = require('./app');
const config = require('./config');
const logger = require('./config/logger');
const db = require('./config/database');

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message);
  console.error(error.stack);
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  // Close database connections
  try {
    await db.pool.end();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections', { error: error.message });
  }

  process.exit(0);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

const alertProcessor = require('./services/alertProcessor');

// Start server
const PORT = 3000;
console.log(`Starting API Gateway on port ${PORT}...`);
const server = app.listen(PORT, () => {
  console.log(`API Gateway running on http://localhost:${PORT}`);
  console.log(`Environment: ${config.env}`);
  console.log(`Database: ${config.database.host}:${config.database.port}/${config.database.name}`);
  logger.info(`API Gateway started successfully`);
  logger.info(`Environment: ${config.env}`);
  logger.info(`Port: ${PORT}`);
  logger.info(`API Version: ${config.apiVersion}`);
  logger.info(`Database: ${config.database.host}:${config.database.port}/${config.database.name}`);
  
  // Start Alert Processor
  alertProcessor.start();
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error.message);
  logger.error('Server error', { error: error.message });
  process.exit(1);
});

module.exports = server;

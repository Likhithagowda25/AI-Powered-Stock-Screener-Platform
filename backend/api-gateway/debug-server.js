// Debug server startup
console.log('Starting server debug...');

try {
  console.log('1. Loading app...');
  const app = require('./src/app');
  console.log('2. App loaded successfully');
  
  console.log('3. Loading config...');
  const config = require('./src/config');
  console.log('4. Config loaded:', {
    port: config.port,
    env: config.env,
    apiVersion: config.apiVersion
  });
  
  console.log('5. Loading logger...');
  const logger = require('./src/config/logger');
  console.log('6. Logger loaded successfully');
  
  console.log('7. Loading database...');
  const db = require('./src/config/database');
  console.log('8. Database loaded successfully');
  
  console.log('9. Starting server on port', config.port);
  const server = app.listen(config.port, () => {
    console.log('Server started successfully!');
    console.log(`Listening on port ${config.port}`);
    logger.info(`API Gateway started on port ${config.port}`);
  });
  
  server.on('error', (error) => {
    console.error('Server error:', error);
    logger.error('Server error', { error: error.message });
  });
  
} catch (error) {
  console.error('Startup error:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
}

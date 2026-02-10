const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

/**
 * Request logging middleware
 * Adds trace ID and logs request/response details
 */
const requestLogger = (req, res, next) => {
  // Generate unique trace ID for request
  req.traceId = uuidv4();
  
  // Capture request start time
  const startTime = Date.now();

  // Log incoming request
  logger.info('Incoming request', {
    traceId: req.traceId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (data) {
    res.send = originalSend;
    
    const duration = Date.now() - startTime;
    
    // Log response
    logger.info('Outgoing response', {
      traceId: req.traceId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });

    return res.send(data);
  };

  next();
};

module.exports = requestLogger;

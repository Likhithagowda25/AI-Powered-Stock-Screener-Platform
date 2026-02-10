const rateLimit = require('express-rate-limit');
const config = require('../config');
const logger = require('../config/logger');

/**
 * Strict rate limiter for authentication endpoints (login/signup)
 * Limits to 5 requests per 15 minutes per IP to prevent brute force attacks
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn({
      message: 'Rate limit exceeded on auth endpoint',
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent')
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  },
  skip: (req) => {
    // Skip rate limiting for test environments
    return process.env.NODE_ENV === 'test';
  }
});

/**
 * General API rate limiter
 * More lenient for regular API endpoints
 */
const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later',
    error_code: 'TOO_MANY_REQUESTS',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return process.env.NODE_ENV === 'test';
  }
});

module.exports = {
  authLimiter,
  rateLimiter
};

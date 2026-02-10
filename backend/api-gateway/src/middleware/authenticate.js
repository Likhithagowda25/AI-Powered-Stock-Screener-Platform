const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
const config = require('../config');
const { ApiError } = require('./errorHandler');
const tokenBlacklist = require('../services/tokenBlacklist');

/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches user info to request
 * 
 * Usage:
 *   router.get('/protected', authenticate, controller.method);
 */
const authenticate = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new ApiError(401, 'No authorization token provided', 'NO_TOKEN');
    }

    // Check Bearer format
    if (!authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Invalid authorization format. Use: Bearer <token>', 'INVALID_TOKEN_FORMAT');
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer '

    if (!token) {
      throw new ApiError(401, 'No token provided', 'NO_TOKEN');
    }

    // Check if token is blacklisted (logged out)
    if (tokenBlacklist.isBlacklisted(token)) {
      logger.warn('Blacklisted token used', { traceId: req.traceId });
      throw new ApiError(401, 'Token has been invalidated. Please login again.', 'TOKEN_BLACKLISTED');
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      iat: decoded.iat,
    };

    logger.debug('JWT verified successfully', { 
      userId: decoded.userId, 
      traceId: req.traceId 
    });

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }

    // Handle JWT-specific errors
    if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid JWT token', { error: error.message, traceId: req.traceId });
      return next(new ApiError(401, 'Invalid token', 'INVALID_TOKEN'));
    }

    if (error.name === 'TokenExpiredError') {
      logger.warn('Expired JWT token', { error: error.message, traceId: req.traceId });
      return next(new ApiError(401, 'Token expired. Please login again', 'TOKEN_EXPIRED'));
    }

    logger.error('Authentication error', { error: error.message, traceId: req.traceId });
    return next(new ApiError(500, 'Authentication failed', 'AUTH_ERROR'));
  }
};

const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer')) {
      return next();
    }

    const token = authHeader.substring(7);

    if (!token) {
      return next();
    }
    const decoded = jwt.verify(token, config.jwt.secret);

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    next();
  } catch (error) {
    // Token invalid or expired, but we don't fail the request
    logger.debug('Optional auth failed, continuing without user', { 
      error: error.message, 
      traceId: req.traceId 
    });
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth,
};

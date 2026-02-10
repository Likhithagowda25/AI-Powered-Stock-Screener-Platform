/**
 * Token Blacklist Service
 * Manages invalidated JWT tokens for logout functionality
 * 
 * In production, use Redis for distributed system support
 */

const logger = require('../config/logger');

class TokenBlacklist {
  constructor() {
    // In-memory store for blacklisted tokens
    // Key: token, Value: expiration timestamp
    this.blacklist = new Map();
    
    // Clean up expired tokens every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Add a token to the blacklist
   * @param {string} token - JWT token to blacklist
   * @param {number} expiresAt - Token expiration timestamp (in seconds)
   */
  add(token, expiresAt) {
    if (!token || !expiresAt) {
      logger.error('Invalid token or expiration provided to blacklist');
      return;
    }

    this.blacklist.set(token, expiresAt);
    
    logger.info({
      message: 'Token added to blacklist',
      tokenLength: token.length,
      expiresAt: new Date(expiresAt * 1000).toISOString()
    });
  }

  /**
   * Check if a token is blacklisted
   * @param {string} token - JWT token to check
   * @returns {boolean} - True if token is blacklisted
   */
  isBlacklisted(token) {
    if (!token) return false;

    const expiresAt = this.blacklist.get(token);
    
    if (!expiresAt) {
      return false;
    }

    // Check if token has expired naturally
    const now = Math.floor(Date.now() / 1000);
    if (now > expiresAt) {
      // Token expired, remove from blacklist
      this.blacklist.delete(token);
      return false;
    }

    return true;
  }

  /**
   * Remove expired tokens from blacklist
   */
  cleanup() {
    const now = Math.floor(Date.now() / 1000);
    let removedCount = 0;

    for (const [token, expiresAt] of this.blacklist.entries()) {
      if (now > expiresAt) {
        this.blacklist.delete(token);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.info({
        message: 'Cleaned up expired tokens from blacklist',
        removedCount,
        remainingCount: this.blacklist.size
      });
    }
  }

  /**
   * Get the number of blacklisted tokens
   * @returns {number}
   */
  size() {
    return this.blacklist.size;
  }

  /**
   * Clear all blacklisted tokens (for testing)
   */
  clear() {
    this.blacklist.clear();
    logger.info('Token blacklist cleared');
  }

  /**
   * Stop the cleanup interval
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
const tokenBlacklist = new TokenBlacklist();

module.exports = tokenBlacklist;

/**
 * Watchlist Validator Middleware
 * Validates watchlist and item input data
 */

const { ApiError } = require('./errorHandler');

/**
 * Validate watchlist creation/update data
 */
const validateWatchlist = (req, res, next) => {
  const { name, description } = req.body;
  const errors = [];

  // For creation, name is required
  if (req.method === 'POST') {
    if (!name || typeof name !== 'string') {
      errors.push('Watchlist name is required and must be a string');
    }
  }

  // Name validation (if provided)
  if (name !== undefined) {
    if (typeof name !== 'string') {
      errors.push('Watchlist name must be a string');
    } else if (name.trim().length < 1 || name.trim().length > 100) {
      errors.push('Watchlist name must be between 1 and 100 characters');
    }
  }

  // Description validation (if provided)
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.push('Description must be a string');
    } else if (description.length > 500) {
      errors.push('Description must be less than 500 characters');
    }
  }

  if (errors.length > 0) {
    return next(new ApiError(400, errors.join('; '), 'VALIDATION_ERROR'));
  }

  // Trim name if provided
  if (name) {
    req.body.name = name.trim();
  }

  next();
};

/**
 * Validate watchlist item creation/update data
 */
const validateWatchlistItem = (req, res, next) => {
  const { ticker, target_price, notes } = req.body;
  const errors = [];

  // For creation, ticker is required
  if (req.method === 'POST') {
    if (!ticker || typeof ticker !== 'string') {
      errors.push('Ticker symbol is required and must be a string');
    }
  }

  // Ticker validation (if provided)
  if (ticker !== undefined) {
    if (typeof ticker !== 'string') {
      errors.push('Ticker must be a string');
    } else if (ticker.trim().length < 1 || ticker.trim().length > 20) {
      errors.push('Ticker must be between 1 and 20 characters');
    } else if (!/^[A-Za-z0-9.\-]+$/.test(ticker.trim())) {
      errors.push('Ticker contains invalid characters');
    }
  }

  // Target price validation (if provided)
  if (target_price !== undefined && target_price !== null) {
    const price = parseFloat(target_price);
    if (isNaN(price) || price < 0) {
      errors.push('Target price must be a non-negative number');
    }
  }

  // Notes validation (if provided)
  if (notes !== undefined && notes !== null) {
    if (typeof notes !== 'string') {
      errors.push('Notes must be a string');
    } else if (notes.length > 500) {
      errors.push('Notes must be less than 500 characters');
    }
  }

  if (errors.length > 0) {
    return next(new ApiError(400, errors.join('; '), 'VALIDATION_ERROR'));
  }

  // Normalize ticker
  if (ticker) {
    req.body.ticker = ticker.trim().toUpperCase();
  }

  next();
};

module.exports = {
  validateWatchlist,
  validateWatchlistItem
};

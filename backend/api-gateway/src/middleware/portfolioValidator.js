/**
 * Portfolio Validator Middleware
 * Validates portfolio and holding input data
 */

const { ApiError } = require('./errorHandler');

/**
 * Validate portfolio creation/update data
 */
const validatePortfolio = (req, res, next) => {
  const { name, description, currency } = req.body;
  const errors = [];

  // For creation, name is required
  if (req.method === 'POST') {
    if (!name || typeof name !== 'string') {
      errors.push('Portfolio name is required and must be a string');
    }
  }

  // Name validation (if provided)
  if (name !== undefined) {
    if (typeof name !== 'string') {
      errors.push('Portfolio name must be a string');
    } else if (name.trim().length < 1 || name.trim().length > 100) {
      errors.push('Portfolio name must be between 1 and 100 characters');
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

  // Currency validation (if provided)
  if (currency !== undefined) {
    const validCurrencies = ['INR', 'USD', 'EUR', 'GBP'];
    if (!validCurrencies.includes(currency)) {
      errors.push(`Currency must be one of: ${validCurrencies.join(', ')}`);
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
 * Validate holding creation/update data
 */
const validateHolding = (req, res, next) => {
  const { ticker, quantity, average_buy_price, buy_date, notes } = req.body;
  const errors = [];

  // For creation, ticker and quantity are required
  if (req.method === 'POST') {
    if (!ticker || typeof ticker !== 'string') {
      errors.push('Ticker symbol is required and must be a string');
    }
    if (quantity === undefined || quantity === null) {
      errors.push('Quantity is required');
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

  // Quantity validation (if provided)
  if (quantity !== undefined && quantity !== null) {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      errors.push('Quantity must be a positive number');
    }
  }

  // Average buy price validation (if provided)
  if (average_buy_price !== undefined && average_buy_price !== null) {
    const price = parseFloat(average_buy_price);
    if (isNaN(price) || price < 0) {
      errors.push('Average buy price must be a non-negative number');
    }
  }

  // Buy date validation (if provided)
  if (buy_date !== undefined && buy_date !== null) {
    const date = new Date(buy_date);
    if (isNaN(date.getTime())) {
      errors.push('Buy date must be a valid date');
    } else if (date > new Date()) {
      errors.push('Buy date cannot be in the future');
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
  validatePortfolio,
  validateHolding
};

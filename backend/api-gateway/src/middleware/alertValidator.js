/**
 * Alert Validator Middleware
 * Validates alert subscription input data
 */

const { ApiError } = require('./errorHandler');

// Supported alert types
const ALERT_TYPES = [
  'price_threshold', 'price_change', 'fundamental', 'event', 'technical', 'custom_dsl',
  'price_below_buy_price', 'price_vs_analyst', 'earnings_upcoming', 'buyback_announced', 'fundamental_condition'
];

// Supported frequencies
const ALERT_FREQUENCIES = ['real_time', 'hourly', 'daily', 'weekly'];

// Supported operators
const SUPPORTED_OPERATORS = ['<', '>', '<=', '>=', '=', '!=', 'between', 'in', 'not_in', 'exists', 'above', 'below'];

// Supported fields for fundamental alerts
const SUPPORTED_FIELDS = [
  'price', 'price_change_percent', 'volume',
  'pe_ratio', 'peg_ratio', 'price_to_book', 'price_to_sales', 'ev_to_ebitda',
  'roe', 'roa', 'operating_margin', 'net_margin',
  'revenue_growth_yoy', 'earnings_growth_yoy', 'eps_growth',
  'debt_to_equity', 'debt_to_fcf', 'free_cash_flow',
  'market_cap', 'dividend_yield', 'promoter_holding',
  'price_change_from_52w_high', 'price_change_from_52w_low',
  'revenue_growth' // Added missing field from frontend
];

// Event types
const EVENT_TYPES = ['earnings_date', 'buyback_announced', 'dividend_declared', 'stock_split'];

/**
 * Validate alert creation data
 */
const validateAlert = (req, res, next) => {
  const {
    name,
    alert_name, // Support alert_name
    description,
    ticker,
    alert_type,
    condition,
    condition_json, // Support condition_json
    frequency,
    expires_at,
    notify_push,
    notify_email
  } = req.body;
  
  const errors = [];

  // Required fields
  // Prefer 'name', callback to 'alert_name' if provided
  const inputName = name || alert_name;
  const inputCondition = condition || condition_json;

  if (!inputName || typeof inputName !== 'string') {
    errors.push('Alert name is required and must be a string');
  } else if (inputName.trim().length < 1 || inputName.trim().length > 200) {
    errors.push('Alert name must be between 1 and 200 characters');
  }

  if (!alert_type) {
    errors.push('Alert type is required');
  } else if (!ALERT_TYPES.includes(alert_type)) {
    errors.push(`Alert type must be one of: ${ALERT_TYPES.join(', ')}`);
  }

  if (!inputCondition || typeof inputCondition !== 'object') {
    errors.push('Condition is required and must be an object');
  }

  // Ticker validation (optional, depends on alert type)
  if (ticker !== undefined && ticker !== null) {
    if (typeof ticker !== 'string') {
      errors.push('Ticker must be a string');
    } else if (!/^[A-Za-z0-9.\-]+$/.test(ticker.trim())) {
      errors.push('Ticker contains invalid characters');
    }
  }

  // Description validation
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.push('Description must be a string');
    } else if (description.length > 500) {
      errors.push('Description must be less than 500 characters');
    }
  }

  // Frequency validation
  if (frequency !== undefined) {
    if (!ALERT_FREQUENCIES.includes(frequency)) {
      errors.push(`Frequency must be one of: ${ALERT_FREQUENCIES.join(', ')}`);
    }
  }

  // Expires_at validation
  if (expires_at !== undefined && expires_at !== null) {
    const date = new Date(expires_at);
    if (isNaN(date.getTime())) {
      errors.push('Expiration date must be a valid date');
    } else if (date <= new Date()) {
      errors.push('Expiration date must be in the future');
    }
  }

  // Boolean validations
  if (notify_push !== undefined && typeof notify_push !== 'boolean') {
    errors.push('notify_push must be a boolean');
  }
  if (notify_email !== undefined && typeof notify_email !== 'boolean') {
    errors.push('notify_email must be a boolean');
  }

  // Validate condition based on alert type (if both are provided)
  if (alert_type && inputCondition && typeof inputCondition === 'object') {
    const conditionErrors = validateCondition(inputCondition, alert_type);
    errors.push(...conditionErrors);
  }

  if (errors.length > 0) {
    return next(new ApiError(400, errors.join('; '), 'VALIDATION_ERROR'));
  }

  // Normalize ticker
  if (ticker) {
    req.body.ticker = ticker.trim().toUpperCase();
  }
  if (inputName) {
    req.body.name = inputName.trim();
  }

  next();
};

/**
 * Validate alert update data
 */
const validateAlertUpdate = (req, res, next) => {
  const {
    name,
    description,
    condition,
    frequency,
    expires_at,
    notify_push,
    notify_email
  } = req.body;
  
  const errors = [];

  // Name validation (if provided)
  if (name !== undefined) {
    if (typeof name !== 'string') {
      errors.push('Alert name must be a string');
    } else if (name.trim().length < 1 || name.trim().length > 200) {
      errors.push('Alert name must be between 1 and 200 characters');
    }
  }

  // Condition validation (if provided)
  if (condition !== undefined) {
    if (typeof condition !== 'object') {
      errors.push('Condition must be an object');
    }
    // Note: Full condition validation would require knowing the alert type
    // which we get from the existing alert in the service layer
  }

  // Description validation
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.push('Description must be a string');
    } else if (description.length > 500) {
      errors.push('Description must be less than 500 characters');
    }
  }

  // Frequency validation
  if (frequency !== undefined) {
    if (!ALERT_FREQUENCIES.includes(frequency)) {
      errors.push(`Frequency must be one of: ${ALERT_FREQUENCIES.join(', ')}`);
    }
  }

  // Expires_at validation
  if (expires_at !== undefined && expires_at !== null) {
    const date = new Date(expires_at);
    if (isNaN(date.getTime())) {
      errors.push('Expiration date must be a valid date');
    }
  }

  // Boolean validations
  if (notify_push !== undefined && typeof notify_push !== 'boolean') {
    errors.push('notify_push must be a boolean');
  }
  if (notify_email !== undefined && typeof notify_email !== 'boolean') {
    errors.push('notify_email must be a boolean');
  }

  if (errors.length > 0) {
    return next(new ApiError(400, errors.join('; '), 'VALIDATION_ERROR'));
  }

  // Normalize name
  if (name) {
    req.body.name = name.trim();
  }

  next();
};

/**
 * Validate condition based on alert type
 */
function validateCondition(condition, alertType) {
  const errors = [];

  switch (alertType) {
    case 'price_threshold':
      if (!condition.operator) {
        errors.push('Price threshold condition requires an operator');
      } else if (!['<', '>', '<=', '>=', '=', 'between'].includes(condition.operator)) {
        errors.push('Price threshold operator must be one of: <, >, <=, >=, =, between');
      }
      
      if (condition.value === undefined || condition.value === null) {
        errors.push('Price threshold condition requires a value');
      } else if (condition.operator === 'between') {
        if (!Array.isArray(condition.value) || condition.value.length !== 2) {
          errors.push('Between operator requires an array of [min, max]');
        } else if (typeof condition.value[0] !== 'number' || typeof condition.value[1] !== 'number') {
          errors.push('Between values must be numbers');
        } else if (condition.value[0] >= condition.value[1]) {
          errors.push('Between range min must be less than max');
        }
      } else if (typeof condition.value !== 'number') {
        errors.push('Price value must be a number');
      } else if (condition.value < 0) {
        errors.push('Price value cannot be negative');
      }
      break;

    case 'price_change':
      if (!condition.operator) {
        errors.push('Price change condition requires an operator');
      } else if (!['<', '>', '<=', '>='].includes(condition.operator)) {
        errors.push('Price change operator must be one of: <, >, <=, >=');
      }
      
      if (typeof condition.value !== 'number') {
        errors.push('Price change value must be a percentage number');
      }
      
      if (!condition.period) {
        errors.push('Price change condition requires a period');
      } else if (!['1d', '1w', '1m', '3m', '1y'].includes(condition.period)) {
        errors.push('Period must be one of: 1d, 1w, 1m, 3m, 1y');
      }
      break;

    case 'fundamental':
      if (!condition.field) {
        errors.push('Fundamental condition requires a field');
      } else if (!SUPPORTED_FIELDS.includes(condition.field)) {
        errors.push(`Unsupported field: ${condition.field}. Supported fields: ${SUPPORTED_FIELDS.slice(0, 10).join(', ')}...`);
      }
      
      if (!condition.operator) {
        errors.push('Fundamental condition requires an operator');
      } else if (!SUPPORTED_OPERATORS.includes(condition.operator)) {
        errors.push(`Invalid operator. Supported operators: ${SUPPORTED_OPERATORS.join(', ')}`);
      }
      
      // Value validation depends on operator
      if (['<', '>', '<=', '>=', '=', '!='].includes(condition.operator)) {
        if (typeof condition.value !== 'number') {
          errors.push('Comparison value must be a number');
        }
      } else if (condition.operator === 'between') {
        if (!Array.isArray(condition.value) || condition.value.length !== 2) {
          errors.push('Between operator requires an array of [min, max]');
        }
      } else if (['in', 'not_in'].includes(condition.operator)) {
        if (!Array.isArray(condition.value)) {
          errors.push('In/not_in operator requires an array of values');
        }
      }
      break;

    case 'event':
      if (!condition.event_type) {
        errors.push('Event condition requires event_type');
      } else if (!EVENT_TYPES.includes(condition.event_type)) {
        errors.push(`Unsupported event type. Supported: ${EVENT_TYPES.join(', ')}`);
      }
      
      if (condition.days_before !== undefined) {
        if (typeof condition.days_before !== 'number' || condition.days_before < 0) {
          errors.push('days_before must be a non-negative number');
        }
      }
      break;

    case 'custom_dsl':
      // Basic structure validation for DSL
      if (!condition.filter && !condition.and && !condition.or) {
        errors.push('Custom DSL must have a filter, and, or or clause');
      }
      break;

    case 'technical':
      // Technical indicator validation
      if (!condition.indicator) {
        errors.push('Technical condition requires an indicator');
      }
      break;

    // Frontend specific types
    case 'price_below_buy_price':
      if (condition.threshold_percent === undefined) {
        errors.push('Price below buy price requires threshold_percent');
      }
      break;

    case 'price_vs_analyst':
      if (!condition.comparison) {
        errors.push('Price vs Analyst requires comparison type');
      }
      break;

    case 'earnings_upcoming':
      if (condition.days_before === undefined) {
        errors.push('Earnings upcoming requires days_before');
      }
      break;

    case 'buyback_announced':
      if (condition.days_lookback === undefined) {
        errors.push('Buyback announced requires days_lookback');
      }
      break;

    case 'fundamental_condition':
      // Map check for frontend fundamental
      if (!condition.metric && !condition.field) {
        errors.push('Fundamental condition requires metric/field');
      }
      if (!condition.operator) {
        errors.push('Fundamental condition requires operator');
      }
      if (condition.value === undefined) {
        errors.push('Fundamental condition requires value');
      }
      break;
  }

  return errors;
}

module.exports = {
  validateAlert,
  validateAlertUpdate
};

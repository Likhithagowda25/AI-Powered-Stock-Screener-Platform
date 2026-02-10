/**
 * DSL Schema Validation
 * 
 * Validates DSL output from LLM/stub against strict schema rules:
 * - Allowed metrics (from field catalog)
 * - Allowed operators
 * - Logical consistency
 * - Time-period constraints
 * - Type validation
 * 
 * Ensures safe, deterministic queries with no SQL injection risk
 */

// Comprehensive list of allowed financial metrics (based on schema.sql)
const ALLOWED_FIELDS = [
  // From companies table
  'market_cap',
  'sector',
  'industry',
  'exchange',
  'promoter_holding',
  'next_earnings_date',
  'last_buyback_date',
  
  // From price_history table
  'open',
  'high',
  'low',
  'close',
  'volume',
  
  // From fundamentals_quarterly table
  'revenue',
  'net_income',
  'eps',
  'operating_margin',
  'roe',
  'roa',
  'pe_ratio',
  'pb_ratio',
  'peg_ratio',
  'ebitda',
  'ebitda_margin',
  'debt_to_equity',
  'current_ratio',
  'total_assets',
  'total_debt',
  'free_cash_flow',
  'operating_cash_flow',
  'revenue_growth_yoy',
  'ebitda_growth_yoy',

  // Derived / computed fields
  'debt_to_fcf',
  
  // From debt_profile table
  'short_term_debt',
  'long_term_debt',
  
  // From cashflow_statements table
  'cfo',           // Cash flow from operations
  'cfi',           // Cash flow from investing
  'cff',           // Cash flow from financing
  'capex',         // Capital expenditure
  
  // From analyst_estimates table
  'eps_estimate',
  'revenue_estimate',
  'price_target_low',
  'price_target_avg',
  'price_target_high'
];

// Allowed comparison operators
const ALLOWED_OPERATORS = [
  '<',        // less than
  '>',        // greater than
  '<=',       // less than or equal
  '>=',       // greater than or equal
  '=',        // equal
  '!=',       // not equal
  'between',  // range
  'in',       // set membership
  'exists'    // null check
];

// Valid time period types
const ALLOWED_PERIOD_TYPES = [
  'last_n_quarters',
  'last_n_years',
  'trailing_12_months'
];

// Valid aggregation methods
const ALLOWED_AGGREGATIONS = [
  'all',   // all periods must satisfy
  'any',   // at least one period must satisfy
  'avg',   // average across periods
  'sum',   // sum across periods
  'min',   // minimum across periods
  'max'    // maximum across periods
];

/**
 * Main validation function
 * @param {object} dsl - DSL object to validate
 * @throws {Error} If validation fails
 */
function validateDSL(dsl) {
  if (!dsl || typeof dsl !== 'object') {
    throw new Error('DSL must be a non-null object');
  }

  // Require filter property
  if (!dsl.filter) {
    throw new Error('DSL must contain "filter" property');
  }

  // Validate filter structure
  validateLogicalExpression(dsl.filter);

  // Validate optional metadata
  if (dsl.meta) {
    validateMetadata(dsl.meta);
  }

  // Validate optional limit
  if (dsl.limit !== undefined) {
    if (typeof dsl.limit !== 'number' || dsl.limit < 1 || dsl.limit > 1000) {
      throw new Error('limit must be a number between 1 and 1000');
    }
  }

  // Validate optional sort
  if (dsl.sort) {
    validateSort(dsl.sort);
  }

  // No additional properties allowed
  const allowedTopLevelKeys = ['filter', 'meta', 'limit', 'sort'];
  const unexpectedKeys = Object.keys(dsl).filter(key => !allowedTopLevelKeys.includes(key));
  if (unexpectedKeys.length > 0) {
    throw new Error(`Unexpected properties in DSL: ${unexpectedKeys.join(', ')}`);
  }
}

/**
 * Validate logical expression (and/or/not)
 */
function validateLogicalExpression(expr) {
  if (!expr || typeof expr !== 'object') {
    throw new Error('Logical expression must be an object');
  }

  const logicalKeys = ['and', 'or', 'not'];
  const presentKeys = logicalKeys.filter(key => key in expr);

  // Must have exactly one logical operator
  if (presentKeys.length !== 1) {
    throw new Error('Logical expression must have exactly one of: and, or, not');
  }

  const operator = presentKeys[0];

  if (operator === 'not') {
    // NOT takes single condition or expression
    const notValue = expr.not;
    if (isCondition(notValue)) {
      validateCondition(notValue);
    } else {
      validateLogicalExpression(notValue);
    }
  } else {
    // AND/OR take arrays
    const conditions = expr[operator];
    
    if (!Array.isArray(conditions)) {
      throw new Error(`${operator.toUpperCase()} must be an array`);
    }

    if (conditions.length === 0) {
      throw new Error(`${operator.toUpperCase()} array cannot be empty`);
    }

    // Validate each condition or nested expression
    conditions.forEach((item, index) => {
      if (isCondition(item)) {
        validateCondition(item);
      } else {
        validateLogicalExpression(item);
      }
    });
  }

  // No additional properties
  const unexpectedKeys = Object.keys(expr).filter(key => !logicalKeys.includes(key));
  if (unexpectedKeys.length > 0) {
    throw new Error(`Unexpected properties in logical expression: ${unexpectedKeys.join(', ')}`);
  }
}

/**
 * Check if object is a condition (has field and operator)
 */
function isCondition(obj) {
  return obj && typeof obj === 'object' && 'field' in obj && 'operator' in obj;
}

/**
 * Validate individual condition
 */
function validateCondition(condition) {
  if (!condition || typeof condition !== 'object') {
    throw new Error('Condition must be an object');
  }

  // Required: field and operator
  if (!condition.field) {
    throw new Error('Condition must have "field" property');
  }

  if (!condition.operator) {
    throw new Error('Condition must have "operator" property');
  }

  // Validate field
  if (!ALLOWED_FIELDS.includes(condition.field)) {
    throw new Error(`Unsupported field: "${condition.field}". Allowed fields: ${ALLOWED_FIELDS.join(', ')}`);
  }

  // Validate operator
  if (!ALLOWED_OPERATORS.includes(condition.operator)) {
    throw new Error(`Unsupported operator: "${condition.operator}". Allowed operators: ${ALLOWED_OPERATORS.join(', ')}`);
  }

  // Validate value based on operator
  validateValueForOperator(condition.operator, condition.value);

  // Validate optional period
  if (condition.period) {
    validatePeriod(condition.period);
  }

  // Validate optional derived_from
  if (condition.derived_from) {
    if (!Array.isArray(condition.derived_from)) {
      throw new Error('derived_from must be an array');
    }
    condition.derived_from.forEach(field => {
      if (!ALLOWED_FIELDS.includes(field)) {
        throw new Error(`Invalid derived_from field: ${field}`);
      }
    });
  }

  // No unexpected properties
  const allowedConditionKeys = ['field', 'operator', 'value', 'period', 'derived_from', 'value_is_field'];
  const unexpectedKeys = Object.keys(condition).filter(key => !allowedConditionKeys.includes(key));
  if (unexpectedKeys.length > 0) {
    throw new Error(`Unexpected properties in condition: ${unexpectedKeys.join(', ')}`);
  }
}

/**
 * Validate value based on operator requirements
 */
function validateValueForOperator(operator, value) {
  if (value === undefined) {
    throw new Error(`Value is required for operator "${operator}"`);
  }

  switch (operator) {
    case 'between':
      // Must be array of 2 numbers
      if (!Array.isArray(value) || value.length !== 2) {
        throw new Error('Value for "between" operator must be an array of 2 numbers');
      }
      if (typeof value[0] !== 'number' || typeof value[1] !== 'number') {
        throw new Error('Values for "between" operator must be numbers');
      }
      if (value[0] >= value[1]) {
        throw new Error('First value in "between" must be less than second value');
      }
      break;

    case 'in':
      // Must be array
      if (!Array.isArray(value) || value.length === 0) {
        throw new Error('Value for "in" operator must be a non-empty array');
      }
      break;

    case 'exists':
      // Must be boolean
      if (typeof value !== 'boolean') {
        throw new Error('Value for "exists" operator must be a boolean');
      }
      break;

    case '<':
    case '>':
    case '<=':
    case '>=':
    case '=':
    case '!=':
      // Must be number or string
      if (typeof value !== 'number' && typeof value !== 'string') {
        throw new Error(`Value for "${operator}" operator must be a number or string`);
      }
      break;

    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
}

/**
 * Validate period specification
 */
function validatePeriod(period) {
  if (!period || typeof period !== 'object') {
    throw new Error('Period must be an object');
  }

  // Required properties
  if (!period.type) {
    throw new Error('Period must have "type" property');
  }

  if (period.n === undefined) {
    throw new Error('Period must have "n" property');
  }

  if (!period.aggregation) {
    throw new Error('Period must have "aggregation" property');
  }

  // Validate type
  if (!ALLOWED_PERIOD_TYPES.includes(period.type)) {
    throw new Error(`Invalid period type: "${period.type}". Allowed: ${ALLOWED_PERIOD_TYPES.join(', ')}`);
  }

  // Validate n
  if (typeof period.n !== 'number' || period.n < 1 || period.n > 20) {
    throw new Error('Period "n" must be a number between 1 and 20');
  }

  // Validate aggregation
  if (!ALLOWED_AGGREGATIONS.includes(period.aggregation)) {
    throw new Error(`Invalid aggregation: "${period.aggregation}". Allowed: ${ALLOWED_AGGREGATIONS.join(', ')}`);
  }
}

/**
 * Validate metadata filters
 */
function validateMetadata(meta) {
  if (!meta || typeof meta !== 'object') {
    throw new Error('Metadata must be an object');
  }

  const allowedMetaKeys = ['sector', 'exchange', 'market_cap_category', 'index', 'market_cap_range'];
  const unexpectedKeys = Object.keys(meta).filter(key => !allowedMetaKeys.includes(key));
  if (unexpectedKeys.length > 0) {
    throw new Error(`Unexpected metadata properties: ${unexpectedKeys.join(', ')}`);
  }

  // Validate exchange if present
  if (meta.exchange) {
    const allowedExchanges = ['NSE', 'BSE', 'NYSE', 'NASDAQ'];
    if (!allowedExchanges.includes(meta.exchange)) {
      throw new Error(`Invalid exchange: "${meta.exchange}". Allowed: ${allowedExchanges.join(', ')}`);
    }
  }

  // Validate market_cap_category if present
  if (meta.market_cap_category) {
    const allowedCategories = ['Large Cap', 'Mid Cap', 'Small Cap', 'Micro Cap'];
    if (!allowedCategories.includes(meta.market_cap_category)) {
      throw new Error(`Invalid market_cap_category: "${meta.market_cap_category}"`);
    }
  }

  // Validate market_cap_range if present
  if (meta.market_cap_range) {
    if (typeof meta.market_cap_range !== 'object') {
      throw new Error('market_cap_range must be an object');
    }
    if (meta.market_cap_range.min !== undefined && typeof meta.market_cap_range.min !== 'number') {
      throw new Error('market_cap_range.min must be a number');
    }
    if (meta.market_cap_range.max !== undefined && typeof meta.market_cap_range.max !== 'number') {
      throw new Error('market_cap_range.max must be a number');
    }
  }
}

/**
 * Validate sort criteria
 */
function validateSort(sort) {
  if (!sort || typeof sort !== 'object') {
    throw new Error('Sort must be an object');
  }

  if (!sort.field) {
    throw new Error('Sort must have "field" property');
  }

  if (!sort.order) {
    throw new Error('Sort must have "order" property');
  }

  // Validate field
  if (!ALLOWED_FIELDS.includes(sort.field)) {
    throw new Error(`Invalid sort field: "${sort.field}"`);
  }

  // Validate order
  if (sort.order !== 'asc' && sort.order !== 'desc') {
    throw new Error('Sort order must be "asc" or "desc"');
  }
}

module.exports = { 
  validateDSL,
  ALLOWED_FIELDS,
  ALLOWED_OPERATORS,
  ALLOWED_PERIOD_TYPES,
  ALLOWED_AGGREGATIONS
};
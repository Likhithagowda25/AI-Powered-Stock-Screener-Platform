/**
 * DSL Validator Service
 * 
 * Responsibilities:
 * - Validate DSL structure and syntax
 * - Ensure DSL contains only allowed fields and operators
 * - Prevent SQL injection by validating field names
 * - Reject malformed or unsafe DSL before compilation
 * - Validate period / time-window qualifiers
 * 
 * Security:
 * - Only validated DSL passes to the compiler
 * - LLM output is never directly used in SQL
 */

// ── Allowed fields must match the ACTUAL database schema ──
const ALLOWED_FIELDS = [
  // companies table
  'ticker', 'name', 'market_cap', 'sector', 'industry', 'exchange',
  'next_earnings_date', 'last_buyback_date', 'promoter_holding',

  // price_history table
  'open', 'high', 'low', 'close', 'volume',

  // fundamentals_quarterly table  (verified against live schema)
  'revenue', 'net_income', 'eps', 'operating_margin', 'roe', 'roa',
  'pe_ratio', 'pb_ratio', 'peg_ratio', 'ebitda',
  'ebitda_margin', 'debt_to_equity', 'current_ratio',
  'total_assets', 'total_debt', 'free_cash_flow', 'operating_cash_flow',
  'revenue_growth_yoy', 'ebitda_growth_yoy',

  // derived / computed fields
  'debt_to_fcf',

  // debt_profile table
  'short_term_debt', 'long_term_debt',

  // cashflow_statements table
  'cfo', 'cfi', 'cff', 'capex',

  // analyst_estimates table
  'eps_estimate', 'revenue_estimate',
  'price_target_low', 'price_target_avg', 'price_target_high',
];

const ALLOWED_OPERATORS = ['<', '>', '<=', '>=', '=', '!=', 'between', 'in', 'exists', 'all_quarters'];

const ALLOWED_LOGICAL_OPERATORS = ['and', 'or', 'not'];

const ALLOWED_AGGREGATIONS = ['all', 'any', 'avg', 'sum', 'latest'];

class DSLValidatorService {
  /**
   * Validate DSL structure and content
   * @param {object} dsl - DSL object from LLM parser
   * @returns {object} { valid: boolean, errors: array, sanitizedDSL: object }
   */
  validate(dsl) {
    const errors = [];

    if (!dsl || typeof dsl !== 'object') {
      return { valid: false, errors: ['DSL must be an object'], sanitizedDSL: null };
    }

    if (!dsl.filter) {
      return { valid: false, errors: ['DSL must contain a filter property'], sanitizedDSL: null };
    }

    // Validate filter contents
    const filterErrors = this._validateFilter(dsl.filter);
    errors.push(...filterErrors);

    // Validate sort if present
    if (dsl.sort) {
      const sortErrors = this._validateSort(dsl.sort);
      errors.push(...sortErrors);
    }

    // Validate limit if present
    if (dsl.limit !== undefined) {
      const limitErrors = this._validateLimit(dsl.limit);
      errors.push(...limitErrors);
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitizedDSL: errors.length === 0 ? dsl : null,
    };
  }

  /** @private */
  _validateFilter(filter) {
    const errors = [];

    if (!filter || typeof filter !== 'object') {
      errors.push('Filter must be an object');
      return errors;
    }

    for (const key of Object.keys(filter)) {
      if (ALLOWED_LOGICAL_OPERATORS.includes(key)) {
        if (!Array.isArray(filter[key])) {
          errors.push("Logical operator '" + key + "' must contain an array");
          continue;
        }
        for (const condition of filter[key]) {
          if (this._isCondition(condition)) {
            errors.push(...this._validateCondition(condition));
          } else if (typeof condition === 'object') {
            errors.push(...this._validateFilter(condition));
          } else {
            errors.push('Invalid condition in filter');
          }
        }
      } else {
        errors.push('Unknown filter operator: ' + key);
      }
    }

    return errors;
  }

  /** @private */
  _validateCondition(condition) {
    const errors = [];

    // ── field ──
    if (!condition.field) {
      errors.push('Condition must have a field property');
    } else if (!ALLOWED_FIELDS.includes(condition.field)) {
      errors.push('Invalid field: ' + condition.field);
    }

    // ── operator ──
    if (!condition.operator) {
      errors.push('Condition must have an operator property');
    } else if (!ALLOWED_OPERATORS.includes(condition.operator)) {
      errors.push('Invalid operator: ' + condition.operator);
    }

    // ── value ──
    if (condition.value === undefined && condition.operator !== 'exists') {
      errors.push('Condition must have a value property');
    }

    // Cross-field comparison: value references another field
    if (condition.value_is_field) {
      if (typeof condition.value !== 'string' || !ALLOWED_FIELDS.includes(condition.value)) {
        errors.push('Cross-field comparison value must be an allowed field: ' + condition.value);
      }
    } else if (condition.operator === 'between') {
      if (!Array.isArray(condition.value) || condition.value.length !== 2) {
        errors.push('Between operator requires array of 2 values');
      }
    } else if (condition.operator === 'in') {
      if (!Array.isArray(condition.value)) {
        errors.push('In operator requires array of values');
      }
    } else if (condition.operator === 'exists') {
      if (typeof condition.value !== 'boolean') {
        errors.push('Exists operator requires boolean value');
      }
    }

    // ── period (time-window) ──
    if (condition.period) {
      const p = condition.period;
      if (typeof p !== 'object') {
        errors.push('period must be an object');
      } else {
        if (!p.type || p.type !== 'last_n_quarters') {
          errors.push('period.type must be "last_n_quarters"');
        }
        if (!p.n || typeof p.n !== 'number' || p.n < 1 || p.n > 20) {
          errors.push('period.n must be a number between 1 and 20');
        }
        if (p.aggregation && !ALLOWED_AGGREGATIONS.includes(p.aggregation)) {
          errors.push('Invalid period aggregation: ' + p.aggregation);
        }
      }
    }

    // ── Legacy: also accept timeframe (old format) and normalise to period ──
    if (condition.timeframe && !condition.period) {
      condition.period = {
        type: 'last_n_quarters',
        n: condition.timeframe.period || 1,
        aggregation: condition.timeframe.aggregation || 'all',
      };
      delete condition.timeframe;
    }

    return errors;
  }

  /** @private */
  _validateSort(sort) {
    const errors = [];
    if (!Array.isArray(sort)) {
      errors.push('Sort must be an array');
      return errors;
    }
    for (const sortItem of sort) {
      if (!sortItem.field) {
        errors.push('Sort item must have a field property');
      } else if (!ALLOWED_FIELDS.includes(sortItem.field)) {
        errors.push('Invalid sort field: ' + sortItem.field);
      }
      if (sortItem.direction && !['asc', 'desc'].includes(sortItem.direction.toLowerCase())) {
        errors.push('Invalid sort direction: ' + sortItem.direction);
      }
    }
    return errors;
  }

  /** @private */
  _validateLimit(limit) {
    const errors = [];
    if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
      errors.push('Limit must be a number between 1 and 1000');
    }
    return errors;
  }

  /** @private */
  _isCondition(obj) {
    return obj && typeof obj === 'object' && obj.field && obj.operator;
  }
}

module.exports = new DSLValidatorService();

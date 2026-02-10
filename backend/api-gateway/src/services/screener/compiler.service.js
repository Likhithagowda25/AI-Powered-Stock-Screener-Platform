/**
 * Screener Compiler Service
 * 
 * Converts validated DSL JSON to SQL queries
 * Maps DSL fields to actual database schema
 */

class ScreenerCompilerService {
  constructor() {
    this.fieldMappings = {
      // Companies table
      'market_cap': { table: 'c', column: 'market_cap' },
      'sector': { table: 'c', column: 'sector' },
      'industry': { table: 'c', column: 'industry' },
      'exchange': { table: 'c', column: 'exchange' },
      
      // Fundamentals table
      'revenue': { table: 'fq', column: 'revenue' },
      'net_income': { table: 'fq', column: 'net_income' },
      'eps': { table: 'fq', column: 'eps' },
      'operating_margin': { table: 'fq', column: 'operating_margin' },
      'roe': { table: 'fq', column: 'roe' },
      'roa': { table: 'fq', column: 'roa' },
      'pe_ratio': { table: 'fq', column: 'pe_ratio' },
      'pb_ratio': { table: 'fq', column: 'pb_ratio' },
      
      // Debt profile table
      'short_term_debt': { table: 'dp', column: 'short_term_debt' },
      'long_term_debt': { table: 'dp', column: 'long_term_debt' },
      'debt_to_equity': { table: 'dp', column: 'debt_to_equity' },
      
      // Cashflow table
      'cfo': { table: 'cf', column: 'cfo' },
      'cfi': { table: 'cf', column: 'cfi' },
      'cff': { table: 'cf', column: 'cff' },
      'capex': { table: 'cf', column: 'capex' },
      
      // Analyst estimates table
      'eps_estimate': { table: 'ae', column: 'eps_estimate' },
      'revenue_estimate': { table: 'ae', column: 'revenue_estimate' },
      'price_target_low': { table: 'ae', column: 'price_target_low' },
      'price_target_avg': { table: 'ae', column: 'price_target_avg' },
      'price_target_high': { table: 'ae', column: 'price_target_high' },
      
      // Price history table
      'open': { table: 'ph', column: 'open' },
      'high': { table: 'ph', column: 'high' },
      'low': { table: 'ph', column: 'low' },
      'close': { table: 'ph', column: 'close' },
      'volume': { table: 'ph', column: 'volume' }
    };
  }

  /**
   * Compile DSL to SQL
   * @param {object} dsl - Validated DSL object
   * @returns {object} { sql: string, params: array }
   */
  compile(dsl) {
    if (!dsl || !dsl.filter) {
      throw new Error('Invalid DSL: missing filter');
    }

    const params = [];
    const usedTables = new Set(['c']); // Always use companies table
    
    // Build WHERE clause
    const whereClause = this._compileFilter(dsl.filter, params, usedTables);
    
    // Build FROM clause with necessary JOINs
    const fromClause = this._buildJoins(usedTables);
    
    // Build SELECT clause
    const selectClause = this._buildSelect(usedTables);
    
    // Build ORDER BY clause
    const orderByClause = dsl.sort ? this._buildOrderBy(dsl.sort) : 'ORDER BY c.ticker';
    
    // Build LIMIT clause
    const limitClause = dsl.limit ? `LIMIT ${parseInt(dsl.limit)}` : 'LIMIT 100';
    
    // Combine into final SQL
    const sql = `
      SELECT ${selectClause}
      FROM ${fromClause}
      WHERE ${whereClause}
      ${orderByClause}
      ${limitClause}
    `.trim();
    
    return { sql, params };
  }

  /**
   * Build SELECT clause based on used tables
   * @private
   */
  _buildSelect(usedTables) {
    const columns = [
      'c.ticker',
      'c.name',
      'c.sector',
      'c.exchange',
      'c.market_cap'
    ];
    
    if (usedTables.has('fq')) {
      columns.push('fq.revenue', 'fq.net_income', 'fq.eps', 'fq.roe', 'fq.roa', 'fq.pe_ratio', 'fq.pb_ratio', 'fq.operating_margin');
    }
    
    if (usedTables.has('dp')) {
      columns.push('dp.debt_to_equity', 'dp.short_term_debt', 'dp.long_term_debt');
    }
    
    if (usedTables.has('cf')) {
      columns.push('cf.cfo', 'cf.cfi', 'cf.cff', 'cf.capex');
    }
    
    return columns.join(', ');
  }

  /**
   * Build FROM clause with JOINs
   * @private
   */
  _buildJoins(usedTables) {
    let from = 'companies c';
    
    if (usedTables.has('fq')) {
      from += '\n  LEFT JOIN fundamentals_quarterly fq ON c.ticker = fq.ticker';
    }
    
    if (usedTables.has('dp')) {
      from += '\n  LEFT JOIN debt_profile dp ON c.ticker = dp.ticker';
    }
    
    if (usedTables.has('cf')) {
      from += '\n  LEFT JOIN cashflow_statements cf ON c.ticker = cf.ticker';
    }
    
    if (usedTables.has('ae')) {
      from += '\n  LEFT JOIN analyst_estimates ae ON c.ticker = ae.ticker';
    }
    
    if (usedTables.has('ph')) {
      from += '\n  LEFT JOIN price_history ph ON c.ticker = ph.ticker';
    }
    
    return from;
  }

  /**
   * Compile filter expression to SQL WHERE clause
   * @private
   */
  _compileFilter(filter, params, usedTables) {
    if (filter.and) {
      const conditions = filter.and.map(cond => this._compileCondition(cond, params, usedTables));
      return `(${conditions.join(' AND ')})`;
    }
    
    if (filter.or) {
      const conditions = filter.or.map(cond => this._compileCondition(cond, params, usedTables));
      return `(${conditions.join(' OR ')})`;
    }
    
    if (filter.not) {
      const condition = this._compileCondition(filter.not, params, usedTables);
      return `NOT ${condition}`;
    }
    
    throw new Error('Invalid filter structure');
  }

  /**
   * Compile single condition to SQL
   * @private
   */
  _compileCondition(condition, params, usedTables) {
    // Handle nested logical expressions
    if (condition.and || condition.or || condition.not) {
      return this._compileFilter(condition, params, usedTables);
    }
    
    // Handle leaf condition
    const { field, operator, value } = condition;
    
    if (!this.fieldMappings[field]) {
      throw new Error(`Unknown field: ${field}`);
    }
    
    const mapping = this.fieldMappings[field];
    usedTables.add(mapping.table);
    
    const columnRef = `${mapping.table}.${mapping.column}`;
    
    switch (operator) {
      case '<':
      case '>':
      case '<=':
      case '>=':
      case '=':
      case '!=':
        params.push(value);
        return `${columnRef} ${operator} $${params.length}`;
      
      case 'between':
        params.push(value[0], value[1]);
        return `${columnRef} BETWEEN $${params.length - 1} AND $${params.length}`;
      
      case 'in':
        const placeholders = value.map((v, i) => {
          params.push(v);
          return `$${params.length}`;
        });
        return `${columnRef} IN (${placeholders.join(', ')})`;
      
      case 'exists':
        return value ? `${columnRef} IS NOT NULL` : `${columnRef} IS NULL`;
      
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  /**
   * Build ORDER BY clause
   * @private
   */
  _buildOrderBy(sortConfig) {
    if (!Array.isArray(sortConfig)) {
      sortConfig = [sortConfig];
    }
    
    const orderBy = sortConfig.map(sort => {
      const mapping = this.fieldMappings[sort.field];
      if (!mapping) {
        throw new Error(`Unknown sort field: ${sort.field}`);
      }
      const direction = sort.direction === 'desc' ? 'DESC' : 'ASC';
      return `${mapping.table}.${mapping.column} ${direction}`;
    });
    
    return `ORDER BY ${orderBy.join(', ')}`;
  }
}

module.exports = new ScreenerCompilerService();

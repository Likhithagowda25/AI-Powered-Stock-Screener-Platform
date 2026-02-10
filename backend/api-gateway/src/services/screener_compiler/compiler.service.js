// ──────────────────────────────────────────────────────────────
// FIELD → TABLE mapping (verified against live schema 2026-02)
// ──────────────────────────────────────────────────────────────
const FIELD_TABLE_MAP = {
  // ── companies ──
  'ticker':              { table: 'companies', column: 'ticker' },
  'name':                { table: 'companies', column: 'name' },
  'market_cap':          { table: 'companies', column: 'market_cap' },
  'sector':              { table: 'companies', column: 'sector' },
  'industry':            { table: 'companies', column: 'industry' },
  'exchange':            { table: 'companies', column: 'exchange' },
  'next_earnings_date':  { table: 'companies', column: 'next_earnings_date' },
  'last_buyback_date':   { table: 'companies', column: 'last_buyback_date' },
  'promoter_holding':    { table: 'companies', column: 'promoter_holding' },

  // ── price_history ──
  'open':    { table: 'price_history', column: 'open' },
  'high':    { table: 'price_history', column: 'high' },
  'low':     { table: 'price_history', column: 'low' },
  'close':   { table: 'price_history', column: 'close' },
  'volume':  { table: 'price_history', column: 'volume' },

  // ── fundamentals_quarterly  (ALL columns present in live DB) ──
  'revenue':             { table: 'fundamentals_quarterly', column: 'revenue' },
  'net_income':          { table: 'fundamentals_quarterly', column: 'net_income' },
  'eps':                 { table: 'fundamentals_quarterly', column: 'eps' },
  'operating_margin':    { table: 'fundamentals_quarterly', column: 'operating_margin' },
  'roe':                 { table: 'fundamentals_quarterly', column: 'roe' },
  'roa':                 { table: 'fundamentals_quarterly', column: 'roa' },
  'pe_ratio':            { table: 'fundamentals_quarterly', column: 'pe_ratio' },
  'pb_ratio':            { table: 'fundamentals_quarterly', column: 'pb_ratio' },
  'peg_ratio':           { table: 'fundamentals_quarterly', column: 'peg_ratio' },
  'ebitda':              { table: 'fundamentals_quarterly', column: 'ebitda' },
  'ebitda_margin':       { table: 'fundamentals_quarterly', column: 'ebitda_margin' },
  'debt_to_equity':      { table: 'fundamentals_quarterly', column: 'debt_to_equity' },
  'current_ratio':       { table: 'fundamentals_quarterly', column: 'current_ratio' },
  'total_assets':        { table: 'fundamentals_quarterly', column: 'total_assets' },
  'total_debt':          { table: 'fundamentals_quarterly', column: 'total_debt' },
  'free_cash_flow':      { table: 'fundamentals_quarterly', column: 'free_cash_flow' },
  'operating_cash_flow': { table: 'fundamentals_quarterly', column: 'operating_cash_flow' },
  'revenue_growth_yoy':  { table: 'fundamentals_quarterly', column: 'revenue_growth_yoy' },
  'ebitda_growth_yoy':   { table: 'fundamentals_quarterly', column: 'ebitda_growth_yoy' },

  // ── debt_profile ──
  'short_term_debt':  { table: 'debt_profile', column: 'short_term_debt' },
  'long_term_debt':   { table: 'debt_profile', column: 'long_term_debt' },

  // ── cashflow_statements ──
  'cfo':   { table: 'cashflow_statements', column: 'cfo' },
  'cfi':   { table: 'cashflow_statements', column: 'cfi' },
  'cff':   { table: 'cashflow_statements', column: 'cff' },
  'capex': { table: 'cashflow_statements', column: 'capex' },

  // ── analyst_estimates ──
  'eps_estimate':       { table: 'analyst_estimates', column: 'eps_estimate' },
  'revenue_estimate':   { table: 'analyst_estimates', column: 'revenue_estimate' },
  'price_target_low':   { table: 'analyst_estimates', column: 'price_target_low' },
  'price_target_avg':   { table: 'analyst_estimates', column: 'price_target_avg' },
  'price_target_high':  { table: 'analyst_estimates', column: 'price_target_high' },

  // ── derived / computed fields ──
  'debt_to_fcf': { table: 'fundamentals_quarterly', column: 'debt_to_fcf', derived: true,
    sql: (alias) => `(${alias}.total_debt::numeric / NULLIF(${alias}.free_cash_flow::numeric, 0))` },
};

// Tables that support period / time-window queries (have multiple rows per ticker)
const PERIOD_CAPABLE_TABLES = ['fundamentals_quarterly'];

class ScreenerCompilerService {
  /**
   * Compile validated DSL to parameterised SQL
   * @param {object} dsl - Validated DSL object
   * @returns {{ sql: string, params: any[], requiredTables: string[] }}
   */
  compile(dsl) {
    const context = {
      params: [],
      paramCounter: 1,
      requiredTables: new Set(['companies']),
      periodSubqueries: [],   // for time-window conditions
    };

    const whereClause = this._compileFilter(dsl.filter, context);

    // Always include price_history for current price display
    context.requiredTables.add('price_history');
    // Always include fundamentals for core metrics display
    context.requiredTables.add('fundamentals_quarterly');

    const joins = this._generateJoins(context.requiredTables);
    const periodJoins = context.periodSubqueries.join('\n      ');
    const orderBy = dsl.sort ? this._compileSort(dsl.sort) : 'c.market_cap DESC NULLS LAST';
    const limit = dsl.limit || 100;

    // Helper: COALESCE fq column with latest-non-null subquery fallback
    // The LATERAL join grabs the absolute latest row, but many columns may
    // be NULL there while a slightly older row has the data.
    const _fq = (col) =>
      '  COALESCE(fq.' + col + ', (SELECT _f.' + col +
      ' FROM fundamentals_quarterly _f WHERE _f.ticker = c.ticker AND _f.' +
      col + ' IS NOT NULL ORDER BY _f.id DESC LIMIT 1)) AS ' + col + ',';

    const sql = [
      'SELECT DISTINCT',
      '  c.ticker,',
      '  c.name,',
      '  c.sector,',
      '  c.industry,',
      '  c.exchange,',
      '  c.market_cap,',
      '  c.promoter_holding,',
      '  c.next_earnings_date,',
      '  c.last_buyback_date,',
      _fq('pe_ratio'),
      _fq('pb_ratio'),
      _fq('roe'),
      _fq('roa'),
      _fq('revenue'),
      _fq('net_income'),
      _fq('eps'),
      _fq('operating_margin'),
      _fq('ebitda_margin'),
      _fq('peg_ratio'),
      _fq('ebitda'),
      _fq('debt_to_equity'),
      _fq('current_ratio'),
      _fq('total_debt'),
      _fq('total_assets'),
      _fq('free_cash_flow'),
      _fq('operating_cash_flow'),
      _fq('revenue_growth_yoy'),
      // last fq column — no trailing comma
      '  COALESCE(fq.ebitda_growth_yoy, (SELECT _f.ebitda_growth_yoy FROM fundamentals_quarterly _f WHERE _f.ticker = c.ticker AND _f.ebitda_growth_yoy IS NOT NULL ORDER BY _f.id DESC LIMIT 1)) AS ebitda_growth_yoy,',
      '  ph.close AS current_price,',
      '  ph.open,',
      '  ph.high,',
      '  ph.low,',
      '  ph.volume',
      'FROM companies c',
      joins,
      periodJoins,
      'WHERE ' + whereClause,
      'ORDER BY ' + orderBy,
      'LIMIT $' + context.paramCounter,
    ].filter(Boolean).join('\n');

    context.params.push(limit);

    return {
      sql,
      params: context.params,
      requiredTables: Array.from(context.requiredTables),
    };
  }

  // ─── Filter compilation ────────────────────────────────────

  /** @private */
  _compileFilter(filter, context) {
    if (!filter) return '1=1';
    if (filter.and)  return this._compileLogical(filter.and, 'AND', context);
    if (filter.or)   return this._compileLogical(filter.or, 'OR', context);
    if (filter.not)  return 'NOT (' + (this._isCondition(filter.not)
      ? this._compileCondition(filter.not, context)
      : this._compileFilter(filter.not, context)) + ')';
    return '1=1';
  }

  /** @private */
  _compileLogical(conditions, joiner, context) {
    const compiled = conditions.map(cond =>
      this._isCondition(cond)
        ? this._compileCondition(cond, context)
        : '(' + this._compileFilter(cond, context) + ')'
    );
    const joined = compiled.join(' ' + joiner + ' ');
    return joiner === 'OR' ? '(' + joined + ')' : joined;
  }

  // ─── Single condition compilation ──────────────────────────

  /** @private */
  _compileCondition(condition, context) {
    const fieldInfo = FIELD_TABLE_MAP[condition.field];
    if (!fieldInfo) throw new Error('Unknown field: ' + condition.field);

    // ── Cross-field comparison (e.g., close < price_target_avg) ──
    if (condition.value_is_field) {
      const otherFieldInfo = FIELD_TABLE_MAP[condition.value];
      if (!otherFieldInfo) throw new Error('Unknown comparison field: ' + condition.value);
      context.requiredTables.add(fieldInfo.table);
      context.requiredTables.add(otherFieldInfo.table);
      const leftAlias = this._getTableAlias(fieldInfo.table);
      const rightAlias = this._getTableAlias(otherFieldInfo.table);
      return leftAlias + '.' + fieldInfo.column + ' ' + condition.operator + ' ' + rightAlias + '.' + otherFieldInfo.column;
    }

    // ── String fields (sector, exchange, industry) ──
    if (['sector', 'exchange', 'industry'].includes(condition.field)) {
      context.requiredTables.add(fieldInfo.table);
      const alias = this._getTableAlias(fieldInfo.table);
      const colRef = alias + '.' + fieldInfo.column;
      return this._compileOperator(colRef, condition, context);
    }

    // ── Date existence checks (e.g., last_buyback_date IS NOT NULL) ──
    if (['last_buyback_date', 'next_earnings_date'].includes(condition.field) && condition.operator === 'exists') {
      context.requiredTables.add(fieldInfo.table);
      const alias = this._getTableAlias(fieldInfo.table);
      const colRef = alias + '.' + fieldInfo.column;
      return condition.value ? colRef + ' IS NOT NULL' : colRef + ' IS NULL';
    }

    // ── Derived fields (e.g., debt_to_fcf = total_debt / free_cash_flow) ──
    if (fieldInfo.derived) {
      context.requiredTables.add(fieldInfo.table);
      const alias = this._getTableAlias(fieldInfo.table);
      const derivedSql = fieldInfo.sql(alias);
      return this._compileOperator(derivedSql, condition, context);
    }

    // ── Period / time-window queries ──
    if (condition.period && PERIOD_CAPABLE_TABLES.includes(fieldInfo.table)) {
      return this._compilePeriodCondition(condition, fieldInfo, context);
    }

    // ── fundamentals_quarterly: use correlated subquery for latest non-null ──
    if (fieldInfo.table === 'fundamentals_quarterly') {
      context.requiredTables.add(fieldInfo.table);
      const col = fieldInfo.column;
      const subRef = '(SELECT fq_sub.' + col +
        ' FROM fundamentals_quarterly fq_sub' +
        ' WHERE fq_sub.ticker = c.ticker AND fq_sub.' + col + ' IS NOT NULL' +
        ' ORDER BY fq_sub.id DESC LIMIT 1)';
      return this._compileOperator(subRef, condition, context);
    }

    // ── Standard single-row condition ──
    context.requiredTables.add(fieldInfo.table);
    const alias = this._getTableAlias(fieldInfo.table);
    const colRef = alias + '.' + fieldInfo.column;

    return this._compileOperator(colRef, condition, context);
  }

  /**
   * Compile a condition with period / time-window logic.
   * Generates a correlated subquery against fundamentals_quarterly.
   *
   * Aggregation modes:
   *   all → every row in the last N quarters must satisfy
   *   any → at least one row must satisfy
   *   avg → the average over N quarters must satisfy
   *   sum → the sum over N quarters must satisfy
   *
   * @private
   */
  _compilePeriodCondition(condition, fieldInfo, context) {
    const { n, aggregation = 'all' } = condition.period;
    const col = fieldInfo.column;
    const op = condition.operator;

    // Generate a unique alias for the subquery
    const subAlias = 'pq_' + context.paramCounter;

    if (aggregation === 'all') {
      // "net_income > 0 in ALL of last 4 quarters"
      // → NOT EXISTS any quarter where net_income <= 0 (inverted operator)
      const invertedOp = this._invertOperator(op);
      context.params.push(condition.value);
      const valParam = '$' + context.paramCounter++;
      context.params.push(n);
      const nParam = '$' + context.paramCounter++;

      return [
        'NOT EXISTS (',
        '  SELECT 1 FROM (',
        '    SELECT ' + col + ' FROM fundamentals_quarterly',
        '    WHERE ticker = c.ticker AND ' + col + ' IS NOT NULL',
        '    ORDER BY id DESC LIMIT ' + nParam,
        '  ) ' + subAlias,
        '  WHERE ' + subAlias + '.' + col + ' ' + invertedOp + ' ' + valParam,
        ')',
      ].join(' ');
    }

    if (aggregation === 'any') {
      // "net_income > 0 in ANY of last 4 quarters"
      context.params.push(condition.value);
      const valParam = '$' + context.paramCounter++;
      context.params.push(n);
      const nParam = '$' + context.paramCounter++;

      return [
        'EXISTS (',
        '  SELECT 1 FROM (',
        '    SELECT ' + col + ' FROM fundamentals_quarterly',
        '    WHERE ticker = c.ticker AND ' + col + ' IS NOT NULL',
        '    ORDER BY id DESC LIMIT ' + nParam,
        '  ) ' + subAlias,
        '  WHERE ' + subAlias + '.' + col + ' ' + op + ' ' + valParam,
        ')',
      ].join(' ');
    }

    if (aggregation === 'avg' || aggregation === 'sum') {
      // "avg(revenue) > 1000 over last 4 quarters"
      const aggFn = aggregation.toUpperCase();
      context.params.push(n);
      const nParam = '$' + context.paramCounter++;
      context.params.push(condition.value);
      const valParam = '$' + context.paramCounter++;

      return [
        '(',
        '  SELECT ' + aggFn + '(' + subAlias + '.' + col + ') FROM (',
        '    SELECT ' + col + ' FROM fundamentals_quarterly',
        '    WHERE ticker = c.ticker AND ' + col + ' IS NOT NULL',
        '    ORDER BY id DESC LIMIT ' + nParam,
        '  ) ' + subAlias,
        ') ' + op + ' ' + valParam,
      ].join(' ');
    }

    // Fallback: latest (default single-row behaviour)
    context.requiredTables.add(fieldInfo.table);
    const alias = this._getTableAlias(fieldInfo.table);
    return this._compileOperator(alias + '.' + col, condition, context);
  }

  /** @private */
  _compileOperator(colRef, condition, context) {
    switch (condition.operator) {
      case '<': case '>': case '<=': case '>=': case '=': case '!=':
        context.params.push(condition.value);
        return colRef + ' ' + condition.operator + ' $' + context.paramCounter++;

      case 'between':
        context.params.push(condition.value[0], condition.value[1]);
        return colRef + ' BETWEEN $' + context.paramCounter++ + ' AND $' + context.paramCounter++;

      case 'in': {
        const placeholders = condition.value
          .map(() => '$' + context.paramCounter++)
          .join(', ');
        context.params.push(...condition.value);
        return colRef + ' IN (' + placeholders + ')';
      }

      case 'exists':
        return condition.value ? colRef + ' IS NOT NULL' : colRef + ' IS NULL';

      default:
        throw new Error('Unsupported operator: ' + condition.operator);
    }
  }

  /** Invert a comparison operator (used for ALL period logic via NOT EXISTS) @private */
  _invertOperator(op) {
    const map = { '>': '<=', '<': '>=', '>=': '<', '<=': '>', '=': '!=', '!=': '=' };
    return map[op] || op;
  }

  // ─── JOIN generation ───────────────────────────────────────

  /** @private */
  _generateJoins(requiredTables) {
    const joins = [];

    if (requiredTables.has('fundamentals_quarterly')) {
      joins.push(
        'LEFT JOIN LATERAL (\n' +
        '  SELECT * FROM fundamentals_quarterly\n' +
        '  WHERE ticker = c.ticker\n' +
        '  ORDER BY id DESC\n' +
        '  LIMIT 1\n' +
        ') fq ON true'
      );
    }

    if (requiredTables.has('price_history')) {
      joins.push(
        'LEFT JOIN LATERAL (\n' +
        '  SELECT * FROM price_history\n' +
        '  WHERE ticker = c.ticker\n' +
        '  ORDER BY time DESC\n' +
        '  LIMIT 1\n' +
        ') ph ON true'
      );
    }

    if (requiredTables.has('debt_profile')) {
      joins.push(
        'LEFT JOIN LATERAL (\n' +
        '  SELECT * FROM debt_profile\n' +
        '  WHERE ticker = c.ticker\n' +
        '  ORDER BY id DESC\n' +
        '  LIMIT 1\n' +
        ') dp ON true'
      );
    }

    if (requiredTables.has('cashflow_statements')) {
      joins.push(
        'LEFT JOIN LATERAL (\n' +
        '  SELECT * FROM cashflow_statements\n' +
        '  WHERE ticker = c.ticker\n' +
        '  ORDER BY id DESC\n' +
        '  LIMIT 1\n' +
        ') cs ON true'
      );
    }

    if (requiredTables.has('analyst_estimates')) {
      joins.push(
        'LEFT JOIN LATERAL (\n' +
        '  SELECT * FROM analyst_estimates\n' +
        '  WHERE ticker = c.ticker\n' +
        '  ORDER BY estimate_date DESC\n' +
        '  LIMIT 1\n' +
        ') ae ON true'
      );
    }

    return joins.join('\n');
  }

  // ─── Helpers ───────────────────────────────────────────────

  /** @private */
  _getTableAlias(tableName) {
    const map = {
      'companies': 'c',
      'fundamentals_quarterly': 'fq',
      'price_history': 'ph',
      'debt_profile': 'dp',
      'cashflow_statements': 'cs',
      'analyst_estimates': 'ae',
    };
    return map[tableName] || tableName;
  }

  /** @private */
  _compileSort(sort) {
    const items = Array.isArray(sort) ? sort : [sort];
    return items.map(s => {
      const fi = FIELD_TABLE_MAP[s.field];
      const alias = this._getTableAlias(fi.table);
      const dir = (s.direction || 'ASC').toUpperCase();
      return alias + '.' + fi.column + ' ' + dir + ' NULLS LAST';
    }).join(', ');
  }

  /** @private */
  _isCondition(obj) {
    return obj && obj.field && obj.operator;
  }
}

module.exports = new ScreenerCompilerService();

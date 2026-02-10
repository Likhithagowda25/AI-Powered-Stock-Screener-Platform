/**
 * Screener Response Handler
 * 
 * This service handles extended screener response payloads from the backend,
 * transforming them into the format expected by UI components. It supports:
 * - Matched conditions extraction
 * - Derived metrics processing
 * - Quarterly vs TTM data organization
 * - Partial/missing data graceful handling
 */

/**
 * Extracts matched conditions from backend response
 * Backend may return these in various formats depending on DSL execution
 * 
 * @param {Object} backendResponse - Raw response from screener API
 * @returns {Object} Object mapping ticker to array of matched conditions
 */
export const extractMatchedConditions = (backendResponse) => {
  const conditionsMap = {};
  
  if (!backendResponse?.results || !Array.isArray(backendResponse.results)) {
    return conditionsMap;
  }

  backendResponse.results.forEach(stock => {
    const conditions = [];
    
    // Extract from explicit matched_conditions if backend provides them
    if (stock.matched_conditions && Array.isArray(stock.matched_conditions)) {
      stock.matched_conditions.forEach(cond => {
        conditions.push({
          field: cond.field || cond.metric,
          operator: cond.operator || cond.op,
          value: cond.value || cond.threshold,
          actual: cond.actual || cond.actual_value,
          type: cond.type || 'condition',
          isDerived: cond.is_derived || false,
          period: cond.period || null,
          timeWindow: cond.time_window || null,
        });
      });
    }
    
    // Also check for dsl_match_details in newer API responses
    if (stock.dsl_match_details && typeof stock.dsl_match_details === 'object') {
      Object.entries(stock.dsl_match_details).forEach(([key, detail]) => {
        if (detail && !conditions.find(c => c.field === key)) {
          conditions.push({
            field: key,
            operator: detail.operator || '=',
            value: detail.expected,
            actual: detail.actual,
            type: detail.condition_type || 'condition',
            isDerived: detail.is_derived || key.includes('_ratio') || key.includes('peg'),
            period: detail.period || null,
          });
        }
      });
    }

    conditionsMap[stock.ticker] = conditions;
  });

  return conditionsMap;
};

/**
 * Process stock data to extract and organize derived metrics
 * 
 * @param {Object} stock - Individual stock data from backend
 * @returns {Object} Organized derived metrics with metadata
 */
export const extractDerivedMetrics = (stock) => {
  const derivedMetrics = {};
  
  // List of known derived metric fields
  const derivedFields = [
    'peg_ratio', 'debt_to_fcf', 'fcf_margin', 'fcf_yield',
    'ev_to_ebitda', 'ev_to_revenue', 'debt_to_equity',
    'current_ratio', 'quick_ratio', 'interest_coverage',
    'dividend_payout_ratio', 'earnings_yield'
  ];

  derivedFields.forEach(field => {
    if (stock[field] !== undefined && stock[field] !== null) {
      derivedMetrics[field] = {
        value: stock[field],
        label: formatFieldLabel(field),
        unit: getFieldUnit(field),
        interpretation: getInterpretation(field, stock[field]),
      };
    }
  });

  return derivedMetrics;
};

/**
 * Organize metrics by period (quarterly vs TTM vs latest)
 * 
 * @param {Object} stock - Stock data from backend
 * @returns {Object} Organized data with quarterly, ttm, and latest sections
 */
export const organizeByPeriod = (stock) => {
  const organized = {
    latest: {},
    quarterly: {},
    ttm: {},
    trends: {},
  };

  // Latest/fundamental metrics
  const latestFields = [
    'pe_ratio', 'pb_ratio', 'market_cap', 'roe', 'roa',
    'eps', 'revenue', 'operating_margin', 'net_margin'
  ];

  latestFields.forEach(field => {
    if (stock[field] !== undefined && stock[field] !== null) {
      organized.latest[field] = stock[field];
    }
  });

  // Quarterly metrics (if backend provides quarterly_ prefixed data)
  Object.keys(stock).forEach(key => {
    if (key.startsWith('quarterly_')) {
      const baseField = key.replace('quarterly_', '');
      organized.quarterly[baseField] = stock[key];
    } else if (key.startsWith('q1_') || key.startsWith('q2_') || key.startsWith('q3_') || key.startsWith('q4_')) {
      organized.quarterly[key] = stock[key];
    }
  });

  // TTM metrics (trailing twelve months)
  Object.keys(stock).forEach(key => {
    if (key.startsWith('ttm_')) {
      const baseField = key.replace('ttm_', '');
      organized.ttm[baseField] = stock[key];
    }
  });

  // Trends and growth metrics
  const trendFields = [
    'revenue_growth', 'eps_growth', 'profit_growth',
    'yoy_revenue_growth', 'yoy_eps_growth', 'qoq_revenue_growth',
    'momentum_score', 'trend_direction'
  ];

  trendFields.forEach(field => {
    if (stock[field] !== undefined && stock[field] !== null) {
      organized.trends[field] = stock[field];
    }
  });

  return organized;
};

/**
 * Handle missing or partial data gracefully
 * Returns default values and flags for UI to handle
 * 
 * @param {Object} stock - Stock data
 * @param {Array} requiredFields - Fields that should be present
 * @returns {Object} Stock data with missing fields handled
 */
export const handleMissingData = (stock, requiredFields = []) => {
  const processed = { ...stock };
  const missingFields = [];

  requiredFields.forEach(field => {
    if (processed[field] === undefined || processed[field] === null) {
      missingFields.push(field);
      processed[field] = null;  // Explicit null for missing
    }
  });

  processed._metadata = {
    ...processed._metadata,
    missingFields,
    hasMissingData: missingFields.length > 0,
    dataCompleteness: requiredFields.length > 0 
      ? ((requiredFields.length - missingFields.length) / requiredFields.length * 100).toFixed(0)
      : 100,
  };

  return processed;
};

/**
 * Process full backend response into UI-ready format
 * 
 * @param {Object} backendResponse - Raw response from screener API
 * @returns {Object} Processed response with all enhancements
 */
export const processScreenerResponse = (backendResponse) => {
  if (!backendResponse || !backendResponse.results) {
    return {
      results: [],
      matchedConditions: {},
      metadata: {},
      error: 'Invalid response format',
    };
  }

  const requiredFields = [
    'ticker', 'name', 'pe_ratio', 'pb_ratio', 'roe', 'roa',
    'market_cap', 'revenue', 'eps', 'operating_margin'
  ];

  const processedResults = backendResponse.results.map(stock => {
    const withMissing = handleMissingData(stock, requiredFields);
    return {
      ...withMissing,
      derivedMetrics: extractDerivedMetrics(stock),
      organizedData: organizeByPeriod(stock),
    };
  });

  return {
    results: processedResults,
    matchedConditions: extractMatchedConditions(backendResponse),
    metadata: {
      totalCount: backendResponse.count || processedResults.length,
      query: backendResponse.query,
      executionTime: backendResponse.execution?.duration_ms,
      timestamp: backendResponse.execution?.timestamp || new Date().toISOString(),
    },
  };
};

// Helper functions

const formatFieldLabel = (field) => {
  const labels = {
    peg_ratio: 'PEG Ratio',
    debt_to_fcf: 'Debt to FCF',
    fcf_margin: 'FCF Margin',
    fcf_yield: 'FCF Yield',
    ev_to_ebitda: 'EV/EBITDA',
    ev_to_revenue: 'EV/Revenue',
    debt_to_equity: 'Debt/Equity',
    current_ratio: 'Current Ratio',
    quick_ratio: 'Quick Ratio',
    interest_coverage: 'Interest Coverage',
    dividend_payout_ratio: 'Dividend Payout',
    earnings_yield: 'Earnings Yield',
  };
  return labels[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const getFieldUnit = (field) => {
  const units = {
    fcf_margin: '%',
    fcf_yield: '%',
    dividend_payout_ratio: '%',
    earnings_yield: '%',
  };
  return units[field] || '';
};

const getInterpretation = (field, value) => {
  const interpretations = {
    peg_ratio: value < 1 ? 'Potentially undervalued' : value < 2 ? 'Fairly valued' : 'Potentially overvalued',
    debt_to_fcf: value < 3 ? 'Healthy debt levels' : value < 5 ? 'Moderate debt' : 'High debt relative to cash flow',
    fcf_margin: value > 15 ? 'Strong cash generation' : value > 5 ? 'Moderate cash generation' : 'Low cash generation',
    current_ratio: value > 2 ? 'Strong liquidity' : value > 1 ? 'Adequate liquidity' : 'Liquidity concern',
    quick_ratio: value > 1 ? 'Good short-term health' : 'May face short-term obligations',
  };
  return interpretations[field] || null;
};

export default {
  extractMatchedConditions,
  extractDerivedMetrics,
  organizeByPeriod,
  handleMissingData,
  processScreenerResponse,
};

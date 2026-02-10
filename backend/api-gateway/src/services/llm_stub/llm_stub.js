// ──────────────────────────────────────────────────────────────
// METRIC_MAP: natural-language phrases → DB column names
// Maps to actual columns in schema.sql tables:
//   companies, fundamentals_quarterly, debt_profile,
//   price_history, cashflow_statements, analyst_estimates
// ──────────────────────────────────────────────────────────────
const METRIC_MAP = {
    // ── Price / Valuation (fundamentals_quarterly) ──
    'pe': 'pe_ratio',
    'pe ratio': 'pe_ratio',
    'p/e': 'pe_ratio',
    'p/e ratio': 'pe_ratio',
    'price to earnings': 'pe_ratio',
    'pb': 'pb_ratio',
    'pb ratio': 'pb_ratio',
    'p/b': 'pb_ratio',
    'p/b ratio': 'pb_ratio',
    'price to book': 'pb_ratio',
    'peg': 'peg_ratio',
    'peg ratio': 'peg_ratio',
    'eps': 'eps',
    'earnings per share': 'eps',

    // ── Profitability (fundamentals_quarterly) ──
    'roe': 'roe',
    'return on equity': 'roe',
    'roa': 'roa',
    'return on assets': 'roa',
    'operating margin': 'operating_margin',
    'ebitda margin': 'ebitda_margin',
    'ebitda': 'ebitda',

    // ── Income (fundamentals_quarterly) ──
    'revenue': 'revenue',
    'sales': 'revenue',
    'net income': 'net_income',
    'net profit': 'net_income',
    'profit': 'net_income',
    'earnings': 'net_income',

    // ── Growth (fundamentals_quarterly) ──
    'revenue growth': 'revenue_growth_yoy',
    'revenue growth yoy': 'revenue_growth_yoy',
    'sales growth': 'revenue_growth_yoy',
    'ebitda growth': 'ebitda_growth_yoy',
    'ebitda growth yoy': 'ebitda_growth_yoy',

    // ── Balance Sheet (fundamentals_quarterly) ──
    'debt to equity': 'debt_to_equity',
    'debt equity': 'debt_to_equity',
    'debt-to-equity': 'debt_to_equity',
    'd/e': 'debt_to_equity',
    'd/e ratio': 'debt_to_equity',
    'current ratio': 'current_ratio',
    'total debt': 'total_debt',
    'total assets': 'total_assets',

    // ── Cash Flow (fundamentals_quarterly) ──
    'free cash flow': 'free_cash_flow',
    'fcf': 'free_cash_flow',
    'operating cash flow': 'operating_cash_flow',
    'ocf': 'operating_cash_flow',

    // ── Derived ratios ──
    'debt to free cash flow': 'debt_to_fcf',
    'debt to fcf': 'debt_to_fcf',
    'debt to free cash flow ratio': 'debt_to_fcf',
    'debt/fcf': 'debt_to_fcf',

    // ── Company-level (companies) ──
    'market cap': 'market_cap',
    'market capitalisation': 'market_cap',
    'market capitalization': 'market_cap',
    'mcap': 'market_cap',
    'promoter holding': 'promoter_holding',
    'promoter holdings': 'promoter_holding',

    // ── Price (price_history) ──
    'current price': 'close',
    'price': 'close',
    'stock price': 'close',

    // ── Debt Profile table ──
    'short term debt': 'short_term_debt',
    'long term debt': 'long_term_debt',

    // ── Cash Flow Statements table ──
    'capex': 'capex',
    'cfo': 'cfo',
    'cfi': 'cfi',
    'cff': 'cff',

    // ── Analyst Estimates table ──
    'eps estimate': 'eps_estimate',
    'revenue estimate': 'revenue_estimate',
    'price target': 'price_target_avg',
    'target price': 'price_target_avg',
    'analyst target price': 'price_target_avg',
    'analyst target': 'price_target_avg',
    'price target low': 'price_target_low',
    'price target high': 'price_target_high',
};

// ── Growth field mapping: base metric → growth column ──
const GROWTH_FIELD_MAP = {
    'revenue': 'revenue_growth_yoy',
    'sales': 'revenue_growth_yoy',
    'revenue_growth_yoy': 'revenue_growth_yoy',
    'ebitda': 'ebitda_growth_yoy',
    'ebitda_growth_yoy': 'ebitda_growth_yoy',
};

// ── Sector aliases for matching ──
const SECTOR_ALIASES = {
    'it': 'Technology',
    'information technology': 'Technology',
    'tech': 'Technology',
    'technology': 'Technology',
    'banking': 'Financial Services',
    'finance': 'Financial Services',
    'financial': 'Financial Services',
    'financial services': 'Financial Services',
    'pharma': 'Healthcare',
    'pharmaceutical': 'Healthcare',
    'healthcare': 'Healthcare',
    'energy': 'Energy',
    'oil': 'Energy',
    'oil and gas': 'Energy',
    'consumer': 'Consumer Cyclical',
    'consumer cyclical': 'Consumer Cyclical',
    'consumer defensive': 'Consumer Defensive',
    'fmcg': 'Consumer Defensive',
    'basic materials': 'Basic Materials',
    'materials': 'Basic Materials',
    'industrials': 'Industrials',
    'industrial': 'Industrials',
    'real estate': 'Real Estate',
    'realty': 'Real Estate',
    'utilities': 'Utilities',
    'communication': 'Communication Services',
    'communication services': 'Communication Services',
    'telecom': 'Communication Services',
};

// ── Exchange aliases for matching ──
const EXCHANGE_ALIASES = {
    'nse': 'NSI',
    'bse': 'BSE',
    'nyse': 'NYQ',
    'nasdaq': 'NMS',
};

// ── Industry keyword matching ──
const INDUSTRY_KEYWORDS = {
    'semiconductor': 'Semiconductor Equipment & Materials',
    'software': ['Software - Application', 'Software - Infrastructure'],
    'banking': 'Banks - Regional',
    'insurance': ['Insurance - Life', 'Insurance - Diversified', 'Insurance - Property & Casualty'],
    'auto': ['Auto Manufacturers', 'Auto Parts'],
    'steel': 'Steel',
    'cement': 'Building Materials',
    'telecom': 'Telecom Services',
};

// ── Unit multipliers for Indian financial context ──
const UNIT_MULTIPLIERS = {
    'crore': 1e7,    // 1 crore = 10,000,000
    'crores': 1e7,
    'cr': 1e7,
    'lakh': 1e5,     // 1 lakh = 100,000
    'lakhs': 1e5,
    'l': 1e5,
    'billion': 1e9,
    'b': 1e9,
    'million': 1e6,
    'm': 1e6,
    'thousand': 1e3,
    'k': 1e3,
    'trillion': 1e12,
    't': 1e12,
};

function translateNLToDSL(query) {
    const normalizedQuery = query.toLowerCase().trim();
    const conditions = [];

    // ── Extract sector filter ──
    const sectorCondition = extractSector(normalizedQuery);
    if (sectorCondition) conditions.push(sectorCondition);

    // ── Extract exchange filter ──
    const exchangeCondition = extractExchange(normalizedQuery);
    if (exchangeCondition) conditions.push(exchangeCondition);

    // ── Extract industry filter ──
    const industryConditions = extractIndustry(normalizedQuery);
    if (industryConditions) conditions.push(...industryConditions);

    // ── Extract cross-field comparisons ──
    const crossFieldCondition = extractCrossFieldComparison(normalizedQuery);
    if (crossFieldCondition) conditions.push(crossFieldCondition);

    // ── Extract buyback queries ──
    const buybackCondition = extractBuyback(normalizedQuery);
    if (buybackCondition) conditions.push(buybackCondition);

    // ── Extract metric conditions (standard parsing) ──
    const metricConditions = extractMetricConditions(normalizedQuery);
    conditions.push(...metricConditions);

    if (conditions.length > 0) {
        return { filter: { and: conditions } };
    }
    return { filter: {} };
}

// ── Extract sector from query ──
function extractSector(query) {
    for (const [alias, sector] of Object.entries(SECTOR_ALIASES)) {
        // Match "IT sector", "technology stocks", "tech companies", etc.
        const pattern = new RegExp('\\b' + alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b\\s*(?:sector|stocks?|companies?|shares?)?', 'i');
        if (pattern.test(query)) {
            return { field: 'sector', operator: '=', value: sector };
        }
    }
    return null;
}

// ── Extract exchange from query ──
function extractExchange(query) {
    for (const [alias, exchange] of Object.entries(EXCHANGE_ALIASES)) {
        const pattern = new RegExp('\\b' + alias + '\\b\\s*(?:listed|stocks?|companies?|exchange)?', 'i');
        if (pattern.test(query)) {
            return { field: 'exchange', operator: '=', value: exchange };
        }
    }
    return null;
}

// ── Extract industry from query ──
function extractIndustry(query) {
    const matchedIndustries = [];
    for (const [keyword, industries] of Object.entries(INDUSTRY_KEYWORDS)) {
        if (query.includes(keyword)) {
            if (Array.isArray(industries)) {
                matchedIndustries.push(...industries);
            } else {
                matchedIndustries.push(industries);
            }
        }
    }
    if (matchedIndustries.length === 1) {
        return [{ field: 'industry', operator: '=', value: matchedIndustries[0] }];
    }
    if (matchedIndustries.length > 1) {
        return [{ field: 'industry', operator: 'in', value: matchedIndustries }];
    }
    return null;
}

// ── Extract cross-field comparisons ──
// e.g. "current price below analyst target price"
function extractCrossFieldComparison(query) {
    // "current price below/under/less than target price/analyst target"
    const priceVsTargetMatch = query.match(
        /(?:current\s+)?price\s+(?:is\s+)?(?:below|under|less than|lower than)\s+(?:analyst\s+)?target\s*(?:price)?/i
    );
    if (priceVsTargetMatch) {
        return { field: 'close', operator: '<', value: 'price_target_avg', value_is_field: true };
    }

    // "current price above target price"
    const priceAboveTargetMatch = query.match(
        /(?:current\s+)?price\s+(?:is\s+)?(?:above|over|greater than|higher than)\s+(?:analyst\s+)?target\s*(?:price)?/i
    );
    if (priceAboveTargetMatch) {
        return { field: 'close', operator: '>', value: 'price_target_avg', value_is_field: true };
    }

    return null;
}

// ── Extract buyback condition ──
function extractBuyback(query) {
    if (/buyback|buy\s*back/i.test(query)) {
        // "announced buybacks recently" → has a last_buyback_date
        return { field: 'last_buyback_date', operator: 'exists', value: true };
    }
    return null;
}

// ── Extract standard metric conditions ──
function extractMetricConditions(query) {
    // Strip preamble to isolate conditions
    let cleanQuery = query
        .replace(/^(show|find|get|list|display|give|search)\s+(me\s+)?(all\s+)?/i, '')
        .replace(/^(stocks?|companies?|shares?)\s+(from\s+)?/i, '')
        // Remove sector/exchange/industry phrases already extracted
        .replace(/\b(it|information technology|tech|technology|banking|finance|pharma|healthcare|energy|consumer|fmcg|industrial|real estate|utilities|telecom|communication)\s*(sector|stocks?|companies?|shares?)?\b/gi, '')
        .replace(/\b(nse|bse|nyse|nasdaq)\s*(listed|stocks?|companies?|exchange)?\b/gi, '')
        .replace(/\b(semiconductor|software)\s*(companies?|stocks?)?\b/gi, '')
        .replace(/\b(that\s+have\s+)?announced\s+stock\s*buybacks?\s+recently\b/gi, '')
        .replace(/\b(whose|that have|that|with|where|having)\b/gi, ',')
        .replace(/^[\s,]+|[\s,]+$/g, '')
        .trim();

    if (!cleanQuery) return [];

    // Check for OR logic
    const hasOr = /\s+or\s+/i.test(cleanQuery);
    if (hasOr) {
        return parseOrConditions(cleanQuery);
    }

    return parseAndConditions(cleanQuery);
}

// Parse OR conditions
function parseOrConditions(query) {
    const orParts = query.split(/\s+or\s+/i);
    const conditions = [];
    for (const part of orParts) {
        const andConds = parseAndConditions(part.trim());
        if (andConds.length > 1) {
            conditions.push({ and: andConds });
        } else if (andConds.length === 1) {
            conditions.push(andConds[0]);
        }
    }
    // Wrap in OR only if we got conditions from OR splitting
    // The caller will merge these into the top-level AND
    if (conditions.length > 1) {
        return [{ or: conditions }];
    }
    return conditions;
}

// Parse AND conditions from a segment
function parseAndConditions(query) {
    // Protect "between X and Y" from being split
    const protectedQuery = query.replace(
        /between\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)/gi,
        'between $1_AND_$2'
    );

    // Also protect "year over year" / "yoy" from splitting
    const parts = protectedQuery.split(/\s*(?:,\s*|\s+and\s+)/i);
    const conditions = [];

    for (const part of parts) {
        const restoredPart = part.replace(/_AND_/g, ' and ').trim();
        if (!restoredPart) continue;

        // Handle "between" explicitly
        const betweenMatch = restoredPart.match(
            /(.+?)\s+between\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)/i
        );
        if (betweenMatch) {
            const field = findMetricField(betweenMatch[1].trim());
            if (field) {
                conditions.push({ field, operator: '>=', value: parseFloat(betweenMatch[2]) });
                conditions.push({ field, operator: '<=', value: parseFloat(betweenMatch[3]) });
            }
            continue;
        }

        const condition = parseCondition(restoredPart);
        if (condition) conditions.push(condition);
    }

    return conditions;
}

// ──────────────────────────────────────────────────────────────
// Parse a single natural-language condition into DSL object
// Supports: standard comparisons, "positive X", "increasing X",
//           time-window / period qualifiers
// ──────────────────────────────────────────────────────────────
function parseCondition(conditionStr) {
    // Strip common preamble words
    let cleanStr = conditionStr
        .replace(/^(show|find|get|list|display|give|search)\s+(me\s+)?(all\s+)?(stocks?|companies?|shares?)\s+(with|where|having|whose|that have)\s+/i, '')
        .replace(/^(stocks?|companies?|shares?)\s+(with|where|having|whose|that have)\s+/i, '')
        .replace(/^(with|where|having)\s+/i, '')
        .trim();

    // ── 1. "Positive [metric] in last N quarters" ──
    const positiveMatch = cleanStr.match(
        /^positive\s+(.+?)(?:\s+(?:in|for|over)\s+(?:the\s+)?last\s+(\d+)\s+(quarters?|years?|months?))?$/i
    );
    if (positiveMatch) {
        const field = findMetricField(positiveMatch[1].trim());
        if (field) {
            const cond = { field, operator: '>', value: 0 };
            if (positiveMatch[2]) {
                cond.period = {
                    type: 'last_n_quarters',
                    n: parseInt(positiveMatch[2]),
                    aggregation: 'all',
                };
            }
            return cond;
        }
    }

    // ── 2. "Increasing / growing [metric] (year over year)" ──
    const growingMatch = cleanStr.match(
        /^(increasing|growing|rising)\s+(.+?)(?:\s+(?:year\s+over\s+year|yoy|y-o-y))?(?:\s+(?:in|for|over)\s+(?:the\s+)?last\s+(\d+)\s+(quarters?|years?|months?))?$/i
    );
    if (growingMatch) {
        const baseField = findMetricField(growingMatch[2].trim());
        if (baseField) {
            // Map to the growth field if one exists, otherwise append _growth_yoy
            const growthField = GROWTH_FIELD_MAP[baseField] || (baseField + '_growth_yoy');
            const cond = { field: growthField, operator: '>', value: 0 };
            if (growingMatch[3]) {
                cond.period = {
                    type: 'last_n_quarters',
                    n: parseInt(growingMatch[3]),
                    aggregation: 'all',
                };
            }
            return cond;
        }
    }

    // ── 3. Standalone growth/metric phrase (no operator, no value) ──
    // e.g., "EBITDA growth", "revenue growth", "growing revenues"
    // Interpret as "growth field > 0"
    const standaloneGrowthField = findMetricField(cleanStr);
    if (standaloneGrowthField && !cleanStr.match(/\d/)) {
        // If the field is already a growth field, use it directly
        if (standaloneGrowthField.includes('growth')) {
            return { field: standaloneGrowthField, operator: '>', value: 0 };
        }
        // Check if there's a growth mapping
        if (GROWTH_FIELD_MAP[standaloneGrowthField]) {
            return { field: GROWTH_FIELD_MAP[standaloneGrowthField], operator: '>', value: 0 };
        }
    }

    // ── 4. Standard comparison pattern ──
    // "market cap greater than 10000 crore"
    // "PE less than 20"
    // "ROE above 15%"
    // "debt to equity below 0.5"
    // "net profit > 0 in last 4 quarters"
    const pattern = /(.+?)\s*(!==|!=|<=|>=|<|>|=|below|above|under|over|at least|at most|less than|greater than|more than|equal to|equal|is)\s*([\d,.]+)\s*(%?)\s*(crores?|cr|lakhs?|l|billion|b|million|m|thousand|k|trillion|t)?(?:\s+(?:in|for|over)\s+(?:the\s+)?last\s+(\d+)\s+(quarters?|years?|months?)(?:\s+(\w+))?)?/i;

    const match = cleanStr.match(pattern);
    if (!match) return null;

    const metricPhrase = match[1].trim();
    const operatorStr = match[2].trim();
    let rawValue = match[3].replace(/,/g, ''); // remove commas from "10,000"
    let value = parseFloat(rawValue);
    const isPercent = match[4] === '%';
    const unitStr = match[5] ? match[5].toLowerCase() : null;

    // Apply unit multiplier (e.g. "10000 crore" → 10000 * 1e7)
    if (unitStr && UNIT_MULTIPLIERS[unitStr]) {
        value = value * UNIT_MULTIPLIERS[unitStr];
    }

    // Fields stored as fractions (0-1 range) in the database.
    // promoter_holding is stored as 0.50 meaning 50%.
    // roe, roa, operating_margin, ebitda_margin are stored as actual
    // percentage values (e.g., 15.2 meaning 15.2%) — no conversion needed.
    const FRACTION_FIELDS = ['promoter_holding'];
    const field = findMetricField(metricPhrase);
    if (!field) return null;

    // Auto-normalize: "promoter holding above 50%" or "above 50" → 0.50
    if (FRACTION_FIELDS.includes(field) && value > 1) {
        value = value / 100;
    }

    const operator = normalizeOperator(operatorStr);
    const condition = { field, operator, value };

    // Period / time-window qualifier
    const periodCount = match[6] ? parseInt(match[6]) : null;
    const periodUnit = match[7] ? match[7].toLowerCase().replace(/s$/, '') : null;
    const aggregation = match[8] ? match[8].toLowerCase() : null;

    if (periodCount && periodUnit) {
        condition.period = {
            type: 'last_n_quarters',
            n: periodCount,
            aggregation: aggregation || 'all',
        };
    }

    return condition;
}

// Find the DB field name from a natural-language phrase
function findMetricField(phrase) {
    const normalized = phrase
        .toLowerCase()
        .replace(/[^a-z0-9/ ]/g, ' ')  // remove special chars except /
        .replace(/\s+/g, ' ')
        .trim();

    // Direct lookup
    if (METRIC_MAP[normalized]) return METRIC_MAP[normalized];

    // Longest-key-first substring match
    const keys = Object.keys(METRIC_MAP).sort((a, b) => b.length - a.length);
    for (const key of keys) {
        if (normalized.includes(key)) {
            return METRIC_MAP[key];
        }
    }
    return null;
}

// Normalize operator strings to SQL operators
function normalizeOperator(op) {
    const opMap = {
        '<': '<',  '>': '>',  '<=': '<=',  '>=': '>=',  '=': '=',  '!=': '!=',
        'is': '=', 'equal': '=', 'equal to': '=',
        'below': '<', 'under': '<', 'less than': '<',
        'above': '>', 'over': '>', 'greater than': '>', 'more than': '>',
        'at least': '>=', 'no less than': '>=',
        'at most': '<=', 'no more than': '<=',
    };
    return opMap[op.toLowerCase().trim()] || op;
}

module.exports = { translateNLToDSL };
# Sample Natural Language Queries & Expected DSL Output

**Module:** LLM Parser Service  
**Purpose:** Test query set for validating NL → DSL translation  
**Version:** 1.0.0  
**Date:** December 26, 2025

---

## Overview

This document provides a comprehensive set of sample natural language queries along with their expected DSL outputs. Use these for:
- ✅ Testing LLM Parser Service
- ✅ Validating stub implementation
- ✅ Training/fine-tuning LLM models
- ✅ Integration testing
- ✅ Documentation and examples

---

## Query Categories

1. [Simple Single-Condition Queries](#1-simple-single-condition-queries)
2. [Multiple Conditions (AND)](#2-multiple-conditions-and)
3. [Multiple Conditions (OR)](#3-multiple-conditions-or)
4. [Complex Nested Logic](#4-complex-nested-logic)
5. [Time-Period Queries](#5-time-period-queries)
6. [Range Queries](#6-range-queries)
7. [Metadata Filters](#7-metadata-filters)
8. [Sorting and Limits](#8-sorting-and-limits)
9. [Derived Metrics](#9-derived-metrics)
10. [Error Cases](#10-error-cases)

---

## 1. Simple Single-Condition Queries

### Query 1.1: Basic Comparison
**Natural Language:**
```
Find stocks with PE ratio less than 15
```

**Expected DSL:**
```json
{
  "filter": {
    "and": [
      {
        "field": "pe_ratio",
        "operator": "<",
        "value": 15
      }
    ]
  }
}
```

---

### Query 1.2: Greater Than
**Natural Language:**
```
Show companies with ROE greater than 20
```

**Expected DSL:**
```json
{
  "filter": {
    "and": [
      {
        "field": "roe",
        "operator": ">",
        "value": 20
      }
    ]
  }
}
```

---

### Query 1.3: Equality
**Natural Language:**
```
Stocks with debt to equity equal to 0.5
```

**Expected DSL:**
```json
{
  "filter": {
    "and": [
      {
        "field": "debt_to_equity",
        "operator": "=",
        "value": 0.5
      }
    ]
  }
}
```

---

### Query 1.4: Less Than or Equal
**Natural Language:**
```
Companies with dividend yield at most 3%
```

**Expected DSL:**
```json
{
  "filter": {
    "and": [
      {
        "field": "dividend_yield",
        "operator": "<=",
        "value": 3
      }
    ]
  }
}
```

---

## 2. Multiple Conditions (AND)

### Query 2.1: Two Conditions
**Natural Language:**
```
Find stocks with PE < 15 and ROE > 20
```

**Expected DSL:**
```json
{
  "filter": {
    "and": [
      {
        "field": "pe_ratio",
        "operator": "<",
        "value": 15
      },
      {
        "field": "roe",
        "operator": ">",
        "value": 20
      }
    ]
  }
}
```

---

### Query 2.2: Three Conditions
**Natural Language:**
```
Show companies with PE < 20, ROE > 15, and debt to equity < 1
```

**Expected DSL:**
```json
{
  "filter": {
    "and": [
      {
        "field": "pe_ratio",
        "operator": "<",
        "value": 20
      },
      {
        "field": "roe",
        "operator": ">",
        "value": 15
      },
      {
        "field": "debt_to_equity",
        "operator": "<",
        "value": 1
      }
    ]
  }
}
```

---

### Query 2.3: Multiple Metrics
**Natural Language:**
```
Stocks with positive net profit, operating margin > 10%, and current ratio > 1.5
```

**Expected DSL:**
```json
{
  "filter": {
    "and": [
      {
        "field": "net_profit",
        "operator": ">",
        "value": 0
      },
      {
        "field": "operating_margin",
        "operator": ">",
        "value": 10
      },
      {
        "field": "current_ratio",
        "operator": ">",
        "value": 1.5
      }
    ]
  }
}
```

---

## 3. Multiple Conditions (OR)

### Query 3.1: Two Alternatives
**Natural Language:**
```
Find stocks with PE < 10 or ROE > 25
```

**Expected DSL:**
```json
{
  "filter": {
    "or": [
      {
        "field": "pe_ratio",
        "operator": "<",
        "value": 10
      },
      {
        "field": "roe",
        "operator": ">",
        "value": 25
      }
    ]
  }
}
```

---

### Query 3.2: Multiple Alternatives
**Natural Language:**
```
Show companies with high ROE > 30 or high dividend yield > 5 or low PE < 8
```

**Expected DSL:**
```json
{
  "filter": {
    "or": [
      {
        "field": "roe",
        "operator": ">",
        "value": 30
      },
      {
        "field": "dividend_yield",
        "operator": ">",
        "value": 5
      },
      {
        "field": "pe_ratio",
        "operator": "<",
        "value": 8
      }
    ]
  }
}
```

---

## 4. Complex Nested Logic

### Query 4.1: AND within OR
**Natural Language:**
```
Find stocks with (PE < 15 and ROE > 20) or (dividend yield > 4 and debt to equity < 0.5)
```

**Expected DSL:**
```json
{
  "filter": {
    "or": [
      {
        "and": [
          {
            "field": "pe_ratio",
            "operator": "<",
            "value": 15
          },
          {
            "field": "roe",
            "operator": ">",
            "value": 20
          }
        ]
      },
      {
        "and": [
          {
            "field": "dividend_yield",
            "operator": ">",
            "value": 4
          },
          {
            "field": "debt_to_equity",
            "operator": "<",
            "value": 0.5
          }
        ]
      }
    ]
  }
}
```

---

### Query 4.2: OR within AND
**Natural Language:**
```
Stocks with PE < 20 and (ROE > 25 or ROA > 15)
```

**Expected DSL:**
```json
{
  "filter": {
    "and": [
      {
        "field": "pe_ratio",
        "operator": "<",
        "value": 20
      },
      {
        "or": [
          {
            "field": "roe",
            "operator": ">",
            "value": 25
          },
          {
            "field": "roa",
            "operator": ">",
            "value": 15
          }
        ]
      }
    ]
  }
}
```

---

### Query 4.3: NOT Logic
**Natural Language:**
```
Find stocks that do not have debt to equity greater than 2
```

**Expected DSL:**
```json
{
  "filter": {
    "not": {
      "field": "debt_to_equity",
      "operator": ">",
      "value": 2
    }
  }
}
```

---

## 5. Time-Period Queries

### Query 5.1: Last N Quarters (All)
**Natural Language:**
```
Stocks with positive earnings in all of the last 4 quarters
```

**Expected DSL:**
```json
{
  "filter": {
    "and": [
      {
        "field": "net_profit",
        "operator": ">",
        "value": 0,
        "period": {
          "type": "last_n_quarters",
          "n": 4,
          "aggregation": "all"
        }
      }
    ]
  }
}
```

---

### Query 5.2: Last N Quarters (Any)
**Natural Language:**
```
Companies with revenue growth > 20% in at least one of the last 3 quarters
```

**Expected DSL:**
```json
{
  "filter": {
    "and": [
      {
        "field": "revenue_growth_yoy",
        "operator": ">",
        "value": 20,
        "period": {
          "type": "last_n_quarters",
          "n": 3,
          "aggregation": "any"
        }
      }
    ]
  }
}
```

---

### Query 5.3: Average Over Period
**Natural Language:**
```
Stocks with average ROE > 18% over the last 8 quarters
```

**Expected DSL:**
```json
{
  "filter": {
    "and": [
      {
        "field": "roe",
        "operator": ">",
        "value": 18,
        "period": {
          "type": "last_n_quarters",
          "n": 8,
          "aggregation": "avg"
        }
      }
    ]
  }
}
```

---

### Query 5.4: Trailing 12 Months
**Natural Language:**
```
Companies with free cash flow > 1000 in trailing 12 months
```

**Expected DSL:**
```json
{
  "filter": {
    "and": [
      {
        "field": "free_cash_flow",
        "operator": ">",
        "value": 1000,
        "period": {
          "type": "trailing_12_months",
          "n": 1,
          "aggregation": "sum"
        }
      }
    ]
  }
}
```

---

## 6. Range Queries

### Query 6.1: Between Range
**Natural Language:**
```
Find stocks with PE ratio between 10 and 20
```

**Expected DSL:**
```json
{
  "filter": {
    "and": [
      {
        "field": "pe_ratio",
        "operator": "between",
        "value": [10, 20]
      }
    ]
  }
}
```

---

### Query 6.2: Multiple Ranges
**Natural Language:**
```
Stocks with PE between 5 and 15 and ROE between 15 and 30
```

**Expected DSL:**
```json
{
  "filter": {
    "and": [
      {
        "field": "pe_ratio",
        "operator": "between",
        "value": [5, 15]
      },
      {
        "field": "roe",
        "operator": "between",
        "value": [15, 30]
      }
    ]
  }
}
```

---

## 7. Metadata Filters

### Query 7.1: Sector Filter
**Natural Language:**
```
Find IT stocks with PE < 20
```

**Expected DSL:**
```json
{
  "filter": {
    "and": [
      {
        "field": "pe_ratio",
        "operator": "<",
        "value": 20
      }
    ]
  },
  "meta": {
    "sector": "IT"
  }
}
```

---

### Query 7.2: Exchange Filter
**Natural Language:**
```
NSE listed stocks with ROE > 25
```

**Expected DSL:**
```json
{
  "filter": {
    "and": [
      {
        "field": "roe",
        "operator": ">",
        "value": 25
      }
    ]
  },
  "meta": {
    "exchange": "NSE"
  }
}
```

---

### Query 7.3: Market Cap Category
**Natural Language:**
```
Large cap stocks with dividend yield > 3%
```

**Expected DSL:**
```json
{
  "filter": {
    "and": [
      {
        "field": "dividend_yield",
        "operator": ">",
        "value": 3
      }
    ]
  },
  "meta": {
    "market_cap_category": "Large Cap"
  }
}
```

---

### Query 7.4: Multiple Metadata
**Natural Language:**
```
IT sector stocks on NSE with PE < 15 and ROE > 20
```

**Expected DSL:**
```json
{
  "filter": {
    "and": [
      {
        "field": "pe_ratio",
        "operator": "<",
        "value": 15
      },
      {
        "field": "roe",
        "operator": ">",
        "value": 20
      }
    ]
  },
  "meta": {
    "sector": "IT",
    "exchange": "NSE"
  }
}
```

---

## 8. Sorting and Limits

### Query 8.1: Sort Ascending
**Natural Language:**
```
Find stocks with PE < 15, sorted by market cap ascending, limit 20
```

**Expected DSL:**
```json
{
  "filter": {
    "and": [
      {
        "field": "pe_ratio",
        "operator": "<",
        "value": 15
      }
    ]
  },
  "sort": {
    "field": "market_cap",
    "order": "asc"
  },
  "limit": 20
}
```

---

### Query 8.2: Sort Descending
**Natural Language:**
```
Top 50 stocks by ROE
```

**Expected DSL:**
```json
{
  "filter": {
    "and": [
      {
        "field": "roe",
        "operator": ">",
        "value": 0
      }
    ]
  },
  "sort": {
    "field": "roe",
    "order": "desc"
  },
  "limit": 50
}
```

---

## 9. Derived Metrics

### Query 9.1: PEG Ratio
**Natural Language:**
```
Stocks with PEG ratio less than 1
```

**Expected DSL:**
```json
{
  "filter": {
    "and": [
      {
        "field": "peg_ratio",
        "operator": "<",
        "value": 1,
        "derived_from": ["pe_ratio", "eps_growth"]
      }
    ]
  }
}
```

---

### Query 9.2: EV to EBITDA
**Natural Language:**
```
Companies with EV to EBITDA between 8 and 15
```

**Expected DSL:**
```json
{
  "filter": {
    "and": [
      {
        "field": "ev_to_ebitda",
        "operator": "between",
        "value": [8, 15],
        "derived_from": ["market_cap", "total_debt", "ebitda"]
      }
    ]
  }
}
```

---

## 10. Error Cases

### Query 10.1: Unsupported Field
**Natural Language:**
```
Find stocks with profit margin > 20%
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "The query could not be translated to a valid screening rule"
  }
}
```

**Reason:** `profit_margin` is not in the allowed fields list. Use `operating_margin` or `net_margin` instead.

---

### Query 10.2: Ambiguous Query
**Natural Language:**
```
Good stocks
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "type": "UNSUPPORTED_QUERY",
    "message": "This query type is not yet supported"
  }
}
```

**Reason:** "Good" is subjective and cannot be translated to specific financial criteria.

---

### Query 10.3: Empty Query
**Natural Language:**
```
(empty string)
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "type": "INVALID_INPUT",
    "message": "Please provide a valid query"
  }
}
```

---

## Advanced Query Examples

### Query A1: Complex Investment Strategy
**Natural Language:**
```
Find value stocks: PE < 12, PB < 1.5, debt to equity < 0.8, ROE > 18%, and positive free cash flow in last 4 quarters
```

**Expected DSL:**
```json
{
  "filter": {
    "and": [
      {
        "field": "pe_ratio",
        "operator": "<",
        "value": 12
      },
      {
        "field": "price_to_book",
        "operator": "<",
        "value": 1.5
      },
      {
        "field": "debt_to_equity",
        "operator": "<",
        "value": 0.8
      },
      {
        "field": "roe",
        "operator": ">",
        "value": 18
      },
      {
        "field": "free_cash_flow",
        "operator": ">",
        "value": 0,
        "period": {
          "type": "last_n_quarters",
          "n": 4,
          "aggregation": "all"
        }
      }
    ]
  }
}
```

---

### Query A2: Dividend Growth Strategy
**Natural Language:**
```
IT sector large cap stocks with dividend yield > 2%, positive dividend growth, and payout ratio < 50%
```

**Expected DSL:**
```json
{
  "filter": {
    "and": [
      {
        "field": "dividend_yield",
        "operator": ">",
        "value": 2
      },
      {
        "field": "payout_ratio",
        "operator": "<",
        "value": 50
      }
    ]
  },
  "meta": {
    "sector": "IT",
    "market_cap_category": "Large Cap"
  }
}
```

---

### Query A3: Quality Growth Stocks
**Natural Language:**
```
Show me stocks with (ROE > 20 and revenue growth > 15%) or (operating margin > 25% and earnings growth > 20%), with PE between 15 and 30
```

**Expected DSL:**
```json
{
  "filter": {
    "and": [
      {
        "field": "pe_ratio",
        "operator": "between",
        "value": [15, 30]
      },
      {
        "or": [
          {
            "and": [
              {
                "field": "roe",
                "operator": ">",
                "value": 20
              },
              {
                "field": "revenue_growth_yoy",
                "operator": ">",
                "value": 15
              }
            ]
          },
          {
            "and": [
              {
                "field": "operating_margin",
                "operator": ">",
                "value": 25
              },
              {
                "field": "earnings_growth_yoy",
                "operator": ">",
                "value": 20
              }
            ]
          }
        ]
      }
    ]
  }
}
```

---

## Testing Checklist

Use this checklist to validate LLM Parser implementation:

- [ ] ✅ **Simple Queries:** All single-condition queries work
- [ ] ✅ **AND Logic:** Multiple conditions combined correctly
- [ ] ✅ **OR Logic:** Alternative conditions handled
- [ ] ✅ **Nested Logic:** Complex AND/OR combinations supported
- [ ] ✅ **NOT Logic:** Negation works correctly
- [ ] ✅ **Time Periods:** Last N quarters/years queries work
- [ ] ✅ **Aggregations:** All, any, avg, sum, min, max supported
- [ ] ✅ **Range Queries:** Between operator works
- [ ] ✅ **Metadata Filters:** Sector, exchange, market cap filters work
- [ ] ✅ **Sorting:** Ascending and descending sort work
- [ ] ✅ **Limits:** Result limits applied correctly
- [ ] ✅ **Derived Metrics:** PEG, EV/EBITDA calculated
- [ ] ✅ **Error Handling:** Invalid queries rejected gracefully
- [ ] ✅ **Field Validation:** Only allowed fields accepted
- [ ] ✅ **Operator Validation:** Only allowed operators accepted

---

## Usage Instructions

### For Testing
```javascript
const testQueries = require('./sample_queries.json');

testQueries.forEach(async (test) => {
  const result = await llmParserService.processQuery(test.query);
  expect(result.dsl).toEqual(test.expectedDSL);
});
```

### For LLM Training
Use the query-DSL pairs in this document to:
1. Fine-tune LLM models
2. Create few-shot examples in prompts
3. Validate LLM output quality

### For Documentation
Reference these examples in:
- User guides
- API documentation
- Frontend help sections

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-26 | Initial sample queries documentation |

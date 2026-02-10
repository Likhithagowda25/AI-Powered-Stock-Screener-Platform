# DSL Format Specification

## Overview

This document describes how different query components are represented in the Domain-Specific Language (DSL) format for the Stock Screener platform.

---

## 1. Financial Metrics

### Currently Supported Metrics (from fundamentals_quarterly table)

| Metric Name           | DSL Field Name    | Natural Language Keywords           | Data Type | Example Query |
|----------------------|-------------------|-------------------------------------|-----------|---------------|
| PE Ratio             | `pe_ratio`        | pe, PE, p/e, pe ratio               | Number    | "PE < 20"     |
| ROE                  | `roe`             | roe, ROE                            | Number    | "ROE > 15"    |
| ROA                  | `roa`             | roa, ROA                            | Number    | "ROA > 10"    |
| PB Ratio             | `pb_ratio`        | pb, PB, p/b, pb ratio               | Number    | "PB < 3"      |
| Revenue              | `revenue`         | revenue                             | Number    | "revenue > 1000000" |
| Net Income           | `net_income`      | net income, net profit              | Number    | "net income > 5000" |
| EPS                  | `eps`             | eps, EPS                            | Number    | "EPS > 10"    |
| Operating Margin     | `operating_margin`| operating margin                    | Number    | "operating margin > 20" |
| Debt to Equity       | `debt_to_equity`  | debt to equity, debt equity         | Number    | "debt to equity < 2" |
| Market Cap           | `market_cap`      | market cap                          | Number    | "market cap > 1000000000" |
| Short Term Debt      | `short_term_debt` | short term debt                     | Number    | "short term debt < 1000" |
| Long Term Debt       | `long_term_debt`  | long term debt                      | Number    | "long term debt < 5000" |
| CapEx                | `capex`           | capex                               | Number    | "capex > 500" |
| Operating Cash Flow  | `cfo`             | cfo, operating cash flow            | Number    | "cfo > 1000" |

### DSL Representation

```json
{
  "field": "pe_ratio",
  "operator": "<",
  "value": 20
}
```

### Status: ✅ SUPPORTED

**Example:**
```
Query: "PE < 20"
DSL: { "field": "pe_ratio", "operator": "<", "value": 20 }
```

### Additional Metrics (Not Yet Supported)

Future metrics to be added:
- Market Cap (`market_cap`)
- Debt to Equity (`debt_to_equity`)
- Current Ratio (`current_ratio`)
- EPS (`eps`)
- Dividend Yield (`dividend_yield`)
- Revenue Growth (`revenue_growth`)
- Price to Book (`pb_ratio`)

---

## 2. Comparison Operators

### Supported Operators

| Symbol | Natural Language      | DSL Representation | Status |
|--------|-----------------------|--------------------|--------|
| `<`    | less than             | `"<"`              | ✅ SUPPORTED |
| `>`    | greater than          | `">"`              | ✅ SUPPORTED |
| `<=`   | less than or equal to | `"<="`             | ✅ SUPPORTED |
| `>=`   | greater than or equal to | `">="`          | ✅ SUPPORTED |
| `=`    | equal to              | `"="`              | ✅ SUPPORTED |
| `!=`   | not equal to          | `"!="`             | ✅ SUPPORTED |
| `between` | between X and Y    | Special format     | ❌ NOT YET SUPPORTED |

### DSL Format

```json
{
  "field": "pe_ratio",
  "operator": "<=",
  "value": 25
}
```

### Examples

**Supported:**
```javascript
"PE < 20"           → { "operator": "<", "value": 20 }
"ROE > 15"          → { "operator": ">", "value": 15 }
"PE less than 20"   → { "operator": "<", "value": 20 }
"ROE >= 10"         → { "operator": ">=", "value": 10 }
```

**Not Yet Supported:**
```javascript
"PE != 15"                    → NOT SUPPORTED
"PE between 10 and 20"        → NOT SUPPORTED
```

---

## 3. Logical Conditions (AND / OR)

### AND Logic

**Status: ✅ PARTIALLY SUPPORTED**

Multiple conditions in the same query are automatically combined with AND logic.

**DSL Format:**
```json
{
  "filter": {
    "and": [
      { "field": "pe_ratio", "operator": "<", "value": 20 },
      { "field": "roe", "operator": ">", "value": 15 }
    ]
  }
}
```

**Example:**
```
Query: "PE < 20 and ROE > 15"
Output:
{
  "filter": {
    "and": [
      { "field": "pe_ratio", "operator": "<", "value": 20 },
      { "field": "roe", "operator": ">", "value": 15 }
    ]
  }
}
```

**How it works:** The stub detects all metric patterns in the query and automatically combines them with AND logic.

### OR Logic

**Status: ✅ SUPPORTED**

OR conditions are fully supported in the stub implementation.

**DSL Format:**
```json
{
  "filter": {
    "or": [
      { "field": "pe_ratio", "operator": "<", "value": 10 },
      { "field": "roe", "operator": ">", "value": 20 }
    ]
  }
}
```

**Not Yet Working:**
```
"PE < 10 or ROE > 20"  → Currently returns empty filter
```

### Complex Nested Logic

**Status: ❌ NOT YET SUPPORTED**

Complex combinations of AND/OR are not supported.

**Future Format:**
```json
{
  "filter": {
    "and": [
      { "field": "pe_ratio", "operator": "<", "value": 20 },
      {
        "or": [
          { "field": "roe", "operator": ">", "value": 15 },
          { "field": "net_profit", "operator": ">", "value": 1000 }
        ]
      }
    ]
  }
}
```

---

## 4. Time-Based Constraints

**Status: ✅ SUPPORTED**

Time-based constraints for analyzing data over specific periods are now supported.

### DSL Format

**Quarter-based constraints:**
```json
{
  "field": "revenue_growth",
  "operator": ">",
  "value": 10,
  "timeframe": {
    "type": "quarters",
    "period": 4,
    "aggregation": "average"
  }
}
```

**Year-based constraints:**
```json
{
  "field": "roe",
  "operator": ">",
  "value": 15,
  "timeframe": {
    "type": "years",
    "period": 3,
    "aggregation": "average"
  }
}
```

### Planned Natural Language Examples

**Not Yet Supported:**
```
"ROE > 15 in last 4 quarters"
"Average revenue growth > 10% over last 3 years"
"PE < 20 as of last quarter"
"Net profit increased in last 2 quarters"
```

### Proposed Timeframe Properties

| Property      | Type   | Description                          | Example Values |
|--------------|--------|--------------------------------------|----------------|
| `type`       | string | Time period unit                     | "quarters", "years", "months" |
| `period`     | number | Number of periods                    | 1, 2, 3, 4, etc. |
| `aggregation`| string | How to aggregate data                | "average", "sum", "min", "max", "latest" |
| `comparison` | string | Period comparison type               | "consecutive", "yoy", "qoq" |

---

## Current Implementation Summary

### ✅ What Works Now

1. **Financial Metrics** - All 14 metrics from database (PE, ROE, ROA, PB, Revenue, Net Income, EPS, Operating Margin, Debt to Equity, Market Cap, Short/Long Term Debt, CapEx, CFO)
2. **Comparison Operators** - All operators (<, >, <=, >=, =, !=)
3. **AND Logic** - Multiple conditions with AND
4. **OR Logic** - Multiple conditions with OR
5. **Complex Nesting** - Combine AND and OR (e.g., "PE < 20 and (ROE > 15 or EPS > 10)")
6. **Time-Based Constraints** - Support for quarters, years, months
7. **Case Insensitive** - Queries work regardless of capitalization
8. **Flexible Syntax** - Supports both symbols and words ("PE < 20" or "PE less than 20")

### ❌ What Doesn't Work Yet

1. **Between Operator** - No range queries (e.g., "PE between 10 and 20")
2. **Advanced Aggregations** - Limited timeframe aggregation options

---

## Example Queries and Results

### Working Queries

```javascript
// Single condition
"PE < 20"
→ { "filter": { "and": [{ "field": "pe_ratio", "operator": "<", "value": 20 }] } }

// Multiple conditions (AND)
"PE < 20 and ROE > 15"
→ {
    "filter": {
      "and": [
        { "field": "pe_ratio", "operator": "<", "value": 20 },
        { "field": "roe", "operator": ">", "value": 15 }
      ]
    }
  }

// Three conditions (AND)
"PE < 20 and ROE > 15 and net profit > 1000"
→ {
    "filter": {
      "and": [
        { "field": "pe_ratio", "operator": "<", "value": 20 },
        { "field": "roe", "operator": ">", "value": 15 },
        { "field": "net_profit", "operator": ">", "value": 1000 }
      ]
    }
  }

// Using words instead of symbols
"PE less than 20 and ROE greater than 15"
→ Same as above
```

**Now Working:**
```javascript
// OR logic
"PE < 10 or ROE > 20"
→ {
    "filter": {
      "or": [
        { "field": "pe_ratio", "operator": "<", "value": 10 },
        { "field": "roe", "operator": ">", "value": 20 }
      ]
    }
  }

// Time-based
"ROE > 15 in last 4 quarters"
→ {
    "filter": {
      "and": [{
        "field": "roe",
        "operator": ">",
        "value": 15,
        "timeframe": {
          "type": "quarters",
          "period": 4,
          "aggregation": "latest"
        }
      }]
    }
  }

// Complex nesting
"PE < 20 and ROE > 15 or net income > 1000"
→ {
    "filter": {
      "or": [
        {
          "and": [
            { "field": "pe_ratio", "operator": "<", "value": 20 },
            { "field": "roe", "operator": ">", "value": 15 }
          ]
        },
        { "field": "net_income", "operator": ">", "value": 1000 }
      ]
    }
  }

// All available metrics
"revenue > 1000000"
→ { "filter": { "and": [{ "field": "revenue", "operator": ">", "value": 1000000 }] } }

"eps > 10"
→ { "filter": { "and": [{ "field": "eps", "operator": ">", "value": 10 }] } }

"debt to equity < 2"
→ { "filter": { "and": [{ "field": "debt_to_equity", "operator": "<", "value": 2 }] } }

"market cap > 1000000000"
→ { "filter": { "and": [{ "field": "market_cap", "operator": ">", "value": 1000000000 }] } }

// Not equal operator
"PE != 15"
→ { "filter": { "and": [{ "field": "pe_ratio", "operator": "!=", "value": 15 }] } }
```

**Still Not Working:**
```javascript
// Between operator
"PE between 10 and 20"        → NOT SUPPORTED (needs implementation)
```

---

## Recommendations for Enhancement

To fully support all four requirements, the stub should be enhanced to:

1. **Add OR Detection**
   - Parse "or" keyword in queries
   - Build nested filter structures

2. **Add Time Parsing**
   - Detect temporal phrases ("last N quarters", "past 3 years")
   - Add timeframe object to conditions

3. **Expand Metric Library**
   - Add more financial metrics
   - Create comprehensive metric mapping

4. **Support Complex Logic**
   - Parse parentheses for grouping
   - Build nested AND/OR structures

---

## Testing Your Current Query

**Your Query:**
```json
{
  "query": "PE < 20 and ROE > 15"
}
```

**What Works:** ✅
- Financial Metrics: PE and ROE are supported
- Comparison Operators: < and > work
- AND Logic: Multiple conditions are combined with AND

**What Doesn't Work:** N/A for this query
- No OR logic used
- No time-based constraints

**Result:**
```json
{
  "dsl": {
    "filter": {
      "and": [
        { "field": "pe_ratio", "operator": "<", "value": 20 },
        { "field": "roe", "operator": ">", "value": 15 }
      ]
    }
  }
}
```

**Status: ✅ FULLY SUPPORTED**

---

## Next Steps

To support all requirements:

1. Implement OR logic parser
2. Add time-based constraint detection
3. Expand metric library
4. Add support for complex nested conditions
5. Implement parentheses grouping
6. Add "between" operator
7. Add "not equal" operator

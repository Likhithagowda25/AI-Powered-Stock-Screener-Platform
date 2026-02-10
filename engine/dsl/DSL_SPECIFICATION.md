# Stock Screener DSL Specification

**Module:** Screener Engine – Rule Definition Layer  
**Project:** AI-Powered Mobile Stock Screener & Advisory Platform  
**Version:** 1.0.0  
**Date:** December 22, 2025

---

## 1. Why This DSL Exists

Users interact with natural language queries like:
> "Find stocks with PE < 5 and positive earnings in last 4 quarters"

But databases require precise, unambiguous SQL logic.

### The Data Flow
```
Natural Language (User)
        ↓
    LLM Parser
        ↓
  DSL / JSON Schema   ← THIS SPECIFICATION
        ↓
Screener Compiler
        ↓
      SQL
```

### What the DSL Provides
✅ **Deterministic behavior** - Same input always produces same output  
✅ **Security** - No SQL injection, controlled field access  
✅ **Validation** - Strict schema enforcement  
✅ **Extensibility** - Easy to add new metrics and operators  
✅ **Debuggability** - Human-readable JSON structure

---

## 2. Objective

Design a JSON-based DSL that can represent:
- ✅ Financial conditions (PE, revenue, debt, growth, etc.)
- ✅ Logical combinations (AND / OR / NOT)
- ✅ Time-based conditions (last N quarters)
- ✅ Derived metrics (PEG, debt-to-FCF)
- ✅ Comparisons and ranges
- ✅ Null/missing-data handling

---

## 3. Core DSL Design Principles

1. **Strict JSON schema** (machine-validated)
2. **Composable logic** (nested AND/OR)
3. **Human-readable** (debuggable)
4. **Safe** (no raw SQL or functions)
5. **Extensible** (future indicators, ML signals)

---

## 4. DSL High-Level Structure

```json
{
  "filter": {
    "and": [ <conditions> ],
    "or": [ <conditions> ],
    "not": <condition>
  },
  "meta": {
    "sector": "IT",
    "exchange": "NSE"
  }
}
```

**Rules:**
- Only one of `and` / `or` / `not` allowed per node
- `filter` is required
- `meta` is optional

---

## 5. Condition Object Definition

```json
{
  "field": "pe_ratio",
  "operator": "<",
  "value": 15
}
```

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `field` | string | Yes | Financial metric name |
| `operator` | string | Yes | Comparison operator |
| `value` | number/string/array | Yes | Comparison value |
| `period` | object | No | Time-window specification |

---

## 6. Supported Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `<` | Less than | `{"field": "pe_ratio", "operator": "<", "value": 15}` |
| `>` | Greater than | `{"field": "roe", "operator": ">", "value": 15}` |
| `<=` | Less than equal | `{"field": "debt_to_equity", "operator": "<=", "value": 1}` |
| `>=` | Greater than equal | `{"field": "promoter_holding", "operator": ">=", "value": 50}` |
| `=` | Equals | `{"field": "sector", "operator": "=", "value": "IT"}` |
| `!=` | Not equals | `{"field": "sector", "operator": "!=", "value": "Finance"}` |
| `between` | Range | `{"field": "pe_ratio", "operator": "between", "value": [10, 20]}` |
| `in` | Set membership | `{"field": "sector", "operator": "in", "value": ["IT", "Pharma"]}` |
| `exists` | Non-null | `{"field": "dividend_yield", "operator": "exists", "value": true}` |

---

## 7. Supported Financial Fields

### Valuation Metrics
- `pe_ratio` - Price to Earnings Ratio
- `peg_ratio` - PE to Growth Ratio
- `price_to_book` - Price to Book Value
- `price_to_sales` - Price to Sales Ratio
- `ev_to_ebitda` - Enterprise Value to EBITDA

### Profitability Metrics
- `net_profit` - Net Profit (in millions)
- `ebitda` - Earnings Before Interest, Taxes, Depreciation & Amortization
- `roe` - Return on Equity (%)
- `roa` - Return on Assets (%)
- `operating_margin` - Operating Profit Margin (%)
- `net_margin` - Net Profit Margin (%)

### Growth Metrics
- `revenue_growth_yoy` - Year-over-Year Revenue Growth (%)
- `earnings_growth_yoy` - Year-over-Year Earnings Growth (%)
- `eps_growth` - Earnings Per Share Growth (%)

### Balance Sheet Metrics
- `total_debt` - Total Debt (in millions)
- `free_cash_flow` - Free Cash Flow (in millions)
- `debt_to_equity` - Debt to Equity Ratio
- `current_ratio` - Current Assets / Current Liabilities

### Ownership Metrics
- `promoter_holding` - Promoter Shareholding (%)
- `institutional_holding` - Institutional Shareholding (%)

### Market Metrics
- `market_cap` - Market Capitalization (in millions)
- `volume` - Trading Volume
- `dividend_yield` - Dividend Yield (%)

**See [field_catalog.json](./field_catalog.json) for complete list.**

---

## 8. Time-Window / Period Logic

For quarterly conditions:

```json
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
```

### Supported Aggregations

| Aggregation | Meaning |
|-------------|---------|
| `all` | Every period must satisfy |
| `any` | At least one period satisfies |
| `avg` | Average over N periods |
| `sum` | Sum over N periods |
| `min` | Minimum value in period |
| `max` | Maximum value in period |

---

## 9. Derived Metrics Representation

```json
{
  "field": "peg_ratio",
  "operator": "<",
  "value": 3,
  "derived_from": ["pe_ratio", "eps_growth"]
}
```

Derived metrics may be:
- Precomputed in DB
- Computed on-the-fly in query layer

---

## 10. Example: Natural Language → DSL Mapping

**Input:**
> "PE < 5 AND promoter holding > 50 AND positive earnings last 4 quarters"

**DSL:**
```json
{
  "filter": {
    "and": [
      { "field": "pe_ratio", "operator": "<", "value": 5 },
      { "field": "promoter_holding", "operator": ">", "value": 50 },
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

## 11. Validation Rules

The DSL must be validated before execution:

✔ Field must exist in whitelist  
✔ Operator must be allowed for field type  
✔ Numeric fields only accept numeric values  
✔ Period rules allowed only for time-series metrics  
✔ Reject ambiguous or empty filters

---

## 12. Complete Examples

### Example 1: Simple PE Filter
```json
{
  "filter": {
    "and": [
      {"field": "pe_ratio", "operator": "<", "value": 15}
    ]
  }
}
```

### Example 2: GARP Strategy
```json
{
  "filter": {
    "and": [
      {"field": "peg_ratio", "operator": "<", "value": 1},
      {"field": "revenue_growth_yoy", "operator": ">", "value": 20},
      {"field": "roe", "operator": ">", "value": 15}
    ]
  }
}
```

### Example 3: Complex Nested Logic
```json
{
  "filter": {
    "and": [
      {"field": "pe_ratio", "operator": "<", "value": 20},
      {
        "or": [
          {"field": "roe", "operator": ">", "value": 15},
          {"field": "net_margin", "operator": ">", "value": 10}
        ]
      }
    ]
  },
  "meta": {
    "sector": "IT"
  }
}
```

---

## 13. Deliverables Summary

| Deliverable | File | Status |
|-------------|------|--------|
| DSL Specification | DSL_SPECIFICATION.md | ✅ |
| Field Catalog | field_catalog.json | ✅ |
| Example DSLs | examples/*.json | ✅ |
| Validation Rules | validation_rules.md | ✅ |
| Mapping Examples | nl_to_dsl_mappings.md | ✅ |

---

## 14. Acceptance Criteria

☑ **DSL supports simple & complex queries** - ✅ Demonstrated in 10 examples  
☑ **Covers time-based logic** - ✅ Period specifications with aggregations  
☑ **Safe & SQL-injection-proof** - ✅ Whitelisted fields and operators  
☑ **LLM output can be strictly validated** - ✅ JSON Schema validation  
☑ **Easily convertible to SQL later** - ✅ Direct field-to-column mapping

---

**Version:** 1.0.0  
**Status:** Production Ready  
**Last Updated:** December 22, 2025

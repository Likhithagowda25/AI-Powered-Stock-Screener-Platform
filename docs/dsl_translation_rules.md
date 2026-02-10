
# DSL Translation Rules

## Supported Natural Language Queries

The LLM stub now supports comprehensive natural language to DSL translation with the following capabilities:

### Example Mappings

| NL Input                              | DSL JSON Representation |
|---------------------------------------|-------------------------|
| "pe less than 10"                     | `{ "filter": { "and": [{ "field": "pe_ratio", "operator": "<", "value": 10 }] } }` |
| "roe greater than 15"                 | `{ "filter": { "and": [{ "field": "roe", "operator": ">", "value": 15 }] } }` |
| "net income > 1000"                   | `{ "filter": { "and": [{ "field": "net_income", "operator": ">", "value": 1000 }] } }` |
| "PE < 20 and ROE > 15"                | `{ "filter": { "and": [{ "field": "pe_ratio", "operator": "<", "value": 20 }, { "field": "roe", "operator": ">", "value": 15 }] } }` |
| "PE < 10 or ROE > 20"                 | `{ "filter": { "or": [{ "field": "pe_ratio", "operator": "<", "value": 10 }, { "field": "roe", "operator": ">", "value": 20 }] } }` |
| "ROE > 15 in last 4 quarters"         | `{ "filter": { "and": [{ "field": "roe", "operator": ">", "value": 15, "timeframe": { "type": "quarters", "period": 4, "aggregation": "latest" } }] } }` |
| "revenue > 1000000"                   | `{ "filter": { "and": [{ "field": "revenue", "operator": ">", "value": 1000000 }] } }` |
| "debt to equity < 2"                  | `{ "filter": { "and": [{ "field": "debt_to_equity", "operator": "<", "value": 2 }] } }` |
| "market cap > 1000000000"             | `{ "filter": { "and": [{ "field": "market_cap", "operator": ">", "value": 1000000000 }] } }` |
| "eps > 10"                            | `{ "filter": { "and": [{ "field": "eps", "operator": ">", "value": 10 }] } }` |
| "PE != 15"                            | `{ "filter": { "and": [{ "field": "pe_ratio", "operator": "!=", "value": 15 }] } }` |

## Field Mappings (from fundamentals_quarterly table)

| Natural Language Term      | DSL Field Name     |
|---------------------------|--------------------|
| PE, pe ratio, p/e         | `pe_ratio`         |
| ROE, roe                  | `roe`              |
| ROA, roa                  | `roa`              |
| PB, pb ratio, p/b         | `pb_ratio`         |
| Revenue                   | `revenue`          |
| Net Income, Net Profit    | `net_income`       |
| EPS, eps                  | `eps`              |
| Operating Margin          | `operating_margin` |
| Debt to Equity            | `debt_to_equity`   |
| Market Cap                | `market_cap`       |
| Short Term Debt           | `short_term_debt`  |
| Long Term Debt            | `long_term_debt`   |
| CapEx                     | `capex`            |
| CFO, Operating Cash Flow  | `cfo`              |

## Operator Mappings

| Natural Language          | DSL Operator |
|--------------------------|-------------|
| less than, <             | `<`         |
| greater than, >          | `>`         |
| less than or equal to, <= | `<=`       |
| greater than or equal to, >= | `>=`    |
| equal to, =              | `=`         |
| not equal to, !=, !==    | `!=`        |

## Logical Operators

| Natural Language | DSL Structure |
|-----------------|---------------|
| and             | `{ "and": [...] }` |
| or              | `{ "or": [...] }` |

## Time Constraints

| Natural Language Pattern              | DSL Timeframe Structure |
|--------------------------------------|------------------------|
| "in last N quarters"                 | `{ "type": "quarters", "period": N, "aggregation": "latest" }` |
| "in last N years"                    | `{ "type": "years", "period": N, "aggregation": "latest" }` |
| "in last N months"                   | `{ "type": "months", "period": N, "aggregation": "latest" }` |

## Complex Query Examples

### AND with OR
```
"PE < 20 and ROE > 15 or net income > 5000"
→ OR( AND(pe_ratio<20, roe>15), net_income>5000 )
```

### Time-based with AND
```
"ROE > 15 in last 4 quarters and PE < 20"
→ AND( roe>15 [last 4 quarters], pe_ratio<20 )
```

## Notes

- Queries are **case-insensitive**
- Pattern matching supports flexible syntax
- Unsupported query patterns return an empty filter object: `{ "filter": {} }`
- All 14 financial metrics from the database are supported
- Supports complex combinations of AND/OR logic
- Time constraints can be applied to any metric
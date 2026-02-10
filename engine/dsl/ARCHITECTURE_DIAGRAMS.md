# DSL Architecture Diagrams

## 1. Overall Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                                                                 │
│  "Find IT stocks with PE < 15 and consistent profit growth"     │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ Natural Language Query
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         LLM PARSER                              │
│                                                                 │
│  • Extracts entities (fields, operators, values)                │
│  • Maps to canonical field names                                │
│  • Builds logical structure                                     │
│  • Uses nl_to_dsl_mappings.md examples                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ DSL JSON
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DSL / JSON SCHEMA                          │
│                                                                 │
│  {                                                              │
│    "filter": {                                                  │
│      "and": [                                                   │
│        {"field": "pe_ratio", "operator": "<", "value": 15},     │
│        {"field": "net_profit", "operator": ">", "value": 0,     │
│         "period": {"type": "last_n_quarters", "n": 4}}          │
│      ]                                                          │
│    },                                                           │
│    "meta": {"sector": "IT"}                                     │
│  }                                                              │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ Validated DSL
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VALIDATION LAYER                           │
│                                                                 │
│  ✓ JSON Schema validation (schema.json)                        │
│  ✓ Field existence (field_catalog.json)                        │
│  ✓ Operator compatibility                                      │
│  ✓ Type checking                                               │
│  ✓ Security checks                                             │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ Valid DSL
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SQL COMPILER                               │
│                                                                 │
│  • Maps DSL fields to DB columns                                │
│  • Generates WHERE clauses                                      │
│  • Handles time-window logic                                    │
│  • Optimizes query structure                                    │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ SQL Query
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      POSTGRESQL                                 │
│                                                                 │
│  SELECT * FROM stocks s                                         │
│  JOIN fundamentals f ON s.symbol = f.symbol                     │
│  WHERE sector = 'IT'                                            │
│    AND pe_ratio < 15                                            │
│    AND (SELECT COUNT(*) FROM quarterly_data                     │
│         WHERE net_profit > 0 LIMIT 4) = 4                       │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ Result Set
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       USER INTERFACE                            │
│                                                                 │
│  Displaying 25 matching stocks...                               │
│  1. INFY - Infosys Ltd (PE: 14.2, ...)                          │
│  2. TCS - Tata Consultancy (PE: 13.8, ...)                      │
│  ...                                                            │
└─────────────────────────────────────────────────────────────────┘
```

## 2. DSL Structure Breakdown

```
DSL Query
│
├── filter (required)
│   │
│   ├── and (array of conditions/expressions)
│   │   ├── Condition 1
│   │   │   ├── field: "pe_ratio"
│   │   │   ├── operator: "<"
│   │   │   └── value: 15
│   │   │
│   │   ├── Condition 2 (with time window)
│   │   │   ├── field: "net_profit"
│   │   │   ├── operator: ">"
│   │   │   ├── value: 0
│   │   │   └── period
│   │   │       ├── type: "last_n_quarters"
│   │   │       ├── n: 4
│   │   │       └── aggregation: "all"
│   │   │
│   │   └── Nested Expression (OR)
│   │       └── or (array)
│   │           ├── Condition 3
│   │           └── Condition 4
│   │
│   ├── or (alternative to 'and')
│   │   └── [conditions...]
│   │
│   └── not (single condition)
│       └── condition
│
├── meta (optional)
│   ├── sector: "IT"
│   ├── exchange: "NSE"
│   ├── market_cap_category: "Large Cap"
│   └── market_cap_range: {min: 1000, max: 10000}
│
├── sort (optional)
│   ├── field: "dividend_yield"
│   └── order: "desc"
│
└── limit (optional)
    └── 100
```

## 3. Validation Flow

```
DSL Input
    │
    ▼
┌─────────────────────┐
│ JSON Schema Check   │  ← schema.json
│ • Valid JSON?       │
│ • Required fields?  │
│ • Type constraints? │
└──────┬──────────────┘
       │ ✓ Valid structure
       ▼
┌─────────────────────┐
│ Field Validation    │  ← field_catalog.json
│ • Field exists?     │
│ • Correct spelling? │
│ • Alias mapping     │
└──────┬──────────────┘
       │ ✓ Valid fields
       ▼
┌─────────────────────┐
│ Operator Check      │  ← validation_rules.md
│ • Valid operator?   │
│ • Compatible type?  │
│ • Operator-value?   │
└──────┬──────────────┘
       │ ✓ Valid operators
       ▼
┌─────────────────────┐
│ Type Validation     │
│ • Number vs string? │
│ • Range checks      │
│ • Array structure?  │
└──────┬──────────────┘
       │ ✓ Valid types
       ▼
┌─────────────────────┐
│ Business Rules      │
│ • Period on TS?     │
│ • Logical nesting?  │
│ • Security checks?  │
└──────┬──────────────┘
       │ ✓ All rules pass
       ▼
  Ready for SQL
  Compilation
```

## 4. Field Categories

```
Financial Metrics (40+ fields)
│
├── Valuation
│   ├── pe_ratio
│   ├── peg_ratio
│   ├── price_to_book
│   ├── price_to_sales
│   └── ev_to_ebitda
│
├── Profitability
│   ├── net_profit
│   ├── ebitda
│   ├── roe
│   ├── roa
│   ├── operating_margin
│   └── net_margin
│
├── Growth
│   ├── revenue_growth_yoy
│   ├── earnings_growth_yoy
│   └── eps_growth
│
├── Balance Sheet
│   ├── total_debt
│   ├── free_cash_flow
│   ├── debt_to_equity
│   ├── debt_to_fcf
│   ├── current_ratio
│   └── quick_ratio
│
├── Ownership
│   ├── promoter_holding
│   └── institutional_holding
│
├── Market
│   ├── market_cap
│   ├── volume
│   ├── dividend_yield
│   ├── payout_ratio
│   ├── beta
│   └── price_change_from_52w_high
│
└── Fundamentals
    ├── revenue
    ├── gross_profit
    └── operating_profit
```

## 5. Operator Decision Tree

```
Choose Operator
    │
    ├─ Single Value?
    │   │
    │   ├─ Numeric?
    │   │   ├─ Less? → <
    │   │   ├─ Greater? → >
    │   │   ├─ Less/Equal? → <=
    │   │   ├─ Greater/Equal? → >=
    │   │   ├─ Equal? → =
    │   │   └─ Not Equal? → !=
    │   │
    │   └─ String?
    │       ├─ Equal? → =
    │       └─ Not Equal? → !=
    │
    ├─ Range? → between
    │   └─ value: [min, max]
    │
    ├─ Multiple Options? → in
    │   └─ value: [opt1, opt2, ...]
    │
    └─ Check Existence? → exists
        └─ value: true/false
```

## 6. Time-Window Aggregation

```
Time Period Query
    │
    ├─ ALL quarters/years must satisfy?
    │   └─ aggregation: "all"
    │       Example: "Profitable in ALL last 4 quarters"
    │
    ├─ ANY quarter/year satisfies?
    │   └─ aggregation: "any"
    │       Example: "At least one profitable quarter"
    │
    ├─ AVERAGE over period?
    │   └─ aggregation: "avg"
    │       Example: "Average ROE > 15 over 3 years"
    │
    ├─ SUM over period?
    │   └─ aggregation: "sum"
    │       Example: "Total FCF > 5000 over 2 years"
    │
    ├─ MINIMUM in period?
    │   └─ aggregation: "min"
    │       Example: "Minimum profit margin > 10%"
    │
    └─ MAXIMUM in period?
        └─ aggregation: "max"
        Example: "Maximum debt < 5000"
```

## 7. Security Layers

```
Input Query
    │
    ▼
┌─────────────────────────────┐
│ Field Whitelisting          │
│ Only catalog fields allowed │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ Operator Validation         │
│ Only 9 defined operators    │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ Value Type Checking         │
│ Strict type enforcement     │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ SQL Injection Detection     │
│ No SQL keywords in values   │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ Function Call Prevention    │
│ No eval/exec patterns       │
└──────┬──────────────────────┘
       │
       ▼
    Safe Query
```

## 8. Example Complexity Levels

```
Simple (Level 1)
├─ Single condition
└─ Example: PE < 15

Intermediate (Level 2)
├─ Multiple AND conditions
├─ OR conditions
├─ Time windows
└─ Example: PE < 15 AND ROE > 15 AND profit last 4 quarters

Advanced (Level 3)
├─ Nested logic (AND/OR/NOT)
├─ Multiple time windows
├─ Derived metrics
└─ Example: PE < 20 AND ((ROE > 15 for 5 years) OR (margins improving))

Expert (Level 4)
├─ Complex nested expressions
├─ Multiple metadata filters
├─ Custom sorting
└─ Example: Warren Buffett moat strategy with sector filters
```

## 9. Integration Points

```
┌──────────────────┐
│   Frontend UI    │
│                  │
│ • Query Builder  │
│ • DSL Display    │
│ • Validation UI  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   API Gateway    │
│                  │
│ • Rate Limiting  │
│ • Auth Check     │
│ • Logging        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐       ┌──────────────────┐
│  LLM Parser      │◄──────┤ nl_to_dsl_       │
│                  │       │ mappings.md      │
│ • NL → DSL       │       └──────────────────┘
└────────┬─────────┘
         │
         ▼
┌──────────────────┐       ┌──────────────────┐
│  Validator       │◄──────┤ schema.json      │
│                  │       │ field_catalog    │
│ • Schema Check   │       │ validation_rules │
└────────┬─────────┘       └──────────────────┘
         │
         ▼
┌──────────────────┐
│  Cache Layer     │
│                  │
│ • Query Cache    │
│ • Result Cache   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  SQL Compiler    │
│                  │
│ • DSL → SQL      │
│ • Optimization   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   PostgreSQL     │
│                  │
│ • Execute Query  │
│ • Return Results │
└──────────────────┘
```

## 10. Version Control & Evolution

```
DSL v1.0 (Current)
├─ 40+ fields
├─ 9 operators
├─ Time windows
└─ Metadata filters

DSL v1.1 (Future)
├─ Custom formulas
├─ Technical indicators
│   ├─ RSI
│   ├─ MACD
│   └─ Moving averages
└─ ML signals

DSL v2.0 (Future)
├─ Event filters
│   ├─ Earnings dates
│   └─ Corporate actions
├─ Peer comparison
└─ Portfolio context
```

---

## Legend

```
┌─────┐
│ Box │  Component/Process
└─────┘

   │
   ▼     Flow direction

   ◄──   Data/Reference

   ✓     Validation passed

   ←     Input
   →     Output
```

---

**Note:** These diagrams are text-based for portability. For presentation purposes, consider converting to tools like Mermaid, PlantUML, or Visio.

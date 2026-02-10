# Natural Language to DSL Mapping Examples

**Purpose:** Training data for LLM parser to convert natural language queries to DSL format.


## Simple Queries

### Example 1: Single Metric
**NL:** "PE less than 15"  
**DSL:**
```json
{
  "filter": {
    "and": [{"field": "pe_ratio", "operator": "<", "value": 15}]
  }
}
```

### Example 2: High ROE
**NL:** "ROE greater than 20%"  
**DSL:**
```json
{
  "filter": {
    "and": [{"field": "roe", "operator": ">", "value": 20}]
  }
}
```

---

## Compound Conditions

### Example 3: Value + Quality
**NL:** "PE < 15 AND ROE > 15"  
**DSL:**
```json
{
  "filter": {
    "and": [
      {"field": "pe_ratio", "operator": "<", "value": 15},
      {"field": "roe", "operator": ">", "value": 15}
    ]
  }
}
```

### Example 4: OR Logic
**NL:** "PE < 10 OR revenue growth > 30%"  
**DSL:**
```json
{
  "filter": {
    "or": [
      {"field": "pe_ratio", "operator": "<", "value": 10},
      {"field": "revenue_growth_yoy", "operator": ">", "value": 30}
    ]
  }
}
```

---

## Time-Based Queries

### Example 5: Consistent Profitability
**NL:** "Profitable in last 4 quarters"  
**DSL:**
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

### Example 6: Average ROE
**NL:** "Average ROE > 15% over last 3 years"  
**DSL:**
```json
{
  "filter": {
    "and": [
      {
        "field": "roe",
        "operator": ">",
        "value": 15,
        "period": {
          "type": "last_n_years",
          "n": 3,
          "aggregation": "avg"
        }
      }
    ]
  }
}
```

---

## Range & Set Operations

### Example 7: Range
**NL:** "PE between 10 and 20"  
**DSL:**
```json
{
  "filter": {
    "and": [
      {"field": "pe_ratio", "operator": "between", "value": [10, 20]}
    ]
  }
}
```

### Example 8: Multiple Sectors
**NL:** "Stocks in IT, Pharma, or Auto sectors"  
**DSL:**
```json
{
  "filter": {
    "and": [
      {"field": "sector", "operator": "in", "value": ["IT", "Pharma", "Auto"]}
    ]
  }
}
```

---

## Sector Filters

### Example 9: IT Sector
**NL:** "IT stocks with PE < 25"  
**DSL:**
```json
{
  "filter": {
    "and": [{"field": "pe_ratio", "operator": "<", "value": 25}]
  },
  "meta": {
    "sector": "IT"
  }
}
```

---

## Complex Strategies

### Example 10: GARP
**NL:** "PEG < 1 AND revenue growth > 20% AND ROE > 15%"  
**DSL:**
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

### Example 11: Nested Logic
**NL:** "PE < 20 AND (ROE > 15 OR margin > 10%)"  
**DSL:**
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
  }
}
```

---

## Common Variations

### Comparison Operators
| NL | Operator |
|----|----------|
| "less than", "below", "<" | `<` |
| "greater than", "above", ">" | `>` |
| "at least", ">=" | `>=` |
| "at most", "<=" | `<=` |

### Logical Connectors
| NL | Logic |
|----|-------|
| "and", "," | `and` |
| "or", "either...or" | `or` |
| "not", "exclude" | `not` |

### Time Periods
| NL | DSL |
|----|-----|
| "last 4 quarters" | `{"type": "last_n_quarters", "n": 4}` |
| "past 3 years" | `{"type": "last_n_years", "n": 3}` |

---

**Usage:** Feed these examples to LLM for training natural language parser.

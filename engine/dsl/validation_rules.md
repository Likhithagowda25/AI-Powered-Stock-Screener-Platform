# DSL Validation Rules

**Module:** Screener Engine – Rule Definition Layer  
**Project:** AI-Powered Mobile Stock Screener & Advisory Platform  
**Version:** 1.0.0  
**Date:** December 22, 2025

## Overview

This document specifies the complete validation rules for Stock Screener DSL queries. All DSL queries MUST pass these validation checks before execution.

---

## Table of Contents

1. [Validation Flow](#validation-flow)
2. [Structural Validation](#structural-validation)
3. [Field Validation](#field-validation)
4. [Operator Validation](#operator-validation)
5. [Value Type Validation](#value-type-validation)
6. [Period Validation](#period-validation)
7. [Metadata Validation](#metadata-validation)
8. [Logical Expression Validation](#logical-expression-validation)
9. [Security Validation](#security-validation)
10. [Example Validations](#example-validations)

---

## Validation Flow

```
DSL Query Input
      ↓
JSON Schema Validation
      ↓
Structural Validation
      ↓
Field Catalog Validation
      ↓
Type Checking
      ↓
Business Rules Validation
      ↓
Security Checks
      ↓
✅ Valid DSL / ❌ Rejected with Error
```

---

## Structural Validation

### Rule 1.1: Required Fields
**Description:** Top-level DSL must have required fields  
**Validation:**
- ✅ `filter` field MUST be present
- ❌ Empty DSL object is invalid

**Examples:**
```json
// ✅ Valid
{
  "filter": { "and": [...] }
}

// ❌ Invalid - missing filter
{
  "meta": { "sector": "IT" }
}

// ❌ Invalid - empty object
{}
```

### Rule 1.2: No Additional Properties
**Description:** Only defined properties are allowed  
**Validation:**
- ✅ Only `filter`, `meta`, `limit`, `sort` allowed at top level
- ❌ Unknown properties rejected

**Examples:**
```json
// ✅ Valid
{
  "filter": {...},
  "meta": {...},
  "limit": 100
}

// ❌ Invalid - unknown property
{
  "filter": {...},
  "custom_field": "value"
}
```

### Rule 1.3: Valid JSON
**Description:** Must be well-formed JSON  
**Validation:**
- ✅ Properly formatted JSON
- ❌ Syntax errors rejected

---

## Field Validation

### Rule 2.1: Field Existence
**Description:** All fields must exist in field catalog  
**Validation:**
- ✅ Field name matches catalog entry
- ❌ Unknown field names rejected

**Examples:**
```json
// ✅ Valid - field exists
{
  "field": "pe_ratio",
  "operator": "<",
  "value": 15
}

// ❌ Invalid - unknown field
{
  "field": "unknown_metric",
  "operator": "<",
  "value": 15
}

// ❌ Invalid - typo
{
  "field": "pe_ration",  // typo
  "operator": "<",
  "value": 15
}
```

### Rule 2.2: Field Aliases
**Description:** Field aliases are normalized to canonical names  
**Validation:**
- ✅ Aliases like `p/e`, `pe`, `price_earnings` → `pe_ratio`
- Parser should normalize before validation

**Aliases Mapping:**
- `p/e`, `pe`, `price_earnings` → `pe_ratio`
- `p/b`, `pb`, `price_book` → `price_to_book`
- `d/e`, `debt_equity` → `debt_to_equity`
- `fcf`, `free_cashflow` → `free_cash_flow`

### Rule 2.3: Case Sensitivity
**Description:** Field names are case-sensitive  
**Validation:**
- ✅ Exact match required: `pe_ratio`
- ❌ Wrong case rejected: `PE_RATIO`, `Pe_Ratio`

---

## Operator Validation

### Rule 3.1: Valid Operators
**Description:** Only defined operators allowed  
**Validation:**
- ✅ Valid: `<`, `>`, `<=`, `>=`, `=`, `!=`, `between`, `in`, `exists`
- ❌ Invalid: `contains`, `matches`, `like`, etc.

**Examples:**
```json
// ✅ Valid
{"field": "pe_ratio", "operator": "<", "value": 15}

// ❌ Invalid - SQL operator
{"field": "pe_ratio", "operator": "LIKE", "value": "%15%"}

// ❌ Invalid - custom operator
{"field": "sector", "operator": "contains", "value": "Tech"}
```

### Rule 3.2: Operator-Field Compatibility
**Description:** Operators must be appropriate for field type  

| Field Type | Allowed Operators |
|------------|-------------------|
| Numeric | `<`, `>`, `<=`, `>=`, `=`, `!=`, `between`, `exists` |
| String | `=`, `!=`, `in`, `exists` |
| Boolean | `=`, `!=` |

**Examples:**
```json
// ✅ Valid - numeric comparison
{"field": "pe_ratio", "operator": "<", "value": 15}

// ✅ Valid - string equality
{"field": "sector", "operator": "=", "value": "IT"}

// ❌ Invalid - can't use < on strings
{"field": "sector", "operator": "<", "value": "IT"}

// ❌ Invalid - can't use 'in' on numeric without array
{"field": "pe_ratio", "operator": "in", "value": 15}
```

### Rule 3.3: Operator-Value Compatibility
**Description:** Value type must match operator requirements  

| Operator | Required Value Type | Example |
|----------|---------------------|---------|
| `<`, `>`, `<=`, `>=`, `=`, `!=` | Single value | `15`, `"IT"` |
| `between` | Array of 2 numbers | `[10, 20]` |
| `in` | Array of values | `["IT", "Pharma"]` |
| `exists` | Boolean | `true`, `false` |

**Examples:**
```json
// ✅ Valid - between with 2-element array
{"field": "pe_ratio", "operator": "between", "value": [10, 20]}

// ❌ Invalid - between with single value
{"field": "pe_ratio", "operator": "between", "value": 15}

// ❌ Invalid - between with 3 elements
{"field": "pe_ratio", "operator": "between", "value": [10, 20, 30]}

// ✅ Valid - in with array
{"field": "sector", "operator": "in", "value": ["IT", "Pharma"]}

// ❌ Invalid - in with single value
{"field": "sector", "operator": "in", "value": "IT"}
```

---

## Value Type Validation

### Rule 4.1: Type Matching
**Description:** Value type must match field type  
**Validation:**
- Numeric fields require numeric values
- String fields require string values
- No implicit type conversion

**Examples:**
```json
// ✅ Valid - number for numeric field
{"field": "pe_ratio", "operator": "<", "value": 15}

// ❌ Invalid - string for numeric field
{"field": "pe_ratio", "operator": "<", "value": "15"}
{"field": "pe_ratio", "operator": "<", "value": "fifteen"}

// ✅ Valid - string for string field
{"field": "sector", "operator": "=", "value": "IT"}

// ❌ Invalid - number for string field
{"field": "sector", "operator": "=", "value": 123}
```

### Rule 4.2: Range Validation
**Description:** Numeric values must be within acceptable ranges  
**Validation:**
- Check against `min_value` and `max_value` in field catalog
- Percentage fields: typically -100 to 100 (or 0 to 100)
- Ratio fields: typically 0 to reasonable upper bound

**Examples:**
```json
// ✅ Valid - PE in reasonable range
{"field": "pe_ratio", "operator": "<", "value": 50}

// ⚠️ Warning - PE value seems unrealistic
{"field": "pe_ratio", "operator": "<", "value": 10000}

// ✅ Valid - percentage in range
{"field": "roe", "operator": ">", "value": 15}

// ❌ Invalid - percentage out of range
{"field": "roe", "operator": ">", "value": 500}
```

### Rule 4.3: Null/Undefined Handling
**Description:** Explicit handling for missing values  
**Validation:**
- Use `exists` operator for null checks
- Don't allow `null` or `undefined` as comparison values

**Examples:**
```json
// ✅ Valid - check for existence
{"field": "dividend_yield", "operator": "exists", "value": true}

// ✅ Valid - check for non-existence
{"field": "dividend_yield", "operator": "exists", "value": false}

// ❌ Invalid - null as value
{"field": "dividend_yield", "operator": ">", "value": null}
```

---

## Period Validation

### Rule 5.1: Period Only on Time-Series Fields
**Description:** Time-window logic only applies to time-series metrics  
**Validation:**
- ✅ Period allowed if `time_series: true` in field catalog
- ❌ Period rejected on non-time-series fields

**Examples:**
```json
// ✅ Valid - time-series field
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

// ❌ Invalid - sector is not time-series
{
  "field": "sector",
  "operator": "=",
  "value": "IT",
  "period": {
    "type": "last_n_quarters",
    "n": 4
  }
}
```

### Rule 5.2: Valid Period Types
**Description:** Period type must be supported  
**Validation:**
- ✅ Valid: `last_n_quarters`, `last_n_years`, `trailing_12_months`
- ❌ Invalid: custom period types

**Examples:**
```json
// ✅ Valid
{"type": "last_n_quarters", "n": 4, "aggregation": "all"}

// ✅ Valid
{"type": "last_n_years", "n": 3, "aggregation": "avg"}

// ❌ Invalid - unknown type
{"type": "last_n_months", "n": 6, "aggregation": "all"}
```

### Rule 5.3: Valid Aggregation Types
**Description:** Aggregation must be supported  
**Validation:**
- ✅ Valid: `all`, `any`, `avg`, `sum`, `min`, `max`
- ❌ Invalid: custom aggregations

### Rule 5.4: Period Range Validation
**Description:** `n` parameter must be reasonable  
**Validation:**
- ✅ `n` must be between 1 and 20
- ❌ Negative or zero values rejected
- ❌ Excessively large values rejected

**Examples:**
```json
// ✅ Valid
{"type": "last_n_quarters", "n": 4, "aggregation": "all"}

// ❌ Invalid - n = 0
{"type": "last_n_quarters", "n": 0, "aggregation": "all"}

// ❌ Invalid - n too large
{"type": "last_n_quarters", "n": 100, "aggregation": "all"}
```

### Rule 5.5: Aggregation-Operator Compatibility
**Description:** Some aggregations may conflict with certain operators  
**Validation:**
- `all`/`any` work with boolean-like comparisons
- `avg`/`sum`/`min`/`max` work with numeric comparisons

---

## Metadata Validation

### Rule 6.1: Valid Metadata Fields
**Description:** Only defined metadata fields allowed  
**Validation:**
- ✅ Valid: `sector`, `exchange`, `market_cap_category`, `index`, `market_cap_range`
- ❌ Invalid: unknown metadata fields

**Examples:**
```json
// ✅ Valid
{
  "meta": {
    "sector": "IT",
    "exchange": "NSE"
  }
}

// ❌ Invalid - unknown field
{
  "meta": {
    "industry": "Software"
  }
}
```

### Rule 6.2: Metadata Value Validation
**Description:** Metadata values must be from allowed lists  
**Validation:**
- Check against `allowed_values` in field catalog
- Case-sensitive matching

**Examples:**
```json
// ✅ Valid - recognized sector
{"meta": {"sector": "IT"}}

// ❌ Invalid - unrecognized sector
{"meta": {"sector": "Technology"}}

// ✅ Valid - recognized exchange
{"meta": {"exchange": "NSE"}}

// ❌ Invalid - case mismatch
{"meta": {"exchange": "nse"}}
```

### Rule 6.3: Market Cap Range
**Description:** Market cap range must have valid structure  
**Validation:**
- `min` must be less than `max`
- Both must be non-negative
- Optional: both min and max can be omitted

**Examples:**
```json
// ✅ Valid
{
  "meta": {
    "market_cap_range": {
      "min": 1000,
      "max": 10000
    }
  }
}

// ❌ Invalid - min > max
{
  "meta": {
    "market_cap_range": {
      "min": 10000,
      "max": 1000
    }
  }
}

// ❌ Invalid - negative values
{
  "meta": {
    "market_cap_range": {
      "min": -100,
      "max": 1000
    }
  }
}
```

---

## Logical Expression Validation

### Rule 7.1: Single Logical Operator
**Description:** Only one logical operator per expression level  
**Validation:**
- ✅ One of: `and`, `or`, `not`
- ❌ Multiple operators at same level

**Examples:**
```json
// ✅ Valid - single AND
{
  "filter": {
    "and": [...]
  }
}

// ❌ Invalid - both AND and OR
{
  "filter": {
    "and": [...],
    "or": [...]
  }
}
```

### Rule 7.2: Non-Empty Logic Arrays
**Description:** AND/OR arrays must contain at least one condition  
**Validation:**
- ✅ `and`/`or` must have at least 1 element
- ❌ Empty arrays rejected

**Examples:**
```json
// ✅ Valid
{
  "filter": {
    "and": [
      {"field": "pe_ratio", "operator": "<", "value": 15}
    ]
  }
}

// ❌ Invalid - empty array
{
  "filter": {
    "and": []
  }
}
```

### Rule 7.3: NOT Operator
**Description:** NOT takes exactly one condition/expression  
**Validation:**
- ✅ `not` contains single condition or expression
- ❌ Array or multiple conditions rejected

**Examples:**
```json
// ✅ Valid
{
  "filter": {
    "not": {
      "field": "sector",
      "operator": "=",
      "value": "Finance"
    }
  }
}

// ❌ Invalid - NOT with array
{
  "filter": {
    "not": [
      {"field": "sector", "operator": "=", "value": "Finance"}
    ]
  }
}
```

### Rule 7.4: Nested Expression Depth
**Description:** Limit nesting depth to prevent complexity  
**Validation:**
- ✅ Maximum nesting depth: 5 levels
- ❌ Deeper nesting rejected

**Examples:**
```json
// ✅ Valid - 2 levels
{
  "filter": {
    "and": [
      {"field": "pe_ratio", "operator": "<", "value": 15},
      {
        "or": [
          {"field": "roe", "operator": ">", "value": 15},
          {"field": "roa", "operator": ">", "value": 10}
        ]
      }
    ]
  }
}

// ❌ Invalid - too deep (> 5 levels)
// ... excessively nested structure ...
```

---

## Security Validation

### Rule 8.1: No SQL Injection
**Description:** No raw SQL or dangerous strings  
**Validation:**
- ✅ Only whitelisted fields and operators
- ❌ SQL keywords in values flagged
- ❌ Semicolons, UNION, DROP, etc. rejected

**Examples:**
```json
// ✅ Valid
{"field": "pe_ratio", "operator": "<", "value": 15}

// ❌ Invalid - SQL injection attempt
{"field": "pe_ratio", "operator": "<", "value": "15; DROP TABLE stocks;"}

// ❌ Invalid - SQL keyword
{"field": "sector", "operator": "=", "value": "IT' OR '1'='1"}
```

### Rule 8.2: No Function Calls
**Description:** No arbitrary function execution  
**Validation:**
- ❌ Function-like syntax rejected
- ❌ No eval, exec, or similar constructs

**Examples:**
```json
// ❌ Invalid - function call attempt
{"field": "pe_ratio", "operator": "=", "value": "eval(15)"}
{"field": "sector", "operator": "=", "value": "system('ls')"}
```

### Rule 8.3: Field Whitelisting
**Description:** Only catalog fields allowed  
**Validation:**
- ✅ Field must be in field_catalog.json
- ❌ Database column names not in catalog rejected
- ❌ Special characters in field names rejected

### Rule 8.4: Value Sanitization
**Description:** Values are properly escaped  
**Validation:**
- String values are escaped for SQL
- Special characters handled safely
- Binary data rejected

---

## Sort and Limit Validation

### Rule 9.1: Valid Sort Fields
**Description:** Can only sort by allowed fields  
**Validation:**
- ✅ Sort field must be in catalog
- ✅ Sort field should be numeric for meaningful ordering

**Examples:**
```json
// ✅ Valid
{
  "sort": {
    "field": "pe_ratio",
    "order": "asc"
  }
}

// ❌ Invalid - unknown field
{
  "sort": {
    "field": "unknown_metric",
    "order": "asc"
  }
}
```

### Rule 9.2: Valid Sort Order
**Description:** Sort order must be asc or desc  
**Validation:**
- ✅ Valid: `asc`, `desc`
- ❌ Invalid: anything else

### Rule 9.3: Limit Range
**Description:** Limit must be reasonable  
**Validation:**
- ✅ Limit between 1 and 1000
- ❌ Negative or zero rejected
- ❌ Values > 1000 rejected

**Examples:**
```json
// ✅ Valid
{"limit": 100}

// ❌ Invalid - too large
{"limit": 10000}

// ❌ Invalid - negative
{"limit": -10}
```

---

## Derived Metrics Validation

### Rule 10.1: Derived Field Documentation
**Description:** Derived fields should document source fields  
**Validation:**
- `derived_from` should list source fields
- Source fields should exist in catalog
- This is primarily for documentation

**Examples:**
```json
// ✅ Valid - documented derivation
{
  "field": "peg_ratio",
  "operator": "<",
  "value": 1,
  "derived_from": ["pe_ratio", "eps_growth"]
}

// ⚠️ Warning - missing derivation info (acceptable)
{
  "field": "peg_ratio",
  "operator": "<",
  "value": 1
}
```

---

## Complete Validation Examples

### Example 1: Valid Complex Query
```json
{
  "filter": {
    "and": [
      {
        "field": "pe_ratio",
        "operator": "between",
        "value": [10, 20]
      },
      {
        "or": [
          {"field": "roe", "operator": ">", "value": 15},
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
      },
      {
        "not": {
          "field": "sector",
          "operator": "=",
          "value": "Finance"
        }
      }
    ]
  },
  "meta": {
    "exchange": "NSE",
    "market_cap_category": "Large Cap"
  },
  "sort": {
    "field": "dividend_yield",
    "order": "desc"
  },
  "limit": 50
}
```

✅ **Passes All Validations**

### Example 2: Invalid - Multiple Errors
```json
{
  "filter": {
    "and": [
      {
        "field": "unknown_field",  // ❌ Field doesn't exist
        "operator": "<",
        "value": 15
      },
      {
        "field": "pe_ratio",
        "operator": "LIKE",  // ❌ Invalid operator
        "value": "%15%"
      },
      {
        "field": "sector",
        "operator": "<",  // ❌ Can't use < on strings
        "value": "IT"
      }
    ],
    "or": [  // ❌ Multiple logical operators
      {"field": "roe", "operator": ">", "value": 15}
    ]
  },
  "meta": {
    "unknown_meta": "value"  // ❌ Unknown metadata field
  },
  "limit": 10000  // ❌ Limit too large
}
```

❌ **Fails Multiple Validations**

---

## Error Response Format

When validation fails, return structured error:

```json
{
  "valid": false,
  "errors": [
    {
      "path": "filter.and[0].field",
      "rule": "FIELD_NOT_FOUND",
      "message": "Field 'unknown_field' does not exist in catalog",
      "suggestion": "Did you mean 'pe_ratio'?"
    },
    {
      "path": "filter.and[1].operator",
      "rule": "INVALID_OPERATOR",
      "message": "Operator 'LIKE' is not supported",
      "allowed": ["<", ">", "<=", ">=", "=", "!=", "between", "in", "exists"]
    }
  ]
}
```

---

## Validation Implementation Checklist

Backend implementation should validate:

- [ ] JSON Schema conformance
- [ ] Field existence in catalog
- [ ] Operator validity and compatibility
- [ ] Value type matching
- [ ] Period specifications
- [ ] Metadata values
- [ ] Logical expression structure
- [ ] SQL injection patterns
- [ ] Nesting depth limits
- [ ] Sort field validity
- [ ] Limit ranges

---

## Related Documents

- [DSL_SPECIFICATION.md](./DSL_SPECIFICATION.md) - Main DSL spec
- [schema.json](./schema.json) - JSON Schema definition
- [field_catalog.json](./field_catalog.json) - Field definitions

---

**Version History**
- v1.0.0 (2025-12-22) - Initial validation rules

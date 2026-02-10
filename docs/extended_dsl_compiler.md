# Extended DSL Compiler Documentation

**Module:** Extended DSL Compiler, Derived Metrics & Backend Validation Engine  
**Project:** AI-Powered Mobile Stock Screener & Advisory Platform  
**Version:** 2.0.0  
**Date:** January 2, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Enhanced Features](#enhanced-features)
4. [Temporal Conditions](#temporal-conditions)
5. [Derived Metrics](#derived-metrics)
6. [Backend Validation](#backend-validation)
7. [Null Handling](#null-handling)
8. [Usage Guide](#usage-guide)
9. [API Reference](#api-reference)
10. [Examples](#examples)

---

## Overview

The Extended DSL Compiler enhances the Stock Screener platform with production-grade capabilities:

### Key Enhancements

✅ **Temporal Conditions** - Time-windowed queries (last N quarters/years)  
✅ **Derived Metrics** - PEG ratio, Debt-to-FCF, CAGR, consistency scores  
✅ **Backend Validation** - Pre-execution safety and consistency checks  
✅ **Range Filters** - BETWEEN, IN, NOT IN operators  
✅ **Null Handling** - Configurable strategies for missing data  
✅ **Trend Analysis** - Increasing/decreasing/stable trend detection  
✅ **Advanced Logic** - Nested AND/OR/NOT expressions

---

## Architecture

```
┌─────────────────┐
│   DSL Query     │
│   (JSON)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Validation    │ ◄── Validation Engine
│   Engine        │     - Rule validity
└────────┬────────┘     - Logical conflicts
         │              - Safety checks
         ▼
┌─────────────────┐
│   Enhanced      │
│   Compiler      │ ◄── Derived Metrics Engine
└────────┬────────┘     - PEG, CAGR, etc.
         │
         ▼
┌─────────────────┐
│   SQL Query     │
│   + Params      │
└─────────────────┘
```

### Component Responsibilities

| Component | File | Purpose |
|-----------|------|---------|
| **Validation Engine** | `validation_engine.py` | Pre-execution validation |
| **Derived Metrics** | `derived_metrics.py` | Safe metric computation |
| **Enhanced Compiler** | `enhanced_compiler.py` | DSL → SQL translation |
| **Field Mapper** | `field_mapper.py` | Field name mappings |
| **Operators** | `operators.py` | Operator definitions |

---

## Enhanced Features

### 1. Temporal Conditions

Query historical data across multiple periods:

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

**Period Types:**
- `last_n_quarters` - Last N quarters
- `last_n_years` - Last N years
- `trailing_12_months` - TTM
- `quarter_over_quarter` - QoQ comparison
- `year_over_year` - YoY comparison

**Aggregation Methods:**
- `all` - All periods must satisfy condition
- `any` - At least one period satisfies
- `avg` - Average over periods
- `sum` - Sum over periods
- `min` - Minimum over periods
- `max` - Maximum over periods
- `trend` - Trend analysis

### 2. Derived Metrics

**Available Metrics:**

| Metric | Formula | Safety Checks |
|--------|---------|---------------|
| `peg_ratio` | PE ÷ EPS Growth | Growth > 0.01% |
| `debt_to_fcf` | Debt ÷ FCF | FCF > 0 |
| `eps_cagr` | EPS CAGR | Beginning > 0 |
| `revenue_cagr` | Revenue CAGR | Beginning > 0 |
| `fcf_margin` | (FCF ÷ Revenue) × 100 | Revenue > 0 |
| `earnings_consistency_score` | 1 - CV | Min 4 periods |

**Example:**
```json
{
  "field": "peg_ratio",
  "operator": "<",
  "value": 1.0
}
```

### 3. Range Operators

**BETWEEN Operator:**
```json
{
  "field": "pe_ratio",
  "operator": "between",
  "value": [10, 20]
}
```

**IN Operator:**
```json
{
  "field": "sector",
  "operator": "in",
  "value": ["IT", "Pharma", "Finance"]
}
```

**NOT IN Operator:**
```json
{
  "field": "sector",
  "operator": "not_in",
  "value": ["Real Estate", "Construction"]
}
```

### 4. Trend Operators

Detect trends in time-series data:

```json
{
  "field": "revenue",
  "operator": "increasing",
  "period": {
    "type": "last_n_quarters",
    "n": 6,
    "aggregation": "trend"
  },
  "trend_config": {
    "direction": "increasing",
    "min_periods": 6,
    "consecutive": true,
    "tolerance": 5
  }
}
```

**Trend Directions:**
- `increasing` - Upward trend
- `decreasing` - Downward trend
- `stable` - Flat trend (within tolerance)

### 5. Null Handling

Configure how missing data is handled:

```json
{
  "field": "pe_ratio",
  "operator": "<",
  "value": 15,
  "null_handling": {
    "strategy": "exclude"
  }
}
```

**Strategies:**
- `exclude` - Exclude rows with null values (default)
- `fail` - Null values fail condition
- `use_default` - Use default value
- `use_latest` - Use latest available value
- `interpolate` - Interpolate missing values

**Example with Default:**
```json
{
  "null_handling": {
    "strategy": "use_default",
    "default_value": 15
  }
}
```

---

## Backend Validation

### Validation Checks

The validation engine performs comprehensive checks before query execution:

#### 1. Rule Validity
- Required fields present
- Valid operators
- Correct value types
- No unknown fields

#### 2. Logical Conflicts
- Unsatisfiable conditions (PE > 50 AND PE < 5)
- Invalid ranges (BETWEEN [20, 10])
- Contradictory constraints

#### 3. Ambiguity Detection
- Missing time windows
- Undefined aggregation
- Ambiguous trend direction

#### 4. Metric Safety
- Divide-by-zero prevention
- Invalid denominators
- Range sanity checks

#### 5. Data Availability
- Required periods exist
- Sufficient historical data
- Field supports time-series

### Validation Result

```python
from compiler.validation_engine import validate_dsl_query

result = validate_dsl_query(dsl_query)

if not result.is_valid:
    for error in result.get_errors():
        print(f"ERROR: {error.message}")
        print(f"  Field: {error.field}")
        print(f"  Suggestion: {error.suggestion}")
```

### Error Types

| Type | Severity | Blocks Execution |
|------|----------|------------------|
| `RULE_VALIDITY` | ERROR | Yes |
| `LOGICAL_CONFLICT` | ERROR | Yes |
| `AMBIGUITY` | WARNING | No |
| `METRIC_SAFETY` | INFO | No |
| `DATA_AVAILABILITY` | WARNING | No |

---

## Usage Guide

### Basic Workflow

```python
from compiler.enhanced_compiler import ExtendedDSLCompiler
from compiler.validation_engine import validate_dsl_query

# 1. Define DSL query
dsl_query = {
    "filter": {
        "and": [
            {"field": "pe_ratio", "operator": "<", "value": 15},
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
    "limit": 50
}

# 2. Validate (optional but recommended)
validation_result = validate_dsl_query(dsl_query)

if not validation_result.is_valid:
    print("Validation errors:")
    for error in validation_result.get_errors():
        print(f"  - {error.message}")
    exit(1)

# 3. Compile to SQL
compiler = ExtendedDSLCompiler(validate_before_compile=True)
sql, params, metadata = compiler.compile(dsl_query)

print(f"SQL: {sql}")
print(f"Params: {params}")
print(f"Uses time-series: {metadata['uses_time_series']}")
print(f"Uses derived metrics: {metadata['uses_derived_metrics']}")

# 4. Execute query (with your database connection)
# cursor.execute(sql, params)
# results = cursor.fetchall()
```

### Computing Derived Metrics

```python
from compiler.derived_metrics import get_derived_metrics_engine

engine = get_derived_metrics_engine()

# Compute PEG ratio
peg = engine.compute_peg_ratio(pe_ratio=20.0, eps_growth=15.0)
if peg is not None:
    print(f"PEG Ratio: {peg:.2f}")
else:
    print("Cannot compute PEG - unsafe inputs")

# Validate before computation
is_safe, error = engine.validate_computation_safety(
    "peg_ratio",
    {"pe_ratio": 20.0, "eps_growth": 0.0}
)
if not is_safe:
    print(f"Safety check failed: {error}")
```

---

## API Reference

### ValidationEngine

```python
class ValidationEngine:
    def validate(self, dsl_query: Dict) -> ValidationResult
```

**Returns:**
- `ValidationResult` with `is_valid`, `issues`, `warnings`, `metadata`

### DerivedMetricsEngine

```python
class DerivedMetricsEngine:
    def compute_peg_ratio(self, pe_ratio: float, eps_growth: float) -> Optional[float]
    def compute_debt_to_fcf(self, total_debt: float, free_cash_flow: float) -> Optional[float]
    def compute_cagr(self, beginning_value: float, ending_value: float, periods: int) -> Optional[float]
    def compute_fcf_margin(self, free_cash_flow: float, revenue: float) -> Optional[float]
    def compute_earnings_consistency_score(self, earnings_history: List[float]) -> Optional[float]
    def validate_computation_safety(self, metric_name: str, data: Dict) -> Tuple[bool, Optional[str]]
```

### ExtendedDSLCompiler

```python
class ExtendedDSLCompiler:
    def __init__(self, validate_before_compile: bool = True)
    def compile(self, dsl_query: Dict) -> Tuple[str, Dict, Dict]
```

**Returns:**
- `(sql_query, parameters, metadata)`

---

## Examples

### Example 1: Quality Stocks with Consistent Earnings

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
        "field": "net_profit",
        "operator": ">",
        "value": 0,
        "period": {
          "type": "last_n_quarters",
          "n": 4,
          "aggregation": "all"
        }
      },
      {
        "field": "roe",
        "operator": ">",
        "value": 15
      }
    ]
  },
  "meta": {
    "sector": "IT"
  },
  "sort": {
    "field": "pe_ratio",
    "order": "asc"
  },
  "limit": 30
}
```

### Example 2: Undervalued Growth Stocks (PEG < 1)

```json
{
  "filter": {
    "and": [
      {
        "field": "peg_ratio",
        "operator": "<",
        "value": 1.0
      },
      {
        "field": "eps_growth",
        "operator": ">",
        "value": 15
      },
      {
        "field": "pe_ratio",
        "operator": "between",
        "value": [5, 25]
      }
    ]
  },
  "sort": {
    "field": "peg_ratio",
    "order": "asc"
  },
  "limit": 20
}
```

### Example 3: Low Debt with Strong Cash Flow

```json
{
  "filter": {
    "and": [
      {
        "field": "debt_to_fcf",
        "operator": "<",
        "value": 3
      },
      {
        "field": "fcf_margin",
        "operator": ">",
        "value": 10
      },
      {
        "field": "free_cash_flow",
        "operator": ">",
        "value": 0,
        "period": {
          "type": "last_n_quarters",
          "n": 8,
          "aggregation": "all"
        }
      }
    ]
  }
}
```

### Example 4: Increasing Revenue Trend

```json
{
  "filter": {
    "and": [
      {
        "field": "revenue",
        "operator": "increasing",
        "period": {
          "type": "last_n_years",
          "n": 3,
          "aggregation": "trend"
        },
        "trend_config": {
          "direction": "increasing",
          "min_periods": 3,
          "consecutive": true
        }
      },
      {
        "field": "revenue_growth_yoy",
        "operator": ">",
        "value": 20
      }
    ]
  }
}
```

### Example 5: Complex Nested Logic with Null Handling

```json
{
  "filter": {
    "and": [
      {
        "or": [
          {
            "field": "roe",
            "operator": ">",
            "value": 18,
            "null_handling": {
              "strategy": "exclude"
            }
          },
          {
            "field": "net_profit",
            "operator": ">",
            "value": 1000
          }
        ]
      },
      {
        "not": {
          "field": "debt_to_equity",
          "operator": ">",
          "value": 2
        }
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

## Testing

### Run All Tests

```bash
cd backend/services/screener_engine
python -m pytest tests/test_extended_compiler.py -v
```

### Run Specific Test Category

```bash
# Validation tests
python -m pytest tests/test_extended_compiler.py::TestValidationEngine -v

# Derived metrics tests
python -m pytest tests/test_extended_compiler.py::TestDerivedMetrics -v

# Compiler tests
python -m pytest tests/test_extended_compiler.py::TestEnhancedCompiler -v

# Integration tests
python -m pytest tests/test_extended_compiler.py::TestIntegration -v
```

---

## Safety Guarantees

### ✅ Divide-by-Zero Prevention

All derived metrics check for zero denominators:
- PEG ratio: Requires EPS growth > 0.01%
- Debt-to-FCF: Requires FCF > 0
- FCF margin: Requires revenue > 0
- CAGR: Requires beginning value > 0

### ✅ Unsatisfiable Rule Detection

Validation engine detects:
- Conflicting ranges (PE > 50 AND PE < 10)
- Invalid BETWEEN ranges
- Impossible constraints

### ✅ Data Availability Checks

- Validates time-series field support
- Checks period data exists
- Warns on excessive historical requirements

### ✅ Type Safety

- Validates operator-value compatibility
- Enforces schema constraints
- Checks field existence

---

## Performance Considerations

### SQL vs Python Computation

| Metric | Computed In | Reason |
|--------|-------------|--------|
| `peg_ratio` | SQL | Simple division |
| `debt_to_fcf` | SQL | Simple division |
| `fcf_margin` | SQL | Simple calculation |
| `eps_cagr` | Python | Complex time-series |
| `revenue_cagr` | Python | Complex time-series |
| `earnings_consistency_score` | Python | Statistical computation |

### Optimization Tips

1. **Limit period ranges** - Avoid requesting > 12 periods
2. **Use indexes** - Ensure database indexes on common fields
3. **Cache derived metrics** - Pre-compute where possible
4. **Batch queries** - Group related screens

---

## Error Handling

### Validation Errors

```python
try:
    compiler = ExtendedDSLCompiler(validate_before_compile=True)
    sql, params, metadata = compiler.compile(invalid_query)
except CompilerError as e:
    print(f"Compilation failed: {e}")
    # Handle error - show to user, log, etc.
```

### Derived Metric Errors

```python
from compiler.derived_metrics import DerivedMetricError

try:
    engine.compute_metric("unknown_metric", data)
except DerivedMetricError as e:
    print(f"Metric error: {e}")
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Dec 2025 | Initial DSL implementation |
| 2.0.0 | Jan 2026 | Extended compiler with validation, derived metrics, temporal conditions |

---

## Next Steps

1. ✅ Integrate with LLM query parser
2. ✅ Add database indexes for time-series queries
3. ✅ Implement metric caching layer
4. ⏳ Add more derived metrics (Altman Z-score, Piotroski F-score)
5. ⏳ Optimize SQL query generation
6. ⏳ Add query cost estimation

---

## Support

For questions or issues:
- Review examples in `engine/dsl/examples/`
- Check test cases in `backend/services/screener_engine/tests/`
- See DSL specification: `engine/dsl/DSL_SPECIFICATION.md`

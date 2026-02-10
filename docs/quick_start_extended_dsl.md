# Extended DSL Compiler - Quick Start Guide

**Version:** 2.0.0  
**Last Updated:** January 2, 2026

---

## 🚀 Quick Start (5 Minutes)

### Installation

```bash
cd backend/services/screener_engine
```

### Your First Enhanced Query

```python
from compiler.enhanced_compiler import ExtendedDSLCompiler
from compiler.validation_engine import validate_dsl_query

# Define a query: "Find value stocks with consistent earnings"
dsl_query = {
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
            }
        ]
    },
    "meta": {
        "sector": "IT"
    },
    "limit": 25
}

# Validate
result = validate_dsl_query(dsl_query)
if result.is_valid:
    print("✅ Query is valid!")
else:
    for error in result.get_errors():
        print(f"❌ {error.message}")

# Compile
compiler = ExtendedDSLCompiler()
sql, params, metadata = compiler.compile(dsl_query)

print(f"\nGenerated SQL:\n{sql}")
print(f"\nParameters: {params}")
```

**Output:**
```
✅ Query is valid!

Generated SQL:
SELECT DISTINCT c.symbol, c.name, c.sector, ...
FROM companies c
LEFT JOIN fundamentals_quarterly fq ON c.symbol = fq.symbol
WHERE (pe_ratio BETWEEN %(p0)s AND %(p1)s) AND ...
...

Parameters: {'p0': 10, 'p1': 20, ...}
```

---

## 📚 Common Patterns

### Pattern 1: Time-Window Queries

**"Positive earnings for last 4 quarters"**

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

### Pattern 2: Derived Metrics

**"PEG ratio less than 1"**

```json
{
  "field": "peg_ratio",
  "operator": "<",
  "value": 1.0
}
```

### Pattern 3: Range Filters

**"PE between 10 and 20"**

```json
{
  "field": "pe_ratio",
  "operator": "between",
  "value": [10, 20]
}
```

### Pattern 4: Trend Analysis

**"Increasing revenue for 3 consecutive years"**

```json
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
}
```

### Pattern 5: Null Handling

**"PE < 15, excluding nulls"**

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

---

## 🎯 Use Cases

### Use Case 1: Value Investing

```python
value_stocks_query = {
    "filter": {
        "and": [
            {"field": "pe_ratio", "operator": "between", "value": [5, 15]},
            {"field": "price_to_book", "operator": "<", "value": 1.5},
            {"field": "roe", "operator": ">", "value": 15}
        ]
    },
    "sort": {"field": "pe_ratio", "order": "asc"},
    "limit": 30
}
```

### Use Case 2: Growth Stocks

```python
growth_stocks_query = {
    "filter": {
        "and": [
            {"field": "peg_ratio", "operator": "<", "value": 1.5},
            {"field": "eps_growth", "operator": ">", "value": 20},
            {
                "field": "revenue",
                "operator": "increasing",
                "period": {"type": "last_n_years", "n": 3, "aggregation": "trend"},
                "trend_config": {"direction": "increasing", "min_periods": 3}
            }
        ]
    }
}
```

### Use Case 3: Quality Stocks

```python
quality_stocks_query = {
    "filter": {
        "and": [
            {"field": "roe", "operator": ">", "value": 18},
            {"field": "debt_to_equity", "operator": "<", "value": 0.5},
            {
                "field": "net_profit",
                "operator": ">",
                "value": 0,
                "period": {"type": "last_n_quarters", "n": 8, "aggregation": "all"}
            },
            {"field": "earnings_consistency_score", "operator": ">", "value": 0.7}
        ]
    }
}
```

### Use Case 4: Turnaround Candidates

```python
turnaround_query = {
    "filter": {
        "and": [
            {
                "field": "net_profit",
                "operator": ">",
                "value": 0,
                "period": {"type": "last_n_quarters", "n": 2, "aggregation": "all"}
            },
            {"field": "pe_ratio", "operator": "<", "value": 15},
            {
                "field": "revenue",
                "operator": "increasing",
                "period": {"type": "quarter_over_quarter", "n": 4, "aggregation": "trend"}
            }
        ]
    }
}
```

---

## 🛠️ Working with Derived Metrics

### Computing Metrics Manually

```python
from compiler.derived_metrics import get_derived_metrics_engine

engine = get_derived_metrics_engine()

# Compute PEG ratio
peg = engine.compute_peg_ratio(pe_ratio=20.0, eps_growth=15.0)
print(f"PEG Ratio: {peg}")  # Output: 1.33

# Compute CAGR
cagr = engine.compute_cagr(beginning_value=100, ending_value=150, periods=3)
print(f"CAGR: {cagr}%")  # Output: ~14.47%

# Check safety before computing
is_safe, error = engine.validate_computation_safety(
    "peg_ratio",
    {"pe_ratio": 20.0, "eps_growth": 0.0}
)
if not is_safe:
    print(f"Cannot compute: {error}")  # Output: EPS growth is zero
```

---

## ✅ Validation Examples

### Example 1: Detect Conflicting Conditions

```python
invalid_query = {
    "filter": {
        "and": [
            {"field": "pe_ratio", "operator": ">", "value": 50},
            {"field": "pe_ratio", "operator": "<", "value": 10}
        ]
    }
}

result = validate_dsl_query(invalid_query)
print(result.is_valid)  # False

for error in result.get_errors():
    print(error.message)
# Output: "Unsatisfiable conditions for 'pe_ratio': requires > 50 AND < 10"
```

### Example 2: Catch Invalid Ranges

```python
invalid_between = {
    "filter": {
        "and": [
            {"field": "pe_ratio", "operator": "between", "value": [20, 10]}
        ]
    }
}

result = validate_dsl_query(invalid_between)
# Error: "'between' range invalid: min (20) >= max (10)"
```

### Example 3: Warn About Ambiguity

```python
ambiguous_query = {
    "filter": {
        "and": [
            {"field": "net_profit", "operator": ">", "value": 0}
        ]
    }
}

result = validate_dsl_query(ambiguous_query)
print(result.is_valid)  # True (valid but has warnings)

for warning in result.get_warnings():
    print(warning.message)
# Output: "Time-series field 'net_profit' used without period specification"
```

---

## 🧪 Testing Your Queries

### Run Tests

```bash
# Run all tests
python -m pytest tests/test_extended_compiler.py -v

# Run specific test class
python -m pytest tests/test_extended_compiler.py::TestValidationEngine -v
```

### Test Your Own Query

```python
import unittest
from compiler.enhanced_compiler import ExtendedDSLCompiler

class TestMyQuery(unittest.TestCase):
    def test_my_custom_query(self):
        query = {
            "filter": {
                "and": [
                    {"field": "pe_ratio", "operator": "<", "value": 15}
                ]
            }
        }
        
        compiler = ExtendedDSLCompiler()
        sql, params, metadata = compiler.compile(query)
        
        self.assertIn("pe_ratio", sql.lower())
        self.assertTrue(len(params) > 0)

if __name__ == '__main__':
    unittest.main()
```

---

## 🐛 Troubleshooting

### Issue 1: "Unknown field" Error

**Error:** `CompilerError: Unknown field: 'unknown_metric'`

**Solution:** Check field name against `field_mapper.py`. Available fields include:
- `pe_ratio`, `roe`, `net_profit`, `revenue`, etc.
- Derived: `peg_ratio`, `debt_to_fcf`, `eps_cagr`, etc.

### Issue 2: "Unsatisfiable conditions" Error

**Error:** `ValidationError: Unsatisfiable conditions for 'pe_ratio'`

**Solution:** Check for conflicting conditions:
```python
# BAD - Conflicting
{"field": "pe_ratio", "operator": ">", "value": 50},
{"field": "pe_ratio", "operator": "<", "value": 10}

# GOOD - Use between
{"field": "pe_ratio", "operator": "between", "value": [10, 50]}
```

### Issue 3: "Divide by zero" Warning

**Error:** Derived metric returns `None`

**Solution:** Check input values:
```python
# PEG ratio requires EPS growth > 0.01%
# Debt-to-FCF requires FCF > 0
# CAGR requires beginning value > 0

# Validate before computing
is_safe, error = engine.validate_computation_safety(
    "peg_ratio",
    {"pe_ratio": 20.0, "eps_growth": eps_value}
)
```

### Issue 4: "Missing period specification"

**Error:** `ValidationError: Derived metric 'eps_cagr' requires period specification`

**Solution:** Add period to time-series metrics:
```python
{
    "field": "eps_cagr",
    "operator": ">",
    "value": 15,
    "period": {
        "type": "last_n_years",
        "n": 5,
        "aggregation": "trend"
    }
}
```

---

## 📖 Further Reading

- **Full Documentation:** `docs/extended_dsl_compiler.md`
- **DSL Specification:** `engine/dsl/DSL_SPECIFICATION.md`
- **Validation Rules:** `engine/dsl/validation_rules.md`
- **Examples:** `engine/dsl/examples/`
- **API Reference:** See documentation for detailed API

---

## 💡 Tips & Best Practices

### ✅ DO

- ✅ Always validate queries before compilation
- ✅ Use `between` for range conditions
- ✅ Specify period for time-series fields
- ✅ Check derived metric safety
- ✅ Handle null values explicitly
- ✅ Use meaningful limit values

### ❌ DON'T

- ❌ Skip validation in production
- ❌ Use conflicting conditions
- ❌ Ignore validation warnings
- ❌ Request excessive historical periods (> 12)
- ❌ Forget to handle divide-by-zero
- ❌ Use raw SQL (security risk)

---

## 🎓 Learning Path

### Beginner

1. Start with simple queries (single condition)
2. Add range filters (`between`, `in`)
3. Combine with AND/OR logic
4. Add metadata filters (sector, exchange)

### Intermediate

5. Use temporal conditions (last N quarters)
6. Try derived metrics (PEG ratio)
7. Implement null handling
8. Use NOT operator

### Advanced

9. Complex nested logic (AND inside OR)
10. Trend analysis (increasing/decreasing)
11. Multiple derived metrics
12. Custom validation rules

---

## 🚀 Ready to Build?

You now have everything you need to create powerful stock screening queries!

**Next Steps:**
1. Try the example queries
2. Build your own custom queries
3. Test with validation
4. Integrate with your application

**Need Help?**
- Check examples: `engine/dsl/examples/`
- Run tests: `python -m pytest tests/ -v`
- Review docs: `docs/extended_dsl_compiler.md`

---

**Happy Screening!** 📈

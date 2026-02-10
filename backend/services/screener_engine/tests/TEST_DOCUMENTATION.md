# Stock Screener Engine - Test Documentation

## Overview
Test suite for the Stock Screener Engine covering DSL compiler and query execution logic.

---

## Test Files

```
tests/
├── test_compiler.py      # DSL-to-SQL compilation tests
├── test_runner.py        # Query execution tests
└── test_dataset.py       # Fake test data
```

---

## Test Dataset

**4 sample stocks** to test various scenarios:

| Ticker    | PE Ratio | ROE  | Net Profit | Use Case                      |
|-----------|----------|------|------------|-------------------------------|
| TCS       | 18       | 22   | 500        | ✓ Passes quality filters      |
| INFY      | 25       | 18   | 450        | ✗ High PE (fails strict filters) |
| HDFCBANK  | 14       | 12   | 700        | ✗ Low ROE                     |
| FAILCO    | None     | -5   | -100       | ✗ Invalid data (null/negative)|

---

## Compiler Tests (`test_compiler.py`)

### Test 1: Single Condition
```python
# Input: PE ratio < 20
# Output: SQL with "fundamentals_quarterly.pe_ratio < %(p0)s"
# Validates: Basic compilation, parameter binding
```

### Test 2: AND Conditions
```python
# Input: PE < 20 AND ROE > 15
# Output: SQL with "AND" operator, 2 parameters
# Validates: Multi-condition logic
```

### Test 3: Invalid Field
```python
# Input: Filter with unknown field
# Output: ValueError raised
# Validates: Error handling
```

---

## Runner Tests (`test_runner.py`)

### Test 1: AND Logic
```python
# Filter: PE < 20 AND ROE > 15
# Expected: Returns ['TCS'] only
# Why: TCS has PE=18 and ROE=22 (both conditions met)
```

### Test 2: No Results
```python
# Filter: PE < 5 (very strict)
# Expected: Returns []
# Why: No stocks meet criteria
```

---

## Running Tests

```bash
# Compiler tests
python tests/test_compiler.py

# Runner tests  
python tests/test_runner.py
```

**Expected Output:**
```
============================================================
Running Screener Engine Unit Tests
============================================================

✓ Test: AND logic with PE < 20 and ROE > 15
  Results: ['TCS']
  Count: 1 stocks matched

✓ Test: No match with PE < 5
  Results: []
  Count: 0 stocks matched

============================================================
All tests passed! ✓
============================================================
```

---

## What's Tested

**✅ Covered:**
- Single and multi-condition filters
- AND logic compilation and execution
- Invalid field validation
- Null value handling
- Empty result scenarios
- SQL parameter binding (prevents injection)

**⚠️ TODO:**
- OR logic
- Nested conditions (A AND (B OR C))
- IN operator with lists

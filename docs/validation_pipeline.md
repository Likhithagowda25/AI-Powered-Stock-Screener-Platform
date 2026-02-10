# Data Validation Pipeline

## What It Does

Automatically checks financial data quality before database insertion. Acts as a quality gate to prevent bad data from entering the system.

**Flow:** FETCH → MERGE → **VALIDATE** → CLEAN → DATABASE

---

### Check Reports
- **Logs:** `logs/validation_*.log`
- **Summary:** `reports/validation_summary_*.md`
- **CSV:** `reports/validation_summary_*.csv`

---

## What Gets Checked

### Missing Data
- **Critical:** ticker, quarter, revenue, net_income
- **Important:** ebitda, eps, total_assets, total_debt, free_cash_flow

### Data Quality
- Negative values (revenue, promoter_holding)
- Ratio ranges (PE: -100 to 500, Debt/Equity: 0 to 20)
- Revenue spikes > 300% QoQ
- Price spikes > 100% daily
- Duplicate records
- Invalid date formats

### Schema Compliance
- Numeric fields are numbers
- Dates are valid
- No future-dated records

---

## Severity Levels

| Level | What It Means | Action |
|-------|---------------|--------|
| **CRITICAL** | Missing mandatory fields | SKIP entire ticker |
| **HIGH** | Invalid data types, bad ranges | SKIP affected records |
| **MEDIUM** | Missing optional fields | FLAG for review |
| **LOW** | Informational only | LOG only |

---

## Integration

Validation runs automatically in the ingestion pipeline:

```python
from validate_data import DataValidator

# In fundamentals_ingest.py
validator = DataValidator()
validated_df, report = validator.validate_fundamentals(df)
# Only clean data goes to database
```

**3 formats per validation run:**

1. **JSON** - Machine-readable with full details
2. **Markdown** - Human-readable summary
3. **CSV** - Excel-compatible issue list

All saved to `reports/` with timestamps.

---

## Validation Rules

**Mandatory Fields:** ticker, quarter, revenue, net_income  
**Important Fields:** ebitda, eps, total_assets, total_debt, free_cash_flow

**Anomaly Thresholds:**
- Revenue change: 300% QoQ
- Net income change: 400% QoQ
- Price change: 100% daily
- Volume spike: 10x average

**Ratio Ranges:**
- Promoter/Institutional holding: 0-100%
- Debt to Equity: 0-20
- PE ratio: -100 to 500
- PB ratio: 0-50

---

## Test Results

**5 files validated**  
**30 issues detected** (10 CRITICAL, 20 MEDIUM)   

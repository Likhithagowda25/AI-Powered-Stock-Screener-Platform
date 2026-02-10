# NSE Stock Data Ingestion Guide

## Overview
The system can now dynamically fetch and ingest **ALL 2,222 NSE-listed stocks** with real-time fundamental data from Yahoo Finance.

## Features
- ✅ **Dynamic ticker fetching** - Automatically gets all NSE stocks from official sources
- ✅ **Caching** - Stores ticker list locally to avoid repeated API calls
- ✅ **Batch processing** - Handles thousands of stocks with error recovery
- ✅ **Complete fundamentals** - Revenue, EBITDA, PEG ratio, debt, growth metrics, earnings dates
- ✅ **YoY calculations** - Automatically computes revenue and EBITDA growth
- ✅ **CSV exports** - Saves normalized data for analysis

## Quick Start

### 1. Test with 10 stocks (RECOMMENDED FIRST)
```powershell
cd "c:\Projects\AI-Powered-Mobile-Stock-Screener-and-Advisory-Platform"
python test_ingestion.py
```

### 2. Ingest specific number of stocks
```powershell
# Process 50 stocks
python -m backend.services.market_ingestion.fundamentals_ingest --limit 50

# Process 100 stocks
python -m backend.services.market_ingestion.fundamentals_ingest --limit 100
```

### 3. Ingest ALL 2,222 NSE stocks (WARNING: Takes 4-6 hours)
```powershell
python -m backend.services.market_ingestion.fundamentals_ingest --all
```

## Command Line Options

| Option | Description | Example |
|--------|-------------|---------|
| `--all` | Process all NSE stocks (~2222) | `--all` |
| `--limit N` | Process only N stocks | `--limit 100` |
| `--test` | Test mode (10 stocks) | `--test` |
| `--no-cache` | Fetch fresh ticker list | `--no-cache` |

## Data Coverage

### Fields Populated
**fundamentals_quarterly table:**
- revenue, net_income, eps
- ebitda, operating_margin
- peg_ratio, pe_ratio, pb_ratio
- revenue_growth_yoy, ebitda_growth_yoy
- total_debt, free_cash_flow
- roe, roa, debt_to_equity, current_ratio
- total_assets, operating_cash_flow

**companies table:**
- promoter_holding
- next_earnings_date
- last_buyback_date

### Data Sources
- **yfinance** - Free, no API key required
- **NSE India** - Official ticker list
- **Yahoo Finance** - Quarterly/annual financials

## Performance Estimates

| Stocks | Time Required | Database Size |
|--------|---------------|---------------|
| 10 | 2-3 minutes | ~1 MB |
| 50 | 10-15 minutes | ~5 MB |
| 100 | 20-30 minutes | ~10 MB |
| 500 | 2-3 hours | ~50 MB |
| 2,222 | 4-6 hours | ~200 MB |

## Error Handling
- Failed stocks are logged but don't stop the pipeline
- Duplicate records are automatically handled (ON CONFLICT UPDATE)
- Network errors trigger automatic retry for cache fallback
- All errors logged to `backend/logs/fundamentals_ingestion_YYYYMMDD.log`

## Monitoring Progress

### Check logs in real-time
```powershell
Get-Content backend\logs\fundamentals_ingestion_*.log -Tail 50 -Wait
```

### Query database progress
```powershell
$env:PGPASSWORD="25101974"
psql -h localhost -p 5433 -U postgres -d stock_screener -c "SELECT COUNT(DISTINCT ticker) as total_stocks FROM fundamentals_quarterly;"
```

## Scheduled Updates

### Daily update (overnight)
Create a Windows Task Scheduler task:
```powershell
# Run at 2 AM daily
python -m backend.services.market_ingestion.fundamentals_ingest --limit 100
```

### Weekly full refresh (weekend)
```powershell
# Saturday 10 PM - full ingestion
python -m backend.services.market_ingestion.fundamentals_ingest --all --no-cache
```

## Cached Ticker List

Location: `backend/services/market_ingestion/nse_tickers_cache.json`

### Refresh ticker list
```powershell
python -m backend.services.market_ingestion.nse_ticker_fetcher
```

### View cached tickers
```powershell
Get-Content backend\services\market_ingestion\nse_tickers_cache.json | ConvertFrom-Json | Select -ExpandProperty tickers | Select -First 20
```

## Testing Queries After Ingestion

### 1. Verify data exists
```sql
SELECT ticker, quarter, revenue, ebitda, peg_ratio, revenue_growth_yoy 
FROM fundamentals_quarterly 
WHERE ticker IN ('TCS.NS', 'INFY.NS', 'RELIANCE.NS')
ORDER BY ticker, quarter DESC 
LIMIT 10;
```

### 2. Test screener with real data
```bash
curl -X POST http://localhost:8080/api/screen \
  -H "Content-Type: application/json" \
  -d '{"query": "Technology stocks with PEG ratio less than 2 and positive revenue growth"}'
```

### 3. Check coverage
```sql
SELECT 
    COUNT(DISTINCT ticker) as total_stocks,
    COUNT(*) as total_quarters,
    AVG(CASE WHEN peg_ratio IS NOT NULL THEN 1 ELSE 0 END) * 100 as peg_coverage_pct,
    AVG(CASE WHEN revenue_growth_yoy IS NOT NULL THEN 1 ELSE 0 END) * 100 as growth_coverage_pct
FROM fundamentals_quarterly;
```

## Next Steps

1. ✅ Run test ingestion (10 stocks)
2. ✅ Verify data in database
3. ✅ Test screener with complex queries
4. ⏳ Schedule daily/weekly updates
5. ⏳ Ingest all 2,222 stocks (optional - run overnight)

## Troubleshooting

### Issue: "No data found for ticker"
**Cause:** Stock delisted or ticker format incorrect  
**Solution:** Normal - pipeline skips and continues

### Issue: "Connection timeout"
**Cause:** Network issues or Yahoo Finance rate limiting  
**Solution:** Use `--limit` to process smaller batches

### Issue: "Duplicate key violation"
**Cause:** Re-running ingestion for same stocks  
**Solution:** Normal - ON CONFLICT clause updates existing records

### Issue: "numpy float64 error"
**Cause:** PostgreSQL doesn't recognize numpy types  
**Solution:** Already handled with `safe_float()` converter

## Support

Check logs: `backend/logs/fundamentals_ingestion_*.log`  
CSV outputs: `data/processed/fundamentals/quarterly/` and `annual/`  
JSON outputs: `storage/processed/fundamentals/YYYY-MM-DD/`

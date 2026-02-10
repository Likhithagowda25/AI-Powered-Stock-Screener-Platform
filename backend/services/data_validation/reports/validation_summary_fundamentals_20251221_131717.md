# Data Validation Report - fundamentals

**Generated:** 2025-12-21T13:17:17.171941

## Summary

- Total Records: 387
- Clean Records: 150
- Skipped Records: 237
- Total Issues: 319

## Severity Breakdown

- **CRITICAL**: 77
- **HIGH**: 1
- **MEDIUM**: 241
- **LOW**: 0

## Skipped Tickers

- KOTAKBANK.NS
- HDFCLIFE.NS
- VEDL.NS
- BIOCON.NS
- PERSISTENT.NS
- HEROMOTOCO.NS
- JSWSTEEL.NS
- SUNPHARMA.NS
- TCS.NS
- TATASTEEL.NS
- AUROPHARMA.NS
- ICICIBANK.NS
- GODREJCP.NS
- ASIANPAINT.NS
- BAJFINANCE.NS
- BAJAJ-AUTO.NS
- INFY.NS
- DRREDDY.NS
- ZEEL.NS
- DIVISLAB.NS
- BAJAJFINSV.NS
- HDFCAMC.NS
- ONGC.NS
- MARICO.NS
- M&M.NS
- EICHERMOT.NS
- SUNTV.NS
- AMBUJACEM.NS
- CIPLA.NS
- RELIANCE.NS
- WIPRO.NS
- TRENT.NS
- ABFRL.NS
- ITC.NS
- HDFCBANK.NS
- TATAMOTORS.NS
- HINDALCO.NS
- LT.NS

## Issues by Type

### Invalid String Format

Count: 1

- **M&M.NS**: Ticker contains 6 invalid characters

### Missing Mandatory

Count: 76

- **ABFRL.NS**: Missing mandatory field 'revenue' in 1/6 records
- **ABFRL.NS**: Missing mandatory field 'net_income' in 1/6 records
- **AMBUJACEM.NS**: Missing mandatory field 'revenue' in 1/6 records
- **AMBUJACEM.NS**: Missing mandatory field 'net_income' in 1/6 records
- **ASIANPAINT.NS**: Missing mandatory field 'revenue' in 1/6 records
- ... and 71 more

### Missing Important

Count: 237

- **ABFRL.NS**: Missing important field 'ebitda' in 1/6 records
- **ABFRL.NS**: Missing important field 'total_assets' in 3/6 records
- **ABFRL.NS**: Missing important field 'total_debt' in 3/6 records
- **ABFRL.NS**: Missing important field 'free_cash_flow' in 6/6 records
- **ACC.NS**: Missing important field 'total_assets' in 3/5 records
- ... and 232 more

### Negative Value

Count: 1

- **ABFRL.NS**: Found 1 negative values in revenue (should always be >= 0)

### Net Income Spike

Count: 4

- **ABFRL.NS**: Net income changed by -1123.3%
- **BIOCON.NS**: Net income changed by 1272.5%
- **IOC.NS**: Net income changed by -1347.4%
- **TATAMOTORS.NS**: Net income changed by 1841.1%


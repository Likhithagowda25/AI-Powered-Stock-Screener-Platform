# Data Validation Report - fundamentals

**Generated:** 2025-12-21T13:16:52.047969

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

- WIPRO.NS
- TATAMOTORS.NS
- BAJAJFINSV.NS
- EICHERMOT.NS
- HDFCBANK.NS
- HEROMOTOCO.NS
- JSWSTEEL.NS
- MARICO.NS
- SUNTV.NS
- VEDL.NS
- SUNPHARMA.NS
- PERSISTENT.NS
- HDFCLIFE.NS
- TCS.NS
- AMBUJACEM.NS
- CIPLA.NS
- ITC.NS
- DRREDDY.NS
- LT.NS
- TRENT.NS
- KOTAKBANK.NS
- RELIANCE.NS
- ZEEL.NS
- ASIANPAINT.NS
- TATASTEEL.NS
- ABFRL.NS
- AUROPHARMA.NS
- BIOCON.NS
- INFY.NS
- BAJAJ-AUTO.NS
- BAJFINANCE.NS
- HINDALCO.NS
- DIVISLAB.NS
- HDFCAMC.NS
- M&M.NS
- GODREJCP.NS
- ICICIBANK.NS
- ONGC.NS

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


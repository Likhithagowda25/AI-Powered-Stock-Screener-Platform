# Live Market Data Integration Guide

## Free Data Sources

### 1. Alpha Vantage (Recommended for US Stocks)
- **Free Tier:** 500 API calls/day
- **Data:** Real-time quotes, fundamentals, technical indicators
- **Sign up:** https://www.alphavantage.co/support/#api-key
- **Best for:** US stocks (NYSE, NASDAQ)

### 2. Yahoo Finance API (yfinance)
- **Free:** Unlimited (unofficial API)
- **Data:** Stock prices, fundamentals, analyst estimates
- **Library:** `pip install yfinance`
- **Best for:** Global stocks including NSE/BSE

### 3. NSE India Official API
- **Free:** Yes (rate limited)
- **Data:** Indian stocks real-time data
- **Endpoint:** https://www.nseindia.com/api/
- **Best for:** NSE/BSE stocks specifically

### 4. Finnhub
- **Free Tier:** 60 API calls/minute
- **Data:** Stock prices, fundamentals, earnings calendar
- **Sign up:** https://finnhub.io/register
- **Best for:** Global stocks

### 5. Polygon.io
- **Free Tier:** Delayed data (15 min)
- **Data:** Stocks, fundamentals, company info
- **Sign up:** https://polygon.io/
- **Best for:** US market comprehensive data

## Implementation Plan

### Phase 1: Basic Live Price Updates (Day 1-2)

**Goal:** Replace mock data with real stock prices

**Steps:**
1. Install yfinance: `pip install yfinance`
2. Create data ingestion service
3. Schedule periodic updates (every 5-15 minutes)
4. Update price_history table

**Code:**
```python
# backend/services/live_data_ingestion/price_updater.py
import yfinance as yf
import psycopg2

def update_live_prices(tickers):
    for ticker in tickers:
        stock = yf.Ticker(ticker)
        data = stock.history(period='1d')
        # Insert into price_history table
```

### Phase 2: Fundamentals Update (Day 3-4)

**Goal:** Update PE, ROE, fundamentals daily

**Data Points:**
- PE Ratio
- PB Ratio  
- ROE, ROA
- EPS
- Revenue
- Net Income
- Operating Margin
- Promoter Holding (for Indian stocks)

**Code:**
```python
def update_fundamentals(ticker):
    stock = yf.Ticker(ticker)
    info = stock.info
    
    fundamentals = {
        'pe_ratio': info.get('forwardPE'),
        'pb_ratio': info.get('priceToBook'),
        'roe': info.get('returnOnEquity') * 100,
        'roa': info.get('returnOnAssets') * 100,
        'revenue': info.get('totalRevenue'),
        'net_income': info.get('netIncomeToCommon'),
        'eps': info.get('trailingEps'),
        'operating_margin': info.get('operatingMargins') * 100
    }
```

### Phase 3: Advanced Metrics (Day 5-7)

**Additional Fields Needed:**
1. **PEG Ratio** - Add to schema
2. **Debt to Free Cash Flow** - Add cashflow table integration
3. **Analyst Price Targets** - Use analyst_estimates table
4. **YoY Growth** - Calculate from quarterly data
5. **Earnings Estimates** - Already have table
6. **Stock Buybacks** - Already have table  
7. **Earnings Call Schedule** - Add to companies table

**Schema Updates:**
```sql
ALTER TABLE fundamentals_quarterly ADD COLUMN peg_ratio NUMERIC;
ALTER TABLE fundamentals_quarterly ADD COLUMN free_cash_flow BIGINT;
ALTER TABLE fundamentals_quarterly ADD COLUMN total_debt BIGINT;

ALTER TABLE companies ADD COLUMN next_earnings_date DATE;
ALTER TABLE companies ADD COLUMN last_buyback_date DATE;
```

### Phase 4: Scheduled Data Updates

**Create Scheduled Tasks:**

```python
# backend/services/scheduler.py
import schedule
import time

def job():
    print("Updating market data...")
    update_all_stocks()

# Update prices every 15 minutes during market hours
schedule.every(15).minutes.do(update_prices)

# Update fundamentals daily at 6 PM
schedule.every().day.at("18:00").do(update_fundamentals)

# Update analyst estimates weekly
schedule.every().monday.at("09:00").do(update_estimates)

while True:
    schedule.run_pending()
    time.sleep(60)
```

## Data Refresh Strategy

### Real-time (Every 5-15 min)
- Stock prices (open, high, low, close, volume)

### Daily (After market close)
- Fundamentals (PE, PB, ROE, ROA)
- Market cap
- Promoter holding (Indian stocks)

### Weekly
- Analyst estimates
- Price targets
- Earnings calendar

### Monthly
- Debt profile
- Cashflow statements
- Buyback announcements

## Implementation Priority

**Week 1:** Basic live prices + fundamentals
- yfinance integration
- Update 50-100 popular stocks
- Real-time price updates

**Week 2:** Advanced metrics
- PEG ratio, debt ratios
- Analyst targets
- Earnings calendar

**Week 3:** Indian market specific
- NSE/BSE data
- Promoter holdings
- Corporate actions

**Week 4:** Optimization
- Caching layer (Redis)
- Rate limiting
- Error handling
- Data validation

## Example: Complete Stock Update

```python
import yfinance as yf
import psycopg2

def update_stock_complete(ticker):
    stock = yf.Ticker(ticker)
    info = stock.info
    
    # Get latest price
    hist = stock.history(period='1d')
    if not hist.empty:
        latest = hist.iloc[-1]
        update_price(ticker, latest)
    
    # Get fundamentals
    fundamentals = {
        'ticker': ticker,
        'pe_ratio': info.get('forwardPE'),
        'pb_ratio': info.get('priceToBook'),
        'roe': info.get('returnOnEquity', 0) * 100,
        'roa': info.get('returnOnAssets', 0) * 100,
        'revenue': info.get('totalRevenue'),
        'net_income': info.get('netIncomeToCommon'),
        'eps': info.get('trailingEps'),
        'operating_margin': info.get('operatingMargins', 0) * 100,
        'market_cap': info.get('marketCap')
    }
    
    update_fundamentals_table(fundamentals)
    
    # Get analyst data
    recommendations = stock.recommendations
    if recommendations is not None:
        update_analyst_estimates(ticker, recommendations)
    
    # Get earnings calendar
    calendar = stock.calendar
    if calendar is not None:
        update_earnings_calendar(ticker, calendar)
```

## Rate Limiting & Best Practices

1. **Cache API responses** - Use Redis for 5-15 min caching
2. **Batch requests** - Update 10 stocks per API call
3. **Respect rate limits** - Add delays between calls
4. **Handle failures gracefully** - Retry with exponential backoff
5. **Log all API calls** - Monitor usage and errors

## Next Steps

1. ✓ Add promoter_holding column (DONE)
2. Create live data ingestion service
3. Install yfinance library
4. Test with 10 sample stocks
5. Schedule periodic updates
6. Add remaining fields (PEG, debt ratios, etc.)
7. Implement caching layer
8. Add error monitoring

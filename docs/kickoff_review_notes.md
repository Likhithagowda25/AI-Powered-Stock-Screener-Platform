# Kickoff & Requirements Review Notes

## 1. Project Overview
*Project:* AI-Powered Mobile Stock Screener and Advisory Platform  
*Goal:* Enable users to query stocks using natural language and receive filtered results based on fundamentals, technicals, earnings, and corporate actions.  

## 2. Decisions & Scope
- *Supported Stock Exchange:* NSE (initial scope)  
- *Scope of Screeners:*  
  - Fundamentals: revenue, EBITDA, PE, PEG, Debt/FCF  
  - Technicals: daily OHLCV price history  
  - Analyst Outlook: rating, target price  
  - Earnings Events: next earnings date  
  - Buyback Announcements: buyback flag  
- *Data Freshness:* End-of-day (EOD) for initial version  
- *NLP → DSL Templates:* JSON-based DSL with lt, gt, equals for filters  


## 3. Field Catalog Approval
Finalized fields and sources:

| Field Name           | Description                          | Source           |
|---------------------|--------------------------------------|----------------|
| symbol              | Stock symbol                          | NSE/BSE API     |
| company_name        | Full company name                     | Market API      |
| sector              | Industry/sector                       | Market API      |
| market_cap          | Market capitalization                 | Fundamentals API|
| revenue             | YoY quarterly revenue                 | Fundamentals API|
| EBITDA              | Earnings before interest & taxes      | Fundamentals API|
| EPS                 | Earnings per share trend               | Earnings report |
| PEG ratio           | Growth-adjusted valuation             | Computed        |
| Debt / FCF          | Debt repayment capability             | Computed        |
| Analyst rating      | Buy/Hold/Sell                          | Analyst API     |
| Price target range  | Low-avg-high target                    | Analyst API     |
| Buyback announced   | Boolean flag                            | Corporate API   |
| Next earnings date  | Quarterly call schedule                | Exchange calendar|
| Daily OHLCV         | Price time-series                      | Market API      |

## 4. Screener Rule Engine
*Filters / Rules:*
- *PEG Ratio:* Include stocks with PEG < 3  
- *Debt / Free Cash Flow:* Include stocks with Debt/FCF < 4  
- *YoY Revenue Growth:* Include stocks with revenue growth > 5%  
- *Buyback Flag:* Include only stocks with announced buybacks  
- *Upcoming Earnings:* Include stocks with earnings in next 30 days  
- *Analyst Target Comparison:* Include stocks where current price ≤ analyst low target  

*Output Schema Example:*
{
  "symbol": "TCS",
  "company_name": "Tata Consultancy Services",
  "peg": 2.4,
  "debt_to_fcf": 0.22,
  "target_low_diff_pct": -8,
  "revenue_growth_yoy": 12.3,
  "earnings_next_30d": true,
  "buyback_announced": true
}

## 5. Data Model & Entity Relationships
Primary Entities and Key Attributes:

| Entity               | Key Attributes | Notes |
|----------------------|----------------|-------|
| Stock                | symbol (PK), company_name, sector, exchange | Core lookup table |
| Financials           | financial_id (PK), stock_symbol (FK), revenue, EBITDA, PE, PEG, debt, FCF | Latest + historical |
| PriceHistory         | price_id (PK), stock_symbol (FK), date, open, high, low, close, volume | Stored as hypertable |
| AnalystEstimates     | estimate_id (PK), stock_symbol (FK), rating, price_target_low/high, estimate_confidence | For projection logic |
| CorporateActions     | action_id (PK), stock_symbol (FK), type (dividend/buyback/split), announcement_date, details | Dividends, buyback, splits |
| EarningsCalendar     | earnings_id (PK), stock_symbol (FK), next_date, last_eps, surprise | Used for screening |
| UserPortfolio        | portfolio_id (PK), user_id (FK), stock_symbol (FK), holdings, avg_price, qty | Per user |
| WatchlistAlerts      | alert_id (PK), user_id (FK), stock_symbol (FK), trigger_rule_type, threshold | Push alert system |

*Relationships:*

- Stock → Financials: 1:N  
- Stock → PriceHistory: 1:N  
- Stock → AnalystEstimates: 1:N  
- Stock → CorporateActions: 1:N  
- Stock → EarningsCalendar: 1:N  
- Stock → UserPortfolio: 1:N (via user)  
- Stock → WatchlistAlerts: 1:N (via user)  

This file includes: project overview, scope, finalized field catalog, rules, ERD summary, relationships.
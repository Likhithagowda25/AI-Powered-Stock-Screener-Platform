# Data Source → Field Mapping

This document maps the core database fields to their upstream data sources
(APIs or internal computations) for the AI-Powered Mobile Stock Screener & Advisory Platform.

It is aligned with:
- Field Catalog: /docs/data_model/field_catalog.xlsx


## 1. Stock (Metadata)

Logical table: stock  
Key attributes: symbol, company_name, sector, exchange

- stock.symbol  
  ← MarketDataAPI /symbols → field symbol

- stock.company_name  
  ← MarketDataAPI /symbols → field name

- stock.sector  
  ← MarketDataAPI or FundamentalsAPI /company-profile → field sector

- stock.exchange  
  ← MarketDataAPI /symbols → field exchange (e.g., NSE, BSE)

---

## 2. Financials

Logical table: financials  
Key attributes: revenue, ebitda, pe, peg, debt, fcf, market_cap, debt_to_fcf

- financials.revenue  
  ← FundamentalsAPI /income-statement → field revenue (quarterly or TTM)

- financials.ebitda  
  ← FundamentalsAPI /income-statement → field ebitda

- financials.pe  
  ← RatiosAPI /ratios → field peRatio  
  or computed in ETL as: latest_price / eps

- financials.peg  
  ← RatiosAPI /ratios → field pegRatio  
  or computed in ETL as: pe / epsGrowthRate

- financials.debt  
  ← FundamentalsAPI /balance-sheet → field totalDebt

- financials.fcf  
  ← FundamentalsAPI /cash-flow → field freeCashFlow

- financials.market_cap  
  ← FundamentalsAPI /key-metrics or MarketDataAPI /quote → field marketCap

- financials.debt_to_fcf  
  ← Computed in ETL as: debt / fcf

---

## 3. PriceHistory (OHLCV Time-Series)

Logical hypertable: price_history  
Key attributes: date, open, high, low, close, volume

- price_history.date  
  ← MarketDataAPI /historical-price → field date

- price_history.open  
  ← MarketDataAPI /historical-price → field open

- price_history.high  
  ← MarketDataAPI /historical-price → field high

- price_history.low  
  ← MarketDataAPI /historical-price → field low

- price_history.close  
  ← MarketDataAPI /historical-price → field close

- price_history.volume  
  ← MarketDataAPI /historical-price → field volume

---

## 4. AnalystEstimates

Logical table: analyst_estimates  
Key attributes: rating, price_target_low, price_target_high, estimate_confidence

- analyst_estimates.rating  
  ← AnalystAPI /ratings → field rating (e.g., BUY, HOLD, SELL)

- analyst_estimates.price_target_low  
  ← AnalystAPI /price-target → field targetLow

- analyst_estimates.price_target_high  
  ← AnalystAPI /price-target → field targetHigh

- analyst_estimates.estimate_confidence  
  ← Internal ETL computation (for example, based on number of analysts and target dispersion)

---

## 5. CorporateActions

Logical table: corporate_actions  
Key attributes: type, announcement_date, details, buyback_announced

- corporate_actions.type  
  ← CorporateActionsAPI /corporate-actions → field type  
  (e.g., DIVIDEND, SPLIT, BONUS, BUYBACK)

- corporate_actions.announcement_date  
  ← CorporateActionsAPI /corporate-actions → field announcementDate

- corporate_actions.details  
  ← CorporateActionsAPI /corporate-actions → descriptive field or stored raw JSON

- corporate_actions.buyback_announced  
  ← Internal ETL flag: TRUE when type = 'BUYBACK', else FALSE

---

## 6. EarningsCalendar

Logical table: earnings_calendar  
Key attributes: next_date, last_eps, surprise

- earnings_calendar.next_date  
  ← EarningsCalendarAPI /calendar → field nextEarningsDate

- earnings_calendar.last_eps  
  ← EarningsResultsAPI /results → field actualEps

- earnings_calendar.surprise  
  If estimates are available:  
  - Computed in ETL as (actualEps - estimatedEps) / estimatedEps  
  If provider returns surprise directly:  
  - ← EarningsResultsAPI /results → field surprisePercent

---

## 7. UserPortfolio

Logical table: portfolio_positions (or user_portfolio)  
Key attributes: user_id, stock_id/symbol, qty, avg_price

All portfolio data is internal (user-entered), not from external APIs.

- portfolio_positions.user_id  
  ← Internal: created via auth/user service

- portfolio_positions.stock_id (or symbol)  
  ← Internal: selected from stock table

- portfolio_positions.qty  
  ← Internal: supplied by user

- portfolio_positions.avg_price  
  ← Internal: supplied or computed when user adds/updates position

- portfolio_positions.created_at, portfolio_positions.updated_at  
  ← Internal: set by backend

---

## 8. WatchlistAlerts

Logical table: watchlist_alerts  
Key attributes: user_id, stock_id/symbol (optional), trigger_rule_type, threshold

All alert definitions are internal.

- watchlist_alerts.user_id  
  ← Internal: from authenticated user context

- watchlist_alerts.stock_id (or symbol, for stock-specific alerts)  
  ← Internal: selected from stock table

- watchlist_alerts.trigger_rule_type  
  ← Internal enum/string (e.g., PRICE_ABOVE, PE_BELOW, CUSTOM_DSL)

- watchlist_alerts.threshold  
  ← Internal: numeric or JSON, defined by user per alert

- watchlist_alerts.created_at, watchlist_alerts.last_triggered_at, watchlist_alerts.is_active  
  ← Internal: managed by backend and alert engine

---

## 9. Scope Note

This mapping includes fields:

- Stock: symbol, company_name, sector, exchange  
- Financials: revenue, ebitda, pe, peg, debt, fcf, market_cap, debt_to_fcf  
- PriceHistory: date, open, high, low, close, volume  
- AnalystEstimates: rating, price_target_low, price_target_high, estimate_confidence  
- CorporateActions: type, announcement_date, details, buyback_announced  
- EarningsCalendar: next_date, last_eps, surprise  
- UserPortfolio: qty, avg_price (per user per stock)  
- WatchlistAlerts: trigger_rule_type, threshold
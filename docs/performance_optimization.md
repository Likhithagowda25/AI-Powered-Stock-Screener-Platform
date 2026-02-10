# Performance & Indexing Plan  

## 1. Overview
This document outlines performance optimization and indexing strategies for PostgreSQL + TimescaleDB backend. It ensures fast query execution for stock screener filters, time-series analytics.

## 1. Hypertables (TimescaleDB)

- price_history table is a time-series hypertable partitioned by time.
- Use create_hypertable('price_history', 'time', if_not_exists => TRUE) to ensure optimal time-series performance.

## 2. Indexing Recommendations

2.1 companies table:  
- Primary Key: company_id
- Unique Index: ticker for fast lookups
CREATE UNIQUE INDEX idx_companies_ticker ON companies(ticker);

2.2 price_history table:

- Primary key (time, ticker)
CREATE INDEX idx_price_history_ticker_time ON price_history(ticker, time DESC);
CREATE INDEX idx_price_history_time ON price_history(time DESC);

2.3 fundamentals_quarterly table:

- Index on ticker
- Composite index (ticker, quarter) for quarterly reporting queries
CREATE INDEX idx_fundamentals_ticker ON fundamentals_quarterly(ticker);
CREATE INDEX idx_fundamentals_quarter ON fundamentals_quarterly(quarter);

2.4 analyst_estimates table:

- Index on ticker
- Composite index (ticker, estimate_date)
CREATE INDEX idx_analyst_ticker_date ON analyst_estimates(ticker, estimate_date DESC);

2.5 buybacks, cashflow_statements, debt_profile:

- Index on ticker and date/quarter for faster filtering:
CREATE INDEX idx_buybacks_ticker_date ON buybacks(ticker, announcement_date DESC);
CREATE INDEX idx_cashflow_ticker_period ON cashflow_statements(ticker, period);
CREATE INDEX idx_debt_ticker_quarter ON debt_profile(ticker, quarter);


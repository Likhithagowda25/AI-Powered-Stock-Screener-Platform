CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE companies (
    company_id SERIAL PRIMARY KEY,
    ticker VARCHAR(10) UNIQUE NOT NULL,
    name TEXT,
    sector VARCHAR(50),
    industry VARCHAR(100),
    exchange VARCHAR(20),
    market_cap BIGINT,
    next_earnings_date DATE,
    last_buyback_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE price_history (
    time TIMESTAMP NOT NULL,
    ticker VARCHAR(10) NOT NULL,
    open NUMERIC,
    high NUMERIC,
    low NUMERIC,
    close NUMERIC,
    volume BIGINT,
    PRIMARY KEY (time, ticker)
);
SELECT create_hypertable('price_history','time');

CREATE TABLE fundamentals_quarterly (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(10),
    quarter VARCHAR(10),
    revenue BIGINT,
    net_income BIGINT,
    eps NUMERIC,
    operating_margin NUMERIC,
    roe NUMERIC,
    roa NUMERIC,
    pe_ratio NUMERIC,
    pb_ratio NUMERIC,
    promoter_holding NUMERIC,
    peg_ratio NUMERIC,
    ebitda BIGINT,
    revenue_growth_yoy NUMERIC,
    ebitda_growth_yoy NUMERIC,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE analyst_estimates (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(10),
    estimate_date DATE,
    eps_estimate NUMERIC,
    revenue_estimate BIGINT,
    price_target_low NUMERIC,
    price_target_avg NUMERIC,
    price_target_high NUMERIC
);

CREATE TABLE buybacks (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(10),
    announcement_date DATE,
    amount BIGINT,
    remarks TEXT
);

CREATE TABLE cashflow_statements (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(10),
    period VARCHAR(10),
    cfo BIGINT,
    cfi BIGINT,
    cff BIGINT,
    capex BIGINT,
    free_cash_flow BIGINT
);

CREATE TABLE debt_profile (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(10),
    quarter VARCHAR(10),
    short_term_debt BIGINT,
    long_term_debt BIGINT,
    total_debt BIGINT,
    debt_to_equity NUMERIC
);

ALTER TABLE price_history
ALTER COLUMN time TYPE TIMESTAMPTZ;

CREATE INDEX idx_companies_ticker ON companies(ticker);

CREATE INDEX idx_fundamentals_quarterly_ticker ON fundamentals_quarterly(ticker);
CREATE INDEX idx_fundamentals_quarterly_pe ON fundamentals_quarterly(pe_ratio);
CREATE INDEX idx_fundamentals_quarterly_revenue ON fundamentals_quarterly(revenue);
CREATE INDEX idx_fundamentals_quarterly_eps ON fundamentals_quarterly(eps);

CREATE INDEX idx_analyst_estimates_ticker ON analyst_estimates(ticker);
CREATE INDEX idx_analyst_estimates_date ON analyst_estimates(estimate_date);

-- REMOVE old single-column indexes on price_history
DROP INDEX IF EXISTS idx_price_history_ticker;
DROP INDEX IF EXISTS idx_price_history_time;

CREATE INDEX idx_price_history_ticker_time
ON price_history (ticker, time DESC);

CREATE INDEX idx_price_history_recent 
ON price_history (ticker, time DESC) 
WHERE time >= NOW() - INTERVAL '1 year';

CREATE INDEX idx_buybacks_ticker ON buybacks(ticker);
CREATE INDEX idx_buybacks_date ON buybacks(announcement_date);

CREATE INDEX idx_cashflow_ticker ON cashflow_statements(ticker);
CREATE INDEX idx_cashflow_period ON cashflow_statements(period);

SELECT ticker FROM companies;
SELECT COUNT(*) FROM price_history;
SELECT COUNT(*) FROM fundamentals_quarterly LIMIT 10;
SELECT COUNT(*) FROM analyst_estimates;
SELECT COUNT(*) FROM buybacks;
SELECT COUNT(*) FROM cashflow_statements;
SELECT COUNT(*) FROM debt_profile;

SELECT * 
FROM price_history 
WHERE ticker = 'TSLA'
ORDER BY time DESC
LIMIT 5;

SELECT *
FROM price_history
WHERE ticker = 'INFY.NS'
ORDER BY time DESC
LIMIT 5;

SELECT ticker, COUNT(*)
FROM price_history
GROUP BY ticker;

SELECT ticker, name, exchange, sector, industry, market_cap
FROM companies
LIMIT 5;

SELECT 'price_history', COUNT(*) FROM price_history;

SELECT *
FROM fundamentals_quarterly
WHERE ticker = 'TCS.NS'
ORDER BY quarter DESC
LIMIT 5;

SELECT ticker, COUNT(DISTINCT quarter) AS num_quarters
FROM fundamentals_quarterly
GROUP BY ticker
ORDER BY num_quarters DESC;

SELECT *
FROM fundamentals_quarterly
WHERE revenue IS NULL OR net_income IS NULL OR eps IS NULL;

SELECT *
FROM price_history
WHERE ticker = 'TCS.NS'
ORDER BY time DESC
LIMIT 5;

SELECT ticker, COUNT(*) AS total_rows, MIN(time) AS first_date, MAX(time) AS last_date
FROM price_history
GROUP BY ticker
ORDER BY ticker;

SELECT ticker, quarter, revenue, net_income, roe, roa FROM fundamentals_quarterly ORDER BY created_at DESC LIMIT 10;

SELECT * FROM fundamentals_quarterly WHERE ticker='TCS.NS' ORDER BY quarter DESC LIMIT 5;

SELECT 'Quarterly' AS type, ticker, COUNT(*) AS row_count
FROM fundamentals_quarterly
GROUP BY ticker
ORDER BY ticker;

SELECT 'Annual' AS type, ticker, COUNT(*) AS row_count
FROM fundamentals_quarterly
GROUP BY ticker
ORDER BY ticker;

SELECT ticker, quarter, revenue, net_income, eps
FROM fundamentals_quarterly
WHERE ticker='TCS.NS';

SELECT ticker, quarter, revenue
FROM fundamentals_quarterly
WHERE quarter >= '2023-Q1'
ORDER BY ticker, quarter DESC;

-- 4️⃣ YoY Revenue Growth calculation
SELECT f1.ticker, f1.quarter,
       (f1.revenue - f2.revenue)::NUMERIC / NULLIF(f2.revenue,0)*100 AS yoy_growth
FROM fundamentals_quarterly f1
JOIN fundamentals_quarterly f2
  ON f1.ticker = f2.ticker
  AND f1.quarter = (f2.quarter || '-1 year')::text;

-- Q-over-Q EPS Trend
SELECT ticker, quarter, eps,
       eps - LAG(eps) OVER (PARTITION BY ticker ORDER BY quarter) AS qoq_eps_change
FROM fundamentals_quarterly
WHERE ticker='TCS.NS';

SELECT *
FROM price_history
WHERE ticker='TCS.NS'
ORDER BY time DESC
LIMIT 5;

SELECT ticker, COUNT(*) AS total_rows,
       COUNT(revenue) AS revenue_present,
       COUNT(net_income) AS net_income_present,
       COUNT(eps) AS eps_present
FROM fundamentals_quarterly
GROUP BY ticker
ORDER BY ticker;
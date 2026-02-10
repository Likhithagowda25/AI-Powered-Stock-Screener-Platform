CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE companies (
    company_id SERIAL PRIMARY KEY,
    ticker VARCHAR(10) UNIQUE NOT NULL,
    name TEXT,
    sector VARCHAR(50),
    industry VARCHAR(100),
    exchange VARCHAR(20),
    market_cap BIGINT,
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
    capex BIGINT
);

CREATE TABLE debt_profile (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(10),
    quarter VARCHAR(10),
    short_term_debt BIGINT,
    long_term_debt BIGINT,
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

CREATE INDEX idx_price_history_ticker ON price_history(ticker);
CREATE INDEX idx_price_history_time ON price_history(time);

CREATE INDEX idx_buybacks_ticker ON buybacks(ticker);
CREATE INDEX idx_buybacks_date ON buybacks(announcement_date);

CREATE INDEX idx_cashflow_ticker ON cashflow_statements(ticker);
CREATE INDEX idx_cashflow_period ON cashflow_statements(period);

CREATE INDEX idx_debt_profile_ticker ON debt_profile(ticker);
CREATE INDEX idx_debt_profile_quarter ON debt_profile(quarter);

-- Count rows in each table
SELECT COUNT(*) FROM companies;
SELECT COUNT(*) FROM price_history;
SELECT COUNT(*) FROM fundamentals_quarterly LIMIT 10;
SELECT COUNT(*) FROM analyst_estimates;

SELECT ticker FROM companies LIMIT 100;

-- Latest price > 1000
SELECT p.ticker, p.close
FROM price_history p
WHERE p.close > 1000;

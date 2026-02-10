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
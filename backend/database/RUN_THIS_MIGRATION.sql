-- Run these commands in your PostgreSQL database
-- Connect: psql -h localhost -p 5433 -U postgres -d stock_screener

-- 1. Add fields to fundamentals_quarterly
ALTER TABLE fundamentals_quarterly ADD COLUMN IF NOT EXISTS peg_ratio NUMERIC;
ALTER TABLE fundamentals_quarterly ADD COLUMN IF NOT EXISTS ebitda BIGINT;
ALTER TABLE fundamentals_quarterly ADD COLUMN IF NOT EXISTS revenue_growth_yoy NUMERIC;
ALTER TABLE fundamentals_quarterly ADD COLUMN IF NOT EXISTS ebitda_growth_yoy NUMERIC;

-- 2. Add fields to cashflow_statements  
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS free_cash_flow BIGINT;

-- 3. Add fields to debt_profile
ALTER TABLE debt_profile ADD COLUMN IF NOT EXISTS total_debt BIGINT;

-- 4. Add fields to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS next_earnings_date DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_buyback_date DATE;

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_fundamentals_quarterly_peg ON fundamentals_quarterly(peg_ratio);
CREATE INDEX IF NOT EXISTS idx_fundamentals_quarterly_revenue_growth ON fundamentals_quarterly(revenue_growth_yoy);
CREATE INDEX IF NOT EXISTS idx_companies_earnings_date ON companies(next_earnings_date);
CREATE INDEX IF NOT EXISTS idx_companies_buyback_date ON companies(last_buyback_date);

-- 6. Calculate derived values
UPDATE debt_profile SET total_debt = COALESCE(short_term_debt, 0) + COALESCE(long_term_debt, 0) WHERE total_debt IS NULL;
UPDATE cashflow_statements SET free_cash_flow = COALESCE(cfo, 0) - COALESCE(capex, 0) WHERE free_cash_flow IS NULL;

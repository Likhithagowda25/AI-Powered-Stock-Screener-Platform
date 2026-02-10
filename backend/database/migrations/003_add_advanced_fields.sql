-- Migration: Add advanced screening fields
-- Date: 2025-12-30
-- Purpose: Support complex queries like PEG ratio, debt/FCF, YoY growth, earnings dates

-- Add fields to fundamentals_quarterly
ALTER TABLE fundamentals_quarterly ADD COLUMN IF NOT EXISTS peg_ratio NUMERIC;
ALTER TABLE fundamentals_quarterly ADD COLUMN IF NOT EXISTS ebitda BIGINT;
ALTER TABLE fundamentals_quarterly ADD COLUMN IF NOT EXISTS revenue_growth_yoy NUMERIC;
ALTER TABLE fundamentals_quarterly ADD COLUMN IF NOT EXISTS ebitda_growth_yoy NUMERIC;

-- Add fields to cashflow_statements
ALTER TABLE cashflow_statements ADD COLUMN IF NOT EXISTS free_cash_flow BIGINT;

-- Add fields to debt_profile
ALTER TABLE debt_profile ADD COLUMN IF NOT EXISTS total_debt BIGINT;

-- Add fields to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS next_earnings_date DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_buyback_date DATE;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_fundamentals_quarterly_peg ON fundamentals_quarterly(peg_ratio);
CREATE INDEX IF NOT EXISTS idx_fundamentals_quarterly_revenue_growth ON fundamentals_quarterly(revenue_growth_yoy);
CREATE INDEX IF NOT EXISTS idx_companies_earnings_date ON companies(next_earnings_date);
CREATE INDEX IF NOT EXISTS idx_companies_buyback_date ON companies(last_buyback_date);

-- Update total_debt as sum of short and long term debt
UPDATE debt_profile 
SET total_debt = COALESCE(short_term_debt, 0) + COALESCE(long_term_debt, 0)
WHERE total_debt IS NULL;

-- Update free_cash_flow as CFO - CapEx
UPDATE cashflow_statements 
SET free_cash_flow = COALESCE(cfo, 0) - COALESCE(capex, 0)
WHERE free_cash_flow IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN fundamentals_quarterly.peg_ratio IS 'Price/Earnings to Growth ratio';
COMMENT ON COLUMN fundamentals_quarterly.ebitda IS 'Earnings Before Interest, Taxes, Depreciation and Amortization';
COMMENT ON COLUMN fundamentals_quarterly.revenue_growth_yoy IS 'Year over Year revenue growth percentage';
COMMENT ON COLUMN fundamentals_quarterly.ebitda_growth_yoy IS 'Year over Year EBITDA growth percentage';
COMMENT ON COLUMN cashflow_statements.free_cash_flow IS 'Operating Cash Flow minus Capital Expenditures';
COMMENT ON COLUMN debt_profile.total_debt IS 'Sum of short-term and long-term debt';
COMMENT ON COLUMN companies.next_earnings_date IS 'Scheduled date of next quarterly earnings call';
COMMENT ON COLUMN companies.last_buyback_date IS 'Date of most recent stock buyback announcement';

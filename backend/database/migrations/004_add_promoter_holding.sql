-- Migration: Add promoter_holding to companies table
-- Date: 2025-12-30
-- Purpose: Store promoter/insider shareholding percentage at company level

ALTER TABLE companies ADD COLUMN IF NOT EXISTS promoter_holding NUMERIC;

CREATE INDEX IF NOT EXISTS idx_companies_promoter_holding ON companies(promoter_holding);

COMMENT ON COLUMN companies.promoter_holding IS 'Percentage of shares held by promoters/insiders';

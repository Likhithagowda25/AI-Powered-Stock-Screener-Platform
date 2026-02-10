-- =====================================================
-- V6: Enhanced Analyst, Buyback & Earnings Tables
-- Extends existing tables with additional fields
-- =====================================================

-- =====================================================
-- SECTION 1: Enhance Analyst Estimates Table
-- =====================================================

-- Add missing columns to analyst_estimates
ALTER TABLE analyst_estimates 
ADD COLUMN IF NOT EXISTS analyst_count INTEGER,
ADD COLUMN IF NOT EXISTS fiscal_year VARCHAR(10),
ADD COLUMN IF NOT EXISTS fiscal_quarter VARCHAR(10),
ADD COLUMN IF NOT EXISTS consensus_rating VARCHAR(20),
ADD COLUMN IF NOT EXISTS strong_buy_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS buy_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS hold_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sell_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS strong_sell_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS revision_trend VARCHAR(20),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add check constraint for price targets
ALTER TABLE analyst_estimates
DROP CONSTRAINT IF EXISTS chk_price_targets_logical,
ADD CONSTRAINT chk_price_targets_logical 
CHECK (
    (price_target_low IS NULL AND price_target_avg IS NULL AND price_target_high IS NULL) OR
    (price_target_low <= price_target_avg AND price_target_avg <= price_target_high)
);

-- Create composite index for better query performance
CREATE INDEX IF NOT EXISTS idx_analyst_estimates_ticker_date 
ON analyst_estimates(ticker, estimate_date DESC);

-- =====================================================
-- SECTION 2: Enhance Buybacks Table
-- =====================================================

-- Add detailed buyback fields
ALTER TABLE buybacks
ADD COLUMN IF NOT EXISTS buyback_type VARCHAR(50) DEFAULT 'open_market',
ADD COLUMN IF NOT EXISTS approved_shares BIGINT,
ADD COLUMN IF NOT EXISTS buyback_percentage NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS price_range_low NUMERIC(18,4),
ADD COLUMN IF NOT EXISTS price_range_high NUMERIC(18,4),
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'announced',
ADD COLUMN IF NOT EXISTS completion_percentage NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS source VARCHAR(100),
ADD COLUMN IF NOT EXISTS filing_reference TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create index for buyback queries
CREATE INDEX IF NOT EXISTS idx_buybacks_ticker_date 
ON buybacks(ticker, announcement_date DESC);

CREATE INDEX IF NOT EXISTS idx_buybacks_status 
ON buybacks(status) WHERE status IN ('announced', 'ongoing');

-- =====================================================
-- SECTION 3: Create Earnings Calendar Table
-- =====================================================

CREATE TABLE IF NOT EXISTS earnings_calendar (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(10) NOT NULL,
    earnings_date DATE NOT NULL,
    fiscal_quarter VARCHAR(10),
    fiscal_year VARCHAR(10),
    estimate_eps NUMERIC,
    actual_eps NUMERIC,
    estimate_revenue BIGINT,
    actual_revenue BIGINT,
    surprise_percent NUMERIC,
    call_time VARCHAR(20),
    status VARCHAR(20) DEFAULT 'scheduled',
    conference_call_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Prevent duplicate entries
    CONSTRAINT unique_earnings_event UNIQUE (ticker, earnings_date, fiscal_quarter)
);

-- Create indexes for earnings calendar
CREATE INDEX idx_earnings_ticker ON earnings_calendar(ticker);
CREATE INDEX idx_earnings_date ON earnings_calendar(earnings_date);
CREATE INDEX idx_earnings_ticker_date ON earnings_calendar(ticker, earnings_date DESC);
CREATE INDEX idx_upcoming_earnings ON earnings_calendar(earnings_date) 
WHERE earnings_date >= CURRENT_DATE AND status = 'scheduled';

-- =====================================================
-- SECTION 4: Create Price Targets History Table
-- =====================================================

CREATE TABLE IF NOT EXISTS price_targets_history (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(10) NOT NULL,
    analyst_firm VARCHAR(100),
    analyst_name VARCHAR(100),
    target_date DATE NOT NULL,
    price_target NUMERIC(18,4),
    rating VARCHAR(20),
    previous_target NUMERIC(18,4),
    action VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_price_targets_ticker ON price_targets_history(ticker);
CREATE INDEX idx_price_targets_date ON price_targets_history(target_date DESC);

-- =====================================================
-- SECTION 5: Update Companies Table
-- =====================================================

-- Ensure next_earnings_date and last_buyback_date columns exist
-- They're in the original schema, but let's add IF NOT EXISTS for safety
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='companies' AND column_name='next_earnings_date'
    ) THEN
        ALTER TABLE companies ADD COLUMN next_earnings_date DATE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='companies' AND column_name='last_buyback_date'
    ) THEN
        ALTER TABLE companies ADD COLUMN last_buyback_date DATE;
    END IF;
END $$;

-- =====================================================
-- SECTION 6: Create Helper Views
-- =====================================================

-- View for latest analyst consensus
CREATE OR REPLACE VIEW latest_analyst_consensus AS
SELECT DISTINCT ON (ticker)
    ticker,
    estimate_date,
    eps_estimate,
    revenue_estimate,
    price_target_low,
    price_target_avg,
    price_target_high,
    analyst_count,
    consensus_rating,
    (strong_buy_count + buy_count) AS buy_signals,
    (sell_count + strong_sell_count) AS sell_signals,
    revision_trend
FROM analyst_estimates
ORDER BY ticker, estimate_date DESC;

-- View for active buybacks
CREATE OR REPLACE VIEW active_buybacks AS
SELECT 
    b.*,
    c.name AS company_name,
    c.market_cap,
    (b.amount::NUMERIC / NULLIF(c.market_cap, 0)) * 100 AS buyback_to_mcap_ratio
FROM buybacks b
JOIN companies c ON b.ticker = c.ticker
WHERE b.status IN ('announced', 'ongoing')
  AND (b.end_date IS NULL OR b.end_date >= CURRENT_DATE)
ORDER BY b.announcement_date DESC;

-- View for upcoming earnings
CREATE OR REPLACE VIEW upcoming_earnings AS
SELECT 
    e.*,
    c.name AS company_name,
    c.sector,
    c.market_cap,
    (e.earnings_date - CURRENT_DATE) AS days_until_earnings
FROM earnings_calendar e
JOIN companies c ON e.ticker = c.ticker
WHERE e.earnings_date >= CURRENT_DATE
  AND e.status = 'scheduled'
ORDER BY e.earnings_date ASC;

-- View for stocks trading below analyst average target
CREATE OR REPLACE VIEW stocks_below_target AS
SELECT 
    a.ticker,
    c.name,
    c.sector,
    a.price_target_avg,
    p.close AS current_price,
    ((p.close - a.price_target_avg) / NULLIF(a.price_target_avg, 0)) * 100 AS discount_percent,
    a.analyst_count,
    a.consensus_rating
FROM latest_analyst_consensus a
JOIN companies c ON a.ticker = c.ticker
JOIN LATERAL (
    SELECT close 
    FROM price_history 
    WHERE ticker = a.ticker 
    ORDER BY time DESC 
    LIMIT 1
) p ON true
WHERE a.price_target_avg IS NOT NULL
  AND p.close < a.price_target_avg
ORDER BY ((p.close - a.price_target_avg) / NULLIF(a.price_target_avg, 0)) ASC;

-- =====================================================
-- SECTION 7: Create Triggers for Updated_at
-- =====================================================

-- Trigger for analyst_estimates
CREATE OR REPLACE FUNCTION update_analyst_estimates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_analyst_estimates_updated_at
    BEFORE UPDATE ON analyst_estimates
    FOR EACH ROW
    EXECUTE FUNCTION update_analyst_estimates_updated_at();

-- Trigger for buybacks
CREATE OR REPLACE FUNCTION update_buybacks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_buybacks_updated_at
    BEFORE UPDATE ON buybacks
    FOR EACH ROW
    EXECUTE FUNCTION update_buybacks_updated_at();

-- Trigger for earnings_calendar
CREATE OR REPLACE FUNCTION update_earnings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_earnings_updated_at
    BEFORE UPDATE ON earnings_calendar
    FOR EACH ROW
    EXECUTE FUNCTION update_earnings_updated_at();

-- =====================================================
-- SECTION 8: Create Helper Functions
-- =====================================================

-- Function to get days until next earnings for a ticker
CREATE OR REPLACE FUNCTION get_days_until_earnings(p_ticker VARCHAR)
RETURNS INTEGER AS $$
DECLARE
    next_date DATE;
BEGIN
    SELECT earnings_date INTO next_date
    FROM earnings_calendar
    WHERE ticker = p_ticker
      AND earnings_date >= CURRENT_DATE
      AND status = 'scheduled'
    ORDER BY earnings_date ASC
    LIMIT 1;
    
    IF next_date IS NOT NULL THEN
        RETURN next_date - CURRENT_DATE;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to check if stock has recent buyback
CREATE OR REPLACE FUNCTION has_recent_buyback(p_ticker VARCHAR, p_days INTEGER DEFAULT 180)
RETURNS BOOLEAN AS $$
DECLARE
    buyback_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO buyback_count
    FROM buybacks
    WHERE ticker = p_ticker
      AND announcement_date >= CURRENT_DATE - p_days;
    
    RETURN buyback_count > 0;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SECTION 9: Add Comments
-- =====================================================

COMMENT ON TABLE earnings_calendar IS 'Earnings announcement schedule and results';
COMMENT ON TABLE price_targets_history IS 'Historical analyst price target changes';
COMMENT ON VIEW latest_analyst_consensus IS 'Most recent analyst consensus per ticker';
COMMENT ON VIEW active_buybacks IS 'Currently active or announced buyback programs';
COMMENT ON VIEW upcoming_earnings IS 'Scheduled earnings announcements';
COMMENT ON VIEW stocks_below_target IS 'Stocks trading below analyst average price target';

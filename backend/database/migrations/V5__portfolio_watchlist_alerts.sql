CREATE TABLE user_portfolios (
    portfolio_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT 'My Portfolio',
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    currency VARCHAR(10) DEFAULT 'INR',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure unique portfolio names per user
    CONSTRAINT unique_portfolio_name_per_user UNIQUE (user_id, name)
);

CREATE TABLE portfolio_holdings (
    holding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES user_portfolios(portfolio_id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    quantity NUMERIC(18, 6) NOT NULL CHECK (quantity > 0),
    average_buy_price NUMERIC(18, 4),
    buy_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Prevent duplicate ticker in same portfolio
    CONSTRAINT unique_ticker_per_portfolio UNIQUE (portfolio_id, ticker)
);

-- Indexes for portfolio queries
CREATE INDEX idx_user_portfolios_user_id ON user_portfolios(user_id);
CREATE INDEX idx_portfolio_holdings_portfolio_id ON portfolio_holdings(portfolio_id);
CREATE INDEX idx_portfolio_holdings_ticker ON portfolio_holdings(ticker);

CREATE TABLE watchlists (
    watchlist_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT 'My Watchlist',
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure unique watchlist names per user
    CONSTRAINT unique_watchlist_name_per_user UNIQUE (user_id, name)
);

-- Watchlist items - stocks being watched
CREATE TABLE watchlist_items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID NOT NULL REFERENCES watchlists(watchlist_id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    added_price NUMERIC(18, 4),  -- Price when added (for reference)
    target_price NUMERIC(18, 4), -- Optional target price
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Prevent duplicate ticker in same watchlist
    CONSTRAINT unique_ticker_per_watchlist UNIQUE (watchlist_id, ticker)
);

-- Indexes for watchlist queries
CREATE INDEX idx_watchlists_user_id ON watchlists(user_id);
CREATE INDEX idx_watchlist_items_watchlist_id ON watchlist_items(watchlist_id);
CREATE INDEX idx_watchlist_items_ticker ON watchlist_items(ticker);

-- =====================================================
-- SECTION 3: ALERT SUBSCRIPTIONS
-- =====================================================

-- Alert type enum
CREATE TYPE alert_type AS ENUM (
    'price_threshold',      -- Price-based alerts (e.g., price < X)
    'price_change',         -- Percentage change alerts
    'fundamental',          -- Fundamental metric alerts (e.g., PE < 15)
    'event',               -- Event-based alerts (earnings, buyback)
    'technical',           -- Technical indicator alerts
    'custom_dsl'           -- Custom DSL-based condition
);

-- Alert status enum
CREATE TYPE alert_status AS ENUM (
    'active',
    'paused',
    'triggered',
    'expired',
    'deleted'
);

-- Alert frequency enum for evaluation
CREATE TYPE alert_frequency AS ENUM (
    'real_time',
    'hourly',
    'daily',
    'weekly'
);

-- Main alert subscriptions table
CREATE TABLE alert_subscriptions (
    alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Alert identification
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Target (can be specific ticker or null for screener-based)
    ticker VARCHAR(20),
    
    -- Alert type and condition
    alert_type alert_type NOT NULL,
    condition JSONB NOT NULL,  -- Structured condition (DSL-compatible)
    
    -- Evaluation settings
    frequency alert_frequency DEFAULT 'daily',
    
    -- Status tracking
    status alert_status DEFAULT 'active',
    
    -- Expiration
    expires_at TIMESTAMP,
    
    -- Trigger tracking
    last_evaluated_at TIMESTAMP,
    last_triggered_at TIMESTAMP,
    trigger_count INTEGER DEFAULT 0,
    
    -- Notification settings
    notify_push BOOLEAN DEFAULT TRUE,
    notify_email BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Alert history - log of triggered alerts
CREATE TABLE alert_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES alert_subscriptions(alert_id) ON DELETE CASCADE,
    triggered_at TIMESTAMP DEFAULT NOW(),
    trigger_value JSONB,  -- The actual values that triggered the alert
    message TEXT,         -- Human-readable alert message
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP
);

-- Indexes for alert queries
CREATE INDEX idx_alert_subscriptions_user_id ON alert_subscriptions(user_id);
CREATE INDEX idx_alert_subscriptions_ticker ON alert_subscriptions(ticker);
CREATE INDEX idx_alert_subscriptions_status ON alert_subscriptions(status);
CREATE INDEX idx_alert_subscriptions_type ON alert_subscriptions(alert_type);
CREATE INDEX idx_alert_subscriptions_frequency ON alert_subscriptions(frequency);
CREATE INDEX idx_alert_subscriptions_active ON alert_subscriptions(user_id, status) WHERE status = 'active';
CREATE INDEX idx_alert_history_alert_id ON alert_history(alert_id);
CREATE INDEX idx_alert_history_triggered_at ON alert_history(triggered_at DESC);

-- GIN index for JSONB condition queries
CREATE INDEX idx_alert_subscriptions_condition ON alert_subscriptions USING GIN (condition);

-- =====================================================
-- SECTION 4: TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Trigger for user_portfolios
CREATE TRIGGER update_user_portfolios_updated_at
    BEFORE UPDATE ON user_portfolios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for portfolio_holdings
CREATE TRIGGER update_portfolio_holdings_updated_at
    BEFORE UPDATE ON portfolio_holdings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for watchlists
CREATE TRIGGER update_watchlists_updated_at
    BEFORE UPDATE ON watchlists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for alert_subscriptions
CREATE TRIGGER update_alert_subscriptions_updated_at
    BEFORE UPDATE ON alert_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SECTION 5: DEFAULT DATA INITIALIZATION FUNCTION
-- =====================================================

-- Function to create default portfolio and watchlist for new users
CREATE OR REPLACE FUNCTION create_default_user_collections()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default portfolio
    INSERT INTO user_portfolios (user_id, name, is_default)
    VALUES (NEW.id, 'My Portfolio', TRUE);
    
    -- Create default watchlist
    INSERT INTO watchlists (user_id, name, is_default)
    VALUES (NEW.id, 'My Watchlist', TRUE);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create defaults when user is created
CREATE TRIGGER create_user_defaults
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_user_collections();

-- =====================================================
-- SECTION 6: HELPER VIEWS
-- =====================================================

-- View for portfolio summary with current values (placeholder for join with price data)
CREATE OR REPLACE VIEW portfolio_summary AS
SELECT 
    up.portfolio_id,
    up.user_id,
    up.name AS portfolio_name,
    COUNT(ph.holding_id) AS total_holdings,
    SUM(ph.quantity * COALESCE(ph.average_buy_price, 0)) AS total_invested,
    up.created_at,
    up.updated_at
FROM user_portfolios up
LEFT JOIN portfolio_holdings ph ON up.portfolio_id = ph.portfolio_id
GROUP BY up.portfolio_id, up.user_id, up.name, up.created_at, up.updated_at;

-- View for watchlist summary
CREATE OR REPLACE VIEW watchlist_summary AS
SELECT 
    w.watchlist_id,
    w.user_id,
    w.name AS watchlist_name,
    COUNT(wi.item_id) AS total_items,
    w.created_at,
    w.updated_at
FROM watchlists w
LEFT JOIN watchlist_items wi ON w.watchlist_id = wi.watchlist_id
GROUP BY w.watchlist_id, w.user_id, w.name, w.created_at, w.updated_at;

-- View for active alerts summary
CREATE OR REPLACE VIEW active_alerts_summary AS
SELECT 
    user_id,
    COUNT(*) FILTER (WHERE status = 'active') AS active_alerts,
    COUNT(*) FILTER (WHERE status = 'paused') AS paused_alerts,
    COUNT(*) FILTER (WHERE status = 'triggered') AS triggered_alerts,
    COUNT(*) AS total_alerts
FROM alert_subscriptions
WHERE status != 'deleted'
GROUP BY user_id;

-- =====================================================
-- SECTION 7: RATE LIMITING FOR ALERTS
-- =====================================================

-- Table to track alert creation rate limits
CREATE TABLE alert_rate_limits (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    alerts_created_today INTEGER DEFAULT 0,
    last_reset_date DATE DEFAULT CURRENT_DATE,
    max_alerts_per_day INTEGER DEFAULT 50,
    max_total_alerts INTEGER DEFAULT 100
);

-- Function to check and update rate limits
CREATE OR REPLACE FUNCTION check_alert_rate_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_limit_record alert_rate_limits%ROWTYPE;
    v_current_total INTEGER;
BEGIN
    -- Get or create rate limit record
    INSERT INTO alert_rate_limits (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO UPDATE
    SET alerts_created_today = CASE 
        WHEN alert_rate_limits.last_reset_date < CURRENT_DATE 
        THEN 0 
        ELSE alert_rate_limits.alerts_created_today 
    END,
    last_reset_date = CURRENT_DATE
    RETURNING * INTO v_limit_record;
    
    -- Check daily limit
    IF v_limit_record.alerts_created_today >= v_limit_record.max_alerts_per_day THEN
        RETURN FALSE;
    END IF;
    
    -- Check total alerts limit
    SELECT COUNT(*) INTO v_current_total
    FROM alert_subscriptions
    WHERE user_id = p_user_id AND status IN ('active', 'paused');
    
    IF v_current_total >= v_limit_record.max_total_alerts THEN
        RETURN FALSE;
    END IF;
    
    -- Update counter
    UPDATE alert_rate_limits
    SET alerts_created_today = alerts_created_today + 1
    WHERE user_id = p_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SECTION 8: COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE user_portfolios IS 'User investment portfolios for tracking owned stocks';
COMMENT ON TABLE portfolio_holdings IS 'Individual stock holdings within a portfolio';
COMMENT ON TABLE watchlists IS 'User watchlists for tracking stocks of interest';
COMMENT ON TABLE watchlist_items IS 'Individual stocks within a watchlist';
COMMENT ON TABLE alert_subscriptions IS 'User alert subscriptions with DSL-compatible conditions';
COMMENT ON TABLE alert_history IS 'History of triggered alerts';
COMMENT ON TABLE alert_rate_limits IS 'Rate limiting for alert creation per user';

COMMENT ON COLUMN alert_subscriptions.condition IS 'JSONB condition using screener DSL format. Examples: {"field": "price", "operator": "<", "value": 100} or {"field": "pe_ratio", "operator": "between", "value": [10, 20]}';

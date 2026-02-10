-- Fix views to use 'time' column from price_history instead of 'date'

DROP VIEW IF EXISTS watchlist_with_prices CASCADE;
DROP VIEW IF EXISTS portfolio_with_values CASCADE;

-- Watchlist with prices view
CREATE OR REPLACE VIEW watchlist_with_prices AS
SELECT 
    w.id as watchlist_id,
    w.user_id,
    w.ticker,
    c.company_name,
    c.sector,
    c.industry,
    ph.close as current_price,
    ph.time as price_date,
    ae.price_target_avg as analyst_target,
    ec.earnings_date as next_earnings,
    w.notes,
    w.added_at,
    w.created_at
FROM watchlist w
JOIN companies c ON w.ticker = c.ticker
LEFT JOIN LATERAL (
    SELECT close, time
    FROM price_history 
    WHERE ticker = w.ticker 
    ORDER BY time DESC 
    LIMIT 1
) ph ON TRUE
LEFT JOIN analyst_estimates ae ON w.ticker = ae.ticker
LEFT JOIN LATERAL (
    SELECT earnings_date
    FROM earnings_calendar
    WHERE ticker = w.ticker AND earnings_date >= CURRENT_DATE
    ORDER BY earnings_date ASC
    LIMIT 1
) ec ON TRUE;

-- Portfolio with values view
CREATE OR REPLACE VIEW portfolio_with_values AS
SELECT 
    p.id as portfolio_id,
    p.user_id,
    p.ticker,
    c.company_name,
    c.sector,
    p.quantity,
    p.avg_buy_price,
    p.total_invested,
    ph.close as current_price,
    ph.time as price_date,
    (p.quantity * ph.close) as current_value,
    (p.quantity * ph.close) - (p.quantity * p.avg_buy_price) as gain_loss,
    CASE 
        WHEN p.avg_buy_price > 0 THEN
            ((ph.close - p.avg_buy_price) / p.avg_buy_price * 100)
        ELSE 0
    END as gain_loss_percent,
    p.notes,
    p.added_at,
    p.created_at
FROM portfolio p
JOIN companies c ON p.ticker = c.ticker
LEFT JOIN LATERAL (
    SELECT close, time
    FROM price_history 
    WHERE ticker = p.ticker 
    ORDER BY time DESC 
    LIMIT 1
) ph ON TRUE;

-- Verify views were created
SELECT 'Views created successfully' as status;

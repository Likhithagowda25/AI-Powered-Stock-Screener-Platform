-- Validate latest prices
SELECT *
FROM price_history
ORDER BY time DESC
LIMIT 10;

-- Validate specific ticker
SELECT *
FROM price_history
WHERE ticker = 'INFY.NS'
ORDER BY time DESC
LIMIT 5;

-- Check data volume
SELECT ticker, COUNT(*) AS records
FROM price_history
GROUP BY ticker;
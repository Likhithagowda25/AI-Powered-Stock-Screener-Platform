const db = require('../config/database');
const logger = require('../config/logger');

/**
 * Get Top Gainers
 * Returns top 10 stocks with highest percentage price increase
 */
exports.getTopGainers = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Use Window Functions to find latest 2 price records for each stock
    // Calculate % change: (Current Close - Prev Close) / Prev Close * 100
    const query = `
      WITH LatestPrices AS (
        SELECT 
          ph.ticker,
          ph.close,
          ph.time,
          ROW_NUMBER() OVER (PARTITION BY ph.ticker ORDER BY ph.time DESC) as rn
        FROM price_history ph
        JOIN companies c ON ph.ticker = c.ticker -- Ensure only active companies
      ),
      PriceChanges AS (
        SELECT 
          t1.ticker,
          t1.close as current_price,
          t2.close as prev_close,
          ((t1.close - t2.close) / t2.close * 100) as change_percent
        FROM LatestPrices t1
        JOIN LatestPrices t2 ON t1.ticker = t2.ticker AND t2.rn = 2
        WHERE t1.rn = 1
      )
      SELECT 
        pc.ticker,
        c.name as company_name,
        pc.current_price,
        pc.change_percent,
        c.sector
      FROM PriceChanges pc
      JOIN companies c ON pc.ticker = c.ticker
      ORDER BY pc.change_percent DESC
      LIMIT $1
    `;
    
    const result = await db.query(query, [limit]);
    
    logger.info(`Top Gainers Query Result: ${result.rowCount} rows found`);
    
    if (result.rowCount === 0) {
       // Debug check: is price_history empty?
       try {
         const countCheck = await db.query('SELECT count(*) FROM price_history');
         logger.info(`Total price_history records: ${countCheck.rows[0].count}`);
         
         const companyCheck = await db.query('SELECT count(*) FROM companies');
         logger.info(`Total companies records: ${companyCheck.rows[0].count}`);
       } catch (e) {
         logger.error('Error checking counts', e);
       }
    } else {
       logger.info('Sample result:', result.rows[0]);
    }
    
    res.json({
      success: true,
      count: result.rowCount,
      results: result.rows.map(row => ({
        ticker: row.ticker,
        companyName: row.company_name,
        price: parseFloat(row.current_price),
        change: parseFloat(row.change_percent),
        isPositive: parseFloat(row.change_percent) >= 0,
        sector: row.sector
      }))
    });
  } catch (error) {
    logger.error('Error fetching top gainers', error);
    next(error);
  }
};

/**
 * Get Top Losers
 * Returns top 10 stocks with lowest percentage price increase (most negative)
 */
exports.getTopLosers = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const query = `
      WITH LatestPrices AS (
        SELECT 
          ph.ticker,
          ph.close,
          ph.time,
          ROW_NUMBER() OVER (PARTITION BY ph.ticker ORDER BY ph.time DESC) as rn
        FROM price_history ph
        JOIN companies c ON ph.ticker = c.ticker
      ),
      PriceChanges AS (
        SELECT 
          t1.ticker,
          t1.close as current_price,
          t2.close as prev_close,
          ((t1.close - t2.close) / t2.close * 100) as change_percent
        FROM LatestPrices t1
        JOIN LatestPrices t2 ON t1.ticker = t2.ticker AND t2.rn = 2
        WHERE t1.rn = 1
      )
      SELECT 
        pc.ticker,
        c.name as company_name,
        pc.current_price,
        pc.change_percent,
        c.sector
      FROM PriceChanges pc
      JOIN companies c ON pc.ticker = c.ticker
      ORDER BY pc.change_percent ASC
      LIMIT $1
    `;
    
    const result = await db.query(query, [limit]);
    
    res.json({
      success: true,
      count: result.rowCount,
      results: result.rows.map(row => ({
        ticker: row.ticker,
        companyName: row.company_name,
        price: parseFloat(row.current_price),
        change: parseFloat(row.change_percent),
        isPositive: parseFloat(row.change_percent) >= 0, // Should be false mostly
        sector: row.sector
      }))
    });
  } catch (error) {
    logger.error('Error fetching top losers', error);
    next(error);
  }
};

/**
 * Company Service
 * Business logic for company-specific data including historical charts
 */

const db = require('../config/database');
const logger = require('../config/logger');
const { ApiError } = require('../middleware/errorHandler');

class CompanyService {
  /**
   * Get historical price data for a stock
   * @param {string} ticker - Stock ticker symbol
   * @param {number} days - Number of days of history (default: 365)
   */
  async getPriceHistory(ticker, days = 365) {
    const query = `
      SELECT 
        time::date AS date,
        open,
        high,
        low,
        close,
        volume
      FROM price_history
      WHERE ticker = $1
        AND time >= NOW() - INTERVAL '${days} days'
      ORDER BY time ASC
    `;
    
    try {
      const result = await db.query(query, [ticker.toUpperCase()]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching price history:', { ticker, error: error.message });
      throw new ApiError(500, 'Failed to fetch price history', 'PRICE_HISTORY_ERROR');
    }
  }

  /**
   * Get fundamentals time-series data (revenue, earnings, debt/FCF, PEG)
   * @param {string} ticker - Stock ticker symbol
   */
  async getFundamentalsHistory(ticker) {
    try {
      // Get all quarterly fundamentals including debt and FCF data
      const quarterlyQuery = `
        SELECT 
          quarter,
          revenue,
          net_income,
          eps,
          ebitda,
          pe_ratio,
          peg_ratio,
          revenue_growth_yoy,
          ebitda_growth_yoy,
          total_debt,
          debt_to_equity,
          free_cash_flow
        FROM fundamentals_quarterly
        WHERE ticker = $1
        ORDER BY quarter DESC
        LIMIT 12
      `;
      
      const quarterlyResult = await db.query(quarterlyQuery, [ticker.toUpperCase()]);
      const quarters = quarterlyResult.rows.reverse(); // Oldest first for charts
      
      // Build response data
      const revenueHistory = quarters.map(q => ({
        quarter: q.quarter,
        revenue: Number(q.revenue) || 0,
        growth: Number(q.revenue_growth_yoy) || null
      }));
      
      const earningsHistory = quarters.map(q => ({
        quarter: q.quarter,
        eps: Number(q.eps) || 0,
        netIncome: Number(q.net_income) || 0
      }));
      
      // Debt/FCF ratio history - use data from fundamentals_quarterly
      const debtFcfHistory = quarters
        .filter(q => q.total_debt !== null || q.debt_to_equity !== null)
        .map(q => {
          const debtValue = Number(q.total_debt) || 0;
          const fcfValue = Number(q.free_cash_flow) || null;
          const debtToEquity = Number(q.debt_to_equity) || null;
          
          return {
            quarter: q.quarter,
            totalDebt: debtValue,
            freeCashFlow: fcfValue,
            debtToEquity: debtToEquity,
            // Use debt/FCF ratio if FCF available, otherwise use debt_to_equity
            ratio: fcfValue && fcfValue !== 0 
              ? Number((debtValue / fcfValue).toFixed(2))
              : (debtToEquity ? Number(debtToEquity.toFixed(2)) : null)
          };
        });
      
      // PEG ratio history
      const pegHistory = quarters
        .filter(q => q.peg_ratio !== null && q.peg_ratio !== undefined)
        .map(q => ({
          quarter: q.quarter,
          peg: Number(q.peg_ratio) || 0
        }));
      
      // If no PEG data, try to calculate from PE and growth
      if (pegHistory.length === 0) {
        const calculatedPeg = quarters
          .filter(q => q.pe_ratio && q.revenue_growth_yoy)
          .map(q => ({
            quarter: q.quarter,
            peg: Number(q.pe_ratio) / Number(q.revenue_growth_yoy) || 0
          }))
          .filter(p => isFinite(p.peg) && p.peg > 0 && p.peg < 100); // Filter out invalid values
        
        if (calculatedPeg.length > 0) {
          pegHistory.push(...calculatedPeg);
        }
      }
      
      return {
        revenue: revenueHistory,
        earnings: earningsHistory,
        debtFcf: debtFcfHistory,
        peg: pegHistory
      };
    } catch (error) {
      logger.error('Error fetching fundamentals history:', { ticker, error: error.message });
      throw new ApiError(500, 'Failed to fetch fundamentals history', 'FUNDAMENTALS_HISTORY_ERROR');
    }
  }

  /**
   * Get company news and announcements
   * For now, returns empty array - can be extended with news API integration
   * @param {string} ticker - Stock ticker symbol
   * @param {number} limit - Maximum number of news items
   */
  async getCompanyNews(ticker, limit = 20) {
    // Placeholder for news integration
    // Could integrate with NewsAPI, Alpha Vantage News, or similar
    logger.debug('News endpoint called for:', { ticker, limit });
    return [];
  }

  /**
   * Get company metadata (sector, industry, etc.)
   * @param {string} ticker - Stock ticker symbol
   */
  async getCompanyMetadata(ticker) {
    const query = `
      SELECT 
        ticker,
        name,
        sector,
        industry,
        exchange,
        market_cap,
        next_earnings_date,
        last_buyback_date
      FROM companies
      WHERE ticker = $1
    `;
    
    try {
      const result = await db.query(query, [ticker.toUpperCase()]);
      
      if (result.rows.length === 0) {
        throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
      }
      
      return result.rows[0];
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error fetching company metadata:', { ticker, error: error.message });
      throw new ApiError(500, 'Failed to fetch company metadata', 'METADATA_ERROR');
    }
  }

  /**
   * Get latest fundamental data for alerts
   */
  async getLatestFundamentals(ticker) {
    const query = `
      SELECT *
      FROM fundamentals_quarterly
      WHERE ticker = $1
      ORDER BY quarter DESC
      LIMIT 1
    `;
    try {
      const result = await db.query(query, [ticker.toUpperCase()]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching latest fundamentals:', { ticker, error: error.message });
      return null;
    }
  }

  /**
   * Get real-time quote (latest price data)
   * @param {string} ticker - Stock ticker symbol
   */
  async getRealTimeQuote(ticker) {
    const query = `
      SELECT 
        time,
        open,
        high,
        low,
        close,
        volume
      FROM price_history
      WHERE ticker = $1
      ORDER BY time DESC
      LIMIT 2
    `;
    
    try {
      const result = await db.query(query, [ticker.toUpperCase()]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const latest = result.rows[0];
      const previous = result.rows[1] || latest;
      
      const change = Number(latest.close) - Number(previous.close);
      const changePercent = previous.close ? ((change / Number(previous.close)) * 100).toFixed(2) : 0;
      
      return {
        ticker: ticker.toUpperCase(),
        price: Number(latest.close),
        open: Number(latest.open),
        high: Number(latest.high),
        low: Number(latest.low),
        volume: Number(latest.volume),
        previousClose: Number(previous.close),
        change: Number(change.toFixed(2)),
        changePercent: Number(changePercent),
        timestamp: latest.time
      };
    } catch (error) {
      logger.error('Error fetching real-time quote:', { ticker, error: error.message });
      throw new ApiError(500, 'Failed to fetch quote', 'QUOTE_ERROR');
    }
  }
}

module.exports = new CompanyService();

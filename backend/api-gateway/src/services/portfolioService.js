/**
 * Portfolio Service
 * Business logic for user portfolio management
 */

const db = require('../config/database');
const logger = require('../config/logger');
const { ApiError } = require('../middleware/errorHandler');

class PortfolioService {
  /**
   * Get all portfolios for a user
   */
  async getUserPortfolios(userId) {
    const query = `
      SELECT 
        p.portfolio_id,
        p.name,
        p.description,
        p.is_default,
        p.currency,
        p.created_at,
        p.updated_at,
        COUNT(h.holding_id) AS total_holdings,
        COALESCE(SUM(h.quantity * h.average_buy_price), 0) AS total_invested
      FROM user_portfolios p
      LEFT JOIN portfolio_holdings h ON p.portfolio_id = h.portfolio_id
      WHERE p.user_id = $1
      GROUP BY p.portfolio_id
      ORDER BY p.is_default DESC, p.created_at ASC
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get a specific portfolio by ID
   */
  async getPortfolioById(portfolioId, userId) {
    console.log('getPortfolioById called with:', { portfolioId, userId });
    
    const query = `
      SELECT 
        p.portfolio_id,
        p.name,
        p.description,
        p.is_default,
        p.currency,
        p.created_at,
        p.updated_at
      FROM user_portfolios p
      WHERE p.portfolio_id = $1 AND p.user_id = $2
    `;
    
    const result = await db.query(query, [portfolioId, userId]);
    console.log('getPortfolioById result rows:', result.rows.length);
    
    if (result.rows.length === 0) {
      throw new ApiError(404, 'Portfolio not found', 'PORTFOLIO_NOT_FOUND');
    }
    
    return result.rows[0];
  }

  /**
   * Create a new portfolio
   */
  async createPortfolio(userId, data) {
    const { name, description, currency = 'INR' } = data;
    
    const query = `
      INSERT INTO user_portfolios (user_id, name, description, currency)
      VALUES ($1, $2, $3, $4)
      RETURNING portfolio_id, name, description, is_default, currency, created_at, updated_at
    `;
    
    try {
      const result = await db.query(query, [userId, name, description, currency]);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new ApiError(409, 'Portfolio with this name already exists', 'DUPLICATE_PORTFOLIO');
      }
      throw error;
    }
  }

  /**
   * Update a portfolio
   */
  async updatePortfolio(portfolioId, userId, data) {
    const { name, description, currency } = data;
    
    // First verify ownership
    await this.getPortfolioById(portfolioId, userId);
    
    const query = `
      UPDATE user_portfolios
      SET 
        name = COALESCE($3, name),
        description = COALESCE($4, description),
        currency = COALESCE($5, currency)
      WHERE portfolio_id = $1 AND user_id = $2
      RETURNING portfolio_id, name, description, is_default, currency, created_at, updated_at
    `;
    
    try {
      const result = await db.query(query, [portfolioId, userId, name, description, currency]);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        throw new ApiError(409, 'Portfolio with this name already exists', 'DUPLICATE_PORTFOLIO');
      }
      throw error;
    }
  }

  /**
   * Delete a portfolio
   */
  async deletePortfolio(portfolioId, userId) {
    // Check if it's the default portfolio
    const portfolio = await this.getPortfolioById(portfolioId, userId);
    
    if (portfolio.is_default) {
      throw new ApiError(400, 'Cannot delete default portfolio', 'CANNOT_DELETE_DEFAULT');
    }
    
    const query = `
      DELETE FROM user_portfolios
      WHERE portfolio_id = $1 AND user_id = $2
      RETURNING portfolio_id
    `;
    
    const result = await db.query(query, [portfolioId, userId]);
    return { deleted: true, portfolio_id: portfolioId };
  }

  /**
   * Get all holdings in a portfolio
   */
  async getPortfolioHoldings(portfolioId, userId) {
    // Verify portfolio ownership
    await this.getPortfolioById(portfolioId, userId);
    
    const query = `
      SELECT 
        h.holding_id,
        h.ticker,
        h.quantity,
        h.average_buy_price,
        h.buy_date,
        h.notes,
        h.created_at,
        h.updated_at,
        c.name AS company_name,
        c.sector,
        c.industry
      FROM portfolio_holdings h
      LEFT JOIN companies c ON h.ticker = c.ticker
      WHERE h.portfolio_id = $1
      ORDER BY h.created_at DESC
    `;
    
    const result = await db.query(query, [portfolioId]);
    return result.rows;
  }

  /**
   * Add a stock to portfolio
   * If the ticker already exists, update the quantity and recalculate average buy price
   * Otherwise, create a new holding
   */
  async addHolding(portfolioId, userId, data) {
    // Verify portfolio ownership
    await this.getPortfolioById(portfolioId, userId);
    
    const { ticker, quantity, average_buy_price, buy_date, notes } = data;
    const normalizedTicker = ticker.toUpperCase();
    
    // Check if the ticker already exists in this portfolio
    const checkQuery = `
      SELECT holding_id, quantity, average_buy_price
      FROM portfolio_holdings
      WHERE portfolio_id = $1 AND ticker = $2
    `;
    
    const existingHolding = await db.query(checkQuery, [portfolioId, normalizedTicker]);
    
    if (existingHolding.rows.length > 0) {
      // Ticker exists - update the existing holding
      const existing = existingHolding.rows[0];
      
      // Calculate new total quantity
      const newQuantity = parseFloat(existing.quantity) + parseFloat(quantity);
      
      // Calculate weighted average buy price
      // Formula: [(old_qty * old_price) + (new_qty * new_price)] / total_qty
      const oldInvestment = parseFloat(existing.quantity) * parseFloat(existing.average_buy_price);
      const newInvestment = parseFloat(quantity) * parseFloat(average_buy_price);
      const newAverageBuyPrice = (oldInvestment + newInvestment) / newQuantity;
      
      // Update the existing holding
      const updateQuery = `
        UPDATE portfolio_holdings
        SET 
          quantity = $1,
          average_buy_price = $2,
          notes = COALESCE($3, notes),
          updated_at = CURRENT_TIMESTAMP
        WHERE holding_id = $4
        RETURNING holding_id, ticker, quantity, average_buy_price, buy_date, notes, updated_at
      `;
      
      const result = await db.query(updateQuery, [
        newQuantity,
        newAverageBuyPrice,
        notes || null,
        existing.holding_id
      ]);
      
      logger.info('Holding aggregated', {
        portfolioId,
        ticker: normalizedTicker,
        oldQuantity: existing.quantity,
        addedQuantity: quantity,
        newQuantity,
        oldAvgPrice: existing.average_buy_price,
        newAvgPrice: newAverageBuyPrice
      });
      
      return {
        ...result.rows[0],
        action: 'updated',
        previous_quantity: existing.quantity,
        added_quantity: quantity
      };
    } else {
      // Ticker doesn't exist - create new holding
      const insertQuery = `
        INSERT INTO portfolio_holdings (portfolio_id, ticker, quantity, average_buy_price, buy_date, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING holding_id, ticker, quantity, average_buy_price, buy_date, notes, created_at
      `;
      
      const result = await db.query(insertQuery, [
        portfolioId, normalizedTicker, quantity, average_buy_price, buy_date, notes
      ]);
      
      logger.info('New holding created', {
        portfolioId,
        ticker: normalizedTicker,
        quantity,
        averageBuyPrice: average_buy_price
      });
      
      return {
        ...result.rows[0],
        action: 'created'
      };
    }
  }

  /**
   * Update a holding
   */
  async updateHolding(holdingId, portfolioId, userId, data) {
    // Verify portfolio ownership
    await this.getPortfolioById(portfolioId, userId);
    
    const { quantity, average_buy_price, buy_date, notes } = data;
    
    const query = `
      UPDATE portfolio_holdings
      SET 
        quantity = COALESCE($3, quantity),
        average_buy_price = COALESCE($4, average_buy_price),
        buy_date = COALESCE($5, buy_date),
        notes = COALESCE($6, notes)
      WHERE holding_id = $1 AND portfolio_id = $2
      RETURNING holding_id, ticker, quantity, average_buy_price, buy_date, notes, updated_at
    `;
    
    const result = await db.query(query, [
      holdingId, portfolioId, quantity, average_buy_price, buy_date, notes
    ]);
    
    if (result.rows.length === 0) {
      throw new ApiError(404, 'Holding not found', 'HOLDING_NOT_FOUND');
    }
    
    return result.rows[0];
  }

  /**
   * Remove a holding from portfolio
   */
  async removeHolding(holdingId, portfolioId, userId) {
    // Verify portfolio ownership
    await this.getPortfolioById(portfolioId, userId);
    
    const query = `
      DELETE FROM portfolio_holdings
      WHERE holding_id = $1 AND portfolio_id = $2
      RETURNING holding_id, ticker
    `;
    
    const result = await db.query(query, [holdingId, portfolioId]);
    
    if (result.rows.length === 0) {
      throw new ApiError(404, 'Holding not found', 'HOLDING_NOT_FOUND');
    }
    
    return { deleted: true, holding_id: holdingId, ticker: result.rows[0].ticker };
  }

  /**
   * Get portfolio summary with current prices
   */
  async getPortfolioSummary(portfolioId, userId) {
    // Verify portfolio ownership
    const portfolio = await this.getPortfolioById(portfolioId, userId);
    
    const holdingsQuery = `
      SELECT 
        h.holding_id,
        h.ticker,
        h.quantity,
        h.average_buy_price,
        c.name AS company_name,
        c.sector,
        (
          SELECT close 
          FROM price_history 
          WHERE ticker = h.ticker 
          ORDER BY time DESC 
          LIMIT 1
        ) AS current_price
      FROM portfolio_holdings h
      LEFT JOIN companies c ON h.ticker = c.ticker
      WHERE h.portfolio_id = $1
    `;
    
    const result = await db.query(holdingsQuery, [portfolioId]);
    
    let totalInvested = 0;
    let totalCurrentValue = 0;
    
    const holdings = result.rows.map(h => {
      const invested = h.quantity * (h.average_buy_price || 0);
      const currentValue = h.quantity * (h.current_price || h.average_buy_price || 0);
      const gainLoss = currentValue - invested;
      const gainLossPercent = invested > 0 ? ((gainLoss / invested) * 100) : 0;
      
      totalInvested += invested;
      totalCurrentValue += currentValue;
      
      return {
        ...h,
        invested,
        current_value: currentValue,
        gain_loss: gainLoss,
        gain_loss_percent: gainLossPercent
      };
    });
    
    const totalGainLoss = totalCurrentValue - totalInvested;
    const totalGainLossPercent = totalInvested > 0 ? ((totalGainLoss / totalInvested) * 100) : 0;
    
    return {
      portfolio,
      summary: {
        total_holdings: holdings.length,
        total_invested: totalInvested,
        total_current_value: totalCurrentValue,
        total_gain_loss: totalGainLoss,
        total_gain_loss_percent: totalGainLossPercent
      },
      holdings
    };
  }

  /**
   * Validate ticker exists in companies table
   */
  async validateTicker(ticker) {
    const query = `SELECT ticker FROM companies WHERE ticker = $1`;
    const result = await db.query(query, [ticker.toUpperCase()]);
    
    if (result.rows.length === 0) {
      throw new ApiError(400, `Invalid ticker symbol: ${ticker}`, 'INVALID_TICKER');
    }
    
    return true;
  }
}

module.exports = new PortfolioService();

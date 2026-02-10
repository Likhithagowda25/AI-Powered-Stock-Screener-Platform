/**
 * Watchlist Service
 * Business logic for user watchlist management
 */

const db = require('../config/database');
const logger = require('../config/logger');
const { ApiError } = require('../middleware/errorHandler');

class WatchlistService {
  /**
   * Get all watchlists for a user
   */
  async getUserWatchlists(userId) {
    const query = `
      SELECT 
        w.watchlist_id,
        w.name,
        w.description,
        w.is_default,
        w.created_at,
        w.updated_at,
        COUNT(wi.item_id) AS total_items
      FROM watchlists w
      LEFT JOIN watchlist_items wi ON w.watchlist_id = wi.watchlist_id
      WHERE w.user_id = $1
      GROUP BY w.watchlist_id
      ORDER BY w.is_default DESC, w.created_at ASC
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get a specific watchlist by ID
   */
  async getWatchlistById(watchlistId, userId) {
    const query = `
      SELECT 
        w.watchlist_id,
        w.name,
        w.description,
        w.is_default,
        w.created_at,
        w.updated_at
      FROM watchlists w
      WHERE w.watchlist_id = $1 AND w.user_id = $2
    `;
    
    const result = await db.query(query, [watchlistId, userId]);
    
    if (result.rows.length === 0) {
      throw new ApiError(404, 'Watchlist not found', 'WATCHLIST_NOT_FOUND');
    }
    
    return result.rows[0];
  }

  /**
   * Create a new watchlist
   */
  async createWatchlist(userId, data) {
    const { name, description } = data;
    
    const query = `
      INSERT INTO watchlists (user_id, name, description)
      VALUES ($1, $2, $3)
      RETURNING watchlist_id, name, description, is_default, created_at, updated_at
    `;
    
    try {
      const result = await db.query(query, [userId, name, description]);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        throw new ApiError(409, 'Watchlist with this name already exists', 'DUPLICATE_WATCHLIST');
      }
      throw error;
    }
  }

  /**
   * Update a watchlist
   */
  async updateWatchlist(watchlistId, userId, data) {
    const { name, description } = data;
    
    // Verify ownership
    await this.getWatchlistById(watchlistId, userId);
    
    const query = `
      UPDATE watchlists
      SET 
        name = COALESCE($3, name),
        description = COALESCE($4, description)
      WHERE watchlist_id = $1 AND user_id = $2
      RETURNING watchlist_id, name, description, is_default, created_at, updated_at
    `;
    
    try {
      const result = await db.query(query, [watchlistId, userId, name, description]);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        throw new ApiError(409, 'Watchlist with this name already exists', 'DUPLICATE_WATCHLIST');
      }
      throw error;
    }
  }

  /**
   * Delete a watchlist
   */
  async deleteWatchlist(watchlistId, userId) {
    const watchlist = await this.getWatchlistById(watchlistId, userId);
    
    if (watchlist.is_default) {
      throw new ApiError(400, 'Cannot delete default watchlist', 'CANNOT_DELETE_DEFAULT');
    }
    
    const query = `
      DELETE FROM watchlists
      WHERE watchlist_id = $1 AND user_id = $2
      RETURNING watchlist_id
    `;
    
    await db.query(query, [watchlistId, userId]);
    return { deleted: true, watchlist_id: watchlistId };
  }

  /**
   * Get all items in a watchlist with current prices
   */
  async getWatchlistItems(watchlistId, userId) {
    // Verify ownership
    await this.getWatchlistById(watchlistId, userId);
    
    const query = `
      SELECT 
        wi.item_id,
        wi.ticker,
        wi.added_price,
        wi.target_price,
        wi.notes,
        wi.created_at,
        c.name AS company_name,
        c.sector,
        c.industry,
        c.market_cap,
        (
          SELECT close 
          FROM price_history 
          WHERE ticker = wi.ticker 
          ORDER BY time DESC 
          LIMIT 1
        ) AS current_price
      FROM watchlist_items wi
      LEFT JOIN companies c ON wi.ticker = c.ticker
      WHERE wi.watchlist_id = $1
      ORDER BY wi.created_at DESC
    `;
    
    const result = await db.query(query, [watchlistId]);
    
    // Calculate price changes
    return result.rows.map(item => {
      const priceChange = item.current_price && item.added_price
        ? item.current_price - item.added_price
        : null;
      const priceChangePercent = item.added_price && priceChange
        ? ((priceChange / item.added_price) * 100).toFixed(2)
        : null;
      
      return {
        ...item,
        price_change: priceChange,
        price_change_percent: priceChangePercent
      };
    });
  }

  /**
   * Add a stock to watchlist
   * If already exists, returns existing item with a message instead of error
   */
  async addItem(watchlistId, userId, data) {
    // Verify ownership
    await this.getWatchlistById(watchlistId, userId);
    
    const { ticker, target_price, notes } = data;
    const normalizedTicker = ticker.toUpperCase();
    
    // Check if ticker already exists in this watchlist
    const checkQuery = `
      SELECT item_id, ticker, added_price, target_price, notes, created_at
      FROM watchlist_items
      WHERE watchlist_id = $1 AND ticker = $2
    `;
    const existingItem = await db.query(checkQuery, [watchlistId, normalizedTicker]);
    
    if (existingItem.rows.length > 0) {
      // Already in watchlist - return success with the existing item
      logger.info('Stock already in watchlist', { watchlistId, ticker: normalizedTicker });
      return {
        ...existingItem.rows[0],
        action: 'already_exists',
        message: `${normalizedTicker} is already in your watchlist`
      };
    }
    
    // Get current price to store as added_price
    const priceQuery = `
      SELECT close as price 
      FROM price_history 
      WHERE ticker = $1 
      ORDER BY time DESC 
      LIMIT 1
    `;
    const priceResult = await db.query(priceQuery, [normalizedTicker]);
    const addedPrice = priceResult.rows[0]?.price || null;
    
    const query = `
      INSERT INTO watchlist_items (watchlist_id, ticker, added_price, target_price, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING item_id, ticker, added_price, target_price, notes, created_at
    `;
    
    const result = await db.query(query, [
      watchlistId, normalizedTicker, addedPrice, target_price, notes
    ]);
    
    logger.info('Stock added to watchlist', { watchlistId, ticker: normalizedTicker });
    
    return {
      ...result.rows[0],
      action: 'created',
      message: `${normalizedTicker} added to watchlist`
    };
  }

  /**
   * Update a watchlist item
   */
  async updateItem(itemId, watchlistId, userId, data) {
    // Verify ownership
    await this.getWatchlistById(watchlistId, userId);
    
    const { target_price, notes } = data;
    
    const query = `
      UPDATE watchlist_items
      SET 
        target_price = COALESCE($3, target_price),
        notes = COALESCE($4, notes)
      WHERE item_id = $1 AND watchlist_id = $2
      RETURNING item_id, ticker, added_price, target_price, notes, created_at
    `;
    
    const result = await db.query(query, [itemId, watchlistId, target_price, notes]);
    
    if (result.rows.length === 0) {
      throw new ApiError(404, 'Watchlist item not found', 'ITEM_NOT_FOUND');
    }
    
    return result.rows[0];
  }

  /**
   * Remove a stock from watchlist
   */
  async removeItem(itemId, watchlistId, userId) {
    // Verify ownership
    await this.getWatchlistById(watchlistId, userId);
    
    const query = `
      DELETE FROM watchlist_items
      WHERE item_id = $1 AND watchlist_id = $2
      RETURNING item_id, ticker
    `;
    
    const result = await db.query(query, [itemId, watchlistId]);
    
    if (result.rows.length === 0) {
      throw new ApiError(404, 'Watchlist item not found', 'ITEM_NOT_FOUND');
    }
    
    return { deleted: true, item_id: itemId, ticker: result.rows[0].ticker };
  }

  /**
   * Remove stock from watchlist by ticker
   */
  async removeItemByTicker(watchlistId, userId, ticker) {
    // Verify ownership
    await this.getWatchlistById(watchlistId, userId);
    
    const query = `
      DELETE FROM watchlist_items
      WHERE watchlist_id = $1 AND ticker = $2
      RETURNING item_id, ticker
    `;
    
    const result = await db.query(query, [watchlistId, ticker.toUpperCase()]);
    
    if (result.rows.length === 0) {
      throw new ApiError(404, 'Stock not found in watchlist', 'ITEM_NOT_FOUND');
    }
    
    return { deleted: true, ticker: result.rows[0].ticker };
  }

  /**
   * Check if a stock is in any of user's watchlists
   */
  async isStockInWatchlist(userId, ticker) {
    const query = `
      SELECT w.watchlist_id, w.name, wi.item_id
      FROM watchlist_items wi
      JOIN watchlists w ON wi.watchlist_id = w.watchlist_id
      WHERE w.user_id = $1 AND wi.ticker = $2
    `;
    
    const result = await db.query(query, [userId, ticker.toUpperCase()]);
    return result.rows;
  }

  /**
   * Validate ticker exists
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

module.exports = new WatchlistService();

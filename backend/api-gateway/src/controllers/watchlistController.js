/**
 * Watchlist Controller
 * HTTP request handlers for watchlist management
 */

const watchlistService = require('../services/watchlistService');
const logger = require('../config/logger');

/**
 * Get all watchlists for the authenticated user
 */
const getWatchlists = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.body?.user_id || req.user?.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    const watchlists = await watchlistService.getUserWatchlists(userId);
    
    res.json({
      success: true,
      data: watchlists,
      count: watchlists.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific watchlist by ID
 */
const getWatchlistById = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.body?.user_id || req.user?.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    const { watchlistId } = req.params;
    
    const watchlist = await watchlistService.getWatchlistById(watchlistId, userId);
    
    res.json({
      success: true,
      data: watchlist
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new watchlist
 */
const createWatchlist = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.body?.user_id || req.user?.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    const watchlist = await watchlistService.createWatchlist(userId, req.body);
    
    logger.info('Watchlist created', { watchlistId: watchlist.watchlist_id, userId });
    
    res.status(201).json({
      success: true,
      message: 'Watchlist created successfully',
      data: watchlist
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a watchlist
 */
const updateWatchlist = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.body?.user_id || req.user?.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    const { watchlistId } = req.params;
    
    const watchlist = await watchlistService.updateWatchlist(watchlistId, userId, req.body);
    
    res.json({
      success: true,
      message: 'Watchlist updated successfully',
      data: watchlist
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a watchlist
 */
const deleteWatchlist = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.body?.user_id || req.user?.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    const { watchlistId } = req.params;
    
    const result = await watchlistService.deleteWatchlist(watchlistId, userId);
    
    logger.info('Watchlist deleted', { watchlistId, userId });
    
    res.json({
      success: true,
      message: 'Watchlist deleted successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all items in a watchlist
 */
const getItems = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.body?.user_id || req.user?.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    const { watchlistId } = req.params;
    
    const items = await watchlistService.getWatchlistItems(watchlistId, userId);
    
    res.json({
      success: true,
      data: items,
      count: items.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a stock to watchlist
 */
const addItem = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.body?.user_id || req.user?.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    const { watchlistId } = req.params;
    
    const item = await watchlistService.addItem(watchlistId, userId, req.body);
    
    // Return different messages based on action
    const message = item.action === 'already_exists' 
      ? item.message 
      : 'Stock added to watchlist';
    
    const statusCode = item.action === 'already_exists' ? 200 : 201;
    
    logger.info('Watchlist addItem result', { 
      watchlistId, 
      ticker: item.ticker, 
      action: item.action,
      userId 
    });
    
    res.status(statusCode).json({
      success: true,
      message,
      data: item
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a watchlist item
 */
const updateItem = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.body?.user_id || req.user?.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    const { watchlistId, itemId } = req.params;
    
    const item = await watchlistService.updateItem(itemId, watchlistId, userId, req.body);
    
    res.json({
      success: true,
      message: 'Watchlist item updated successfully',
      data: item
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a stock from watchlist
 */
const removeItem = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.body?.user_id || req.user?.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    const { watchlistId, itemId } = req.params;
    
    const result = await watchlistService.removeItem(itemId, watchlistId, userId);
    
    logger.info('Item removed from watchlist', { watchlistId, itemId, ticker: result.ticker, userId });
    
    res.json({
      success: true,
      message: 'Stock removed from watchlist',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove stock by ticker from watchlist
 */
const removeItemByTicker = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.body?.user_id || req.user?.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    const { watchlistId, ticker } = req.params;
    
    const result = await watchlistService.removeItemByTicker(watchlistId, userId, ticker);
    
    logger.info('Item removed from watchlist by ticker', { watchlistId, ticker, userId });
    
    res.json({
      success: true,
      message: 'Stock removed from watchlist',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check if stock is in any watchlist
 */
const checkStockInWatchlists = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.body?.user_id || req.user?.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    const { ticker } = req.params;
    
    const watchlists = await watchlistService.isStockInWatchlist(userId, ticker);
    
    res.json({
      success: true,
      data: {
        ticker: ticker.toUpperCase(),
        in_watchlists: watchlists,
        is_watched: watchlists.length > 0
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWatchlists,
  getWatchlistById,
  createWatchlist,
  updateWatchlist,
  deleteWatchlist,
  getItems,
  addItem,
  updateItem,
  removeItem,
  removeItemByTicker,
  checkStockInWatchlists
};

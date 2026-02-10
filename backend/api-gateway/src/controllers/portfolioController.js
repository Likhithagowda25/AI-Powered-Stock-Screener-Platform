/**
 * Portfolio Controller
 * HTTP request handlers for portfolio management
 */

const portfolioService = require('../services/portfolioService');
const logger = require('../config/logger');

/**
 * Get all portfolios for the authenticated user
 */
const getPortfolios = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.user?.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    const portfolios = await portfolioService.getUserPortfolios(userId);
    
    res.json({
      success: true,
      data: portfolios,
      count: portfolios.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific portfolio by ID
 */
const getPortfolioById = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.body?.user_id || req.user?.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    const { portfolioId } = req.params;
    
    const portfolio = await portfolioService.getPortfolioById(portfolioId, userId);
    
    res.json({
      success: true,
      data: portfolio
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new portfolio
 */
const createPortfolio = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.body?.user_id || req.user?.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    const portfolio = await portfolioService.createPortfolio(userId, req.body);
    
    logger.info('Portfolio created', { portfolioId: portfolio.portfolio_id, userId });
    
    res.status(201).json({
      success: true,
      message: 'Portfolio created successfully',
      data: portfolio
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a portfolio
 */
const updatePortfolio = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.body?.user_id || req.user?.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    const { portfolioId } = req.params;
    
    const portfolio = await portfolioService.updatePortfolio(portfolioId, userId, req.body);
    
    res.json({
      success: true,
      message: 'Portfolio updated successfully',
      data: portfolio
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a portfolio
 */
const deletePortfolio = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.body?.user_id || req.user?.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    const { portfolioId } = req.params;
    
    const result = await portfolioService.deletePortfolio(portfolioId, userId);
    
    logger.info('Portfolio deleted', { portfolioId, userId });
    
    res.json({
      success: true,
      message: 'Portfolio deleted successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get portfolio summary with holdings and current values
 */
const getPortfolioSummary = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.body?.user_id || req.user?.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    const { portfolioId } = req.params;
    
    const summary = await portfolioService.getPortfolioSummary(portfolioId, userId);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all holdings in a portfolio
 */
const getHoldings = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.body?.user_id || req.user?.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    const { portfolioId } = req.params;
    
    const holdings = await portfolioService.getPortfolioHoldings(portfolioId, userId);
    
    res.json({
      success: true,
      data: holdings,
      count: holdings.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a stock to portfolio
 */
const addHolding = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.body.user_id || req.user?.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    const { portfolioId } = req.params;
    
    const holding = await portfolioService.addHolding(portfolioId, userId, req.body);
    
    logger.info('Holding added', { portfolioId, ticker: holding.ticker, userId });
    
    // Provide different messages based on whether it was created or updated
    const message = holding.action === 'updated' 
      ? `Stock updated: Added ${holding.added_quantity} shares. Total quantity is now ${holding.quantity} shares.`
      : 'Stock added to portfolio';
    
    res.status(201).json({
      success: true,
      message,
      data: holding
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a holding
 */
const updateHolding = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.body?.user_id || req.user?.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    const { portfolioId, holdingId } = req.params;
    
    const holding = await portfolioService.updateHolding(holdingId, portfolioId, userId, req.body);
    
    res.json({
      success: true,
      message: 'Holding updated successfully',
      data: holding
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a holding from portfolio
 */
const removeHolding = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.body?.user_id || req.user?.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    const { portfolioId, holdingId } = req.params;
    
    const result = await portfolioService.removeHolding(holdingId, portfolioId, userId);
    
    logger.info('Holding removed', { portfolioId, holdingId, ticker: result.ticker, userId });
    
    res.json({
      success: true,
      message: 'Stock removed from portfolio',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPortfolios,
  getPortfolioById,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  getPortfolioSummary,
  getHoldings,
  addHolding,
  updateHolding,
  removeHolding
};

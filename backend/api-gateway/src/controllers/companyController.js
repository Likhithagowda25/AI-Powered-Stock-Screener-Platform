/**
 * Company Controller
 * Handles HTTP requests for company-specific endpoints
 */

const companyService = require('../services/companyService');
const logger = require('../config/logger');

/**
 * GET /company/:ticker/price-history
 * Get historical price data for a stock
 */
const getPriceHistory = async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const days = parseInt(req.query.days) || 365;
    
    const data = await companyService.getPriceHistory(ticker, days);
    
    res.json({
      success: true,
      data,
      meta: {
        ticker: ticker.toUpperCase(),
        days,
        count: data.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /company/:ticker/fundamentals-history
 * Get fundamentals time-series data
 */
const getFundamentalsHistory = async (req, res, next) => {
  try {
    const { ticker } = req.params;
    
    const data = await companyService.getFundamentalsHistory(ticker);
    
    res.json({
      success: true,
      data,
      meta: {
        ticker: ticker.toUpperCase()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /company/:ticker/news
 * Get company news and announcements
 */
const getCompanyNews = async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    
    const data = await companyService.getCompanyNews(ticker, limit);
    
    res.json({
      success: true,
      data,
      meta: {
        ticker: ticker.toUpperCase(),
        limit,
        count: data.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /company/:ticker/metadata
 * Get company metadata (sector, industry, etc.)
 */
const getCompanyMetadata = async (req, res, next) => {
  try {
    const { ticker } = req.params;
    
    const data = await companyService.getCompanyMetadata(ticker);
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /company/:ticker/quote
 * Get real-time quote for a stock
 */
const getRealTimeQuote = async (req, res, next) => {
  try {
    const { ticker } = req.params;
    
    const data = await companyService.getRealTimeQuote(ticker);
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPriceHistory,
  getFundamentalsHistory,
  getCompanyNews,
  getCompanyMetadata,
  getRealTimeQuote
};

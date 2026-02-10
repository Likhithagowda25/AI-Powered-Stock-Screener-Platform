/**
 * Company Routes
 * API endpoints for company-specific data including historical charts
 */

const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');

// ==========================================
// Company Data Routes (Public)
// ==========================================

/**
 * GET /company/:ticker/price-history
 * Get historical price data for charts
 * Query params: days (optional, default: 365)
 */
router.get('/:ticker/price-history', companyController.getPriceHistory);

/**
 * GET /company/:ticker/fundamentals-history
 * Get fundamentals time-series (revenue, earnings, debt/FCF, PEG)
 */
router.get('/:ticker/fundamentals-history', companyController.getFundamentalsHistory);

/**
 * GET /company/:ticker/news
 * Get company news and announcements
 * Query params: limit (optional, default: 20)
 */
router.get('/:ticker/news', companyController.getCompanyNews);

/**
 * GET /company/:ticker/metadata
 * Get company metadata (sector, industry, etc.)
 */
router.get('/:ticker/metadata', companyController.getCompanyMetadata);

/**
 * GET /company/:ticker/quote
 * Get real-time quote for a stock
 */
router.get('/:ticker/quote', companyController.getRealTimeQuote);

module.exports = router;

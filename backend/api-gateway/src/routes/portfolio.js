/**
 * Portfolio Routes
 * API endpoints for portfolio management
 */

const express = require('express');
const router = express.Router();
const portfolioController = require('../controllers/portfolioController');
const { authenticate } = require('../middleware/authenticate');
const { validatePortfolio, validateHolding } = require('../middleware/portfolioValidator');

/**
 * GET /portfolios
 * Get all portfolios for the authenticated user
 */
router.get('/', portfolioController.getPortfolios);

/**
 * POST /portfolios
 * Create a new portfolio
 * Body: { name, description?, currency? }
 */
router.post('/', validatePortfolio, portfolioController.createPortfolio);

/**
 * GET /portfolios/:portfolioId
 * Get a specific portfolio
 */
router.get('/:portfolioId', portfolioController.getPortfolioById);

/**
 * PUT /portfolios/:portfolioId
 * Update a portfolio
 * Body: { name?, description?, currency? }
 */
router.put('/:portfolioId', validatePortfolio, portfolioController.updatePortfolio);

/**
 * DELETE /portfolios/:portfolioId
 * Delete a portfolio (not default)
 */
router.delete('/:portfolioId', portfolioController.deletePortfolio);

/**
 * GET /portfolios/:portfolioId/summary
 * Get portfolio summary with current values
 */
router.get('/:portfolioId/summary', portfolioController.getPortfolioSummary);

// ==========================================
// Holdings Routes
// ==========================================

/**
 * GET /portfolios/:portfolioId/holdings
 * Get all holdings in a portfolio
 */
router.get('/:portfolioId/holdings', portfolioController.getHoldings);

/**
 * POST /portfolios/:portfolioId/holdings
 * Add a stock to portfolio
 * Body: { ticker, quantity, average_buy_price?, buy_date?, notes? }
 */
router.post('/:portfolioId/holdings', validateHolding, portfolioController.addHolding);

/**
 * PUT /portfolios/:portfolioId/holdings/:holdingId
 * Update a holding
 * Body: { quantity?, average_buy_price?, buy_date?, notes? }
 */
router.put('/:portfolioId/holdings/:holdingId', validateHolding, portfolioController.updateHolding);

/**
 * DELETE /portfolios/:portfolioId/holdings/:holdingId
 * Remove a stock from portfolio
 */
router.delete('/:portfolioId/holdings/:holdingId', portfolioController.removeHolding);

module.exports = router;

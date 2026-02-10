/**
 * Watchlist Routes
 * API endpoints for watchlist management
 */

const express = require('express');
const router = express.Router();
const watchlistController = require('../controllers/watchlistController');
const { authenticate } = require('../middleware/authenticate');
const { validateWatchlist, validateWatchlistItem } = require('../middleware/watchlistValidator');

// All routes require authentication
// TODO: Re-enable authentication when auth system is implemented
// router.use(authenticate);

// ==========================================
// Watchlist Routes
// ==========================================

/**
 * GET /watchlists
 * Get all watchlists for the authenticated user
 */
router.get('/', watchlistController.getWatchlists);

/**
 * POST /watchlists
 * Create a new watchlist
 * Body: { name, description? }
 */
router.post('/', validateWatchlist, watchlistController.createWatchlist);

/**
 * GET /watchlists/check/:ticker
 * Check if a stock is in any of user's watchlists
 */
router.get('/check/:ticker', watchlistController.checkStockInWatchlists);

/**
 * GET /watchlists/:watchlistId
 * Get a specific watchlist
 */
router.get('/:watchlistId', watchlistController.getWatchlistById);

/**
 * PUT /watchlists/:watchlistId
 * Update a watchlist
 * Body: { name?, description? }
 */
router.put('/:watchlistId', validateWatchlist, watchlistController.updateWatchlist);

/**
 * DELETE /watchlists/:watchlistId
 * Delete a watchlist (not default)
 */
router.delete('/:watchlistId', watchlistController.deleteWatchlist);

// ==========================================
// Watchlist Items Routes
// ==========================================

/**
 * GET /watchlists/:watchlistId/items
 * Get all items in a watchlist
 */
router.get('/:watchlistId/items', watchlistController.getItems);

/**
 * POST /watchlists/:watchlistId/items
 * Add a stock to watchlist
 * Body: { ticker, target_price?, notes? }
 */
router.post('/:watchlistId/items', validateWatchlistItem, watchlistController.addItem);

/**
 * PUT /watchlists/:watchlistId/items/:itemId
 * Update a watchlist item
 * Body: { target_price?, notes? }
 */
router.put('/:watchlistId/items/:itemId', validateWatchlistItem, watchlistController.updateItem);

/**
 * DELETE /watchlists/:watchlistId/items/:itemId
 * Remove a stock from watchlist by item ID
 */
router.delete('/:watchlistId/items/:itemId', watchlistController.removeItem);

/**
 * DELETE /watchlists/:watchlistId/items/ticker/:ticker
 * Remove a stock from watchlist by ticker
 */
router.delete('/:watchlistId/items/ticker/:ticker', watchlistController.removeItemByTicker);

module.exports = router;

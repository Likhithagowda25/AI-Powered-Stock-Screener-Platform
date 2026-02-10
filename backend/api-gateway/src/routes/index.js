const express = require('express');
const router = express.Router();
const healthRoutes = require('./healthRoutes');
const metadataRoutes = require('./metadataRoutes');
const authRoutes = require('./auth');
const screenerRoutes = require('./screener');
const portfolioRoutes = require('./portfolio');
const watchlistRoutes = require('./watchlist');
const alertRoutes = require('./alert');
const companyRoutes = require('./company');
const notificationsRoutes = require('./notifications');
const marketRoutes = require('./market');

// Health check routes
router.use('/health', healthRoutes);

// Metadata routes
router.use('/metadata', metadataRoutes);

// Authentication routes
router.use('/auth', authRoutes);

// Screener routes
router.use('/screener', screenerRoutes);

// Portfolio routes
router.use('/portfolios', portfolioRoutes);

// Watchlist routes
router.use('/watchlists', watchlistRoutes);

// Alert routes
router.use('/alerts', alertRoutes);

// Notifications routes
router.use('/notifications', notificationsRoutes);

// Company routes (historical data, charts, news)
router.use('/company', companyRoutes);

// Market routes (top gainers/losers)
router.use('/market', marketRoutes);

module.exports = router;

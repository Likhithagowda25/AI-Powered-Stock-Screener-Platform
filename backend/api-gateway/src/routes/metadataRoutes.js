const express = require('express');
const router = express.Router();
const { query } = require('express-validator');
const metadataController = require('../controllers/metadataController');
const validate = require('../middleware/validator');

/**
 * Metadata routes
 */

// Get list of stocks with optional filters
router.get(
  '/stocks',
  [
    query('sector').optional().isString(),
    query('exchange').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 500 }),
    query('offset').optional().isInt({ min: 0 }),
    validate,
  ],
  metadataController.getStocks
);

module.exports = router;

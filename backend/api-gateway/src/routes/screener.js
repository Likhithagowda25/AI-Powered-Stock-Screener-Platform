const express = require('express');
const router = express.Router();
const { runScreener } = require('../controllers/screenerController');

// POST endpoint for running screener
router.post('/', runScreener);

// GET endpoint for running screener (with query params)
router.get('/run', runScreener);

// POST endpoint for running screener (alternative endpoint)
router.post('/run', runScreener);

module.exports = router;
const express = require('express');
const router = express.Router();
const marketController = require('../controllers/marketController');

router.get('/top-gainers', marketController.getTopGainers);
router.get('/top-losers', marketController.getTopLosers);

module.exports = router;

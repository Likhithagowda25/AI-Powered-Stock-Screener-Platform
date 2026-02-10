const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

/**
 * Health check routes
 */

// General health check
router.get('/', healthController.healthCheck);

// Kubernetes readiness probe
router.get('/ready', healthController.readinessCheck);

// Kubernetes liveness probe
router.get('/live', healthController.livenessCheck);

module.exports = router;

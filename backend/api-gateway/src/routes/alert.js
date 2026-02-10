/**
 * Alert Routes
 * API endpoints for alert subscription management
 */

const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { authenticate } = require('../middleware/authenticate');
const { validateAlert, validateAlertUpdate } = require('../middleware/alertValidator');

// All routes require authentication
// TODO: Re-enable authentication when auth system is implemented
// router.use(authenticate);

// ==========================================
// Alert Summary
// ==========================================

/**
 * GET /alerts/summary
 * Get user's alert summary (counts by status)
 */
router.get('/summary', alertController.getAlertSummary);

// ==========================================
// Alert CRUD Routes
// ==========================================

/**
 * GET /alerts
 * Get all alerts for the authenticated user
 * Query params: status?, type?, ticker?, limit?, offset?
 */
router.get('/', alertController.getAlerts);

/**
 * POST /alerts
 * Create a new alert
 * Body: {
 *   name, description?, ticker?,
 *   alert_type, condition,
 *   frequency?, expires_at?,
 *   notify_push?, notify_email?
 * }
 */
router.post('/', validateAlert, alertController.createAlert);

/**
 * GET /alerts/:alertId
 * Get a specific alert
 */
router.get('/:alertId', alertController.getAlertById);

/**
 * PUT /alerts/:alertId
 * Update an alert
 * Body: { name?, description?, condition?, frequency?, expires_at?, notify_push?, notify_email? }
 */
router.put('/:alertId', validateAlertUpdate, alertController.updateAlert);

/**
 * PATCH /alerts/:alertId
 * Partially update an alert (e.g., toggle is_active status)
 * Body: { is_active?: boolean, alert_name?: string }
 */
router.patch('/:alertId', alertController.updateAlert);

/**
 * DELETE /alerts/:alertId
 * Delete an alert (soft delete)
 */
router.delete('/:alertId', alertController.deleteAlert);

// ==========================================
// Alert Status Routes
// ==========================================

/**
 * POST /alerts/:alertId/enable
 * Enable (activate) an alert
 */
router.post('/:alertId/enable', alertController.enableAlert);

/**
 * POST /alerts/:alertId/disable
 * Disable (pause) an alert
 */
router.post('/:alertId/disable', alertController.disableAlert);

// ==========================================
// Alert History Routes
// ==========================================

/**
 * GET /alerts/:alertId/history
 * Get alert trigger history
 * Query params: limit?
 */
router.get('/:alertId/history', alertController.getAlertHistory);

/**
 * POST /alerts/:alertId/history/:historyId/acknowledge
 * Acknowledge an alert trigger
 */
router.post('/:alertId/history/:historyId/acknowledge', alertController.acknowledgeAlert);

module.exports = router;

/**
 * Alert Controller
 * HTTP request handlers for alert subscription management
 */

const alertService = require('../services/alertService');
const companyService = require('../services/companyService');
const logger = require('../config/logger');

/**
 * Get all alerts for the authenticated user
 */
const getAlerts = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.user?.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    const { status, type, ticker, limit, offset } = req.query;
    
    console.log('[AlertController] Fetching alerts for user:', userId);
    
    const alerts = await alertService.getUserAlerts(userId, {
      status,
      type,
      ticker,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    });
    
    console.log('[AlertController] Retrieved', alerts.length, 'alerts');
    
    res.json({
      success: true,
      data: alerts,
      count: alerts.length
    });
  } catch (error) {
    console.error('[AlertController] Error fetching alerts:', error.message);
    console.error('[AlertController] Stack:', error.stack);
    next(error);
  }
};

/**
 * Get a specific alert by ID
 */
const getAlertById = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.user?.userId || req.headers['x-user-id'];
    const { alertId } = req.params;
    
    const alert = await alertService.getAlertById(alertId, userId);
    
    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new alert
 */
const createAlert = async (req, res, next) => {
  try {
    const userId = req.body?.user_id || req.query.user_id || req.user?.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    
    // Map API fields to Service fields (name -> alert_name)
    // AND Map Frontend Alert Types to DB Enum Types
    
    // Validate Ticker Existence to prevent 500 FK error
    if (req.body.ticker) {
      try {
        await companyService.getCompanyMetadata(req.body.ticker);
      } catch (err) {
         if (err.statusCode === 404 || err.message === 'Company not found') {
           return res.status(400).json({ success: false, error: `Ticker '${req.body.ticker}' not found in database` });
         }
         // Ignore other errors (e.g. DB downstream) and let createAlert handle it or fail
      }
    }

    let dbAlertType = req.body.alert_type;
    let dbCondition = req.body.condition_json || req.body.condition || {};

    switch (req.body.alert_type) {
      case 'price_below_buy_price':
        dbAlertType = 'price_threshold'; 
        // We preserve the condition_json as is for the consumer to handle specific logic
        break;
      case 'price_vs_analyst':
        dbAlertType = 'fundamental_condition'; // or price_threshold depending on implementation
        dbCondition.metric = 'analyst_target'; // Normalized
        break;
      case 'earnings_upcoming':
        dbAlertType = 'event'; // Assumed DB type
        dbCondition.event_type = 'earnings_date';
        break;
      case 'buyback_announced':
        dbAlertType = 'buyback_announced'; // Seems to exist in DB
        break;
      case 'fundamental_condition':
        dbAlertType = 'fundamental_condition'; // Matches DB
        break;
    }

    const alertData = {
      ...req.body,
      alert_name: req.body.name || req.body.alert_name,
      alert_type: dbAlertType,
      condition_json: dbCondition
    };
    
    // Fallback if dbAlertType is still invalid for DB, we might catch it in Service or DB error
    
    const alert = await alertService.createAlert(userId, alertData);
    
    logger.info('Alert created', { alertId: alert.alert_id, userId, type: alert.alert_type });
    
    res.status(201).json({
      success: true,
      message: 'Alert created successfully',
      data: alert
    });
  } catch (error) {
    console.error('Create Alert Error:', error);
    res.status(500).json({ 
        success: false, 
        error: error.message,
        detail: error.detail,
        stack: error.stack 
    });
  }
};

/**
 * Update an alert
 */
const updateAlert = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.user?.userId || req.headers['x-user-id'];
    const { alertId } = req.params;
    
    const alert = await alertService.updateAlert(alertId, userId, req.body);
    
    res.json({
      success: true,
      message: 'Alert updated successfully',
      data: alert
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Enable an alert
 */
const enableAlert = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.user?.userId || req.headers['x-user-id'];
    const { alertId } = req.params;
    
    const alert = await alertService.setAlertStatus(alertId, userId, 'active');
    
    logger.info('Alert enabled', { alertId, userId });
    
    res.json({
      success: true,
      message: 'Alert enabled',
      data: alert
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Disable (pause) an alert
 */
const disableAlert = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.user?.userId || req.headers['x-user-id'];
    const { alertId } = req.params;
    
    const alert = await alertService.setAlertStatus(alertId, userId, 'paused');
    
    logger.info('Alert disabled', { alertId, userId });
    
    res.json({
      success: true,
      message: 'Alert paused',
      data: alert
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an alert
 */
const deleteAlert = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.user?.userId || req.headers['x-user-id'];
    const { alertId } = req.params;
    
    const result = await alertService.deleteAlert(alertId, userId);
    
    logger.info('Alert deleted', { alertId, userId });
    
    res.json({
      success: true,
      message: 'Alert deleted successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get alert history
 */
const getAlertHistory = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.user?.userId || req.headers['x-user-id'];
    const { alertId } = req.params;
    const { limit } = req.query;
    
    const history = await alertService.getAlertHistory(
      alertId, 
      userId, 
      limit ? parseInt(limit) : undefined
    );
    
    res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Acknowledge an alert trigger
 */
const acknowledgeAlert = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.user?.userId || req.headers['x-user-id'];
    const { alertId, historyId } = req.params;
    
    const result = await alertService.acknowledgeAlert(historyId, alertId, userId);
    
    res.json({
      success: true,
      message: 'Alert acknowledged',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's alert summary
 */
const getAlertSummary = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.user?.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    const summary = await alertService.getAlertSummary(userId);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAlerts,
  getAlertById,
  createAlert,
  updateAlert,
  enableAlert,
  disableAlert,
  deleteAlert,
  getAlertHistory,
  acknowledgeAlert,
  getAlertSummary
};

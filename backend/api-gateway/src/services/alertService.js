/**
 * Alert Service
 * Business logic for user alert subscription management
 */

const db = require('../config/database');
const logger = require('../config/logger');
const { ApiError } = require('../middleware/errorHandler');

class AlertService {
  /**
   * Get all alerts for a user
   */
  async getUserAlerts(userId, options = {}) {
    const { status, type, ticker, limit = 50, offset = 0 } = options;
    
    let query = `
      SELECT 
        a.id,
        a.user_id,
        a.alert_name,
        a.ticker,
        a.alert_type,
        a.condition_json,
        a.frequency,
        a.is_active,
        a.last_triggered,
        a.last_evaluated,
        a.trigger_count,
        a.created_at,
        a.updated_at,
        c.name AS company_name
      FROM alert_subscriptions a
      LEFT JOIN companies c ON a.ticker = c.ticker
      WHERE a.user_id = $1
    `;
    
    const params = [userId];
    let paramIndex = 2;
    
    if (status !== undefined) {
      if (status === 'active') {
        query += ` AND a.is_active = true`;
      } else if (status === 'inactive' || status === 'paused') {
        query += ` AND a.is_active = false`;
      }
    }
    
    if (type) {
      query += ` AND a.alert_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    
    if (ticker) {
      query += ` AND a.ticker = $${paramIndex}`;
      params.push(ticker.toUpperCase());
      paramIndex++;
    }
    
    query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    try {
      logger.info('Executing getUserAlerts query', { query, params });
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error in getUserAlerts', { error: error.message, query, params });
      throw error;
    }
  }

  /**
   * Get alert by ID
   */
  async getAlertById(alertId, userId) {
    const query = `
      SELECT 
        a.id,
        a.user_id,
        a.alert_name,
        a.ticker,
        a.alert_type,
        a.condition_json,
        a.frequency,
        a.is_active,
        a.last_triggered,
        a.last_evaluated,
        a.trigger_count,
        a.created_at,
        a.updated_at,
        c.name AS company_name
      FROM alert_subscriptions a
      LEFT JOIN companies c ON a.ticker = c.ticker
      WHERE a.id = $1 AND a.user_id = $2
    `;
    
    const result = await db.query(query, [alertId, userId]);
    
    if (result.rows.length === 0) {
      throw new ApiError(404, 'Alert not found', 'ALERT_NOT_FOUND');
    }
    
    return result.rows[0];
  }

  /**
   * Create a new alert
   */
  async createAlert(userId, data) {
    const {
      alert_name,
      ticker,
      alert_type,
      condition_json,
      frequency = 'daily',
      is_active = true
    } = data;
    
    const query = `
      INSERT INTO alert_subscriptions (
        user_id, alert_name, ticker, alert_type, 
        condition_json, frequency, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id, user_id, alert_name, ticker, alert_type,
        condition_json, frequency, is_active, created_at
    `;
    
    const result = await db.query(query, [
      userId, alert_name, ticker?.toUpperCase(), alert_type,
      JSON.stringify(condition_json || {}), frequency, is_active
    ]);
    
    logger.info('Alert created', { 
      alertId: result.rows[0].id, 
      userId, 
      type: alert_type 
    });
    
    return result.rows[0];
  }

  /**
   * Update an alert
   */
  async updateAlert(alertId, userId, data) {
    // Verify ownership
    await this.getAlertById(alertId, userId);
    
    const {
      alert_name,
      condition_json,
      frequency,
      is_active
    } = data;
    
    const query = `
      UPDATE alert_subscriptions
      SET 
        alert_name = COALESCE($3, alert_name),
        condition_json = COALESCE($4, condition_json),
        frequency = COALESCE($5, frequency),
        is_active = COALESCE($6, is_active),
        updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING 
        id, alert_name, ticker, alert_type,
        condition_json, frequency, is_active, updated_at
    `;
    
    const result = await db.query(query, [
      alertId, userId, alert_name, condition_json ? JSON.stringify(condition_json) : null, frequency, is_active
    ]);
    
    return result.rows[0];
  }

  /**
   * Enable/disable an alert
   */
  async setAlertStatus(alertId, userId, is_active) {
    // Verify ownership
    await this.getAlertById(alertId, userId);
    
    const activeValue = is_active === true || is_active === 'active';
    
    const query = `
      UPDATE alert_subscriptions
      SET is_active = $3, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING id, alert_name, is_active, updated_at
    `;
    
    const result = await db.query(query, [alertId, userId, activeValue]);
    return result.rows[0];
  }

  /**
   * Delete an alert
   */
  async deleteAlert(alertId, userId) {
    // Verify ownership
    await this.getAlertById(alertId, userId);
    
    const query = `
      DELETE FROM alert_subscriptions
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    
    await db.query(query, [alertId, userId]);
    return { deleted: true, id: alertId };
  }

  /**
   * Get user's alert summary
   */
  async getAlertSummary(userId) {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE is_active = true) AS active_count,
        COUNT(*) FILTER (WHERE is_active = false) AS inactive_count,
        COUNT(*) AS total_count,
        COALESCE(SUM(trigger_count), 0) AS total_triggers
      FROM alert_subscriptions
      WHERE user_id = $1
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows[0];
  }
}

module.exports = new AlertService();

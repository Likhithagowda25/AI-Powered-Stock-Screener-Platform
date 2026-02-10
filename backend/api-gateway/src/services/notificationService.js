/**
 * Notification Service
 * Handles creation and management of user notifications
 */

const db = require('../config/database');
const logger = require('../config/logger');

class NotificationService {
  /**
   * Create a new notification
   * @param {string} userId - User ID
   * @param {Object} data - Notification data
   * @returns {Object} Created notification
   */
  async createNotification(userId, data) {
    const {
      alert_id,
      ticker,
      notification_type,
      title,
      message,
      data_json
    } = data;

    const query = `
      INSERT INTO notifications (
        user_id, alert_id, ticker, notification_type, 
        title, message, data_json, triggered_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `;

    try {
      const result = await db.query(query, [
        userId,
        alert_id,
        ticker,
        notification_type,
        title,
        message,
        data_json ? JSON.stringify(data_json) : null
      ]);

      const notification = result.rows[0];
      
      logger.info('Notification created', { 
        notificationId: notification.id, 
        userId, 
        type: notification_type 
      });

      return notification;
    } catch (error) {
      logger.error('Error creating notification', { error: error.message, userId, data });
      throw error;
    }
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(userId) {
    const query = `
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE user_id = $1 AND is_read = false
    `;
    
    const result = await db.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }
}

module.exports = new NotificationService();

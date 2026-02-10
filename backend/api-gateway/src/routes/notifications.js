/**
 * Notifications Routes
 * API endpoints for user notifications
 */

const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

// Database connection pool
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    database: process.env.DB_NAME || 'stock_screener',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

/**
 * GET /api/notifications
 * Get user's notifications
 */
router.get('/', async (req, res) => {
    const userId = req.query.user_id || req.user?.id;
    const unreadOnly = req.query.unread === 'true';
    const limit = parseInt(req.query.limit) || 50;
    
    if (!userId) {
        return res.status(400).json({ error: 'user_id required' });
    }
    
    try {
        let query = `
            SELECT * FROM notifications 
            WHERE user_id = $1
        `;
        
        if (unreadOnly) {
            query += ` AND is_read = false`;
        }
        
        query += ` ORDER BY triggered_at DESC LIMIT $2`;
        
        const result = await pool.query(query, [userId, limit]);
        
        // Get unread count
        const countResult = await pool.query(
            `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false`,
            [userId]
        );
        
        res.json({
            success: true,
            count: result.rows.length,
            unread_count: parseInt(countResult.rows[0].count),
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read
 */
router.patch('/:id/read', async (req, res) => {
    const { id } = req.params;
    const userId = req.query.user_id || req.user?.id;
    
    if (!userId) {
        return res.status(400).json({ error: 'user_id required' });
    }
    
    try {
        const result = await pool.query(
            `UPDATE notifications SET is_read = true 
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            [id, userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        
        res.json({
            success: true,
            message: 'Notification marked as read',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read
 */
router.patch('/read-all', async (req, res) => {
    const userId = req.query.user_id || req.user?.id;
    
    if (!userId) {
        return res.status(400).json({ error: 'user_id required' });
    }
    
    try {
        const result = await pool.query(
            `UPDATE notifications SET is_read = true 
             WHERE user_id = $1 AND is_read = false`,
            [userId]
        );
        
        res.json({
            success: true,
            message: 'All notifications marked as read',
            count: result.rowCount
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
});

module.exports = router;

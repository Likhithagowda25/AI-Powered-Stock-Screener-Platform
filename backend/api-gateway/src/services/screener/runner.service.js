/**
 * Screener Runner Service
 * 
 * Executes compiled SQL queries against PostgreSQL database
 */

const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../../../.env') });

class ScreenerRunnerService {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'stock_screener',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });

    this.pool.on('error', (err) => {
      console.error('Database pool error:', err);
    });
  }

  /**
   * Execute SQL query and return results
   * @param {string} sql - SQL query
   * @param {array} params - Query parameters
   * @returns {Promise<array>} Query results
   */
  async execute(sql, params = []) {
    const client = await this.pool.connect();
    
    try {
      console.log('[Screener Runner] Executing query...');
      console.log('SQL:', sql);
      console.log('Params:', params);
      
      const startTime = Date.now();
      const result = await client.query(sql, params);
      const duration = Date.now() - startTime;
      
      console.log(`[Screener Runner] Query completed in ${duration}ms`);
      console.log(`[Screener Runner] Found ${result.rows.length} results`);
      
      return {
        success: true,
        data: result.rows,
        count: result.rows.length,
        executionTime: duration
      };
      
    } catch (error) {
      console.error('[Screener Runner] Query failed:', error.message);
      
      return {
        success: false,
        error: {
          type: 'EXECUTION_ERROR',
          message: 'Failed to execute screener query'
        }
      };
      
    } finally {
      client.release();
    }
  }

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      console.log('[Screener Runner] Database connected:', result.rows[0].now);
      return true;
    } catch (error) {
      console.error('[Screener Runner] Database connection failed:', error.message);
      return false;
    }
  }

  /**
   * Close database pool
   */
  async close() {
    await this.pool.end();
  }
}

module.exports = new ScreenerRunnerService();

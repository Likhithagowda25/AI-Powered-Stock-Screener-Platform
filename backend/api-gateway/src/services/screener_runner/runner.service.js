const { Pool } = require('pg');
const config = require('../../config');

class ScreenerRunnerService {
  constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.pool.on('error', (err) => {
      console.error('[DB Pool Error]', err);
    });
  }

  /**
   * Execute screener query
   * @param {string} sql - Compiled SQL query
   * @param {array} params - Query parameters
   * @returns {object} { success: boolean, results: array, count: number }
   */
  async execute(sql, params = []) {
    const startTime = Date.now();
    let client;

    try {
      client = await this.pool.connect();
      
      // Set query timeout to 30 seconds
      await client.query('SET statement_timeout = 30000');

      const result = await client.query(sql, params);
      
      const executionTime = Date.now() - startTime;
      
      console.log('[Screener Query]', {
        executionTime: `${executionTime}ms`,
        rowCount: result.rows.length,
        params: params.length
      });

      return {
        success: true,
        results: result.rows,
        count: result.rows.length,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      console.error('[Screener Query Error]', {
        error: error.message,
        code: error.code,
        detail: error.detail,
        executionTime: `${executionTime}ms`,
        sql: sql.substring(0, 200)
      });

      return this._handleQueryError(error);

    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Handle query execution errors
   * @private
   */
  _handleQueryError(error) {
    let userMessage = 'Failed to execute screener query';
    let errorType = 'QUERY_ERROR';

    if (error.code === '57014') {
      userMessage = 'Query timeout - please try a more specific filter';
      errorType = 'TIMEOUT';
    } else if (error.code === '42P01') {
      userMessage = 'Database schema error';
      errorType = 'SCHEMA_ERROR';
    } else if (error.code === '53300') {
      userMessage = 'Database connection limit reached';
      errorType = 'CONNECTION_ERROR';
    } else if (error.message.includes('connect')) {
      userMessage = 'Unable to connect to database';
      errorType = 'CONNECTION_ERROR';
    }

    return {
      success: false,
      error: {
        type: errorType,
        message: userMessage
      },
      results: [],
      count: 0
    };
  }

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      
      console.log('[DB Connection] OK', result.rows[0]);
      return { success: true, connected: true };
      
    } catch (error) {
      console.error('[DB Connection] FAILED', error.message);
      return { success: false, connected: false, error: error.message };
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

const db = require('../config/database');
const logger = require('../config/logger');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

/**
 * Get list of available stock symbols with metadata
 */
const getStocks = asyncHandler(async (req, res) => {
  const { sector, exchange, limit = 100, offset = 0 } = req.query;

  // Build query with optional filters
  let query = `
    SELECT 
      ticker as symbol,
      name,
      exchange,
      sector,
      industry,
      market_cap
    FROM companies
    WHERE 1=1
  `;
  
  const params = [];
  let paramIndex = 1;

  if (sector) {
    query += ` AND LOWER(sector) = LOWER($${paramIndex})`;
    params.push(sector);
    paramIndex++;
  }

  if (exchange) {
    query += ` AND LOWER(exchange) = LOWER($${paramIndex})`;
    params.push(exchange);
    paramIndex++;
  }

  query += ` ORDER BY ticker LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  try {
    const result = await db.query(query, params);
    
    // Get total count for pagination
    const countQuery = 'SELECT COUNT(*) as total FROM companies';
    const countResult = await db.query(countQuery);
    const total = parseInt(countResult.rows[0].total, 10);

    res.status(200).json({
      success: true,
      data: {
        stocks: result.rows,
        pagination: {
          total,
          limit: parseInt(limit, 10),
          offset: parseInt(offset, 10),
          hasMore: (parseInt(offset, 10) + parseInt(limit, 10)) < total,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to fetch stocks metadata', { error: error.message });
    throw new ApiError(500, 'Failed to fetch stocks metadata', 'DB_ERROR');
  }
});

module.exports = {
  getStocks,
};

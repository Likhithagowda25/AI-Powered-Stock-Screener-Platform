const db = require('./src/config/database');
const logger = require('./src/config/logger');

async function searchTicker() {
  try {
    console.log('Searching for companies matching "LT", "Larsen", or "L&T"...');
    
    // Search by ticker or name
    const query = `
      SELECT ticker, name 
      FROM companies 
      WHERE ticker ILIKE '%LT%' 
         OR name ILIKE '%Larsen%' 
         OR name ILIKE '%L&T%'
      LIMIT 10;
    `;
    
    const result = await db.query(query);
    
    if (result.rows.length === 0) {
      console.log('No matches found.');
    } else {
      console.log('Found matches:', result.rows);
    }
  } catch (error) {
    console.error('Error searching database:', error);
  } finally {
    process.exit();
  }
}

searchTicker();

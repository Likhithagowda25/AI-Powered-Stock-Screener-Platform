require('dotenv').config();
const db = require('./src/config/database');

async function runDiagnostics() {
  try {
    console.log('--- DIAGNOSTICS START ---');
    
    // 1. Count total companies
    const countRes = await db.query('SELECT COUNT(*) FROM companies');
    console.log(`Total companies in DB: ${countRes.rows[0].count}`);

    // 2. Search for LT variants
    console.log('Searching for "Larsen" or "LT"...');
    const searchRes = await db.query(`
      SELECT ticker, name 
      FROM companies 
      WHERE ticker ILIKE '%LT%' 
         OR name ILIKE '%Larsen%' 
         OR ticker = 'LT.NS'
      LIMIT 20
    `);
    
    if (searchRes.rows.length === 0) {
      console.log('NO MATCHES found for LT/Larsen.');
    } else {
      console.log('Found matches:');
      searchRes.rows.forEach(row => {
        console.log(` - Ticker: ${row.ticker}, Name: ${row.name}`);
      });
    }
    
    console.log('--- DIAGNOSTICS END ---');
  } catch (err) {
    console.error('DB Error:', err.message);
  } finally {
    process.exit();
  }
}

runDiagnostics();

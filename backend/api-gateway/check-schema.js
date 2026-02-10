// Check the actual user_id values in the database
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkSchema() {
  try {
    console.log('Checking user_portfolios schema...\n');
    
    // Get column types
    const schemaQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_portfolios'
      ORDER BY ordinal_position
    `;
    const schema = await pool.query(schemaQuery);
    console.log('Columns:');
    schema.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
    // Get sample data
    console.log('\nSample portfolios:');
    const sample = await pool.query('SELECT user_id, portfolio_id, name FROM user_portfolios LIMIT 5');
    sample.rows.forEach(row => {
      console.log(`  User ID: ${row.user_id} (type: ${typeof row.user_id})`);
      console.log(`  Portfolio ID: ${row.portfolio_id}`);
      console.log(`  Name: ${row.name}\n`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSchema();

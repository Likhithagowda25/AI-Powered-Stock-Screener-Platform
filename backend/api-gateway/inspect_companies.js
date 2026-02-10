require('dotenv').config();
const db = require('./src/config/database');

async function inspect() {
  try {
    console.log('Inspecting companies table schema...');
    
    const query = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'companies'
    `;
    
    const result = await db.query(query);
    console.log('Columns:', JSON.stringify(result.rows, null, 2));

  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    process.exit(0);
  }
}

inspect();

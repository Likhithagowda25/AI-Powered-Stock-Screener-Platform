const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./src/config/database');

async function run() {
  const r1 = await db.pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'companies' ORDER BY ordinal_position");
  console.log('=== companies columns ===');
  console.log(r1.rows.map(r => r.column_name).join(', '));

  const r2 = await db.pool.query('SELECT DISTINCT sector FROM companies WHERE sector IS NOT NULL ORDER BY sector');
  console.log('\n=== sectors ===');
  console.log(r2.rows.map(r => r.sector).join(', '));

  const r3 = await db.pool.query('SELECT DISTINCT exchange FROM companies WHERE exchange IS NOT NULL ORDER BY exchange');
  console.log('\n=== exchanges ===');
  console.log(r3.rows.map(r => r.exchange).join(', '));

  const r4 = await db.pool.query('SELECT DISTINCT industry FROM companies WHERE industry IS NOT NULL ORDER BY industry');
  console.log('\n=== industries ===');
  console.log(r4.rows.map(r => r.industry).join(', '));

  const r5 = await db.pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'fundamentals_quarterly' ORDER BY ordinal_position");
  console.log('\n=== fundamentals_quarterly columns ===');
  console.log(r5.rows.map(r => r.column_name).join(', '));

  const r6 = await db.pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'analyst_estimates' ORDER BY ordinal_position");
  console.log('\n=== analyst_estimates columns ===');
  console.log(r6.rows.map(r => r.column_name).join(', '));

  const r7 = await db.pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'price_history' ORDER BY ordinal_position");
  console.log('\n=== price_history columns ===');
  console.log(r7.rows.map(r => r.column_name).join(', '));

  // Check data availability
  const r8 = await db.pool.query('SELECT COUNT(*) FROM companies');
  console.log('\n=== row counts ===');
  console.log('companies:', r8.rows[0].count);
  const r9 = await db.pool.query('SELECT COUNT(*) FROM fundamentals_quarterly');
  console.log('fundamentals_quarterly:', r9.rows[0].count);
  const r10 = await db.pool.query('SELECT COUNT(*) FROM analyst_estimates');
  console.log('analyst_estimates:', r10.rows[0].count);
  const r11 = await db.pool.query('SELECT COUNT(*) FROM price_history');
  console.log('price_history:', r11.rows[0].count);

  // Check sample analyst_estimates
  const r12 = await db.pool.query('SELECT * FROM analyst_estimates LIMIT 3');
  console.log('\n=== sample analyst_estimates ===');
  console.log(JSON.stringify(r12.rows, null, 2));

  // Check sample company with current_price  
  const r13 = await db.pool.query("SELECT c.ticker, c.sector, c.market_cap, ph.close as current_price FROM companies c LEFT JOIN LATERAL (SELECT close FROM price_history WHERE ticker = c.ticker ORDER BY time DESC LIMIT 1) ph ON true LIMIT 5");
  console.log('\n=== sample companies with prices ===');
  console.log(JSON.stringify(r13.rows, null, 2));

  await db.pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });

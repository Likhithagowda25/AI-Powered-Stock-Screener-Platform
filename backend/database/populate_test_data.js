
// // Test data population script removed for production use. No test/demo data will be inserted.
//       INSERT INTO user_portfolios (user_id, name, description, is_default, currency)
//       VALUES ($1, 'My Portfolio', 'Main investment portfolio', TRUE, 'INR')
//       ON CONFLICT (user_id, name) DO UPDATE SET description = EXCLUDED.description
//       RETURNING portfolio_id
//     `, [USER_ID]);
    
//     const portfolioId = portfolioResult.rows[0].portfolio_id;
//     console.log(`Portfolio created (ID: ${portfolioId})\n`);

//     // Note: Holdings are not pre-populated - users can add their own via the app

//     // 3. Create Watchlists
//     console.log('Creating watchlists...');
//     const watchlistResult = await client.query(`
//       INSERT INTO watchlists (user_id, name, description, is_default)
//       VALUES ($1, 'My Watchlist', 'Stocks I''m tracking', TRUE)
//       ON CONFLICT (user_id, name) DO UPDATE SET description = EXCLUDED.description
//       RETURNING watchlist_id
//     `, [USER_ID]);
    
//     const watchlistId = watchlistResult.rows[0].watchlist_id;
//     console.log(`Default watchlist created (ID: ${watchlistId})`);

//     const techWatchlistResult = await client.query(`
//       INSERT INTO watchlists (user_id, name, description, is_default)
//       VALUES ($1, 'Tech Stocks', 'IT and Technology companies', FALSE)
//       ON CONFLICT (user_id, name) DO UPDATE SET description = EXCLUDED.description
//       RETURNING watchlist_id
//     `, [USER_ID]);
    
//     const techWatchlistId = techWatchlistResult.rows[0].watchlist_id;
//     console.log(`Tech watchlist created (ID: ${techWatchlistId})\n`);

//     // 4. Add Watchlist Items
//     console.log('Adding watchlist items...');
//     const watchlistItems = [
//       [watchlistId, 'TATAMOTORS', 650.00, 'Strong automobile sector play'],
//       [watchlistId, 'BAJFINANCE', 7500.00, 'Leading NBFC'],
//       [watchlistId, 'ASIANPAINT', 3200.00, 'Defensive stock'],
//       [watchlistId, 'MARUTI', 11000.00, 'Auto sector leader'],
//       [watchlistId, 'LT', 3400.00, 'Infrastructure play'],
//       [watchlistId, 'BHARTIARTL', 1200.00, 'Telecom sector'],
//       [watchlistId, 'SUNPHARMA', 1450.00, 'Pharma sector'],
//       [watchlistId, 'COALINDIA', 420.00, 'PSU play'],
//       [watchlistId, 'NTPC', 280.00, 'Power sector'],
//       [watchlistId, 'ONGC', 240.00, 'Oil & Gas'],
//       [watchlistId, 'POWERGRID', 250.00, 'Infrastructure'],
//       [watchlistId, 'SBIN', 620.00, 'Banking sector'],
//       [techWatchlistId, 'TCS', 4000.00, 'IT services giant'],
//       [techWatchlistId, 'INFY', 1650.00, 'Global IT leader'],
//       [techWatchlistId, 'WIPRO', 450.00, 'IT services'],
//       [techWatchlistId, 'HCLTECH', 1400.00, 'IT company'],
//       [techWatchlistId, 'TECHM', 1200.00, 'Tech Mahindra'],
//     ];

//     for (const [wlId, ticker, price, notes] of watchlistItems) {
//       await client.query(`
//         INSERT INTO watchlist_items (watchlist_id, ticker, target_price, notes)
//         VALUES ($1, $2, $3, $4)
//         ON CONFLICT (watchlist_id, ticker) DO NOTHING
//       `, [wlId, ticker, price, notes]);
//       console.log(`  Added ${ticker}`);
//     }
//     console.log('');

//     // 5. Create Alerts
//     console.log('Creating alerts...');
//     const alerts = [
//       ['RELIANCE Price Alert', 'Alert when RELIANCE crosses ₹2600', 'RELIANCE.NS', 'price_threshold',
//        JSON.stringify({field: 'price', operator: '>', value: 2600})],
//       ['TATASTEEL Target', 'Alert when TATASTEEL reaches ₹160', 'TATASTEEL.NS', 'price_threshold',
//        JSON.stringify({field: 'price', operator: '>=', value: 160})],
//       ['INFY PE Ratio Watch', 'Alert when INFY PE drops below 20', 'INFY.NS', 'fundamental',
//        JSON.stringify({field: 'pe_ratio', operator: '<', value: 20})],
//       ['TCS Dividend', 'Alert on TCS dividend announcement', 'TCS.NS', 'event',
//        JSON.stringify({event_type: 'dividend_declared'})],
//       ['HDFCBANK Strong Buy', 'Alert when HDFCBANK shows strong technicals', 'HDFCBANK.NS', 'technical',
//        JSON.stringify({field: 'rsi', operator: '<', value: 30})],
//     ];

//     for (const [name, desc, ticker, type, condition] of alerts) {
//       await client.query(`
//         INSERT INTO alert_subscriptions 
//         (user_id, alert_name, ticker, alert_type, condition_json, frequency, is_active)
//         VALUES ($1, $2, $3, $4, $5::jsonb, 'daily', TRUE)
//         ON CONFLICT DO NOTHING
//       `, [USER_ID, name, ticker, type, condition]);
//       console.log(`Created ${name}`);
//     }
//     console.log('');

//     await client.query('COMMIT');

//     // Summary
//     console.log('========================================');
//     console.log('Test Data Population Complete!');
//     console.log('========================================');
//     console.log(`Portfolio: 1 portfolio with ${holdings.length} holdings`);
//     console.log(`Watchlists: 2 watchlists with ${watchlistItems.length} items`);
//     console.log(`Alerts: ${alerts.length} active alerts`);
//     console.log('');
//     console.log('Next steps:');
//     console.log('  1. Refresh your mobile app');
//     console.log('  2. Pull down to refresh data');
//     console.log('  3. Navigate to Portfolio/Watchlist/Alerts');
//     console.log('');

//   } catch (error) {
//     await client.query('ROLLBACK');
//     console.error('Error:', error.message);
//     throw error;
//   } finally {
//     client.release();
//     await pool.end();
//   }
// }

// // Run the script
// populateTestData()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error('Fatal error:', error);
//     process.exit(1);
//   });

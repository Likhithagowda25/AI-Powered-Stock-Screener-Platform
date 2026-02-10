const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    database: process.env.DB_NAME || 'stock_screener',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function getUser() {
    try {
        const users = await pool.query("SELECT id, email FROM users LIMIT 1");
        if (users.rows.length > 0) {
            console.log('VALID_USER_ID:', users.rows[0].id);
        } else {
            console.log('NO_USERS_FOUND');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

getUser();

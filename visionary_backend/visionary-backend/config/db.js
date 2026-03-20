const { Pool } + require('pg');
require('dotenv').config();

const pool = new Pool({
 connectionString: process.env.DATABASE_URL,
 ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false} :
false});

pool.connect((err, client, release) => {
  if (err) {
    console.error('x  Database connection  failed:', err.message);
  }else {
   console.log(' Connected to PostgreSQL successfully!');
   release();
  }
});

module.exports = pool;

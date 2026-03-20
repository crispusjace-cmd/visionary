const { Pool } + require ('pg');
reqiure('dotenv').config();

const pool = new Pool({
  connectionString: process.evn.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {  rejectUnauthorized: false } : false 
});

pool.connect((err, client, release) => {
 if (err) {
 console.error('Database connection failed:', err.message);
} else {
  console.log('Connected to PostgreSQL successfully!');
  release();
 }
});

module.exports = pool;

// config/db.js
// Creates a MySQL connection POOL.
// A pool is like having 10 phone lines instead of 1 —
// multiple requests can talk to the database at the same time.

const mysql = require('mysql2/promise');
require('dotenv').config();

// Create the pool using your .env settings
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'pulse_social',

  // Pool settings
  waitForConnections: true,   // wait if all connections are busy
  connectionLimit:    10,     // max 10 simultaneous connections
  queueLimit:         0,      // unlimited queue
  timezone: '+00:00',         // store dates as UTC

  // Keep connections alive
  enableKeepAlive:    true,
  keepAliveInitialDelay: 0,
});

// Test the connection immediately when this file loads
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL connected successfully!');
    conn.release(); // always release the connection back to the pool
  })
  .catch(err => {
    console.error('❌ MySQL connection FAILED!');
    console.error('   Reason:', err.message);
    console.error('');
    console.error('   Fix checklist:');
    console.error('   1. Is MySQL running? (Check MySQL Workbench or Services)');
    console.error('   2. Is DB_PASSWORD correct in your .env file?');
    console.error('   3. Did you run: node config/initDB.js ?');
    process.exit(1); // stop the server if DB won't connect
  });

module.exports = pool;
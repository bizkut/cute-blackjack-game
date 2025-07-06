const mysql = require('mysql2/promise'); // Using the promise-based API

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'db', // 'db' is the service name in docker-compose
  user: process.env.MYSQL_USER || 'user',
  password: process.env.MYSQL_PASSWORD || 'password',
  database: process.env.MYSQL_DATABASE || 'blackjack_db',
  waitForConnections: true,
  connectionLimit: 10, // Adjust as needed
  queueLimit: 0
});

// Test the connection (optional, but good for startup diagnostics)
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Successfully connected to MySQL database.');
    connection.release();
  } catch (error) {
    console.error('Error connecting to MySQL database:', error);
    // Exit process if DB connection fails on startup in critical scenarios
    // process.exit(1);
  }
}

testConnection();

module.exports = pool;

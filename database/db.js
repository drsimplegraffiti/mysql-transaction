const mysql = require("mysql2");
const config = require("../config/configService");
const { performance, PerformanceObserver } = require("perf_hooks");

// Create MySQL connection
const pool = mysql.createConnection({
  host: config.db.host,
  user: config.db.username,
  password: config.db.password,
  database: config.db.name,
  port: config.db.port,
});


// Start the performance measurement
const start = performance.now();

// Connect to MySQL
pool.query("SELECT 1 + 1 AS solution", (err, rows, fields) => {
  if (err) {
    console.error("Error connecting to MySQL: " + err.stack);
    return;
  }
  // Stop the performance measurement
  const end = performance.now();

  // Log the time it took to connect to MySQL
  console.log("Time to connect to MySQL: " + (end - start) + "ms");
  
  console.log("Connected to MySQL as id " + pool.threadId);
});

module.exports = pool.promise();

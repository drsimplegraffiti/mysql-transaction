const mysql = require("mysql2");

// Create MySQL connection
const pool = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Bassguitar1",
  database: "kay",
  port: 3306,
});

// Connect to MySQL
pool.query("SELECT 1 + 1 AS solution", (err, rows, fields) => {
  if (err) {
    console.error("Error connecting to MySQL: " + err.stack);
    return;
  }
  console.log("Connected to MySQL as id " + pool.threadId);
});

module.exports = pool.promise();

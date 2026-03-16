const mysql = require('mysql2');
require('dotenv').config();

// On crée un "pool" de connexions (plus efficace qu'une connexion unique)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false
  },
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = pool.promise(); // On utilise .promise() pour utiliser async/await plus tard
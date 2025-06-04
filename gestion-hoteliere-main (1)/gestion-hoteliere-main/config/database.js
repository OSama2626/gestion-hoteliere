// config/database.js - Configuration base de données
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hotel_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Test de connexion only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  pool.getConnection()
    .then(connection => {
      console.log('✅ Connexion à la base de données réussie');
      connection.release();
    })
    .catch(error => {
      console.error('❌ Erreur de connexion à la base de données:', error);
      // In a real application, you might want to handle this more gracefully,
      // perhaps by exiting the process or implementing a retry mechanism.
      // For now, just logging the error.
    });
}

module.exports = pool;
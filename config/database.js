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

// Test de connexion
pool.getConnection()
  .then(connection => {
    console.log('✅ Connexion à la base de données réussie');
    connection.release();
  })
  .catch(error => {
    console.error('❌ Erreur de connexion à la base de données:', error);
  });

module.exports = pool;
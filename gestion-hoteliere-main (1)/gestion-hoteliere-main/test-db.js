const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'hotel_management'
    });
    
    console.log('✅ Connexion DB réussie !');
    await connection.end();
  } catch (error) {
    console.error('❌ Erreur DB:', error.message);
  }
}

testConnection();
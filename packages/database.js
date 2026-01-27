require('dotenv').config();
const mysql = require('mysql2/promise');

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'gtas_rp',
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0
});

db.getConnection()
    .then(connection => {
        console.log('[Database] ✅ Подключено');
        connection.release();
    })
    .catch(err => {
        console.error('[Database] ❌ Ошибка подключения:', err.message);
    });

module.exports = { db };
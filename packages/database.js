// ===== ОБЩИЙ МОДУЛЬ БАЗЫ ДАННЫХ =====

const mysql = require('mysql2/promise');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Avatar98_98',
    database: 'gtas_rp',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

console.log('[Database] Попытка подключения к базе данных gtas_rp...');

// Проверяем подключение
db.getConnection()
    .then(connection => {
        console.log('[Database] ✅ База данных gtas_rp подключена успешно!');
        connection.release();
    })
    .catch(err => {
        console.error('[Database] ❌ Ошибка подключения к базе данных:', err.message);
    });

module.exports = { db };

console.log('[Database] ✅ Модуль базы данных экспортирован');
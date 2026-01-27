// ===== DATABASE UTILITIES =====
// Helper functions for common database operations

const { db } = require('./database');

/**
 * Загрузка персонажей пользователя
 * @param {number} userId - ID пользователя
 * @returns {Promise<Array>} Массив персонажей
 */
async function loadUserCharacters(userId) {
    try {
        const [characters] = await db.query(
            'SELECT id, name, surname, age, gender, money, bank, level, last_active FROM characters WHERE user_id = ? ORDER BY last_active DESC',
            [userId]
        );
        return characters;
    } catch (err) {
        console.error('[DB Utils] Error loading characters:', err);
        return [];
    }
}

/**
 * Получение персонажа по ID
 * @param {number} characterId - ID персонажа
 * @param {number} userId - ID владельца (для проверки прав)
 * @returns {Promise<Object|null>} Данные персонажа или null
 */
async function getCharacter(characterId, userId = null) {
    try {
        const query = userId 
            ? 'SELECT * FROM characters WHERE id = ? AND user_id = ?'
            : 'SELECT * FROM characters WHERE id = ?';
        const params = userId ? [characterId, userId] : [characterId];
        
        const [result] = await db.query(query, params);
        return result.length > 0 ? result[0] : null;
    } catch (err) {
        console.error('[DB Utils] Error getting character:', err);
        return null;
    }
}

/**
 * Обновление позиции персонажа
 * @param {number} characterId - ID персонажа
 * @param {Object} position - Координаты {x, y, z, heading}
 */
async function saveCharacterPosition(characterId, position) {
    try {
        await db.query(
            'UPDATE characters SET position_x = ?, position_y = ?, position_z = ?, heading = ?, last_active = NOW() WHERE id = ?',
            [position.x, position.y, position.z, position.heading, characterId]
        );
        return true;
    } catch (err) {
        console.error('[DB Utils] Error saving position:', err);
        return false;
    }
}

/**
 * Обновление денег персонажа
 * @param {number} characterId - ID персонажа
 * @param {number} cash - Наличные
 * @param {number} bank - Банк
 */
async function updateCharacterMoney(characterId, cash, bank) {
    try {
        await db.query(
            'UPDATE characters SET money = ?, bank = ? WHERE id = ?',
            [cash, bank, characterId]
        );
        return true;
    } catch (err) {
        console.error('[DB Utils] Error updating money:', err);
        return false;
    }
}

/**
 * Получение данных пользователя по логину
 * @param {string} login - Логин пользователя
 * @returns {Promise<Object|null>} Данные пользователя или null
 */
async function getUserByLogin(login) {
    try {
        const [result] = await db.query(
            'SELECT * FROM users WHERE login = ?',
            [login]
        );
        return result.length > 0 ? result[0] : null;
    } catch (err) {
        console.error('[DB Utils] Error getting user:', err);
        return null;
    }
}

/**
 * Проверка существования пользователя
 * @param {string} login - Логин пользователя
 * @returns {Promise<boolean>}
 */
async function userExists(login) {
    try {
        const [result] = await db.query(
            'SELECT id FROM users WHERE login = ?',
            [login]
        );
        return result.length > 0;
    } catch (err) {
        console.error('[DB Utils] Error checking user:', err);
        return false;
    }
}

/**
 * Проверка активных банов
 * @param {string} login - Логин или null
 * @param {string} ip - IP адрес
 * @returns {Promise<Object|null>} Данные бана или null
 */
async function checkActiveBan(login, ip) {
    try {
        const [bans] = await db.query(
            'SELECT * FROM bans WHERE (social_club = ? OR ip_address = ?) AND (expires_at IS NULL OR expires_at > NOW()) LIMIT 1',
            [login, ip]
        );
        return bans.length > 0 ? bans[0] : null;
    } catch (err) {
        console.error('[DB Utils] Error checking ban:', err);
        return null;
    }
}

/**
 * Получение количества персонажей пользователя
 * @param {number} userId - ID пользователя
 * @returns {Promise<number>} Количество персонажей
 */
async function getCharacterCount(userId) {
    try {
        const [result] = await db.query(
            'SELECT COUNT(*) as count FROM characters WHERE user_id = ?',
            [userId]
        );
        return result[0].count;
    } catch (err) {
        console.error('[DB Utils] Error counting characters:', err);
        return 0;
    }
}

/**
 * Проверка уникальности имени персонажа
 * @param {string} name - Имя
 * @param {string} surname - Фамилия
 * @returns {Promise<boolean>} true если имя свободно
 */
async function isCharacterNameAvailable(name, surname) {
    try {
        const [result] = await db.query(
            'SELECT id FROM characters WHERE name = ? AND surname = ?',
            [name, surname]
        );
        return result.length === 0;
    } catch (err) {
        console.error('[DB Utils] Error checking name:', err);
        return false;
    }
}

/**
 * Создание нового пользователя
 * @param {string} login - Логин
 * @param {string} hashedPassword - Хешированный пароль
 * @param {string} ip - IP адрес
 * @returns {Promise<number|null>} ID нового пользователя или null
 */
async function createUser(login, hashedPassword, ip, startMoney, startBank) {
    try {
        const [result] = await db.query(
            'INSERT INTO users (login, password, ip_address, registered_at, last_login, money, bank, level, exp, admin_level) VALUES (?, ?, ?, NOW(), NOW(), ?, ?, 1, 0, 0)',
            [login, hashedPassword, ip, startMoney, startBank]
        );
        return result.insertId;
    } catch (err) {
        console.error('[DB Utils] Error creating user:', err);
        return null;
    }
}

/**
 * Обновление последнего входа пользователя
 * @param {number} userId - ID пользователя
 * @param {string} ip - IP адрес
 */
async function updateLastLogin(userId, ip) {
    try {
        await db.query(
            'UPDATE users SET last_login = NOW(), ip_address = ? WHERE id = ?',
            [ip, userId]
        );
        return true;
    } catch (err) {
        console.error('[DB Utils] Error updating last login:', err);
        return false;
    }
}

// Кеширование админ уровней (простой in-memory кеш)
const adminLevelCache = new Map();
const CACHE_TTL = 300000; // 5 минут

/**
 * Получение админ уровня с кешированием
 * @param {number} userId - ID пользователя
 * @returns {Promise<number>} Уровень администратора
 */
async function getAdminLevel(userId) {
    // Проверяем кеш
    const cached = adminLevelCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.level;
    }
    
    try {
        const [result] = await db.query(
            'SELECT admin_level FROM users WHERE id = ?',
            [userId]
        );
        
        const level = result.length > 0 ? (result[0].admin_level || 0) : 0;
        
        // Сохраняем в кеш
        adminLevelCache.set(userId, {
            level: level,
            timestamp: Date.now()
        });
        
        return level;
    } catch (err) {
        console.error('[DB Utils] Error getting admin level:', err);
        return 0;
    }
}

/**
 * Очистка кеша админ уровня
 * @param {number} userId - ID пользователя
 */
function clearAdminCache(userId) {
    adminLevelCache.delete(userId);
}

// Очистка старого кеша каждые 10 минут
setInterval(() => {
    const now = Date.now();
    for (const [userId, data] of adminLevelCache.entries()) {
        if (now - data.timestamp > CACHE_TTL) {
            adminLevelCache.delete(userId);
        }
    }
}, 600000);

module.exports = {
    loadUserCharacters,
    getCharacter,
    saveCharacterPosition,
    updateCharacterMoney,
    getUserByLogin,
    userExists,
    checkActiveBan,
    getCharacterCount,
    isCharacterNameAvailable,
    createUser,
    updateLastLogin,
    getAdminLevel,
    clearAdminCache
};

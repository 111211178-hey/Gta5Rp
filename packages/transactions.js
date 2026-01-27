// ===== TRANSACTION LOGGING SYSTEM =====

const { db } = require('./database');
const config = require('./config');

/**
 * Типы транзакций
 */
const TRANSACTION_TYPES = {
    ADMIN_GIVE: 'admin_give',
    ADMIN_TAKE: 'admin_take',
    PLAYER_TRANSFER: 'player_transfer',
    PURCHASE: 'purchase',
    SALE: 'sale',
    SALARY: 'salary',
    FINE: 'fine',
    REWARD: 'reward',
    OTHER: 'other'
};

// Configuration for suspicious transaction detection
const SUSPICIOUS_THRESHOLD = config.TRANSACTIONS ? config.TRANSACTIONS.SUSPICIOUS_THRESHOLD : 100000;

// Flag to track if table has been initialized
let tableInitialized = false;

/**
 * Логирование транзакции
 * @param {number} characterId - ID персонажа
 * @param {string} type - Тип транзакции (из TRANSACTION_TYPES)
 * @param {number} amount - Сумма (положительная для получения, отрицательная для траты)
 * @param {string} currency - Тип валюты ('cash' или 'bank')
 * @param {string} description - Описание транзакции
 * @param {number|null} relatedCharacterId - ID связанного персонажа (для переводов)
 * @param {number|null} adminId - ID админа (для админских действий)
 */
async function logTransaction(characterId, type, amount, currency, description, relatedCharacterId = null, adminId = null) {
    try {
        // Create table only on first call
        if (!tableInitialized) {
            await createTransactionTableIfNotExists();
            tableInitialized = true;
        }
        
        await db.query(
            `INSERT INTO transactions 
            (character_id, transaction_type, amount, currency, description, related_character_id, admin_id, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [characterId, type, amount, currency, description, relatedCharacterId, adminId]
        );
        
        console.log(`[Transactions] Logged: ${type} - Character ${characterId} - ${currency} $${amount}`);
        return true;
    } catch (err) {
        console.error('[Transactions] Error logging transaction:', err);
        return false;
    }
}

/**
 * Создание таблицы транзакций если не существует
 */
async function createTransactionTableIfNotExists() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INT PRIMARY KEY AUTO_INCREMENT,
                character_id INT NOT NULL,
                transaction_type VARCHAR(50) NOT NULL,
                amount INT NOT NULL,
                currency ENUM('cash', 'bank') NOT NULL,
                description TEXT,
                related_character_id INT,
                admin_id INT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_character (character_id),
                INDEX idx_type (transaction_type),
                INDEX idx_date (created_at),
                FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
    } catch (err) {
        // Таблица уже существует или ошибка
        if (!err.message.includes('already exists')) {
            console.error('[Transactions] Error creating table:', err);
        }
    }
}

/**
 * Получение истории транзакций персонажа
 * @param {number} characterId - ID персонажа
 * @param {number} limit - Лимит записей (по умолчанию 50)
 * @returns {Promise<Array>} Массив транзакций
 */
async function getTransactionHistory(characterId, limit = 50) {
    try {
        const [transactions] = await db.query(
            `SELECT t.*, c.name as related_name, c.surname as related_surname 
            FROM transactions t 
            LEFT JOIN characters c ON t.related_character_id = c.id 
            WHERE t.character_id = ? 
            ORDER BY t.created_at DESC 
            LIMIT ?`,
            [characterId, limit]
        );
        
        return transactions;
    } catch (err) {
        console.error('[Transactions] Error getting history:', err);
        return [];
    }
}

/**
 * Получение статистики транзакций
 * @param {number} characterId - ID персонажа
 * @param {number} days - За сколько дней (по умолчанию 30)
 * @returns {Promise<Object>} Статистика
 */
async function getTransactionStats(characterId, days = 30) {
    try {
        const [stats] = await db.query(
            `SELECT 
                currency,
                SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_expense,
                COUNT(*) as transaction_count
            FROM transactions 
            WHERE character_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY currency`,
            [characterId, days]
        );
        
        const result = {
            cash: { income: 0, expense: 0, count: 0 },
            bank: { income: 0, expense: 0, count: 0 }
        };
        
        stats.forEach(stat => {
            result[stat.currency] = {
                income: stat.total_income || 0,
                expense: stat.total_expense || 0,
                count: stat.transaction_count || 0
            };
        });
        
        return result;
    } catch (err) {
        console.error('[Transactions] Error getting stats:', err);
        return null;
    }
}

/**
 * Получение подозрительных транзакций (для анти-читов)
 * @param {number} threshold - Порог суммы для подозрительной транзакции (по умолчанию из конфигурации)
 * @param {number} hours - За последние N часов
 * @returns {Promise<Array>} Массив подозрительных транзакций
 */
async function getSuspiciousTransactions(threshold = SUSPICIOUS_THRESHOLD, hours = 24) {
    try {
        const [suspicious] = await db.query(
            `SELECT t.*, c.name, c.surname, c.user_id 
            FROM transactions t 
            JOIN characters c ON t.character_id = c.id 
            WHERE ABS(t.amount) >= ? 
            AND t.created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
            AND t.transaction_type NOT IN ('admin_give', 'admin_take')
            ORDER BY t.created_at DESC`,
            [threshold, hours]
        );
        
        return suspicious;
    } catch (err) {
        console.error('[Transactions] Error getting suspicious:', err);
        return [];
    }
}

/**
 * Команда для просмотра истории транзакций
 */
function registerTransactionCommands() {
    // Команда для игроков
    mp.events.addCommand('transactions', async (player) => {
        if (!player.characterId) {
            player.outputChatBox('!{#f44336}Вы не выбрали персонажа!');
            return;
        }
        
        try {
            const history = await getTransactionHistory(player.characterId, 10);
            
            if (history.length === 0) {
                player.outputChatBox('!{#ff9800}У вас нет транзакций');
                return;
            }
            
            player.outputChatBox('!{#2196f3}===== ПОСЛЕДНИЕ ТРАНЗАКЦИИ =====');
            history.forEach((t, index) => {
                const sign = t.amount > 0 ? '+' : '';
                const color = t.amount > 0 ? '#4caf50' : '#f44336';
                const currencyText = t.currency === 'cash' ? 'Наличные' : 'Банк';
                const date = new Date(t.created_at).toLocaleString('ru-RU');
                
                player.outputChatBox(`!{${color}}${index + 1}. ${sign}$${t.amount.toLocaleString()} (${currencyText}) - ${t.description}`);
                player.outputChatBox(`!{#9e9e9e}   ${date}`);
            });
        } catch (err) {
            console.error('[Transactions] Error in command:', err);
            player.outputChatBox('!{#f44336}Ошибка получения транзакций');
        }
    });
    
    // Команда для админов
    mp.events.addCommand('checktransactions', async (player, fullText) => {
        if (!player.adminLevel || player.adminLevel < 3) {
            player.outputChatBox('!{#f44336}Недостаточно прав!');
            return;
        }
        
        const targetId = parseInt(fullText);
        
        if (isNaN(targetId)) {
            player.outputChatBox('!{#ff9800}Использование: /checktransactions [ID игрока]');
            return;
        }
        
        const target = mp.players.at(targetId);
        
        if (!target || !target.characterId) {
            player.outputChatBox('!{#f44336}Игрок не найден!');
            return;
        }
        
        try {
            const history = await getTransactionHistory(target.characterId, 20);
            const stats = await getTransactionStats(target.characterId, 7);
            
            player.outputChatBox(`!{#2196f3}===== ТРАНЗАКЦИИ: ${target.name} =====`);
            
            if (stats) {
                player.outputChatBox(`!{#ffffff}Наличные (7 дней): Доход $${stats.cash.income.toLocaleString()}, Расход $${stats.cash.expense.toLocaleString()}`);
                player.outputChatBox(`!{#ffffff}Банк (7 дней): Доход $${stats.bank.income.toLocaleString()}, Расход $${stats.bank.expense.toLocaleString()}`);
            }
            
            player.outputChatBox(`!{#ffffff}Последние транзакции:`);
            history.slice(0, 10).forEach((t, index) => {
                const sign = t.amount > 0 ? '+' : '';
                const color = t.amount > 0 ? '#4caf50' : '#f44336';
                player.outputChatBox(`!{${color}}${index + 1}. ${sign}$${t.amount.toLocaleString()} - ${t.description}`);
            });
        } catch (err) {
            console.error('[Transactions] Error in admin command:', err);
            player.outputChatBox('!{#f44336}Ошибка получения данных');
        }
    });
    
    console.log('[Transactions] Commands registered');
}

// Инициализация
createTransactionTableIfNotExists().then(() => {
    console.log('[Transactions] ✅ Transaction system initialized');
});

module.exports = {
    TRANSACTION_TYPES,
    logTransaction,
    getTransactionHistory,
    getTransactionStats,
    getSuspiciousTransactions,
    registerTransactionCommands
};

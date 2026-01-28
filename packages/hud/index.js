// ===== HUD СИСТЕМА - СЕРВЕР =====

const { db } = require('../database');

// ===== ЗАПРОС ДАННЫХ ДЛЯ HUD =====
mp.events.add('hud:requestData', async (player) => {
    if (!player || !mp.players.exists(player) || !player.characterId) return;
    
    try {
        const [charData] = await db.query(`
            SELECT money, bank, level, exp, hunger, thirst
            FROM characters WHERE id = ?
        `, [player.characterId]);
        
        if (charData.length === 0) return;
        
        const char = charData[0];
        const maxExp = getExpForLevel(char.level || 1);
        
        const hudData = {
            cash: char.money || 0,
            bank: char.bank || 0,
            level: char.level || 1,
            exp: char.exp || 0,
            maxExp: maxExp,
            hunger: char.hunger !== undefined ? char.hunger : 100,
            thirst: char.thirst !== undefined ? char.thirst : 100,
            online: mp.players.length,
            myId: player.id
        };
        
        if (player && mp.players.exists(player)) {
            player.call('client:updateHUD', [JSON.stringify(hudData)]);
        }
        
    } catch (err) {
        console.error('[HUD] Ошибка получения данных:', err);
    }
});

// Формула опыта
function getExpForLevel(level) {
    return Math.floor(1000 * level * Math.pow(1.1, Math.floor(level / 10)));
}

// ===== АВТООБНОВЛЕНИЕ HUD =====
setInterval(() => {
    mp.players.forEach(async (player) => {
        if (!player || !mp.players.exists(player) || !player.characterId) return;
        
        try {
            const [charData] = await db.query(`
                SELECT money, bank, level, exp, hunger, thirst
                FROM characters WHERE id = ?
            `, [player.characterId]);
            
            if (charData.length === 0) return;
            
            const char = charData[0];
            const maxExp = getExpForLevel(char.level || 1);
            
            const hudData = {
                cash: char.money || 0,
                bank: char.bank || 0,
                level: char.level || 1,
                exp: char.exp || 0,
                maxExp: maxExp,
                hunger: char.hunger !== undefined ? char.hunger : 100,
                thirst: char.thirst !== undefined ? char.thirst : 100,
                online: mp.players.length,
                myId: player.id
            };
            
            if (player && mp.players.exists(player)) {
                player.call('client:updateHUD', [JSON.stringify(hudData)]);
            }
            
        } catch (err) {}
    });
}, 10000); // Каждые 10 секунд

// ===== ОТПРАВКА УВЕДОМЛЕНИЙ =====
global.sendNotification = function(player, type, title, message, duration = 5000) {
    if (player && mp.players.exists(player)) {
        player.call('client:notify', [type, title, message, duration]);
    }
};

global.broadcastNotification = function(type, title, message, duration = 5000) {
    mp.players.forEach(player => {
        if (player && mp.players.exists(player)) {
            player.call('client:notify', [type, title, message, duration]);
        }
    });
};

// ===== ПОДСКАЗКИ КЛАВИШ =====
global.showKeyHint = function(player, key, text, id) {
    if (player && mp.players.exists(player)) {
        player.call('client:showKeyHint', [key, text, id]);
    }
};

global.hideKeyHint = function(player, id) {
    if (player && mp.players.exists(player)) {
        player.call('client:hideKeyHint', [id]);
    }
};

// ===== ОБНОВЛЕНИЕ ПРИ ИЗМЕНЕНИИ ДАННЫХ =====
mp.events.add('hud:updateMoney', (player) => {
    if (player && mp.players.exists(player)) {
        mp.events.call('hud:requestData', player);
    }
});

console.log('[HUD] ✅ Система HUD загружена!');
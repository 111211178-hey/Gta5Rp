// ===== HUD СИСТЕМА - СЕРВЕР =====

const { db } = require('../database');

// ===== ЗАПРОС ДАННЫХ ДЛЯ HUD =====
mp.events.add('hud:requestData', async (player) => {
    if (!player || !mp.players.exists(player)) return;
    if (!player.characterId) {
        console.log('[HUD] characterId отсутствует');
        return;
    }
    
    try {
        const [charData] = await db.query(`
            SELECT money, bank, level, exp, hunger, thirst
            FROM characters WHERE id = ?
        `, [player.characterId]);
        
        if (charData.length === 0) {
            console.log('[HUD] Персонаж не найден:', player.characterId);
            return;
        }
        
        const char = charData[0];
        const maxExp = getExpForLevel(char.level || 1);
        
        const hudData = {
            cash: char.money || 0,
            bank: char.bank || 0,
            level: char.level || 1,
            exp: char.exp || 0,
            maxExp: maxExp,
            hunger: char.hunger !== undefined && char.hunger !== null ? char.hunger : 100,
            thirst: char.thirst !== undefined && char.thirst !== null ? char.thirst : 100,
            online: mp.players.length,
            myId: player.id
        };
        
        console.log('[HUD] Отправка данных игроку:', player.name, hudData);
        
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

// ===== АВТООБНОВЛЕНИЕ HUD КАЖДЫЕ 10 СЕКУНД =====
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
                hunger: char.hunger !== undefined && char.hunger !== null ? char.hunger : 100,
                thirst: char.thirst !== undefined && char.thirst !== null ? char.thirst : 100,
                online: mp.players.length,
                myId: player.id
            };
            
            if (player && mp.players.exists(player)) {
                player.call('client:updateHUD', [JSON.stringify(hudData)]);
            }
            
        } catch (err) {}
    });
}, 10000);

// ===== ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ УВЕДОМЛЕНИЙ =====
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

console.log('[HUD] ✅ Система HUD загружена!');
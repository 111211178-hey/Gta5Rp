// ===== СИСТЕМА ВЫЖИВАНИЯ (ГОЛОД И ЖАЖДА) =====

const { db } = require('../database');

// ===== НАСТРОЙКИ =====
const SURVIVAL_CONFIG = {
    decreaseInterval: 60000,
    hungerDecrease: 1,
    thirstDecrease: 1.5,
    starvingDamage: 5,
    dehydrationDamage: 7,
    lowThreshold: 25,
    criticalThreshold: 10,
    regenThreshold: 80,
    regenAmount: 1,
    regenInterval: 10000
};

// Флаги для предупреждений
const playerWarnings = new Map();

// ===== ИНИЦИАЛИЗАЦИЯ ИГРОКА =====
mp.events.add('playerReady', (player) => {
    if (!player.survivalInitialized) {
        player.hunger = 100;
        player.thirst = 100;
        player.survivalInitialized = true;
    }
});

// ===== ЗАГРУЗКА ДАННЫХ ПЕРСОНАЖА =====
mp.events.add('character:loaded', async (player, characterId) => {
    try {
        const [result] = await db.query(
            'SELECT hunger, thirst FROM characters WHERE id = ?',
            [characterId]
        );
        
        if (result.length > 0) {
            player.hunger = result[0].hunger ?? 100;
            player.thirst = result[0].thirst ?? 100;
        } else {
            player.hunger = 100;
            player.thirst = 100;
        }
        
        playerWarnings.set(player.id, { hunger: false, thirst: false, hungerLow: false, thirstLow: false });
        updateClientStats(player);
        
        console.log(`[Survival] Загружено для ${player.name}: Голод=${player.hunger}, Жажда=${player.thirst}`);
    } catch (err) {
        console.error('[Survival] Ошибка загрузки:', err);
        player.hunger = 100;
        player.thirst = 100;
    }
});

// ===== СОХРАНЕНИЕ ДАННЫХ =====
async function savePlayerSurvival(player) {
    if (!player.characterId) return;
    
    try {
        await db.query(
            'UPDATE characters SET hunger = ?, thirst = ? WHERE id = ?',
            [Math.round(player.hunger || 0), Math.round(player.thirst || 0), player.characterId]
        );
    } catch (err) {
        console.error('[Survival] Ошибка сохранения:', err);
    }
}

// ===== ОТПРАВКА СТАТОВ КЛИЕНТУ =====
function updateClientStats(player) {
    if (!player || !mp.players.exists(player)) return;
    
    player.call('client:updateSurvivalStats', [
        Math.round(player.hunger || 100),
        Math.round(player.thirst || 100),
        player.health || 100
    ]);
}

// ===== ЗАПРОС СТАТОВ =====
mp.events.add('survival:requestStats', (player) => {
    if (player.characterId) {
        updateClientStats(player);
    }
});

// ===== ГЛАВНЫЙ ЦИКЛ ВЫЖИВАНИЯ =====
setInterval(() => {
    mp.players.forEach(player => {
        if (!player.characterId) return;
        if (!mp.players.exists(player)) return;
        if (player.health <= 0) return;
        
        if (!playerWarnings.has(player.id)) {
            playerWarnings.set(player.id, { hunger: false, thirst: false, hungerLow: false, thirstLow: false });
        }
        const warnings = playerWarnings.get(player.id);
        
        player.hunger = Math.max(0, (player.hunger || 100) - SURVIVAL_CONFIG.hungerDecrease);
        player.thirst = Math.max(0, (player.thirst || 100) - SURVIVAL_CONFIG.thirstDecrease);
        
        let damage = 0;
        
        // Голод
        if (player.hunger <= 0) {
            damage += SURVIVAL_CONFIG.starvingDamage;
            if (!warnings.hunger) {
                player.outputChatBox('!{#f44336}⚠ Вы умираете от голода!');
                warnings.hunger = true;
            }
        } else if (player.hunger <= SURVIVAL_CONFIG.criticalThreshold) {
            if (!warnings.hunger) {
                player.outputChatBox('!{#ff5722}⚠ Вы сильно голодны! Срочно найдите еду!');
                warnings.hunger = true;
            }
        } else if (player.hunger <= SURVIVAL_CONFIG.lowThreshold) {
            if (!warnings.hungerLow) {
                player.outputChatBox('!{#ff9800}🍔 Вы проголодались');
                warnings.hungerLow = true;
            }
            warnings.hunger = false;
        } else {
            warnings.hunger = false;
            warnings.hungerLow = false;
        }
        
        // Жажда
        if (player.thirst <= 0) {
            damage += SURVIVAL_CONFIG.dehydrationDamage;
            if (!warnings.thirst) {
                player.outputChatBox('!{#f44336}⚠ Вы умираете от жажды!');
                warnings.thirst = true;
            }
        } else if (player.thirst <= SURVIVAL_CONFIG.criticalThreshold) {
            if (!warnings.thirst) {
                player.outputChatBox('!{#ff5722}⚠ Вы сильно хотите пить! Срочно найдите воду!');
                warnings.thirst = true;
            }
        } else if (player.thirst <= SURVIVAL_CONFIG.lowThreshold) {
            if (!warnings.thirstLow) {
                player.outputChatBox('!{#03a9f4}💧 Вы хотите пить');
                warnings.thirstLow = true;
            }
            warnings.thirst = false;
        } else {
            warnings.thirst = false;
            warnings.thirstLow = false;
        }
        
        if (damage > 0) {
            player.health = Math.max(1, player.health - damage);
        }
        
        updateClientStats(player);
    });
}, SURVIVAL_CONFIG.decreaseInterval);

// ===== РЕГЕНЕРАЦИЯ HP =====
setInterval(() => {
    mp.players.forEach(player => {
        if (!player.characterId) return;
        if (!mp.players.exists(player)) return;
        if (player.health <= 0 || player.health >= 100) return;
        
        if ((player.hunger || 0) >= SURVIVAL_CONFIG.regenThreshold && 
            (player.thirst || 0) >= SURVIVAL_CONFIG.regenThreshold) {
            player.health = Math.min(100, player.health + SURVIVAL_CONFIG.regenAmount);
            updateClientStats(player);
        }
    });
}, SURVIVAL_CONFIG.regenInterval);

// ===== СОХРАНЕНИЕ =====
mp.events.add('playerQuit', (player) => {
    savePlayerSurvival(player);
    playerWarnings.delete(player.id);
});

setInterval(() => {
    mp.players.forEach(player => {
        if (player.characterId && mp.players.exists(player)) {
            savePlayerSurvival(player);
        }
    });
}, 5 * 60 * 1000);

// ===== ФУНКЦИИ ДЛЯ ПРЕДМЕТОВ =====
function restoreHunger(player, amount) {
    if (!player || !mp.players.exists(player)) return;
    player.hunger = Math.min(100, (player.hunger || 0) + amount);
    
    if (playerWarnings.has(player.id)) {
        const w = playerWarnings.get(player.id);
        w.hunger = false;
        w.hungerLow = false;
    }
    
    updateClientStats(player);
    savePlayerSurvival(player);
}

function restoreThirst(player, amount) {
    if (!player || !mp.players.exists(player)) return;
    player.thirst = Math.min(100, (player.thirst || 0) + amount);
    
    if (playerWarnings.has(player.id)) {
        const w = playerWarnings.get(player.id);
        w.thirst = false;
        w.thirstLow = false;
    }
    
    updateClientStats(player);
    savePlayerSurvival(player);
}

function restoreHealth(player, amount) {
    if (!player || !mp.players.exists(player)) return;
    player.health = Math.min(100, player.health + amount);
    updateClientStats(player);
}

// ===== ЭКСПОРТ =====
global.restoreHunger = restoreHunger;
global.restoreThirst = restoreThirst;
global.restoreHealth = restoreHealth;
global.updateClientStats = updateClientStats;

// ===== КОМАНДЫ =====
mp.events.addCommand('sethunger', (player, _, value) => {
    const hunger = parseInt(value);
    if (isNaN(hunger) || hunger < 0 || hunger > 100) {
        player.outputChatBox('!{#f44336}Использование: /sethunger [0-100]');
        return;
    }
    player.hunger = hunger;
    if (playerWarnings.has(player.id)) {
        const w = playerWarnings.get(player.id);
        w.hunger = false;
        w.hungerLow = false;
    }
    updateClientStats(player);
    player.outputChatBox(`!{#4caf50}Голод установлен: ${hunger}`);
});

mp.events.addCommand('setthirst', (player, _, value) => {
    const thirst = parseInt(value);
    if (isNaN(thirst) || thirst < 0 || thirst > 100) {
        player.outputChatBox('!{#f44336}Использование: /setthirst [0-100]');
        return;
    }
    player.thirst = thirst;
    if (playerWarnings.has(player.id)) {
        const w = playerWarnings.get(player.id);
        w.thirst = false;
        w.thirstLow = false;
    }
    updateClientStats(player);
    player.outputChatBox(`!{#4caf50}Жажда установлена: ${thirst}`);
});

mp.events.addCommand('stats', (player) => {
    player.outputChatBox(`!{#2196f3}═══════ СТАТИСТИКА ═══════`);
    player.outputChatBox(`!{#e57373}❤ HP: ${player.health}`);
    player.outputChatBox(`!{#ffb74d}🍔 Голод: ${Math.round(player.hunger || 0)}`);
    player.outputChatBox(`!{#4fc3f7}💧 Жажда: ${Math.round(player.thirst || 0)}`);
});

mp.events.addCommand('heal', (player) => {
    player.health = 100;
    player.hunger = 100;
    player.thirst = 100;
    updateClientStats(player);
    player.outputChatBox('!{#4caf50}Все показатели восстановлены!');
});

console.log('[Survival] ✅ Система выживания загружена!');
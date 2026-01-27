// ===== СИСТЕМА ВЫЖИВАНИЯ (ГОЛОД И ЖАЖДА) =====

const { db } = require('../database');

// ===== НАСТРОЙКИ =====
const SURVIVAL_CONFIG = {
    // Интервал уменьшения (в миллисекундах)
    decreaseInterval: 60000, // 1 минута
    
    // Сколько отнимается за интервал
    hungerDecrease: 1,
    thirstDecrease: 1.5,
    
    // Урон при критических значениях
    starvingDamage: 5,      // Урон при голоде = 0
    dehydrationDamage: 7,   // Урон при жажде = 0
    
    // Пороги для эффект��в
    lowThreshold: 25,       // Ниже этого - предупреждение
    criticalThreshold: 10,  // Ниже этого - критическое состояние
    
    // Восстановление HP при сытости
    regenThreshold: 80,     // Выше этого - регенерация HP
    regenAmount: 1,         // Сколько HP восстанавливается
    regenInterval: 10000    // Интервал регенерации (10 сек)
};

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
        
        // Отправляем данные клиенту
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
            [Math.round(player.hunger), Math.round(player.thirst), player.characterId]
        );
    } catch (err) {
        console.error('[Survival] Ошибка сохранения:', err);
    }
}

// ===== ОТПРАВКА СТАТОВ КЛИЕНТУ =====
function updateClientStats(player) {
    player.call('client:updateSurvivalStats', [
        Math.round(player.hunger || 100),
        Math.round(player.thirst || 100),
        player.health
    ]);
}

// ===== ГЛАВНЫЙ ЦИКЛ ВЫЖИВАНИЯ =====
setInterval(() => {
    mp.players.forEach(player => {
        if (!player.characterId) return;
        if (player.health <= 0) return; // Мёртвые не голодают
        
        // Уменьшаем голод и жажду
        player.hunger = Math.max(0, (player.hunger || 100) - SURVIVAL_CONFIG.hungerDecrease);
        player.thirst = Math.max(0, (player.thirst || 100) - SURVIVAL_CONFIG.thirstDecrease);
        
        // Проверяем критические состояния
        let damage = 0;
        
        if (player.hunger <= 0) {
            damage += SURVIVAL_CONFIG.starvingDamage;
            player.outputChatBox('!{#f44336}Вы умираете от голода!');
        } else if (player.hunger <= SURVIVAL_CONFIG.criticalThreshold) {
            player.outputChatBox('!{#ff9800}Вы сильно голодны! Срочно найдите еду!');
        } else if (player.hunger <= SURVIVAL_CONFIG.lowThreshold) {
            player.outputChatBox('!{#ffeb3b}Вы проголодались');
        }
        
        if (player.thirst <= 0) {
            damage += SURVIVAL_CONFIG.dehydrationDamage;
            player.outputChatBox('!{#f44336}Вы умираете от жажды!');
        } else if (player.thirst <= SURVIVAL_CONFIG.criticalThreshold) {
            player.outputChatBox('!{#ff9800}Вы сильно хотите пить! Срочно найдите воду!');
        } else if (player.thirst <= SURVIVAL_CONFIG.lowThreshold) {
            player.outputChatBox('!{#ffeb3b}Вы хотите пить');
        }
        
        // Наносим урон если голод или жажда на нуле
        if (damage > 0) {
            player.health = Math.max(1, player.health - damage);
        }
        
        // Отправляем обновление клиенту
        updateClientStats(player);
    });
}, SURVIVAL_CONFIG.decreaseInterval);

// ===== РЕГЕНЕРАЦИЯ HP =====
setInterval(() => {
    mp.players.forEach(player => {
        if (!player.characterId) return;
        if (player.health <= 0) return;
        if (player.health >= 100) return;
        
        // Регенерация только если сыт и напоен
        if (player.hunger >= SURVIVAL_CONFIG.regenThreshold && 
            player.thirst >= SURVIVAL_CONFIG.regenThreshold) {
            player.health = Math.min(100, player.health + SURVIVAL_CONFIG.regenAmount);
            updateClientStats(player);
        }
    });
}, SURVIVAL_CONFIG.regenInterval);

// ===== СОХРАНЕНИЕ ПРИ ВЫХОДЕ =====
mp.events.add('playerQuit', (player) => {
    savePlayerSurvival(player);
});

// ===== ПЕРИОДИЧЕСКОЕ СОХРАНЕНИЕ =====
setInterval(() => {
    mp.players.forEach(player => {
        if (player.characterId) {
            savePlayerSurvival(player);
        }
    });
}, 5 * 60 * 1000); // Каждые 5 минут

// ===== ФУНКЦИИ ДЛЯ ИСПОЛЬЗОВАНИЯ ПРЕДМЕТОВ =====
function restoreHunger(player, amount) {
    player.hunger = Math.min(100, (player.hunger || 0) + amount);
    updateClientStats(player);
    savePlayerSurvival(player);
}

function restoreThirst(player, amount) {
    player.thirst = Math.min(100, (player.thirst || 0) + amount);
    updateClientStats(player);
    savePlayerSurvival(player);
}

function restoreHealth(player, amount) {
    player.health = Math.min(100, player.health + amount);
    updateClientStats(player);
}

// ===== ЭКСПОРТ ФУНКЦИЙ =====
global.restoreHunger = restoreHunger;
global.restoreThirst = restoreThirst;
global.restoreHealth = restoreHealth;
global.updateClientStats = updateClientStats;

// ===== КОМАНДЫ ДЛЯ ТЕСТИРОВАНИЯ =====
mp.events.addCommand('sethunger', (player, _, value) => {
    const hunger = parseInt(value);
    if (isNaN(hunger) || hunger < 0 || hunger > 100) {
        player.outputChatBox('!{#f44336}Использование: /sethunger [0-100]');
        return;
    }
    player.hunger = hunger;
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
    updateClientStats(player);
    player.outputChatBox(`!{#4caf50}Жажда установлена: ${thirst}`);
});

mp.events.addCommand('stats', (player) => {
    player.outputChatBox(`!{#2196f3}===== СТАТИСТИКА =====`);
    player.outputChatBox(`!{#4caf50}HP: ${player.health}`);
    player.outputChatBox(`!{#ff9800}Голод: ${Math.round(player.hunger || 0)}`);
    player.outputChatBox(`!{#03a9f4}Жажда: ${Math.round(player.thirst || 0)}`);
});

// В packages/survival/index.js добавь:

mp.events.add('survival:requestStats', (player) => {
    if (player.characterId) {
        updateClientStats(player);
    }
});

console.log('[Survival] ✅ Система выживания загружена!');
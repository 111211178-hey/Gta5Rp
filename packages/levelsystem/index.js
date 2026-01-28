// ===== СИСТЕМА УРОВНЕЙ И ОПЫТА =====

const { db } = require('../database');

// ===== КОНФИГУРАЦИЯ =====
const CONFIG = {
    // Опыт
    expPerHour: 100,                    // Базовый опыт в час
    expPerLevel: 1000,                  // Опыт на уровень (умножается на уровень)
    maxLevel: 100,                      // Максимальный уровень
    
    // Пособие по безработице
    unemploymentBenefit: 500,           // Пособие в час ($)
    
    // Награды за уровень
    skillPointsPerLevel: 1,             // Очков навыков за уровень
    moneyPerLevel: 1000,                // Бонус денег за уровень
    
    // Интервал проверки (в минутах)
    checkInterval: 1,                   // Проверка каждую минуту (для точности)
    
    // Минимальное время онлайн для награды (в минутах)
    minOnlineTime: 55                   // Минимум 55 минут из часа
};

// Хранилище времени онлайн игроков
const playerOnlineTime = new Map();

// ===== ИНИЦИАЛИЗАЦИЯ ИГРОКА =====
mp.events.add('playerReady', (player) => {
    playerOnlineTime.set(player.id, {
        odometer: 0,        // Счётчик минут в текущем часе
        totalMinutes: 0,    // Общее время онлайн
        lastCheck: Date.now()
    });
});

mp.events.add('playerQuit', (player) => {
    // Сохраняем время игры перед выходом
    savePlayTime(player);
    playerOnlineTime.delete(player.id);
});

// ===== ОСНОВНОЙ ЦИКЛ (каждую минуту) =====
setInterval(async () => {
    const now = Date.now();
    
    mp.players.forEach(async (player) => {
        if (!player || !player.characterId) return;
        
        const timeData = playerOnlineTime.get(player.id);
        if (!timeData) return;
        
        // Увеличиваем счётчик
        timeData.odometer++;
        timeData.totalMinutes++;
        
        // Проверяем прошёл ли час (60 минут)
        if (timeData.odometer >= 60) {
            // Начисляем награды за час
            await processHourlyRewards(player);
            
            // Сбрасываем одометр
            timeData.odometer = 0;
        }
        
        // Обновляем время последней проверки
        timeData.lastCheck = now;
    });
    
}, CONFIG.checkInterval * 60 * 1000); // Каждую минуту

// ===== ОБРАБОТКА ЧАСОВЫХ НАГРАД =====
async function processHourlyRewards(player) {
    if (!player || !player.characterId) return;
    
    try {
        // Получаем данные персонажа
        const [charData] = await db.query(`
            SELECT 
                c.id, c.level, c.exp, c.money, c.bank,
                cf.faction_id,
                cj.job_id
            FROM characters c
            LEFT JOIN character_factions cf ON c.id = cf.character_id
            LEFT JOIN character_jobs cj ON c.id = cj.character_id
            WHERE c.id = ?
        `, [player.characterId]);
        
        if (charData.length === 0) return;
        
        const char = charData[0];
        const currentLevel = char.level || 1;
        const currentExp = char.exp || 0;
        
        const hasFaction = char.faction_id !== null;
        const hasJob = char.job_id !== null;
        const isUnemployed = !hasFaction && !hasJob;
        
        // === Начисляем опыт ===
        const expGain = CONFIG.expPerHour;
        let newExp = currentExp + expGain;
        let newLevel = currentLevel;
        let leveledUp = false;
        let levelsGained = 0;
        
        // Проверяем повышение уровня
        let expForNextLevel = getExpForLevel(newLevel);
        
        while (newExp >= expForNextLevel && newLevel < CONFIG.maxLevel) {
            newExp -= expForNextLevel;
            newLevel++;
            levelsGained++;
            leveledUp = true;
            expForNextLevel = getExpForLevel(newLevel);
        }
        
        // === Начисляем пособие по безработице ===
        let benefitAmount = 0;
        if (isUnemployed) {
            benefitAmount = CONFIG.unemploymentBenefit;
            
            await db.query(
                'UPDATE characters SET bank = bank + ? WHERE id = ?',
                [benefitAmount, player.characterId]
            );
            
            // Логируем транзакцию
            await db.query(
                `INSERT INTO transactions (character_id, transaction_type, amount, currency, description) 
                 VALUES (?, 'unemployment_benefit', ?, 'bank', 'Пособие по безработице')`,
                [player.characterId, benefitAmount]
            );
        }
        
        // === Обновляем опыт и уровень ===
        if (leveledUp) {
            // Начисляем награды за уровень
            const skillPointsReward = levelsGained * CONFIG.skillPointsPerLevel;
            const moneyReward = levelsGained * CONFIG.moneyPerLevel;
            
            await db.query(`
                UPDATE characters 
                SET level = ?, exp = ?, skill_points = skill_points + ?, bank = bank + ?
                WHERE id = ?
            `, [newLevel, newExp, skillPointsReward, moneyReward, player.characterId]);
            
            // Логируем награду за уровень
            await db.query(
                `INSERT INTO transactions (character_id, transaction_type, amount, currency, description) 
                 VALUES (?, 'level_up_reward', ?, 'bank', ?)`,
                [player.characterId, moneyReward, `Награда за достижение ${newLevel} уровня`]
            );
            
            // Уведомляем игрока о повышении уровня
            player.call('client:levelUp', [newLevel, skillPointsReward, moneyReward]);
            
            player.outputChatBox(`!{#ffd700}★ Поздравляем! Вы достигли ${newLevel} уровня!`);
            player.outputChatBox(`!{#4caf50}+${skillPointsReward} очков навыков`);
            player.outputChatBox(`!{#4caf50}+$${moneyReward.toLocaleString()} на банковский счёт`);
            
            console.log(`[LevelSystem] ${player.name} достиг ${newLevel} уровня`);
            
        } else {
            // Просто обновляем опыт
            await db.query(
                'UPDATE characters SET exp = ? WHERE id = ?',
                [newExp, player.characterId]
            );
        }
        
        // === Уведомления игроку ===
        player.outputChatBox(`!{#2196f3}[Система] +${expGain} опыта за час игры`);
        
        if (isUnemployed && benefitAmount > 0) {
            player.outputChatBox(`!{#4caf50}[Банк] Получено пособие по безработице: $${benefitAmount.toLocaleString()}`);
            player.call('client:showNotification', ['success', `Пособие: +$${benefitAmount}`]);
        }
        
        // Показываем прогресс до следующего уровня
        const expToNext = getExpForLevel(newLevel);
        const progress = Math.floor((newExp / expToNext) * 100);
        player.outputChatBox(`!{#9e9e9e}Прогресс до ${newLevel + 1} уровня: ${progress}% (${newExp}/${expToNext})`);
        
        // Обновляем HUD игрока
        player.call('client:updateExpBar', [newLevel, newExp, expToNext]);
        
        // Записываем активность
        await db.query(`
            INSERT INTO player_activity (user_id, character_id, session_start, duration)
            VALUES (?, ?, NOW(), 60)
            ON DUPLICATE KEY UPDATE duration = duration + 60
        `, [player.accountId, player.characterId]);
        
    } catch (err) {
        console.error('[LevelSystem] Ошибка начисления наград:', err);
    }
}

// ===== РАСЧЁТ ОПЫТА ДЛЯ УРОВНЯ =====
function getExpForLevel(level) {
    // Формула: базовый опыт * уровень * 1.1^(уровень/10)
    // Это создаёт плавное увеличение требуемого опыта
    const baseExp = CONFIG.expPerLevel;
    const multiplier = Math.pow(1.1, Math.floor(level / 10));
    return Math.floor(baseExp * level * multiplier);
}

// ===== СОХРАНЕНИЕ ВРЕМЕНИ ИГРЫ =====
async function savePlayTime(player) {
    if (!player || !player.characterId) return;
    
    const timeData = playerOnlineTime.get(player.id);
    if (!timeData) return;
    
    try {
        await db.query(`
            INSERT INTO player_activity (user_id, character_id, session_start, duration)
            VALUES (?, ?, NOW(), ?)
        `, [player.accountId, player.characterId, timeData.totalMinutes]);
    } catch (err) {
        console.error('[LevelSystem] Ошибка сохранения времени:', err);
    }
}

// ===== КОМАНДА ДЛЯ ПРОВЕРКИ СТАТУСА =====
mp.events.addCommand('level', async (player) => {
    if (!player.characterId) {
        player.outputChatBox('!{#f44336}Сначала выберите персонажа!');
        return;
    }
    
    try {
        const [charData] = await db.query(
            'SELECT level, exp, skill_points FROM characters WHERE id = ?',
            [player.characterId]
        );
        
        if (charData.length === 0) return;
        
        const char = charData[0];
        const expForNext = getExpForLevel(char.level);
        const progress = Math.floor((char.exp / expForNext) * 100);
        
        const timeData = playerOnlineTime.get(player.id);
        const minutesToReward = timeData ? (60 - timeData.odometer) : 60;
        
        player.outputChatBox('!{#ffd700}═══════ УРОВЕНЬ ═══════');
        player.outputChatBox(`!{#ffffff}Уровень: !{#ffd700}${char.level}`);
        player.outputChatBox(`!{#ffffff}Опыт: !{#2196f3}${char.exp} / ${expForNext} !{#9e9e9e}(${progress}%)`);
        player.outputChatBox(`!{#ffffff}Очки навыков: !{#4caf50}${char.skill_points}`);
        player.outputChatBox(`!{#ffffff}До награды: !{#ff9800}${minutesToReward} мин`);
        player.outputChatBox('!{#ffd700}═══════════════════════');
        
    } catch (err) {
        console.error('[LevelSystem] Ошибка команды /level:', err);
    }
});

// ===== КОМАНДА ДЛЯ ПРОВЕРКИ ПОСОБИЯ =====
mp.events.addCommand('benefit', async (player) => {
    if (!player.characterId) {
        player.outputChatBox('!{#f44336}Сначала выберите персонажа!');
        return;
    }
    
    try {
        const [charData] = await db.query(`
            SELECT 
                cf.faction_id,
                cj.job_id
            FROM characters c
            LEFT JOIN character_factions cf ON c.id = cf.character_id
            LEFT JOIN character_jobs cj ON c.id = cj.character_id
            WHERE c.id = ?
        `, [player.characterId]);
        
        if (charData.length === 0) return;
        
        const char = charData[0];
        const hasFaction = char.faction_id !== null;
        const hasJob = char.job_id !== null;
        const isUnemployed = !hasFaction && !hasJob;
        
        if (isUnemployed) {
            const timeData = playerOnlineTime.get(player.id);
            const minutesToReward = timeData ? (60 - timeData.odometer) : 60;
            
            player.outputChatBox(`!{#4caf50}[Пособие] Вы безработный. Пособие: $${CONFIG.unemploymentBenefit}/час`);
            player.outputChatBox(`!{#9e9e9e}Следующая выплата через: ${minutesToReward} мин`);
        } else {
            if (hasFaction) {
                player.outputChatBox(`!{#ff9800}[Пособие] Вы состоите во фракции. Пособие не начисляется.`);
            }
            if (hasJob) {
                player.outputChatBox(`!{#ff9800}[Пособие] Вы трудоустроены. Пособие не начисляется.`);
            }
        }
        
    } catch (err) {
        console.error('[LevelSystem] Ошибка команды /benefit:', err);
    }
});

// ===== АДМИН КОМАНДА - ВЫДАТЬ ОПЫТ =====
mp.events.addCommand('giveexp', async (player, fullText) => {
    if (!player.adminLevel || player.adminLevel < 3) {
        player.outputChatBox('!{#f44336}Недостаточно прав!');
        return;
    }
    
    const args = fullText.split(' ');
    if (args.length < 2) {
        player.outputChatBox('!{#ff9800}Использование: /giveexp [ID] [количество]');
        return;
    }
    
    const targetId = parseInt(args[0]);
    const amount = parseInt(args[1]);
    
    if (isNaN(amount) || amount <= 0) {
        player.outputChatBox('!{#f44336}Неверное количество опыта!');
        return;
    }
    
    const target = mp.players.at(targetId);
    if (!target || !target.characterId) {
        player.outputChatBox('!{#f44336}Игрок не найден!');
        return;
    }
    
    try {
        // Получаем текущие данные
        const [charData] = await db.query(
            'SELECT level, exp FROM characters WHERE id = ?',
            [target.characterId]
        );
        
        if (charData.length === 0) return;
        
        let currentLevel = charData[0].level;
        let newExp = charData[0].exp + amount;
        let newLevel = currentLevel;
        let levelsGained = 0;
        
        // Проверяем повышение уровня
        let expForNextLevel = getExpForLevel(newLevel);
        
        while (newExp >= expForNextLevel && newLevel < CONFIG.maxLevel) {
            newExp -= expForNextLevel;
            newLevel++;
            levelsGained++;
            expForNextLevel = getExpForLevel(newLevel);
        }
        
        // Обновляем базу
        if (levelsGained > 0) {
            const skillPointsReward = levelsGained * CONFIG.skillPointsPerLevel;
            
            await db.query(`
                UPDATE characters 
                SET level = ?, exp = ?, skill_points = skill_points + ?
                WHERE id = ?
            `, [newLevel, newExp, skillPointsReward, target.characterId]);
            
            target.call('client:levelUp', [newLevel, skillPointsReward, 0]);
            target.outputChatBox(`!{#ffd700}★ Вы получили ${amount} опыта и достигли ${newLevel} уровня!`);
        } else {
            await db.query(
                'UPDATE characters SET exp = ? WHERE id = ?',
                [newExp, target.characterId]
            );
            target.outputChatBox(`!{#2196f3}Вы получили ${amount} опыта от администратора`);
        }
        
        player.outputChatBox(`!{#4caf50}[Admin] Выдано ${amount} опыта игроку ${target.name}`);
        
    } catch (err) {
        console.error('[LevelSystem] Ошибка /giveexp:', err);
        player.outputChatBox('!{#f44336}Ошибка выдачи опыта!');
    }
});

// ===== АДМИН КОМАНДА - УСТАНОВИТЬ УРОВЕНЬ =====
mp.events.addCommand('setlevel', async (player, fullText) => {
    if (!player.adminLevel || player.adminLevel < 4) {
        player.outputChatBox('!{#f44336}Недостаточно прав!');
        return;
    }
    
    const args = fullText.split(' ');
    if (args.length < 2) {
        player.outputChatBox('!{#ff9800}Использование: /setlevel [ID] [уровень]');
        return;
    }
    
    const targetId = parseInt(args[0]);
    const level = parseInt(args[1]);
    
    if (isNaN(level) || level < 1 || level > CONFIG.maxLevel) {
        player.outputChatBox(`!{#f44336}Уровень должен быть от 1 до ${CONFIG.maxLevel}!`);
        return;
    }
    
    const target = mp.players.at(targetId);
    if (!target || !target.characterId) {
        player.outputChatBox('!{#f44336}Игрок не найден!');
        return;
    }
    
    try {
        await db.query(
            'UPDATE characters SET level = ?, exp = 0 WHERE id = ?',
            [level, target.characterId]
        );
        
        target.outputChatBox(`!{#ffd700}★ Администратор установил вам ${level} уровень!`);
        target.call('client:levelUp', [level, 0, 0]);
        
        player.outputChatBox(`!{#4caf50}[Admin] Установлен ${level} уровень игроку ${target.name}`);
        
    } catch (err) {
        console.error('[LevelSystem] Ошибка /setlevel:', err);
        player.outputChatBox('!{#f44336}Ошибка установки уровня!');
    }
});

// ===== ЭКСПОРТ ФУНКЦИЙ =====
global.giveExp = async function(characterId, amount, reason = 'Опыт') {
    try {
        const [charData] = await db.query(
            'SELECT level, exp FROM characters WHERE id = ?',
            [characterId]
        );
        
        if (charData.length === 0) return false;
        
        let currentLevel = charData[0].level;
        let newExp = charData[0].exp + amount;
        let newLevel = currentLevel;
        
        let expForNextLevel = getExpForLevel(newLevel);
        
        while (newExp >= expForNextLevel && newLevel < CONFIG.maxLevel) {
            newExp -= expForNextLevel;
            newLevel++;
            expForNextLevel = getExpForLevel(newLevel);
        }
        
        if (newLevel > currentLevel) {
            const levelsGained = newLevel - currentLevel;
            const skillPointsReward = levelsGained * CONFIG.skillPointsPerLevel;
            
            await db.query(`
                UPDATE characters 
                SET level = ?, exp = ?, skill_points = skill_points + ?
                WHERE id = ?
            `, [newLevel, newExp, skillPointsReward, characterId]);
        } else {
            await db.query(
                'UPDATE characters SET exp = ? WHERE id = ?',
                [newExp, characterId]
            );
        }
        
        return true;
    } catch (err) {
        console.error('[LevelSystem] Ошибка giveExp:', err);
        return false;
    }
};

console.log('[LevelSystem] ✅ Система уровней загружена!');
console.log(`[LevelSystem] Опыт в час: ${CONFIG.expPerHour}`);
console.log(`[LevelSystem] Пособие: $${CONFIG.unemploymentBenefit}/час`);
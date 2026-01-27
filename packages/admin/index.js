// ===== АДМИН СИСТЕМА - СЕРВЕРНАЯ ЧАСТЬ =====

const { db } = require('../database');

console.log('[Admin System] Загрузка системы администрирования...');

// ===== КОНФИГУРАЦИЯ =====
const ADMIN_PERMISSIONS = {
    1: ['kick', 'mute', 'freeze', 'heal', 'tp', 'spawn_vehicle'],
    2: ['kick', 'mute', 'freeze', 'heal', 'tp', 'spawn_vehicle', 'ban_temp', 'weather', 'time'],
    3: ['kick', 'mute', 'freeze', 'heal', 'tp', 'spawn_vehicle', 'ban_temp', 'weather', 'time', 'give_money', 'announcement'],
    4: ['kick', 'mute', 'freeze', 'heal', 'tp', 'spawn_vehicle', 'ban_temp', 'ban_perm', 'weather', 'time', 'give_money', 'announcement', 'manage_admins'],
    5: ['*'] // Полный доступ
};

// ===== ПРОВЕРКА ПРАВ =====
function hasPermission(player, permission) {
    if (!player.adminLevel || player.adminLevel === 0) {
        return false;
    }
    
    const permissions = ADMIN_PERMISSIONS[player.adminLevel];
    
    if (!permissions) return false;
    if (permissions.includes('*')) return true;
    
    return permissions.includes(permission);
}

// ===== ЛОГИРОВАНИЕ ДЕЙСТВИЙ =====
async function logAdminAction(adminId, actionType, targetPlayer, details) {
    try {
        await db.query(
            'INSERT INTO admin_logs (admin_id, action_type, target_player, details) VALUES (?, ?, ?, ?)',
            [adminId, actionType, targetPlayer, details]
        );
        
        console.log(`[Admin Log] ${actionType}: Admin=${adminId}, Target=${targetPlayer}, Details=${details}`);
    } catch (err) {
        console.error('[Admin Log] Ошибка логирования:', err);
    }
}

// ===== АКТИВАЦИЯ АДМИН СИСТЕМЫ =====
mp.events.addCommand('admin', async (player) => {
    try {
        console.log('[Admin System] ===== КОМАНДА /admin =====');
        console.log(`[Admin System] Игрок: ${player.socialClub}`);
        
        if (!player.accountId) {
            player.outputChatBox('!{#f44336}Вы не авторизованы!');
            return;
        }
        
        // Проверяем админ права
        const [result] = await db.query(
            'SELECT admin_level FROM users WHERE id = ?',
            [player.accountId]
        );
        
        if (result.length === 0 || !result[0].admin_level || result[0].admin_level === 0) {
            player.outputChatBox('!{#f44336}У вас нет прав администратора!');
            return;
        }
        
        player.adminLevel = result[0].admin_level;
        player.adminEnabled = true; // Флаг активации
        
        console.log(`[Admin System] ✅ ${player.socialClub} активировал админ систему (Level: ${player.adminLevel})`);
        
        player.outputChatBox(`!{#4caf50}[Админ] Система активирована! Уровень: ${player.adminLevel}`);
        player.outputChatBox(`!{#2196f3}[Админ] Нажмите F3 для открытия панели`);
        
        // Отправляем активацию на клиент
        player.call('client:activateAdminSystem', [player.adminLevel]);
        
    } catch (err) {
        console.error('[Admin System] ❌ Ошибка активации:', err);
        player.outputChatBox('!{#f44336}Ошибка активации админ системы!');
    }
});

// ===== ОТКРЫТИЕ ПАНЕЛИ ПО ЗАПРОСУ =====
mp.events.add('admin:requestOpenPanel', (player) => {
    if (!player.adminEnabled || !player.adminLevel) {
        player.outputChatBox('!{#f44336}Админ система не активирована! Используйте /admin');
        return;
    }
    
    console.log(`[Admin System] ${player.socialClub} открывает админ панель через F3`);
    
    player.call('client:openAdminPanel', [player.adminLevel]);
});

// ===== ПОЛУЧЕНИЕ СПИСКА ИГРОКОВ =====
mp.events.add('admin:getPlayers', (player) => {
    if (!player.adminLevel) {
        console.log(`[Admin System] ${player.socialClub} попытался получить список игроков без прав!`);
        return;
    }
    
    const players = [];
    
    mp.players.forEach((p) => {
        if (p && p.socialClub) {
            players.push({
                id: p.id,
                name: p.name || p.socialClub,
                socialClub: p.socialClub,
                ping: p.ping,
                money: p.money || 0,
                bank: p.bank || 0,
                dimension: p.dimension
            });
        }
    });
    
    player.call('client:receivePlayersList', [JSON.stringify(players)]);
    
    console.log(`[Admin System] Отправлено ${players.length} игроков админу ${player.socialClub}`);
});

// ===== ДЕЙСТВИЯ С ИГРОКАМИ =====
mp.events.add('admin:playerAction', async (player, action, targetId) => {
    if (!player.adminLevel) return;
    
    const target = mp.players.at(targetId);
    
    if (!target) {
        player.call('client:adminNotify', ['error', 'Игрок не найден!']);
        return;
    }
    
    console.log(`[Admin System] ${player.socialClub} выполняет ${action} для ${target.socialClub}`);
    
    switch (action) {
        case 'teleportTo':
            if (!hasPermission(player, 'tp')) {
                player.call('client:adminNotify', ['error', 'Недостаточно прав!']);
                return;
            }
            
            player.position = target.position;
            player.dimension = target.dimension;
            player.call('client:adminNotify', ['success', `Телепорт к ${target.name}`]);
            
            await logAdminAction(player.accountId, 'TELEPORT_TO', target.socialClub, `Admin teleported to player`);
            break;
            
        case 'teleportHere':
            if (!hasPermission(player, 'tp')) {
                player.call('client:adminNotify', ['error', 'Недостаточно прав!']);
                return;
            }
            
            target.position = player.position;
            target.dimension = player.dimension;
            player.call('client:adminNotify', ['success', `${target.name} телепортирован к вам`]);
            target.call('client:adminNotify', ['info', `Вы телепортированы к администратору`]);
            
            await logAdminAction(player.accountId, 'TELEPORT_HERE', target.socialClub, `Player teleported to admin`);
            break;
            
        case 'freeze':
            if (!hasPermission(player, 'freeze')) {
                player.call('client:adminNotify', ['error', 'Недостаточно прав!']);
                return;
            }
            
            target.call('client:freezePlayer', [true]);
            player.call('client:adminNotify', ['success', `${target.name} заморожен`]);
            
            await logAdminAction(player.accountId, 'FREEZE', target.socialClub, `Player frozen`);
            break;
            
        case 'heal':
            if (!hasPermission(player, 'heal')) {
                player.call('client:adminNotify', ['error', 'Недостаточно прав!']);
                return;
            }
            
            target.health = 100;
            target.armour = 100;
            player.call('client:adminNotify', ['success', `${target.name} вылечен`]);
            target.call('client:adminNotify', ['success', `Вы были вылечены администраторо��`]);
            
            await logAdminAction(player.accountId, 'HEAL', target.socialClub, `Player healed`);
            break;
            
        case 'kick':
            if (!hasPermission(player, 'kick')) {
                player.call('client:adminNotify', ['error', 'Недостаточно прав!']);
                return;
            }
            
            const kickReason = 'Kicked by admin';
            player.call('client:adminNotify', ['success', `${target.name} кикнут`]);
            
            await logAdminAction(player.accountId, 'KICK', target.socialClub, kickReason);
            
            target.kick(kickReason);
            break;
            
        case 'ban':
            if (!hasPermission(player, 'ban_temp')) {
                player.call('client:adminNotify', ['error', 'Недостаточно прав!']);
                return;
            }
            
            // Открываем диалог бана
            player.call('client:openBanDialog', [targetId, target.name]);
            break;
    }
});

// ===== БАН ИГРОКА =====
mp.events.add('admin:banPlayer', async (player, targetId, reason, duration) => {
    if (!hasPermission(player, 'ban_temp')) {
        player.call('client:adminNotify', ['error', 'Недостаточно прав!']);
        return;
    }
    
    const target = mp.players.at(targetId);
    
    if (!target) {
        player.call('client:adminNotify', ['error', 'Игрок не найден!']);
        return;
    }
    
    try {
        const expiresAt = duration > 0 ? new Date(Date.now() + duration * 60000) : null;
        
        await db.query(
            'INSERT INTO bans (user_id, social_club, ip_address, banned_by, reason, duration, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [target.accountId, target.socialClub, target.ip, player.accountId, reason, duration, expiresAt]
        );
        
        await logAdminAction(player.accountId, 'BAN', target.socialClub, `Reason: ${reason}, Duration: ${duration}min`);
        
        player.call('client:adminNotify', ['success', `${target.name} забанен`]);
        
        target.kick(`Banned: ${reason}`);
        
        console.log(`[Admin System] ${player.socialClub} забанил ${target.socialClub} на ${duration} минут. Причина: ${reason}`);
        
    } catch (err) {
        console.error('[Admin System] Ошибка бана:', err);
        player.call('client:adminNotify', ['error', 'Ошибка при бане игрока!']);
    }
});

// ===== СПАВН ТРАНСПОРТА =====
mp.events.add('admin:spawnVehicle', (player, model) => {
    if (!hasPermission(player, 'spawn_vehicle')) {
        player.call('client:adminNotify', ['error', 'Недостаточно прав!']);
        return;
    }
    
    try {
        const pos = player.position;
        const heading = player.heading;
        
        const vehicle = mp.vehicles.new(mp.joaat(model), new mp.Vector3(pos.x + 3, pos.y, pos.z), {
            heading: heading,
            numberPlate: 'ADMIN',
            color: [[255, 255, 255], [255, 255, 255]],
            dimension: player.dimension
        });
        
        player.call('client:adminNotify', ['success', `Транспорт ${model} заспавнен`]);
        
        logAdminAction(player.accountId, 'SPAWN_VEHICLE', '', `Model: ${model}`);
        
        console.log(`[Admin System] ${player.socialClub} заспавнил транспорт ${model}`);
        
    } catch (err) {
        console.error('[Admin System] Ошибка спавна транспорта:', err);
        player.call('client:adminNotify', ['error', 'Ошибка спавна транспорта!']);
    }
});

// ===== ТЕЛЕПОРТАЦИЯ =====
mp.events.add('admin:teleport', (player, x, y, z) => {
    if (!hasPermission(player, 'tp')) {
        player.call('client:adminNotify', ['error', 'Недостаточно прав!']);
        return;
    }
    
    player.position = new mp.Vector3(x, y, z);
    player.call('client:adminNotify', ['success', 'Телепортация выполнена!']);
    
    logAdminAction(player.accountId, 'TELEPORT', '', `X: ${x}, Y: ${y}, Z: ${z}`);
    
    console.log(`[Admin System] ${player.socialClub} телепортировался на ${x}, ${y}, ${z}`);
});

// ===== ПОГОДА =====
mp.events.add('admin:setWeather', (player, weather) => {
    if (!hasPermission(player, 'weather')) {
        player.call('client:adminNotify', ['error', 'Недостаточно прав!']);
        return;
    }
    
    mp.world.weather = weather;
    
    mp.players.broadcast(`!{#4caf50}[Сервер] Администратор изменил погоду на ${weather}`);
    
    logAdminAction(player.accountId, 'SET_WEATHER', '', `Weather: ${weather}`);
    
    console.log(`[Admin System] ${player.socialClub} изменил погоду на ${weather}`);
});

// ===== ВРЕМЯ =====
mp.events.add('admin:setTime', (player, hour, minute) => {
    if (!hasPermission(player, 'time')) {
        player.call('client:adminNotify', ['error', 'Недостаточно прав!']);
        return;
    }
    
    mp.world.time.set(hour, minute, 0);
    
    mp.players.broadcast(`!{#4caf50}[Сервер] Администратор изменил время на ${hour}:${minute.toString().padStart(2, '0')}`);
    
    logAdminAction(player.accountId, 'SET_TIME', '', `Time: ${hour}:${minute}`);
    
    console.log(`[Admin System] ${player.socialClub} изменил время на ${hour}:${minute}`);
});

// ===== ДЕНЬГИ =====
mp.events.add('admin:giveMoney', async (player, targetId, amount, type) => {
    if (!hasPermission(player, 'give_money')) {
        player.call('client:adminNotify', ['error', 'Недостаточно прав!']);
        return;
    }
    
    const target = mp.players.at(targetId);
    
    if (!target || !target.characterId) {
        player.call('client:adminNotify', ['error', 'Игрок не найден!']);
        return;
    }
    
    // Validate type to prevent SQL injection
    if (type !== 'cash' && type !== 'bank') {
        console.error('[Admin System] Invalid money type:', type);
        player.call('client:adminNotify', ['error', 'Неверный тип валюты!']);
        return;
    }
    
    // Validate amount
    const numAmount = parseInt(amount);
    if (isNaN(numAmount) || numAmount < 0) {
        player.call('client:adminNotify', ['error', 'Неверная сумма!']);
        return;
    }
    
    try {
        const field = type === 'cash' ? 'money' : 'bank';
        
        // Use parameterized query properly
        if (field === 'money') {
            await db.query(
                'UPDATE characters SET money = money + ? WHERE id = ?',
                [numAmount, target.characterId]
            );
        } else {
            await db.query(
                'UPDATE characters SET bank = bank + ? WHERE id = ?',
                [numAmount, target.characterId]
            );
        }
        
        if (type === 'cash') {
            target.money = (target.money || 0) + numAmount;
        } else {
            target.bank = (target.bank || 0) + numAmount;
        }
        
        player.call('client:adminNotify', ['success', `Выдано $${numAmount.toLocaleString()} игроку ${target.name}`]);
        target.call('client:adminNotify', ['success', `Вам выдано $${numAmount.toLocaleString()}`]);
        
        await logAdminAction(player.accountId, 'GIVE_MONEY', target.socialClub, `Amount: $${numAmount}, Type: ${type}`);
        
        console.log(`[Admin System] ${player.socialClub} выдал $${numAmount} (${type}) игроку ${target.socialClub}`);
        
    } catch (err) {
        console.error('[Admin System] Ошибка выдачи денег:', err);
        player.call('client:adminNotify', ['error', 'Ошибка выдачи денег!']);
    }
});

mp.events.add('admin:takeMoney', async (player, targetId, amount, type) => {
    if (!hasPermission(player, 'give_money')) {
        player.call('client:adminNotify', ['error', 'Недостаточно прав!']);
        return;
    }
    
    const target = mp.players.at(targetId);
    
    if (!target || !target.characterId) {
        player.call('client:adminNotify', ['error', 'Игрок не найден!']);
        return;
    }
    
    // Validate type to prevent SQL injection
    if (type !== 'cash' && type !== 'bank') {
        console.error('[Admin System] Invalid money type:', type);
        player.call('client:adminNotify', ['error', 'Неверный тип валюты!']);
        return;
    }
    
    // Validate amount
    const numAmount = parseInt(amount);
    if (isNaN(numAmount) || numAmount < 0) {
        player.call('client:adminNotify', ['error', 'Неверная сумма!']);
        return;
    }
    
    try {
        const field = type === 'cash' ? 'money' : 'bank';
        
        // Use parameterized query properly
        if (field === 'money') {
            await db.query(
                'UPDATE characters SET money = GREATEST(0, money - ?) WHERE id = ?',
                [numAmount, target.characterId]
            );
        } else {
            await db.query(
                'UPDATE characters SET bank = GREATEST(0, bank - ?) WHERE id = ?',
                [numAmount, target.characterId]
            );
        }
        
        if (type === 'cash') {
            target.money = Math.max(0, (target.money || 0) - numAmount);
        } else {
            target.bank = Math.max(0, (target.bank || 0) - numAmount);
        }
        
        player.call('client:adminNotify', ['success', `Снято $${numAmount.toLocaleString()} у игрока ${target.name}`]);
        target.call('client:adminNotify', ['warning', `У вас снято $${numAmount.toLocaleString()}`]);
        
        await logAdminAction(player.accountId, 'TAKE_MONEY', target.socialClub, `Amount: $${numAmount}, Type: ${type}`);
        
        console.log(`[Admin System] ${player.socialClub} снял $${numAmount} (${type}) у игрока ${target.socialClub}`);
        
    } catch (err) {
        console.error('[Admin System] Ошибка снятия денег:', err);
        player.call('client:adminNotify', ['error', 'Ошибка снятия денег!']);
    }
});

// ===== ОБЪЯВЛЕНИЕ =====
mp.events.add('admin:sendAnnouncement', (player, text) => {
    if (!hasPermission(player, 'announcement')) {
        player.call('client:adminNotify', ['error', 'Недостаточно прав!']);
        return;
    }
    
    mp.players.broadcast(`!{#ff9800}[ОБЪЯВЛЕНИЕ] ${text}`);
    
    logAdminAction(player.accountId, 'ANNOUNCEMENT', '', `Text: ${text}`);
    
    console.log(`[Admin System] ${player.socialClub} отправил объявление: ${text}`);
});

// ===== СТАТИСТИКА ЭКОНОМИКИ =====
mp.events.add('admin:getEconomyStats', async (player) => {
    if (!player.adminLevel) return;
    
    try {
        const [result] = await db.query(
            'SELECT SUM(money) as totalCash, SUM(bank) as totalBank FROM characters'
        );
        
        const stats = {
            totalCash: result[0].totalCash || 0,
            totalBank: result[0].totalBank || 0,
            totalMoney: (result[0].totalCash || 0) + (result[0].totalBank || 0)
        };
        
        player.call('client:receiveEconomyStats', [JSON.stringify(stats)]);
        
    } catch (err) {
        console.error('[Admin System] Ошибка получения статистики:', err);
    }
});

// ===== ЛОГИ =====
mp.events.add('admin:getLogs', async (player) => {
    if (!player.adminLevel) return;
    
    try {
        const [logs] = await db.query(
            'SELECT al.*, u.login as admin_login FROM admin_logs al LEFT JOIN users u ON al.admin_id = u.id ORDER BY al.created_at DESC LIMIT 50'
        );
        
        const formattedLogs = logs.map(log => ({
            time: new Date(log.created_at).toLocaleString('ru-RU'),
            action: log.action_type,
            admin: log.admin_login || 'Unknown',
            target: log.target_player || '-',
            details: log.details || '-'
        }));
        
        player.call('client:receiveLogs', [JSON.stringify(formattedLogs)]);
        
        console.log(`[Admin System] Отправлено ${formattedLogs.length} логов админу ${player.socialClub}`);
        
    } catch (err) {
        console.error('[Admin System] Ошибка получения логов:', err);
        player.call('client:adminNotify', ['error', 'Ошибка загрузки логов!']);
    }
});

// ===== НАЗНАЧЕНИЕ АДМИНА =====
mp.events.addCommand('setadmin', async (player, fullText) => {
    // Только владелец сервера или уровень 5
    if (!player.adminLevel || player.adminLevel < 5) {
        player.outputChatBox('!{#f44336}У вас нет прав для выполнения этой команды!');
        return;
    }
    
    const args = fullText.split(' ');
    
    if (args.length < 2) {
        player.outputChatBox('!{#ff9800}Использование: /setadmin [ID игрока] [уровень 1-5]');
        return;
    }
    
    const targetId = parseInt(args[0]);
    const level = parseInt(args[1]);
    
    if (isNaN(level) || level < 0 || level > 5) {
        player.outputChatBox('!{#f44336}Неверный уровень! Доступно: 0-5');
        return;
    }
    
    const target = mp.players.at(targetId);
    
    if (!target || !target.accountId) {
        player.outputChatBox('!{#f44336}Игрок не найден!');
        return;
    }
    
    try {
        await db.query(
            'UPDATE users SET admin_level = ? WHERE id = ?',
            [level, target.accountId]
        );
        
        target.adminLevel = level;
        
        player.outputChatBox(`!{#4caf50}[Admin] Игроку ${target.name} установлен админ уровень: ${level}`);
        target.outputChatBox(`!{#4caf50}[Система] Вам установлен админ уровень: ${level}`);
        
        await logAdminAction(player.accountId, 'SET_ADMIN', target.socialClub, `Level: ${level}`);
        
        console.log(`[Admin System] ${player.socialClub} установил админ уровень ${level} игроку ${target.socialClub}`);
        
    } catch (err) {
        console.error('[Admin System] Ошибка назначения админа:', err);
        player.outputChatBox('!{#f44336}Ошибка при назначении администратора!');
    }
});

// ===== СНЯТИЕ АДМИНКИ =====
mp.events.addCommand('removeadmin', async (player, fullText) => {
    if (!player.adminLevel || player.adminLevel < 5) {
        player.outputChatBox('!{#f44336}У вас нет прав для выполнения этой команды!');
        return;
    }
    
    const targetId = parseInt(fullText);
    
    if (isNaN(targetId)) {
        player.outputChatBox('!{#ff9800}Использование: /removeadmin [ID игрока]');
        return;
    }
    
    const target = mp.players.at(targetId);
    
    if (!target || !target.accountId) {
        player.outputChatBox('!{#f44336}Игрок не найден!');
        return;
    }
    
    try {
        await db.query(
            'UPDATE users SET admin_level = 0 WHERE id = ?',
            [target.accountId]
        );
        
        target.adminLevel = 0;
        
        player.outputChatBox(`!{#4caf50}[Admin] Игрок ${target.name} снят с должности администратора`);
        target.outputChatBox(`!{#f44336}[Система] Вы сняты с должности администратора`);
        
        await logAdminAction(player.accountId, 'REMOVE_ADMIN', target.socialClub, 'Admin removed');
        
        console.log(`[Admin System] ${player.socialClub} снял админку с ${target.socialClub}`);
        
    } catch (err) {
        console.error('[Admin System] Ошибка снятия админа:', err);
        player.outputChatBox('!{#f44336}Ошибка при снятии администратора!');
    }
});

console.log('[Admin System] ✅ Система администрирования загружена успешно!');
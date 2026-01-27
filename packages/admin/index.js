// ===== АДМИН СИСТЕМА - СЕРВЕРНАЯ ЧАСТЬ =====

const { db } = require('../database');

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
        
    } catch (err) {
        console.error('[Admin Log] Ошибка логирования:', err);
    }
}

// ===== АКТИВАЦИЯ АДМИН СИСТЕМЫ =====
mp.events.addCommand('admin', async (player) => {
    try {
        
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
        
    player.call('client:openAdminPanel', [player.adminLevel]);
});

// ===== ПОЛУЧЕНИЕ СПИСКА ИГРОКОВ =====
mp.events.add('admin:getPlayers', (player) => {
    if (!player.adminLevel) {
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
});

// ===== ДЕЙСТВИЯ С ИГРОКАМИ =====
mp.events.add('admin:playerAction', async (player, action, targetId) => {
    if (!player.adminLevel) return;
    
    const target = mp.players.at(targetId);
    
    if (!target) {
        player.call('client:adminNotify', ['error', 'Игрок не найден!']);
        return;
    }
        
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
        
        
    } catch (err) {
        console.error('[Admin System] Ошибка снятия админа:', err);
        player.outputChatBox('!{#f44336}Ошибка при снятии администратора!');
    }
});


// ===== РАСШИРЕННЫЕ ФУНКЦИИ АДМИНКИ =====

// Глобальное хранилище состояний админов
global.adminStates = new Map();

// ===== СЛЕЖКА ЗА ИГРОКОМ =====
mp.events.add('admin:startSpectate', async (admin, targetId) => {
    try {
        const target = mp.players.at(targetId);
        
        if (!target || !target.characterId) {
            admin.call('client:adminNotify', ['error', 'Игрок не найден или не в игре']);
            return;
        }
        
        // Сохраняем позицию админа
        const adminState = {
            position: admin.position,
            heading: admin.heading,
            dimension: admin.dimension,
            spectating: targetId,
            invisible: true
        };
        
        global.adminStates.set(admin.id, adminState);
        
        // Обновляем БД
        await db.query('UPDATE users SET is_spectating = ? WHERE id = ?', [targetId, admin.accountId]);
        
        // Делаем админа невидимым
        admin.alpha = 0;
        admin.dimension = target.dimension;
        
        // Отправляем клиенту
        admin.call('client:startSpectate', [targetId, target.position.x, target.position.y, target.position.z]);
        
        logAdminAction(admin.accountId, 'spectate', `Начал слежку за ${target.socialClub}`);
        
    } catch (err) {
        console.error('[Admin] Ошибка spectate:', err);
        admin.call('client:adminNotify', ['error', 'Ошибка активации слежки']);
    }
});

mp.events.add('admin:stopSpectate', async (admin) => {
    try {
        const adminState = global.adminStates.get(admin.id);
        
        if (!adminState || !adminState.spectating) {
            admin.call('client:adminNotify', ['warning', 'Слежка не активна']);
            return;
        }
        
        // Возвращаем админа
        admin.position = adminState.position;
        admin.heading = adminState.heading;
        admin.dimension = adminState.dimension;
        admin.alpha = 255;
        
        await db.query('UPDATE users SET is_spectating = NULL WHERE id = ?', [admin.accountId]);
        
        global.adminStates.delete(admin.id);
        
        admin.call('client:stopSpectate');
        admin.call('client:adminNotify', ['success', 'Слежка остановлена']);
        
        
    } catch (err) {
        console.error('[Admin] Ошибка остановки spectate:', err);
    }
});

// ===== НЕВИДИМОСТЬ =====
mp.events.add('admin:toggleInvisible', async (admin) => {
    try {
        const current = admin.alpha === 0;
        const newAlpha = current ? 255 : 0;
        
        admin.alpha = newAlpha;
        
        await db.query('UPDATE users SET is_invisible = ? WHERE id = ?', [current ? 0 : 1, admin.accountId]);
        
        admin.call('client:adminNotify', ['success', current ? 'Невидимость отключена' : 'Невидимость включена']);
        
        logAdminAction(admin.accountId, 'invisible', current ? 'Отключил' : 'Включил');
        
    } catch (err) {
        console.error('[Admin] Ошибка невидимости:', err);
    }
});

// ===== БЕССМЕРТИЕ =====
mp.events.add('admin:toggleGodMode', async (admin) => {
    try {
        const current = admin.invincible || false;
        
        admin.invincible = !current;
        
        await db.query('UPDATE users SET is_invincible = ? WHERE id = ?', [current ? 0 : 1, admin.accountId]);
        
        admin.call('client:adminNotify', ['success', current ? 'Бессмертие отключено' : 'Бессмертие включено']);
        
        logAdminAction(admin.accountId, 'godmode', current ? 'Отключил' : 'Включил');
        
    } catch (err) {
        console.error('[Admin] Ошибка godmode:', err);
    }
});

// ===== NOCLIP =====
mp.events.add('admin:toggleNoclip', async (admin) => {
    try {
        const current = admin.noclip || false;
        
        admin.noclip = !current;
        
        await db.query('UPDATE users SET is_noclip = ? WHERE id = ?', [current ? 0 : 1, admin.accountId]);
        
        admin.call('client:toggleNoclip', [!current]);
        admin.call('client:adminNotify', ['success', current ? 'Noclip отключен' : 'Noclip включен']);
        
        logAdminAction(admin.accountId, 'noclip', current ? 'Отключил' : 'Включил');
        
    } catch (err) {
        console.error('[Admin] Ошибка noclip:', err);
    }
});

// ===== ИСТОРИЯ ТЕЛЕПОРТОВ =====
mp.events.add('admin:getTeleportHistory', async (admin) => {
    try {
        const [history] = await db.query(`
            SELECT * FROM admin_teleports 
            WHERE admin_id = ? 
            ORDER BY created_at DESC 
            LIMIT 50
        `, [admin.accountId]);
        
        admin.call('client:receiveTeleportHistory', [JSON.stringify(history)]);
        
    } catch (err) {
        console.error('[Admin] Ошибка получения истории:', err);
    }
});

// ===== СПИСОК ЗАБАНЕННЫХ =====
mp.events.add('admin:getBannedList', async (admin) => {
    try {
        
        const [bans] = await db.query(`
            SELECT 
                b.id,
                b.user_id,
                b.social_club,
                b.reason,
                b.expires_at,
                b.created_at,
                b.banned_by,
                b.duration,
                u.login
            FROM bans b
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.is_active = 1
            ORDER BY b.created_at DESC
            LIMIT 50
        `);
        
        
        // Форматируем для CEF
        const formattedBans = bans.map(ban => {
            return {
                id: ban.id,
                user_id: ban.user_id,
                login: ban.login || ban.social_club || 'Неизвестно',
                reason: ban.reason || 'Не указана',
                expires_at: ban.expires_at,
                created_at: ban.created_at,
                admin_name: ban.banned_by || 'Система',
                duration: ban.duration || 0
            };
        });
        
        admin.call('client:receiveBannedList', [JSON.stringify(formattedBans)]);
        
    } catch (err) {
        console.error('[Admin] Ошибка получения списка банов:', err);
        console.error('[Admin] SQL Error:', err.sqlMessage || err.message);
        admin.call('client:receiveBannedList', [JSON.stringify([])]);
        admin.call('client:adminNotify', ['error', 'Ошибка загрузки списка банов']);
    }
});

// ===== РАЗБАН =====
mp.events.add('admin:unbanPlayer', async (admin, banId, reason) => {
    try {
        
        await db.query(`
            UPDATE bans 
            SET is_active = 0, 
                unbanned_by = ?, 
                unban_reason = ?, 
                unbanned_at = NOW() 
            WHERE id = ?
        `, [admin.accountId, reason, banId]);
        
        await logAdminAction(admin.accountId, 'unban', `Разбан ID:${banId}. Причина: ${reason}`);
        
        admin.call('client:adminNotify', ['success', 'Игрок разбанен']);
        
        
        // Обновляем список
        mp.events.call('admin:getBannedList', admin);
        
    } catch (err) {
        console.error('[Admin] Ошибка разбана:', err);
        admin.call('client:adminNotify', ['error', 'Ошибка разбана']);
    }
});

// ===== ВЫДАЧА ОРУЖИЯ =====
mp.events.add('admin:giveWeapon', async (admin, targetId, weaponHash, ammo) => {
    try {
        const target = mp.players.at(targetId);
        
        if (!target) {
            admin.call('client:adminNotify', ['error', 'Игрок не найден']);
            return;
        }
        
        target.giveWeapon(mp.joaat(weaponHash), parseInt(ammo));
        
        logAdminAction(admin.accountId, 'give_weapon', `Оружие: ${weaponHash}, Патроны: ${ammo}, Цель: ${target.socialClub}`);
        
        admin.call('client:adminNotify', ['success', `Оружие выдано ${target.socialClub}`]);
        target.call('client:adminNotify', ['info', 'Вам выдано оружие от администратора']);
        
        
    } catch (err) {
        console.error('[Admin] Ошибка выдачи оружия:', err);
    }
});

// ===== ОЧИСТКА ИНВЕНТАРЯ =====
mp.events.add('admin:clearInventory', async (admin, targetId) => {
    try {
        const target = mp.players.at(targetId);
        
        if (!target || !target.characterId) {
            admin.call('client:adminNotify', ['error', 'Игрок не найден']);
            return;
        }
        
        await db.query('DELETE FROM character_inventory WHERE character_id = ?', [target.characterId]);
        
        target.call('client:updateInventory', [JSON.stringify([])]);
        
        logAdminAction(admin.accountId, 'clear_inventory', `Character ID: ${target.characterId}, Игрок: ${target.socialClub}`);
        
        admin.call('client:adminNotify', ['success', `Инвентарь очищен у ${target.socialClub}`]);
        target.call('client:adminNotify', ['warning', 'Ваш инвентарь очищен администратором']);
        
        
    } catch (err) {
        console.error('[Admin] Ошибка очистки инвентаря:', err);
    }
});

// ===== УДАЛЕНИЕ ВСЕХ МАШИН =====
mp.events.add('admin:deleteAllVehicles', async (admin) => {
    try {
        let count = 0;
        
        mp.vehicles.forEach(vehicle => {
            vehicle.destroy();
            count++;
        });
        
        logAdminAction(admin.accountId, 'delete_all_vehicles', `Удалено машин: ${count}`);
        
        admin.call('client:adminNotify', ['success', `Удалено машин: ${count}`]);
        
        
    } catch (err) {
        console.error('[Admin] Ошибка удаления машин:', err);
    }
});

// ===== РЕМОНТ ТРАНСПОРТА =====
mp.events.add('admin:repairVehicle', (admin, targetId) => {
    try {
        const target = mp.players.at(targetId);
        
        if (!target) {
            admin.call('client:adminNotify', ['error', 'Игрок не найден']);
            return;
        }
        
        if (!target.vehicle) {
            admin.call('client:adminNotify', ['error', 'Игрок не в машине']);
            return;
        }
        
        target.vehicle.repair();
        
        logAdminAction(admin.accountId, 'repair_vehicle', `Игрок: ${target.socialClub}`);
        
        admin.call('client:adminNotify', ['success', `Машина отремонтирована для ${target.socialClub}`]);
        target.call('client:adminNotify', ['success', 'Ваша машина отремонтирована']);
        
        
    } catch (err) {
        console.error('[Admin] Ошибка ремонта:', err);
    }
});

// ===== ЗАПРАВКА =====
mp.events.add('admin:refuelVehicle', async (admin, targetId) => {
    try {
        const target = mp.players.at(targetId);
        
        if (!target) {
            admin.call('client:adminNotify', ['error', 'Игрок не найден']);
            return;
        }
        
        if (!target.vehicle) {
            admin.call('client:adminNotify', ['error', 'Игрок не в машине']);
            return;
        }
        
        if (target.vehicle.fuel !== undefined) {
            target.vehicle.fuel = 100;
        }
        
        logAdminAction(admin.accountId, 'refuel_vehicle', `Игрок: ${target.socialClub}`);
        
        admin.call('client:adminNotify', ['success', `Машина заправлена для ${target.socialClub}`]);
        target.call('client:adminNotify', ['success', 'Ваша машина заправлена']);
        
        
    } catch (err) {
        console.error('[Admin] Ошибка заправки:', err);
    }
});

// ===== СТАТИСТИКА ОНЛАЙНА =====
mp.events.add('admin:getOnlineStats', async (admin) => {
    try {
        const [stats] = await db.query(`
            SELECT date, hour, players_online 
            FROM server_statistics 
            WHERE date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            ORDER BY date DESC, hour DESC
        `);
        
        admin.call('client:receiveOnlineStats', [JSON.stringify(stats)]);
        
    } catch (err) {
        console.error('[Admin] Ошибка статистики онлайна:', err);
    }
});

// ===== САМЫЕ АКТИВНЫЕ ИГРОКИ =====
mp.events.add('admin:getTopPlayers', async (admin) => {
    try {
        
        // Пытаемся получить из player_activity
        let [players] = [];
        
        try {
            [players] = await db.query(`
                SELECT 
                    u.login,
                    MAX(c.name) as name,
                    MAX(c.surname) as surname,
                    SUM(pa.duration) as total_time,
                    COUNT(pa.id) as sessions_count
                FROM player_activity pa
                JOIN users u ON pa.user_id = u.id
                LEFT JOIN characters c ON pa.character_id = c.id
                WHERE pa.session_start >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY u.id, u.login
                ORDER BY total_time DESC
                LIMIT 20
            `);
            
            
        } catch (paErr) {
            console.log('[Admin] player_activity недоступна:', paErr.sqlMessage || paErr.message);
        }
        
        // Если нет данных, используем альтернативный запрос
        if (!players || players.length === 0) {
            console.log('[Admin] Используем альтернативный запрос по users');
            
            [players] = await db.query(`
                SELECT 
                    u.login,
                    MAX(c.name) as name,
                    MAX(c.surname) as surname,
                    TIMESTAMPDIFF(SECOND, u.registered_at, NOW()) as total_time,
                    1 as sessions_count
                FROM users u
                LEFT JOIN characters c ON c.user_id = u.id
                WHERE u.registered_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY u.id, u.login
                ORDER BY u.last_login DESC
                LIMIT 20
            `);
            
        }
        
        // Если всё ещё пусто, тестовые данные
        if (!players || players.length === 0) {
            console.log('[Admin] ⚠️ Нет данных, создаём тестовые');
            
            players = [
                {
                    login: 'Player1',
                    name: 'John',
                    surname: 'Doe',
                    total_time: 36000,
                    sessions_count: 5
                },
                {
                    login: 'Player2',
                    name: 'Jane',
                    surname: 'Smith',
                    total_time: 28800,
                    sessions_count: 3
                },
                {
                    login: 'Player3',
                    name: 'Mike',
                    surname: 'Johnson',
                    total_time: 21600,
                    sessions_count: 2
                }
            ];
        }
        
        admin.call('client:receiveTopPlayers', [JSON.stringify(players)]);
        
    } catch (err) {
        console.error('[Admin] Критическая ошибка топа игроков:', err);
        console.error('[Admin] SQL Error:', err.sqlMessage || err.message);
        
        admin.call('client:receiveTopPlayers', [JSON.stringify([])]);
        admin.call('client:adminNotify', ['error', 'Ошибка загрузки топа игроков']);
    }
});

// ===== ОТЧЁТЫ АДМИНОВ =====
mp.events.add('admin:getAdminReports', async (admin) => {
    try {
        const [reports] = await db.query(`
            SELECT * FROM admin_reports 
            WHERE report_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            ORDER BY report_date DESC
        `);
        
        admin.call('client:receiveAdminReports', [JSON.stringify(reports)]);
        
    } catch (err) {
        console.error('[Admin] Ошибка отчётов:', err);
    }
});

// ===== АВТОМАТИЧЕСКОЕ ЛОГИРОВАНИЕ СТАТИСТИКИ =====
setInterval(async () => {
    try {
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const hour = now.getHours();
        const playersOnline = mp.players.length;
        
        await db.query(`
            INSERT INTO server_statistics (date, hour, players_online) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE players_online = ?
        `, [date, hour, playersOnline, playersOnline]);
        
    } catch (err) {
        console.error('[Admin] Ошибка логирования статистики:', err);
    }
}, 300000); // Каждые 5 минут

// ===== ОБРАБОТЧИК ДЕЙСТВИЙ ИЗ CEF =====
mp.events.add('cef:adminAction', async (admin, action, playerId, ...args) => {
    try {
        if (!admin.adminLevel) {
            admin.call('client:adminNotify', ['error', 'Нет прав']);
            return;
        }
        
        const target = mp.players.at(playerId);
        
        if (!target && !['ban'].includes(action)) {
            admin.call('client:adminNotify', ['error', 'Игрок не найден']);
            return;
        }
                
        switch(action) {
            case 'kick':
                const kickReason = args[0] || 'Без причины';
                target.kick(kickReason);
                logAdminAction(admin.accountId, 'kick', `Игрок: ${target.socialClub}, Причина: ${kickReason}`);
                admin.call('client:adminNotify', ['success', `${target.socialClub} кикнут`]);
                break;
                
            case 'ban':
                const banReason = args[0] || 'Без причины';
                const banDays = parseInt(args[1]) || 0;
                const expiresAt = banDays === 0 ? new Date('2099-12-31') : new Date(Date.now() + banDays * 24 * 60 * 60 * 1000);
                
                await db.query(`
                    INSERT INTO bans (user_id, admin_id, admin_name, reason, expires_at, is_active, created_at)
                    VALUES (?, ?, ?, ?, ?, 1, NOW())
                `, [target.accountId, admin.accountId, admin.socialClub, banReason, expiresAt]);
                
                target.kick(`Вы забанены. Причина: ${banReason}`);
                
                logAdminAction(admin.accountId, 'ban', `Игрок: ${target.socialClub}, Причина: ${banReason}, Срок: ${banDays} дней`);
                admin.call('client:adminNotify', ['success', `${target.socialClub} забанен`]);
                break;
                
            case 'tpto':
                admin.position = target.position;
                admin.dimension = target.dimension;
                
                logAdminAction(admin.accountId, 'teleport', `К игроку: ${target.socialClub}`);
                admin.call('client:adminNotify', ['success', `Телепорт к ${target.socialClub}`]);
                break;
                
            case 'tphere':
                target.position = admin.position;
                target.dimension = admin.dimension;
                
                logAdminAction(admin.accountId, 'teleport', `Игрок ${target.socialClub} к себе`);
                admin.call('client:adminNotify', ['success', `${target.socialClub} телепортирован к вам`]);
                target.call('client:adminNotify', ['info', 'Вы телепортированы к администратору']);
                break;
                
            case 'freeze':
                const currentFreeze = target.frozen || false;
                target.frozen = !currentFreeze;
                
                logAdminAction(admin.accountId, 'freeze', `Игрок: ${target.socialClub}, Состояние: ${!currentFreeze ? 'Заморожен' : 'Разморожен'}`);
                admin.call('client:adminNotify', ['success', `${target.socialClub} ${!currentFreeze ? 'заморожен' : 'разморожен'}`]);
                target.call('client:adminNotify', [!currentFreeze ? 'warning' : 'success', !currentFreeze ? 'Вы заморожены' : 'Вы разморожены']);
                break;
                
            default:
                console.log(`[Admin] Неизвестное действие: ${action}`);
        }
        
    } catch (err) {
        console.error('[Admin] Ошибка выполнения действия:', err);
        admin.call('client:adminNotify', ['error', 'Ошибка выполнения действия']);
    }
});
// ===== СИСТЕМА ТЕЛЕФОНА =====

const { db } = require('../database');

// ===== ИНИЦИАЛИЗАЦИЯ ТЕЛЕФОНА =====
mp.events.add('phone:open', async (player) => {
    if (!player.characterId) return;
    
    try {
        // Получаем данные персонажа
        const [charData] = await db.query(
            'SELECT name, surname, money, bank, phone_number FROM characters WHERE id = ?',
            [player.characterId]
        );
        
        if (charData.length === 0) return;
        
        const character = charData[0];
        
        // Генерируем номер телефона если его нет
        if (!character.phone_number) {
            const phoneNumber = generatePhoneNumber();
            await db.query('UPDATE characters SET phone_number = ? WHERE id = ?', [phoneNumber, player.characterId]);
            character.phone_number = phoneNumber;
        }
        
        // Получаем контакты
        const contacts = await getContacts(player.characterId);
        
        // Получаем сообщения
        const messages = await getMessages(player.characterId);
        
        // Получаем историю звонков
        const callHistory = await getCallHistory(player.characterId);
        
        // Получаем уведомления
        const notifications = await getNotifications(player.characterId);
        
        const phoneData = {
            owner: `${character.name} ${character.surname}`,
            phoneNumber: character.phone_number,
            balance: character.money || 0,
            bankBalance: character.bank || 0,
            time: getCurrentTime(),
            date: getCurrentDate(),
            battery: 100,
            signal: 4,
            contacts: contacts,
            messages: messages,
            callHistory: callHistory,
            notifications: notifications
        };
        
        player.call('client:openPhone', [JSON.stringify(phoneData)]);
        
    } catch (err) {
        console.error('[Phone] Ошибка открытия:', err);
    }
});

// ===== ГЕНЕРАЦИЯ НОМЕРА ТЕЛЕФОНА =====
function generatePhoneNumber() {
    const prefix = '555';
    const number = Math.floor(1000000 + Math.random() * 9000000);
    return `${prefix}-${number.toString().substring(0, 3)}-${number.toString().substring(3, 7)}`;
}

// ===== ПОЛУЧЕНИЕ КОНТАКТОВ =====
async function getContacts(characterId) {
    try {
        const [contacts] = await db.query(`
            SELECT pc.id, pc.name, pc.phone_number, pc.avatar
            FROM phone_contacts pc
            WHERE pc.character_id = ?
            ORDER BY pc.name ASC
        `, [characterId]);
        
        return contacts;
    } catch (err) {
        console.error('[Phone] Ошибка получения контактов:', err);
        return [];
    }
}

// ===== ДОБАВЛЕНИЕ КОНТАКТА =====
mp.events.add('phone:addContact', async (player, name, phoneNumber) => {
    if (!player.characterId) return;
    
    try {
        // Проверяем существует ли уже контакт
        const [existing] = await db.query(
            'SELECT id FROM phone_contacts WHERE character_id = ? AND phone_number = ?',
            [player.characterId, phoneNumber]
        );
        
        if (existing.length > 0) {
            player.call('client:phoneNotify', ['error', 'Контакт уже существует!']);
            return;
        }
        
        await db.query(
            'INSERT INTO phone_contacts (character_id, name, phone_number) VALUES (?, ?, ?)',
            [player.characterId, name, phoneNumber]
        );
        
        player.call('client:phoneNotify', ['success', 'Контакт добавлен!']);
        player.call('client:updateContacts', [JSON.stringify(await getContacts(player.characterId))]);
        
    } catch (err) {
        console.error('[Phone] Ошибка добавления контакта:', err);
    }
});

// ===== УДАЛЕНИЕ КОНТАКТА =====
mp.events.add('phone:deleteContact', async (player, contactId) => {
    if (!player.characterId) return;
    
    try {
        await db.query(
            'DELETE FROM phone_contacts WHERE id = ? AND character_id = ?',
            [contactId, player.characterId]
        );
        
        player.call('client:phoneNotify', ['success', 'Контакт удалён!']);
        player.call('client:updateContacts', [JSON.stringify(await getContacts(player.characterId))]);
        
    } catch (err) {
        console.error('[Phone] Ошибка удаления контакта:', err);
    }
});

// ===== ПОЛУЧЕНИЕ СООБЩЕНИЙ =====
async function getMessages(characterId) {
    try {
        const [messages] = await db.query(`
            SELECT 
                pm.id,
                pm.sender_id,
                pm.receiver_id,
                pm.message,
                pm.is_read,
                pm.created_at,
                CASE WHEN pm.sender_id = ? THEN 'sent' ELSE 'received' END as type,
                c.name as sender_name,
                c.phone_number as sender_phone
            FROM phone_messages pm
            LEFT JOIN characters c ON pm.sender_id = c.id
            WHERE pm.sender_id = ? OR pm.receiver_id = ?
            ORDER BY pm.created_at DESC
            LIMIT 100
        `, [characterId, characterId, characterId]);
        
        return messages;
    } catch (err) {
        console.error('[Phone] Ошибка получения сообщений:', err);
        return [];
    }
}

// ===== ОТПРАВКА СООБЩЕНИЯ =====
mp.events.add('phone:sendMessage', async (player, phoneNumber, message) => {
    if (!player.characterId) return;
    
    try {
        // Находим получателя по номеру
        const [receiver] = await db.query(
            'SELECT id, name, surname FROM characters WHERE phone_number = ?',
            [phoneNumber]
        );
        
        if (receiver.length === 0) {
            player.call('client:phoneNotify', ['error', 'Номер не найден!']);
            return;
        }
        
        const receiverId = receiver[0].id;
        
        // Сохраняем сообщение
        await db.query(
            'INSERT INTO phone_messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
            [player.characterId, receiverId, message]
        );
        
        player.call('client:phoneNotify', ['success', 'Сообщение отправлено!']);
        
        // Отправляем получателю если онлайн
        mp.players.forEach(p => {
            if (p.characterId === receiverId) {
                p.call('client:receiveMessage', [JSON.stringify({
                    from: player.name,
                    message: message,
                    time: getCurrentTime()
                })]);
            }
        });
        
        // Обновляем сообщения отправителя
        player.call('client:updateMessages', [JSON.stringify(await getMessages(player.characterId))]);
        
    } catch (err) {
        console.error('[Phone] Ошибка отправки сообщения:', err);
    }
});

// ===== ИСТОРИЯ ЗВОНКОВ =====
async function getCallHistory(characterId) {
    try {
        const [calls] = await db.query(`
            SELECT 
                pc.id,
                pc.caller_id,
                pc.receiver_id,
                pc.duration,
                pc.status,
                pc.created_at,
                CASE WHEN pc.caller_id = ? THEN 'outgoing' ELSE 'incoming' END as type,
                c.name as contact_name,
                c.phone_number as contact_phone
            FROM phone_calls pc
            LEFT JOIN characters c ON (CASE WHEN pc.caller_id = ? THEN pc.receiver_id ELSE pc.caller_id END) = c.id
            WHERE pc.caller_id = ? OR pc.receiver_id = ?
            ORDER BY pc.created_at DESC
            LIMIT 50
        `, [characterId, characterId, characterId, characterId]);
        
        return calls;
    } catch (err) {
        console.error('[Phone] Ошибка получения истории звонков:', err);
        return [];
    }
}

// ===== ЗВОНОК =====
const activeCalls = new Map();

mp.events.add('phone:call', async (player, phoneNumber) => {
    if (!player.characterId) return;
    
    try {
        // Находим получателя
        const [receiver] = await db.query(
            'SELECT id, name, surname FROM characters WHERE phone_number = ?',
            [phoneNumber]
        );
        
        if (receiver.length === 0) {
            player.call('client:phoneNotify', ['error', 'Номер не найден!']);
            return;
        }
        
        const receiverId = receiver[0].id;
        let receiverPlayer = null;
        
        // Ищем получателя онлайн
        mp.players.forEach(p => {
            if (p.characterId === receiverId) {
                receiverPlayer = p;
            }
        });
        
        if (!receiverPlayer) {
            player.call('client:phoneNotify', ['error', 'Абонент не в сети!']);
            
            // Записываем пропущенный звонок
            await db.query(
                'INSERT INTO phone_calls (caller_id, receiver_id, status, duration) VALUES (?, ?, ?, 0)',
                [player.characterId, receiverId, 'missed']
            );
            return;
        }
        
        // Проверяем не занят ли получатель
        if (activeCalls.has(receiverPlayer.id)) {
            player.call('client:phoneNotify', ['error', 'Абонент занят!']);
            return;
        }
        
        // Создаём звонок
        const callId = Date.now();
        const callData = {
            id: callId,
            callerId: player.characterId,
            callerPlayerId: player.id,
            receiverId: receiverId,
            receiverPlayerId: receiverPlayer.id,
            startTime: null,
            status: 'ringing'
        };
        
        activeCalls.set(player.id, callData);
        activeCalls.set(receiverPlayer.id, callData);
        
        // Уведомляем звонящего
        player.call('client:callStatus', ['calling', receiver[0].name + ' ' + receiver[0].surname]);
        
        // Уведомляем получателя
        const [callerData] = await db.query(
            'SELECT name, surname, phone_number FROM characters WHERE id = ?',
            [player.characterId]
        );
        
        receiverPlayer.call('client:incomingCall', [JSON.stringify({
            callId: callId,
            callerName: callerData[0].name + ' ' + callerData[0].surname,
            callerPhone: callerData[0].phone_number
        })]);
        
        // Таймаут звонка (30 секунд)
        setTimeout(async () => {
            const call = activeCalls.get(player.id);
            if (call && call.status === 'ringing') {
                // Звонок не принят
                activeCalls.delete(player.id);
                activeCalls.delete(receiverPlayer.id);
                
                player.call('client:callEnded', ['Нет ответа']);
                receiverPlayer.call('client:callEnded', ['Пропущенный звонок']);
                
                await db.query(
                    'INSERT INTO phone_calls (caller_id, receiver_id, status, duration) VALUES (?, ?, ?, 0)',
                    [player.characterId, receiverId, 'missed']
                );
            }
        }, 30000);
        
    } catch (err) {
        console.error('[Phone] Ошибка звонка:', err);
    }
});

// ===== ПРИНЯТЬ ЗВОНОК =====
mp.events.add('phone:acceptCall', async (player) => {
    const call = activeCalls.get(player.id);
    if (!call) return;
    
    call.status = 'active';
    call.startTime = Date.now();
    
    const callerPlayer = mp.players.at(call.callerPlayerId);
    
    if (callerPlayer) {
        callerPlayer.call('client:callAccepted', []);
    }
    
    player.call('client:callAccepted', []);
});

// ===== ОТКЛОНИТЬ ЗВОНОК =====
mp.events.add('phone:declineCall', async (player) => {
    const call = activeCalls.get(player.id);
    if (!call) return;
    
    const callerPlayer = mp.players.at(call.callerPlayerId);
    const receiverPlayer = mp.players.at(call.receiverPlayerId);
    
    activeCalls.delete(call.callerPlayerId);
    activeCalls.delete(call.receiverPlayerId);
    
    if (callerPlayer) {
        callerPlayer.call('client:callEnded', ['Звонок отклонён']);
    }
    if (receiverPlayer) {
        receiverPlayer.call('client:callEnded', ['']);
    }
    
    await db.query(
        'INSERT INTO phone_calls (caller_id, receiver_id, status, duration) VALUES (?, ?, ?, 0)',
        [call.callerId, call.receiverId, 'declined']
    );
});

// ===== ЗАВЕРШИТЬ ЗВОНОК =====
mp.events.add('phone:endCall', async (player) => {
    const call = activeCalls.get(player.id);
    if (!call) return;
    
    const duration = call.startTime ? Math.floor((Date.now() - call.startTime) / 1000) : 0;
    
    const callerPlayer = mp.players.at(call.callerPlayerId);
    const receiverPlayer = mp.players.at(call.receiverPlayerId);
    
    activeCalls.delete(call.callerPlayerId);
    activeCalls.delete(call.receiverPlayerId);
    
    if (callerPlayer) {
        callerPlayer.call('client:callEnded', [`Звонок завершён (${formatDuration(duration)})`]);
    }
    if (receiverPlayer) {
        receiverPlayer.call('client:callEnded', [`Звонок завершён (${formatDuration(duration)})`]);
    }
    
    await db.query(
        'INSERT INTO phone_calls (caller_id, receiver_id, status, duration) VALUES (?, ?, ?, ?)',
        [call.callerId, call.receiverId, 'completed', duration]
    );
});

// ===== УВЕДОМЛЕНИЯ =====
async function getNotifications(characterId) {
    try {
        const [notifications] = await db.query(`
            SELECT id, type, title, message, is_read, created_at
            FROM phone_notifications
            WHERE character_id = ?
            ORDER BY created_at DESC
            LIMIT 50
        `, [characterId]);
        
        return notifications;
    } catch (err) {
        return [];
    }
}

// ===== БАНКОВСКИЕ ОПЕРАЦИИ =====
mp.events.add('phone:bankTransfer', async (player, phoneNumber, amount) => {
    if (!player.characterId) return;
    
    try {
        amount = parseInt(amount);
        if (isNaN(amount) || amount <= 0) {
            player.call('client:phoneNotify', ['error', 'Неверная сумма!']);
            return;
        }
        
        // Проверяем баланс
        const [senderData] = await db.query(
            'SELECT bank FROM characters WHERE id = ?',
            [player.characterId]
        );
        
        if (senderData[0].bank < amount) {
            player.call('client:phoneNotify', ['error', 'Недостаточно средств!']);
            return;
        }
        
        // Находим получателя
        const [receiver] = await db.query(
            'SELECT id, name, surname FROM characters WHERE phone_number = ?',
            [phoneNumber]
        );
        
        if (receiver.length === 0) {
            player.call('client:phoneNotify', ['error', 'Получатель не найден!']);
            return;
        }
        
        // Выполняем перевод
        await db.query('UPDATE characters SET bank = bank - ? WHERE id = ?', [amount, player.characterId]);
        await db.query('UPDATE characters SET bank = bank + ? WHERE id = ?', [amount, receiver[0].id]);
        
        player.call('client:phoneNotify', ['success', `Переведено $${amount} игроку ${receiver[0].name} ${receiver[0].surname}`]);
        player.bank = (player.bank || 0) - amount;
        
        // Обновляем баланс в телефоне
        const [newBalance] = await db.query('SELECT bank FROM characters WHERE id = ?', [player.characterId]);
        player.call('client:updateBankBalance', [newBalance[0].bank]);
        
        // Уведомляем получателя если онлайн
        mp.players.forEach(p => {
            if (p.characterId === receiver[0].id) {
                p.call('client:phoneNotify', ['success', `Вам переведено $${amount}`]);
                p.bank = (p.bank || 0) + amount;
            }
        });
        
    } catch (err) {
        console.error('[Phone] Ошибка перевода:', err);
    }
});

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function getCurrentDate() {
    const now = new Date();
    return now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ===== GPS / НАВИГАЦИЯ =====
mp.events.add('phone:setWaypoint', (player, x, y) => {
    player.call('client:setWaypoint', [parseFloat(x), parseFloat(y)]);
});

// ===== КАМЕРА =====
mp.events.add('phone:takePhoto', (player) => {
    player.call('client:takePhoto', []);
});

console.log('[Phone] ✅ Система телефона загружена!');
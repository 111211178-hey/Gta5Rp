const { db } = require('../database');

// Счетчик измерений для создания персонажей
let nextCreationDimension = 1000;

// При подключении игрока
mp.events.add('playerJoin', async (player) => {
    console.log(`[Server] Игрок ${player.socialClub} подключился к серверу`);
    
    player.dimension = 0;
    player.accountId = null;
    player.characterId = null;
    player.creationDimension = null;
    
    // Загружаем админ уровень
    try {
        const [adminResult] = await db.query(
            'SELECT admin_level FROM users WHERE login = ?',
            [player.socialClub]
        );
        
        if (adminResult.length > 0) {
            player.adminLevel = adminResult[0].admin_level || 0;
            
            if (player.adminLevel > 0) {
                player.outputChatBox(`!{#4caf50}[Система] Вы авторизованы как администратор уровня ${player.adminLevel}`);
                player.outputChatBox(`!{#2196f3}[Подсказка] Используйте /admin для открытия админ панели`);
                
                console.log(`[Server] ${player.socialClub} вошел с админ уровнем ${player.adminLevel}`);
            }
        }
    } catch (err) {
        console.error('[Server] Ошибка загрузки админ уровня:', err);
    }
});

// === АВТОРИЗАЦИЯ ===

mp.events.add('server:login', async (player, login, password) => {
    try {
        console.log('='.repeat(60));
        console.log(`[Server] 🔍 Попытка входа: "${login}"`);
        
        // Ищем пользователя по логину И паролю
        const [rows] = await db.query(
            'SELECT * FROM users WHERE login = ? AND password = ?',
            [login, password]
        );
        
        console.log(`[Server] Найдено записей: ${rows.length}`);
        
        if (rows.length === 0) {
            // Проверяем существует ли логин вообще
            const [checkLogin] = await db.query(
                'SELECT id FROM users WHERE login = ?',
                [login]
            );
            
            if (checkLogin.length > 0) {
                console.log(`[Server] ❌ Логин найден, но пароль неверный`);
                player.call('client:authResponse', ['error', 'Неверный пароль']);
            } else {
                console.log(`[Server] ❌ Логин не найден`);
                player.call('client:authResponse', ['error', 'Пользователь не найден']);
            }
            console.log('='.repeat(60));
            return;
        }
        
        const user = rows[0];
        
        console.log(`[Server] ��� Пользователь найден: ID=${user.id}, Login=${user.login}`);
        
        // Обновляем последний вход и IP
        await db.query(
            'UPDATE users SET last_login = NOW(), ip_address = ? WHERE id = ?',
            [player.ip, user.id]
        );
        
        player.accountId = user.id;
        player.socialClub = login;
        player.adminLevel = user.admin_level || 0;
        
        console.log(`[Server] ✅ Игрок ${login} успешно авторизован (ID: ${user.id})`);
        
        if (player.adminLevel > 0) {
            console.log(`[Server] Админ уровень: ${player.adminLevel}`);
        }
        
        console.log('='.repeat(60));
        
        player.call('client:authResponse', ['success', 'Вход выполнен!']);
        
        // Загружаем персонажей
        setTimeout(async () => {
            console.log(`[Server] 📋 Загрузка персонажей для user_id=${user.id}...`);
            
            const [characters] = await db.query(
                'SELECT id, name, surname, age, gender, money, bank, level, last_active FROM characters WHERE user_id = ?',
                [user.id]
            );
            
            console.log(`[Server] Найдено персонажей: ${characters.length}`);
            
            if (characters.length > 0) {
                console.log(`[Server] Список персонажей:`);
                characters.forEach((char, index) => {
                    console.log(`  ${index + 1}. ID=${char.id}, Name=${char.name} ${char.surname}, Level=${char.level || 1}, Money=$${char.money}`);
                });
            }
            
            const charactersJson = JSON.stringify(characters);
            console.log(`[Server] Отправка JSON клиенту (длина: ${charactersJson.length} символов)`);
            
            player.call('client:showCharacterSelection', [charactersJson]);
            
            console.log(`[Server] ✅ Команда client:showCharacterSelection отправлена`);
        }, 1000);
        
    } catch (err) {
        console.error('[Server] ❌ КРИТИЧЕСКАЯ ОШИБКА при входе:', err);
        console.log('='.repeat(60));
        player.call('client:authResponse', ['error', 'Ошибка сервера']);
    }
});

mp.events.add('server:register', async (player, login, password) => {
    try {
        console.log(`[Server] Попытка регистрации: ${login}`);
        
        // Проверяем существование пользователя
        const [existing] = await db.query(
            'SELECT id FROM users WHERE login = ?',
            [login]
        );
        
        if (existing.length > 0) {
            console.log(`[Server] Логин ${login} уже занят`);
            player.call('client:authResponse', ['error', 'Логин уже занят']);
            return;
        }
        
        // Создаем нового пользователя
        const [result] = await db.query(
            'INSERT INTO users (login, password, ip_address, registered_at, last_login, money, bank, level, exp, admin_level) VALUES (?, ?, ?, NOW(), NOW(), 5000, 10000, 1, 0, 0)',
            [login, password, player.ip]
        );
        
        player.accountId = result.insertId;
        player.socialClub = login;
        player.adminLevel = 0;
        
        console.log(`[Server] ✅ Игрок ${login} успешно зарегистрирован (ID: ${result.insertId})`);
        
        player.call('client:authResponse', ['success', 'Регистрация успешна!']);
        
        setTimeout(() => {
            // Пустой массив для нового пользователя
            player.call('client:showCharacterSelection', [JSON.stringify([])]);
        }, 1000);
        
    } catch (err) {
        console.error('[Server] ❌ Ошибка при регистрации:', err);
        player.call('client:authResponse', ['error', 'Ошибка регистрации']);
    }
});

// === СИСТЕМА ПЕРСОНАЖЕЙ ===

mp.events.add('server:enterCharacterCreation', (player) => {
    try {
        console.log(`[Server] Игрок ${player.socialClub} входит в режим создания персонажа`);
        
        player.creationDimension = nextCreationDimension++;
        player.dimension = player.creationDimension;
        
        console.log(`[Server] Игрок ${player.socialClub} изолирован в измерении ${player.creationDimension}`);
        
        player.call('client:showCharacterCreation');
        
    } catch (err) {
        console.error('[Server] Ошибка при входе в создание персонажа:', err);
    }
});

mp.events.add('server:createCharacter', async (player, characterDataJson) => {
    try {
        console.log('='.repeat(60));
        console.log(`[Server] 🎭 СОЗДАНИЕ ПЕРСОНАЖА`);
        console.log(`[Server] Игрок: ${player.socialClub} (AccountID: ${player.accountId})`);
        console.log(`[Server] Dimension: ${player.dimension}`);
        console.log(`[Server] Полученные данные: ${characterDataJson}`);
        
        const characterData = JSON.parse(characterDataJson);
        
        console.log(`[Server] Распарсенные данные:`);
        console.log(`  - Имя: ${characterData.name}`);
        console.log(`  - Фамилия: ${characterData.surname}`);
        console.log(`  - Возраст: ${characterData.age}`);
        console.log(`  - Пол: ${characterData.gender}`);
        
        // Проверка лимита персонажей
        const [existingChars] = await db.query(
            'SELECT COUNT(*) as count FROM characters WHERE user_id = ?',
            [player.accountId]
        );
        
        console.log(`[Server] Существующих персонажей: ${existingChars[0].count}`);
        
        if (existingChars[0].count >= 3) {
            console.log(`[Server] ❌ Лимит персонажей превышен`);
            player.call('client:characterCreationResponse', ['error', 'У вас уже 3 персонажа!']);
            console.log('='.repeat(60));
            return;
        }
        
        // Проверка уникальности имени
        const [nameCheck] = await db.query(
            'SELECT id FROM characters WHERE name = ? AND surname = ?',
            [characterData.name, characterData.surname]
        );
        
        console.log(`[Server] Проверка имени: найдено ${nameCheck.length} совпадений`);
        
        if (nameCheck.length > 0) {
            console.log(`[Server] ❌ Имя занято`);
            player.call('client:characterCreationResponse', ['error', 'Персонаж с таким именем уже существует!']);
            console.log('='.repeat(60));
            return;
        }
        
        const startPosition = {
            x: -1037.7,
            y: -2738.5,
            z: 20.0,
            heading: 0
        };
        
        console.log(`[Server] Стартовая позиция: X=${startPosition.x}, Y=${startPosition.y}, Z=${startPosition.z}`);
        console.log(`[Server] Внешность: ${JSON.stringify(characterData.appearance)}`);
        
        // СОЗДАЕМ ПЕРСОНАЖА
        console.log(`[Server] 💾 Выполнение INSERT запроса...`);
        
        const [result] = await db.query(
            `INSERT INTO characters 
            (user_id, name, surname, age, gender, money, bank, level, exp, health, armor, position_x, position_y, position_z, heading, dimension, appearance, created_at, last_active) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                player.accountId,
                characterData.name,
                characterData.surname,
                characterData.age,
                characterData.gender,
                1000,
                5000,
                1,
                0,
                100,
                0,
                startPosition.x,
                startPosition.y,
                startPosition.z,
                startPosition.heading,
                0,
                JSON.stringify(characterData.appearance)
            ]
        );
        
        console.log(`[Server] ✅ INSERT успешен! ID нового персонажа: ${result.insertId}`);
        console.log(`[Server] Affected rows: ${result.affectedRows}`);
        
        // ПРОВЕРЯЕМ ЧТО ПЕРСОНАЖ РЕАЛЬНО СОЗДАН
        const [checkCreated] = await db.query(
            'SELECT * FROM characters WHERE id = ?',
            [result.insertId]
        );
        
        if (checkCreated.length > 0) {
            console.log(`[Server] ✅ ПОДТВЕРЖДЕНИЕ: Персонаж найден в БД после создания`);
            console.log(`[Server] Данные: ID=${checkCreated[0].id}, Name=${checkCreated[0].name}, Surname=${checkCreated[0].surname}`);
        } else {
            console.log(`[Server] ❌ ОШИБКА: Персонаж НЕ НАЙДЕН в БД после создания!`);
        }
        
        player.call('client:characterCreationResponse', ['success', 'Персонаж успешно создан!']);
        
        // ВОЗВРАЩАЕМ В ОСНОВНОЕ ИЗМЕРЕНИЕ
        player.dimension = 0;
        console.log(`[Server] Игрок возвращен в dimension 0`);
        
        // ЗАГРУЖАЕМ СПИСОК ПЕРСОНАЖЕЙ
        setTimeout(async () => {
            console.log(`[Server] 📋 Загрузка списка персонажей для user_id=${player.accountId}...`);
            
            const [characters] = await db.query(
                'SELECT id, name, surname, age, gender, money, bank, level, last_active FROM characters WHERE user_id = ?',
                [player.accountId]
            );
            
            console.log(`[Server] Найдено персонажей: ${characters.length}`);
            
            if (characters.length > 0) {
                console.log(`[Server] Список персонажей:`);
                characters.forEach((char, index) => {
                    console.log(`  ${index + 1}. ID=${char.id}, Name=${char.name} ${char.surname}, Gender=${char.gender}, Money=$${char.money}, Level=${char.level || 1}`);
                });
            } else {
                console.log(`[Server] ⚠️ ВНИМАНИЕ: Список персонажей ПУСТ!`);
            }
            
            const charactersJson = JSON.stringify(characters);
            console.log(`[Server] JSON для отправки: ${charactersJson}`);
            console.log(`[Server] Длина JSON: ${charactersJson.length} символов`);
            
            player.call('client:showCharacterSelection', [charactersJson]);
            
            console.log(`[Server] ✅ Команда client:showCharacterSelection отправлена`);
            console.log('='.repeat(60));
            
        }, 1500);
        
    } catch (err) {
        console.error('[Server] ❌ КРИТИЧЕСКАЯ ОШИБКА при создании персонажа:', err);
        console.error('[Server] Stack trace:', err.stack);
        console.log('='.repeat(60));
        player.call('client:characterCreationResponse', ['error', 'Ошибка при создании персонажа!']);
    }
	
	console.log(`[Server] ✅ INSERT успешен! ID нового персонажа: ${result.insertId}`);

// ДОБАВИТЬ ЭТО:
// Выдаём стартовый набор
if (typeof global.addItem === 'function') {
    await global.addItem(result.insertId, 'water', 2);
    await global.addItem(result.insertId, 'bread', 3);
    await global.addItem(result.insertId, 'phone', 1);
    console.log('[Server] Стартовый набор выдан новому персонажу');
}
});

mp.events.add('server:selectCharacter', async (player, characterId) => {
    try {
        console.log('='.repeat(60));
        console.log(`[Server] 👤 ВЫБОР ПЕРСОНАЖА`);
        console.log(`[Server] Игрок: ${player.socialClub} выбрал персонажа ID: ${characterId}`);
        
        const [result] = await db.query(
            'SELECT * FROM characters WHERE id = ? AND user_id = ?',
            [characterId, player.accountId]
        );
        
        if (result.length === 0) {
            console.log('[Server] ❌ Персонаж не найден или не принадлежит игроку');
            console.log('='.repeat(60));
            return;
        }
        
        const character = result[0];
        
        player.characterId = character.id;
        player.name = `${character.name}_${character.surname}`;
        player.money = character.money;
        player.bank = character.bank;
        
        player.dimension = 0;
        console.log(`[Server] Игрок ${player.socialClub} возвращен в основное измерение (0)`);
        
        const characterData = {
            id: character.id,
            name: character.name,
            surname: character.surname,
            age: character.age,
            gender: character.gender,
            money: character.money,
            bank: character.bank,
            position_x: character.position_x,
            position_y: character.position_y,
            position_z: character.position_z,
            heading: character.heading,
            appearance: character.appearance ? JSON.parse(character.appearance) : null
        };
        
        console.log(`[Server] Данные персонажа подготовлены для отправки`);
        console.log(`[Server] Позиция спавна: X=${characterData.position_x}, Y=${characterData.position_y}, Z=${characterData.position_z}`);
        
        player.call('client:spawnCharacter', [JSON.stringify(characterData)]);
        
        console.log(`[Server] ✅ Персонаж ${character.name} ${character.surname} загружен`);
        console.log('='.repeat(60));
        
    } catch (err) {
        console.error('[Server] ❌ Ошибка при выборе персонажа:', err);
        console.log('='.repeat(60));
    }
});

mp.events.add('server:deleteCharacter', async (player, characterId) => {
    try {
        console.log('='.repeat(60));
        console.log(`[Server] 🗑️ УДАЛЕНИЕ ПЕРСОНАЖА`);
        console.log(`[Server] Игрок: ${player.socialClub}, CharacterID: ${characterId}`);
        
        const [result] = await db.query(
            'DELETE FROM characters WHERE id = ? AND user_id = ?',
            [characterId, player.accountId]
        );
        
        if (result.affectedRows > 0) {
            console.log(`[Server] ✅ Персонаж ID: ${characterId} успешно удален`);
            player.call('client:characterDeletionResponse', ['success', 'Персонаж удален!']);
            
            // ОБНОВЛЯЕМ СПИСОК
            setTimeout(async () => {
                const [characters] = await db.query(
                    'SELECT id, name, surname, age, gender, money, bank, level, last_active FROM characters WHERE user_id = ?',
                    [player.accountId]
                );
                
                console.log(`[Server] Обновленный список персонажей: ${characters.length} шт.`);
                
                player.call('client:updateCharacterList', [JSON.stringify(characters)]);
            }, 500);
        } else {
            console.log(`[Server] ❌ Персонаж не найден или не принадлежит игроку`);
            player.call('client:characterDeletionResponse', ['error', 'Персонаж не найден!']);
        }
        
        console.log('='.repeat(60));
        
    } catch (err) {
        console.error('[Server] ❌ Ошибка при удалении персонажа:', err);
        console.log('='.repeat(60));
        player.call('client:characterDeletionResponse', ['error', 'Ошибка при удалении!']);
    }
});

mp.events.add('playerQuit', async (player, exitType, reason) => {
    try {
        console.log(`[Server] Игрок ${player.socialClub} отключился (Тип: ${exitType})`);
        
        if (player.creationDimension) {
            console.log(`[Server] Освобождено измерение ${player.creationDimension}`);
            delete player.creationDimension;
        }
        
        if (player.characterId) {
            const pos = player.position;
            
            await db.query(
                'UPDATE characters SET position_x = ?, position_y = ?, position_z = ?, heading = ?, last_active = NOW() WHERE id = ?',
                [pos.x, pos.y, pos.z, player.heading, player.characterId]
            );
            
            console.log(`[Server] Позиция персонажа ID: ${player.characterId} сохранена`);
        }
        
    } catch (err) {
        console.error('[Server] ❌ Ошибка при отключении игрока:', err);
    }
});

console.log('[Server] ✅ Игровой режим загружен успешно!');
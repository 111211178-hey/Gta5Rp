const { db } = require('../database');
const config = require('../config');
const security = require('../security');
// ===== ПОДКЛЮЧЕНИЕ ДОПОЛНИТЕЛЬНЫХ МОДУЛЕЙ =====
require('../objects');

console.log('[Server] ✅ Все модули загружены!');

// Счетчик измерений для создания персонажей
let nextCreationDimension = config.DIMENSION.CREATION_START;

// При подключении игрока
mp.events.add('playerJoin', async (player) => {
    
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
                
            }
        }
    } catch (err) {
        console.error('[Server] Ошибка загрузки админ уровня:', err);
    }
});

// === АВТОРИЗАЦИЯ ===

mp.events.add('server:login', async (player, login, password) => {
    try {
        
        // Validate inputs
        const loginValidation = security.validateLogin(login);
        if (!loginValidation.valid) {
            player.call('client:authResponse', ['error', loginValidation.error]);
            return;
        }
        
        const passwordValidation = security.validatePassword(password);
        if (!passwordValidation.valid) {
            player.call('client:authResponse', ['error', passwordValidation.error]);
            return;
        }
        
        // Check rate limiting
        const rateLimit = security.checkRateLimit(player.ip);
        if (!rateLimit.allowed) {
            console.log(`[Server] ⚠️ Rate limit exceeded for IP: ${player.ip}`);
            player.call('client:authResponse', ['error', rateLimit.error]);
            console.log('='.repeat(60));
            return;
        }
        
        // Check if user is banned
        const [bans] = await db.query(
            'SELECT * FROM bans WHERE (social_club = ? OR ip_address = ?) AND (expires_at IS NULL OR expires_at > NOW())',
            [login, player.ip]
        );
        
        if (bans.length > 0) {
            const ban = bans[0];
            const banMsg = ban.expires_at 
                ? `Вы забанены до ${new Date(ban.expires_at).toLocaleString('ru-RU')}. Причина: ${ban.reason}`
                : `Вы забанены навсегда. Причина: ${ban.reason}`;
            
            player.call('client:authResponse', ['error', banMsg]);
            console.log('='.repeat(60));
            return;
        }
        
        // Ищем пользователя по логину
        const [rows] = await db.query(
            'SELECT * FROM users WHERE login = ?',
            [login]
        );
        
        if (rows.length === 0) {
            player.call('client:authResponse', ['error', 'Неверный логин или пароль']);
            console.log('='.repeat(60));
            return;
        }
        
        const user = rows[0];
        
        // Verify password
        const passwordMatch = await security.verifyPassword(password, user.password);
        
        if (!passwordMatch) {
            console.log(`[Server] ❌ Неверный пароль`);
            player.call('client:authResponse', ['error', 'Неверный логин или пароль']);
            console.log('='.repeat(60));
            return;
        }
        
        console.log(`[Server] ✅ Пользователь найден: ID=${user.id}, Login=${user.login}`);
        
        // Reset rate limit on successful login
        security.resetRateLimit(player.ip);
        
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
        
        // Validate inputs
        const loginValidation = security.validateLogin(login);
        if (!loginValidation.valid) {
            player.call('client:authResponse', ['error', loginValidation.error]);
            return;
        }
        
        const passwordValidation = security.validatePassword(password);
        if (!passwordValidation.valid) {
            player.call('client:authResponse', ['error', passwordValidation.error]);
            return;
        }
        
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
        
        // Hash password
        const hashedPassword = await security.hashPassword(password);
        
        // Создаем нового пользователя
        const [result] = await db.query(
            'INSERT INTO users (login, password, ip_address, registered_at, last_login, money, bank, level, exp, admin_level) VALUES (?, ?, ?, NOW(), NOW(), ?, ?, 1, 0, 0)',
            [login, hashedPassword, player.ip, config.REGISTRATION.START_MONEY, config.REGISTRATION.START_BANK]
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
        
        // Validate name
        const nameValidation = security.validateCharacterName(characterData.name);
        if (!nameValidation.valid) {
            player.call('client:characterCreationResponse', ['error', nameValidation.error]);
            console.log('='.repeat(60));
            return;
        }
        
        const surnameValidation = security.validateCharacterName(characterData.surname);
        if (!surnameValidation.valid) {
            player.call('client:characterCreationResponse', ['error', surnameValidation.error]);
            console.log('='.repeat(60));
            return;
        }
        
        // Validate age
        const ageValidation = security.validateAge(characterData.age);
        if (!ageValidation.valid) {
            player.call('client:characterCreationResponse', ['error', ageValidation.error]);
            console.log('='.repeat(60));
            return;
        }
        
        // ✅ ИСПРАВЛЕНИЕ: Извлекаем gender как число
        const gender = parseInt(characterData.gender);
        
        console.log(`[Server] Распарсенные данные:`);
        console.log(`  - Имя: ${nameValidation.value}`);
        console.log(`  - Фамилия: ${surnameValidation.value}`);
        console.log(`  - Возраст: ${ageValidation.value}`);
        console.log(`  - Пол (число): ${gender}`);
        
        // Проверка лимита персонажей
        const [existingChars] = await db.query(
            'SELECT COUNT(*) as count FROM characters WHERE user_id = ?',
            [player.accountId]
        );
        
        console.log(`[Server] Существующих персонажей: ${existingChars[0].count}`);
        
        if (existingChars[0].count >= config.CHARACTER.MAX_PER_ACCOUNT) {
            console.log(`[Server] ❌ Лимит персонажей превышен`);
            player.call('client:characterCreationResponse', ['error', `У вас уже ${config.CHARACTER.MAX_PER_ACCOUNT} персонажа!`]);
            console.log('='.repeat(60));
            return;
        }
        
        // Проверка уникальности имени
        const [nameCheck] = await db.query(
            'SELECT id FROM characters WHERE name = ? AND surname = ?',
            [nameValidation.value, surnameValidation.value]
        );
        
        console.log(`[Server] Проверка имени: найдено ${nameCheck.length} совпадений`);
        
        if (nameCheck.length > 0) {
            console.log(`[Server] ❌ Имя занято`);
            player.call('client:characterCreationResponse', ['error', 'Персонаж с таким именем уже существует!']);
            console.log('='.repeat(60));
            return;
        }
        
        const startPosition = config.CHARACTER.START_POSITION;
        
        // ✅ ИСПРАВЛЕНИЕ: Создаём правильный объект внешности
        const appearance = {
            gender: gender,
            faceFeatures: characterData.appearance?.faceFeatures || {
                mother: 21,
                father: 0,
                shapeMix: 0.5,
                skinMix: 0.5
            },
            hair: characterData.appearance?.hair || 0,
            hairColor: characterData.appearance?.hairColor || 0,
            eyeColor: characterData.appearance?.eyeColor || 0
        };
        
        const appearanceJson = JSON.stringify(appearance);
        
        console.log(`[Server] Стартовая позиция: X=${startPosition.x}, Y=${startPosition.y}, Z=${startPosition.z}`);
        console.log(`[Server] Внешность (исправленная): ${appearanceJson}`);
        
        // СОЗДАЕМ ПЕРСОНАЖА
        console.log(`[Server] 💾 Выполнение INSERT запроса...`);
        
        const [result] = await db.query(
            `INSERT INTO characters 
            (user_id, name, surname, age, gender, money, bank, level, exp, health, armor, position_x, position_y, position_z, heading, dimension, appearance, created_at, last_active) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                player.accountId,
                nameValidation.value,
                surnameValidation.value,
                ageValidation.value,
                gender,                          // ✅ ИСПРАВЛЕНО: Число вместо объекта
                config.CHARACTER.START_MONEY,
                config.CHARACTER.START_BANK,
                1,
                0,
                100,
                0,
                startPosition.x,
                startPosition.y,
                startPosition.z,
                startPosition.heading,
                0,
                appearanceJson                   // ✅ ИСПРАВЛЕНО: Правильный JSON
            ]
        );
        
        console.log(`[Server] ✅ INSERT успешен! ID нового персонажа: ${result.insertId}`);
        console.log(`[Server] Affected rows: ${result.affectedRows}`);
        
        // Выдаём стартовый набор
        if (typeof global.addItem === 'function') {
            for (const item of config.INVENTORY.STARTER_ITEMS) {
                await global.addItem(result.insertId, item.name, item.quantity);
            }
            console.log('[Server] Стартовый набор выдан новому персонажу');
        }
        
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
		
		mp.events.call('character:loaded', player, character.id);
        
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
        
        // Загружаем одежду и оружие с небольшой задержкой (после спавна)
        setTimeout(() => {
            // Загружаем одежду
            if (typeof global.loadCharacterClothes === 'function') {
                global.loadCharacterClothes(player, character.id);
                console.log(`[Server] 👕 Одежда загружена для персонажа ${character.id}`);
            }
            
            // Загружаем экипированное оружие
            if (typeof global.loadCharacterWeapons === 'function') {
                global.loadCharacterWeapons(player, character.id);
                console.log(`[Server] 🔫 Оружие загружено для персонажа ${character.id}`);
            }
        }, 2000); // 2 секунды задержки
        
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

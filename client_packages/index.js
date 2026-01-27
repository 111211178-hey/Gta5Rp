// Клиентская логика для системы авторизации и создания персонажа

let authBrowser = null;
let characterBrowser = null;
let characterSelectionBrowser = null;
let isAuthShown = false;
let isCharacterCreationShown = false;
let isCharacterSelectionShown = false;
let isSpawned = false;
let transitionBrowser = null;

// Глобальные переменные для чата, инвентаря и админки
let isChatActive = false; // Отслеживаем состояние чата
let isInventoryOpen = false;
let isAdminPanelOpen = false;

// Переменные для предпросмотра
let previewCamera = null;
let isPreviewMode = false;
let previewPosition = new mp.Vector3(150.0, -1035.0, 29.35);
let previewHeading = 340.0;
let previewUpdateInterval = null;

// ПЕРЕМЕННЫЕ ДЛЯ КАМЕРЫ
let cameraRotation = 0;
let cameraMode = 'body'; // 'head', 'body', 'full'
let autoRotateInterval = null;

// БЛОКИРУЕМ загрузку игры до авторизации
mp.game.ui.displayRadar(false);
mp.game.ui.displayHud(false);

// Событие при старте клиента
mp.events.add('playerReady', () => {
    console.log('[Client] Player Ready - показываем главное меню');
    showAuthWindow();
});

// Отключение управления
function disableControls() {
    mp.game.controls.disableAllControlActions(0);
    mp.game.controls.disableAllControlActions(1);
    mp.game.controls.disableAllControlActions(2);
}

// Включение управления
function enableControls() {
    mp.game.controls.enableAllControlActions(0);
    mp.game.controls.enableAllControlActions(1);
    mp.game.controls.enableAllControlActions(2);
}

// ===== ЦЕНТРАЛИЗОВАННАЯ ОБРАБОТКА КЛАВИШ =====

// Перехватываем T (открытие чата)
mp.keys.bind(0x54, true, () => { // T key
    // Блокируем если инвентарь открыт
    if (isInventoryOpen) {
        console.log('[Chat] Инвентарь открыт - чат заблокирован');
        mp.game.graphics.notify('~r~Закройте инвентарь!');
        return;
    }
    
    // Блокируем если админ панель открыта
    if (isAdminPanelOpen) {
        console.log('[Chat] Админ панель открыта - чат заблокирован');
        mp.game.graphics.notify('~r~Закройте админ панель!');
        return;
    }
    
    // Разрешаем открытие чата
    isChatActive = true;
    console.log('[Chat] Чат открыт через T');
});

// Перехватываем Y (открытие чата с /)
mp.keys.bind(0x59, true, () => { // Y key
    // Блокируем если инвентарь открыт
    if (isInventoryOpen) {
        console.log('[Chat] Инвентарь открыт - чат заблокирован');
        mp.game.graphics.notify('~r~Закройте инвентарь!');
        return;
    }
    
    // Блокируем если админ панель открыта
    if (isAdminPanelOpen) {
        console.log('[Chat] Админ панель открыта - чат заблокирован');
        mp.game.graphics.notify('~r~Закройте админ панель!');
        return;
    }
    
    // Разрешаем открытие чата
    isChatActive = true;
    console.log('[Chat] Чат открыт через Y (/)');
});

// ESC закрывает чат, инвентарь или админку (по приоритету)
mp.keys.bind(0x1B, true, () => { // ESC
    // Закрываем чат если активен (наивысший приоритет)
    if (isChatActive) {
        isChatActive = false;
        console.log('[Chat] Чат закрыт через ESC');
        return; // Останавливаемся здесь
    }
    
    // Закрываем инвентарь если открыт (средний приоритет)
    if (isInventoryOpen) {
        closeInventory();
        return; // Останавливаемся здесь
    }
    
    // Закрываем админ панель если открыта (низкий приоритет)
    if (isAdminPanelOpen) {
        closeAdminPanel();
        return; // Останавливаемся здесь
    }
});

// Enter закрывает чат
mp.keys.bind(0x0D, true, () => { // Enter
    if (isChatActive) {
        setTimeout(() => {
            isChatActive = false;
            console.log('[Chat] Чат закрыт через Enter');
        }, 100);
    }
});

// Отслеживание состояния чата через событие
mp.events.add('chatActive', (active) => {
    isChatActive = active;
    console.log('[Chat] Состояние чата:', active ? 'активен' : 'неактивен');
});

// === АВТОРИЗАЦИЯ (ГЛАВНОЕ МЕНЮ) ===

function showAuthWindow() {
    if (isAuthShown) return;
    
    console.log('[Auth] Открытие главного меню');
    
    disableControls();
    
    mp.game.ui.displayRadar(false);
    mp.game.ui.displayHud(false);
    mp.gui.chat.show(false);
    
    authBrowser = mp.browsers.new('package://cef/auth/index.html');
    
    setTimeout(() => {
        mp.gui.cursor.visible = true;
        
        if (typeof mp.gui.cursor.show === 'function') {
            mp.gui.cursor.show(true, true);
        }
    }, 300);
    
    isAuthShown = true;
}

function hideAuthWindow() {
    if (!isAuthShown) return;
    
    console.log('[Auth] Закрытие главного меню');
    
    if (authBrowser) {
        authBrowser.destroy();
        authBrowser = null;
    }
    
    isAuthShown = false;
}

mp.events.add('cef:login', (login, password) => {
    mp.events.callRemote('server:login', login, password);
});

mp.events.add('cef:register', (login, password) => {
    mp.events.callRemote('server:register', login, password);
});

mp.events.add('client:authResponse', (type, message) => {
    if (authBrowser) {
        authBrowser.execute(`showMessage('${type}', '${message}')`);
    }
    
    if (type === 'success') {
        setTimeout(() => {
            hideAuthWindow();
            showTransitionScreen('Проверка персонажей...');
        }, 1000);
    }
});

// === ЭКРАН ПЕРЕХОДА (FADE) ===

function showTransitionScreen(text = 'Загрузка...') {
    console.log('[Transition] Показ экрана перехода:', text);
    
    mp.gui.cursor.visible = false;
    if (typeof mp.gui.cursor.show === 'function') {
        mp.gui.cursor.show(false, false);
    }
    
    if (!transitionBrowser) {
        transitionBrowser = mp.browsers.new('package://cef/transition/index.html');
        
        setTimeout(() => {
            if (transitionBrowser) {
                transitionBrowser.execute(`updateText('${text}')`);
            }
        }, 100);
    }
}

function hideTransitionScreen() {
    console.log('[Transition] Скрытие экрана перехода');
    
    if (transitionBrowser) {
        transitionBrowser.destroy();
        transitionBrowser = null;
    }
}

// === ВЫБОР ПЕРСОНАЖА ===

mp.events.add('client:showCharacterSelection', (charactersJson) => {
    hideTransitionScreen();
    showCharacterSelection(charactersJson);
});

function showCharacterSelection(charactersJson) {
    if (isCharacterSelectionShown) return;
    
    console.log('[CharSelect] ===== ОТКРЫТИЕ ВЫБОРА ПЕРСОНАЖА =====');
    console.log('[CharSelect] Получен JSON:', charactersJson);
    
    try {
        const characters = JSON.parse(charactersJson);
        console.log('[CharSelect] Распарсено персонажей:', characters.length);
        
        if (characters.length > 0) {
            console.log('[CharSelect] Список персонажей:');
            characters.forEach((char, index) => {
                console.log(`  ${index + 1}. ${char.name} ${char.surname} (ID: ${char.id})`);
            });
        } else {
            console.log('[CharSelect] ⚠️ Список персонажей пуст!');
        }
    } catch (err) {
        console.error('[CharSelect] ❌ Ошибка парсинга JSON:', err);
    }
    
    characterSelectionBrowser = mp.browsers.new('package://cef/characterselection/index.html');
    
    setTimeout(() => {
        mp.gui.cursor.visible = true;
        
        if (typeof mp.gui.cursor.show === 'function') {
            mp.gui.cursor.show(true, true);
        }
        
        console.log('[CharSelect] Отправка данных в браузер...');
        characterSelectionBrowser.execute(`loadCharacters(${charactersJson})`);
        console.log('[CharSelect] ===== ДАННЫЕ ОТПРАВЛЕНЫ =====');
    }, 500);
    
    isCharacterSelectionShown = true;
}

function hideCharacterSelection() {
    if (!isCharacterSelectionShown) return;
    
    console.log('[CharSelect] Закрытие выбора персонажа');
    
    if (characterSelectionBrowser) {
        characterSelectionBrowser.destroy();
        characterSelectionBrowser = null;
    }
    
    isCharacterSelectionShown = false;
}

mp.events.add('cef:selectCharacter', (characterId) => {
    console.log('[CharSelect] Выбран персонаж ID:', characterId);
    
    hideCharacterSelection();
    showTransitionScreen('Загрузка персонажа...');
    mp.events.callRemote('server:selectCharacter', characterId);
});

mp.events.add('cef:createNewCharacter', () => {
    console.log('[CharSelect] Создание нового персонажа');
    
    hideCharacterSelection();
    showTransitionScreen('Подготовка комнаты персонализации...');
    
    mp.events.callRemote('server:enterCharacterCreation');
});

mp.events.add('client:showCharacterCreation', () => {
    console.log('[Client] Сервер разрешил запуск создания персонажа');
    
    setTimeout(() => {
        startPreviewMode();
        
        setTimeout(() => {
            hideTransitionScreen();
            showCharacterCreation();
        }, 3000);
    }, 500);
});

mp.events.add('cef:deleteCharacter', (characterId) => {
    console.log('[CharSelect] Удаление персонажа ID:', characterId);
    mp.events.callRemote('server:deleteCharacter', characterId);
});

mp.events.add('client:updateCharacterList', (charactersJson) => {
    if (characterSelectionBrowser) {
        characterSelectionBrowser.execute(`loadCharacters(${charactersJson})`);
    }
});

mp.events.add('client:characterDeletionResponse', (type, message) => {
    if (characterSelectionBrowser) {
        characterSelectionBrowser.execute(`showMessage('${type}', '${message}')`);
    }
});

// === РЕЖИМ ПРЕДПРОСМОТРА ===

function startPreviewMode() {
    console.log('[Preview] ===== ЗАПУСК РЕЖИМА ПРЕДПРОСМОТРА =====');
    
    isPreviewMode = true;
    const player = mp.players.local;
    
    player.position = previewPosition;
    player.heading = previewHeading;
    console.log('[Preview] ШАГ 1: Телепорт на позицию:', previewPosition);
    console.log('[Preview] Текущее измерение игрока:', player.dimension);
    
    const model = mp.game.joaat('mp_m_freemode_01');
    mp.game.streaming.requestModel(model);
    console.log('[Preview] ШАГ 2: Запрос модели mp_m_freemode_01');
    
    let modelLoaded = false;
    let attempts = 0;
    
    const waitModel = setInterval(() => {
        if (mp.game.streaming.hasModelLoaded(model) || attempts > 100) {
            clearInterval(waitModel);
            
            if (mp.game.streaming.hasModelLoaded(model) && !modelLoaded) {
                modelLoaded = true;
                console.log('[Preview] ШАГ 3: Модель загружена, применяем...');
                
                player.model = model;
                
                setTimeout(() => {
                    player.position = previewPosition;
                    player.heading = previewHeading;
                    player.freezePosition(true);
                    player.setAlpha(255);
                    player.setInvincible(true);
                    
                    console.log('[Preview] ШАГ 4: Персонаж установлен');
                    
                    applyDefaultAppearance();
                    
                    console.log('[Preview] ШАГ 5: Прогрузка мира...');
                    mp.game.streaming.newLoadSceneStart(
                        previewPosition.x,
                        previewPosition.y,
                        previewPosition.z,
                        previewPosition.x,
                        previewPosition.y,
                        previewPosition.z,
                        50.0,
                        0
                    );
                    
                    setTimeout(() => {
                        mp.game.streaming.newLoadSceneStop();
                        console.log('[Preview] ШАГ 6: Мир прогружен, создаем камеру');
                        
                        setupPreviewCamera();
                        startPositionKeeper();
                        
                        console.log('[Preview] ===== РЕЖИМ ПРЕДПРОСМОТРА АКТИВИРОВАН =====');
                    }, 2000);
                    
                }, 200);
            } else if (attempts > 100) {
                console.error('[Preview] ОШИБКА: Не удалось загрузить модель за 100 попыток');
            }
        }
        attempts++;
    }, 100);
}

function applyDefaultAppearance() {
    const player = mp.players.local;
    const handle = player.handle;
    
    mp.game.ped.setHeadBlendData(handle, 21, 0, 0, 21, 0, 0, 0.5, 0.5, 0.0, false);
    mp.game.ped.setComponentVariation(handle, 2, 0, 0, 0);
    
    console.log('[Preview] Базовая внешность применена');
}

// ПРАВИЛЬНЫЙ ПОДХОД: Настройка камеры
function setupPreviewCamera() {
    console.log('[Preview] ===== НАСТРОЙКА КАМЕРЫ =====');
    
    updateCameraPosition();
    
    mp.game.ui.displayRadar(false);
    mp.game.ui.displayHud(false);
    mp.gui.chat.show(false);
    
    mp.game.time.setClockTime(12, 0, 0);
    mp.game.gameplay.setWeatherTypeNow('EXTRASUNNY');
    mp.game.gameplay.clearOverrideWeather();
    
    console.log('[Preview] ===== КАМЕРА НАСТРОЕНА =====');
}

// ИСПРАВЛЕНО: Смещение в правильную сторону
function updateCameraPosition() {
    const player = mp.players.local;
    const actualPlayerPos = player.position;
    
    // Параметры в зависимости от режима
    let distance, height, lookAtHeight, lookAtOffsetX;
    
    switch(cameraMode) {
        case 'head':
            distance = 0.8;
            height = 0.65;
            lookAtHeight = 0.65;
            lookAtOffsetX = 0.4; // ПОЛОЖИТЕЛЬНОЕ = персонаж правее
            break;
        case 'body':
            distance = 2.5;
            height = 0.6;
            lookAtHeight = 0.5;
            lookAtOffsetX = 0.9; // ПОЛОЖИТЕЛЬНОЕ = персонаж правее
            break;
        case 'full':
            distance = 4.5;
            height = 0.2;
            lookAtHeight = 0.4;
            lookAtOffsetX = 1.6; // ПОЛОЖИТЕЛЬНОЕ = персонаж правее
            break;
        default:
            distance = 2.5;
            height = 0.6;
            lookAtHeight = 0.5;
            lookAtOffsetX = 1.8;
    }
    
    const headingRad = ((player.getHeading() + cameraRotation) * Math.PI) / 180;
    
    // Позиция камеры
    const camPos = new mp.Vector3(
        actualPlayerPos.x + Math.sin(headingRad) * distance,
        actualPlayerPos.y + Math.cos(headingRad) * distance,
        actualPlayerPos.z + height
    );
    
    console.log('[Camera] Позиция камеры:', camPos);
    console.log('[Camera] Режим:', cameraMode, 'Поворот:', cameraRotation, 'Смещение взгляда:', lookAtOffsetX);
    
    if (previewCamera) {
        previewCamera.destroy();
    }
    
    previewCamera = mp.cameras.new('default', camPos, new mp.Vector3(0, 0, 0), 50);
    
    // Смещаем точку взгляда ВПРАВО (положительное значение)
    const rightVector = new mp.Vector3(
        Math.cos(headingRad),
        -Math.sin(headingRad),
        0
    );
    
    const lookAtPos = new mp.Vector3(
        actualPlayerPos.x + rightVector.x * lookAtOffsetX,
        actualPlayerPos.y + rightVector.y * lookAtOffsetX,
        actualPlayerPos.z + lookAtHeight
    );
    
    previewCamera.pointAtCoord(lookAtPos.x, lookAtPos.y, lookAtPos.z);
    previewCamera.setActive(true);
    
    mp.game.cam.renderScriptCams(true, false, 0, true, false);
}

// Вращение камеры влево
function rotateCameraLeft() {
    if (!isPreviewMode) return;
    
    cameraRotation -= 15;
    if (cameraRotation < 0) cameraRotation += 360;
    
    updateCameraPosition();
    console.log('[Preview] Камера повернута влево:', cameraRotation);
}

// Вращение камеры вправо
function rotateCameraRight() {
    if (!isPreviewMode) return;
    
    cameraRotation += 15;
    if (cameraRotation >= 360) cameraRotation -= 360;
    
    updateCameraPosition();
    console.log('[Preview] Камера повернута вправо:', cameraRotation);
}

// Изменение режима камеры
function setCameraMode(mode) {
    if (!isPreviewMode) return;
    
    cameraMode = mode;
    updateCameraPosition();
    console.log('[Preview] Режим камеры изменен:', mode);
}

// Автоматическое вращение
function startAutoRotate() {
    if (autoRotateInterval) return;
    
    autoRotateInterval = setInterval(() => {
        if (isPreviewMode) {
            cameraRotation += 0.5;
            if (cameraRotation >= 360) cameraRotation -= 360;
            updateCameraPosition();
        }
    }, 50);
    
    console.log('[Preview] Автоматическое вращение запущено');
}

function stopAutoRotate() {
    if (autoRotateInterval) {
        clearInterval(autoRotateInterval);
        autoRotateInterval = null;
        console.log('[Preview] Автоматическое вращение остановлено');
    }
}

// ОБРАБОТЧИКИ СОБЫТИЙ ОТ CEF
mp.events.add('cef:rotateCameraLeft', () => {
    rotateCameraLeft();
});

mp.events.add('cef:rotateCameraRight', () => {
    rotateCameraRight();
});

mp.events.add('cef:setCameraMode', (mode) => {
    setCameraMode(mode);
});

mp.events.add('cef:toggleAutoRotate', (enabled) => {
    if (enabled) {
        startAutoRotate();
    } else {
        stopAutoRotate();
    }
});

function startPositionKeeper() {
    if (previewUpdateInterval) {
        clearInterval(previewUpdateInterval);
    }
    
    console.log('[Preview] Запуск системы удержания позиции');
    
    let updateCount = 0;
    
    previewUpdateInterval = setInterval(() => {
        if (isPreviewMode) {
            const player = mp.players.local;
            const currentPos = player.position;
            
            const distance = Math.sqrt(
                Math.pow(currentPos.x - previewPosition.x, 2) +
                Math.pow(currentPos.y - previewPosition.y, 2) +
                Math.pow(currentPos.z - previewPosition.z, 2)
            );
            
            if (distance > 0.1) {
                player.position = previewPosition;
                player.heading = previewHeading;
            }
            
            player.freezePosition(true);
            
            const currentAlpha = player.getAlpha();
            if (currentAlpha < 255) {
                player.setAlpha(255);
            }
            
            updateCount++;
            if (updateCount % 50 === 0) {
                console.log('[Preview] Статус: OK');
            }
        }
    }, 100);
}

function stopPreviewMode() {
    console.log('[Preview] Остановка режима предпросмотра');
    
    isPreviewMode = false;
    cameraRotation = 0;
    cameraMode = 'body';
    
    stopAutoRotate();
    
    if (previewUpdateInterval) {
        clearInterval(previewUpdateInterval);
        previewUpdateInterval = null;
    }
    
    if (previewCamera) {
        previewCamera.setActive(false);
        previewCamera.destroy();
        previewCamera = null;
        mp.game.cam.renderScriptCams(false, false, 0, true, false);
    }
    
    const player = mp.players.local;
    player.freezePosition(false);
    player.setInvincible(false);
}

// === СОЗДАНИЕ ПЕРСОНАЖА ===

function showCharacterCreation() {
    if (isCharacterCreationShown) return;
    
    console.log('[Character] Открытие создания персонажа');
    
    characterBrowser = mp.browsers.new('package://cef/character/index.html');
    
    setTimeout(() => {
        mp.gui.cursor.visible = true;
        
        if (typeof mp.gui.cursor.show === 'function') {
            mp.gui.cursor.show(true, true);
        }
    }, 300);
    
    isCharacterCreationShown = true;
}

function hideCharacterCreation() {
    if (!isCharacterCreationShown) return;
    
    console.log('[Character] Закрытие создания персонажа');
    
    if (characterBrowser) {
        characterBrowser.destroy();
        characterBrowser = null;
    }
    
    stopPreviewMode();
    
    isCharacterCreationShown = false;
}

mp.events.add('cef:createCharacter', (characterDataJson) => {
    console.log('[Character] Отправка данных персонажа на сервер:', characterDataJson);
    mp.events.callRemote('server:createCharacter', characterDataJson);
});

mp.events.add('cef:updateAppearance', (appearanceJson) => {
    if (!isPreviewMode) return;
    
    try {
        const appearance = JSON.parse(appearanceJson);
        applyPreviewAppearance(appearance);
    } catch (err) {
        console.error('[Preview] Ошибка:', err);
    }
});

function applyPreviewAppearance(appearance) {
    if (!isPreviewMode) return;
    
    const player = mp.players.local;
    const handle = player.handle;
    
    if (appearance.gender !== undefined) {
        const modelName = appearance.gender === 0 ? 'mp_m_freemode_01' : 'mp_f_freemode_01';
        const model = mp.game.joaat(modelName);
        
        if (player.model !== model) {
            mp.game.streaming.requestModel(model);
            
            let attempts = 0;
            const waitModel = setInterval(() => {
                if (mp.game.streaming.hasModelLoaded(model) || attempts > 100) {
                    clearInterval(waitModel);
                    
                    if (mp.game.streaming.hasModelLoaded(model)) {
                        player.model = model;
                        
                        setTimeout(() => {
                            player.position = previewPosition;
                            player.heading = previewHeading;
                            player.freezePosition(true);
                            player.setAlpha(255);
                            
                            setTimeout(() => {
                                applyFaceFeatures(appearance);
                            }, 200);
                        }, 100);
                    }
                }
                attempts++;
            }, 100);
            
            return;
        }
    }
    
    applyFaceFeatures(appearance);
}

function applyFaceFeatures(appearance) {
    const player = mp.players.local;
    const handle = player.handle;
    
    if (appearance.faceFeatures) {
        const mother = parseInt(appearance.faceFeatures.mother) || 0;
        const father = parseInt(appearance.faceFeatures.father) || 0;
        const shapeMix = parseFloat(appearance.faceFeatures.shapeMix) || 0.5;
        const skinMix = parseFloat(appearance.faceFeatures.skinMix) || 0.5;
        
        mp.game.ped.setHeadBlendData(handle, mother, father, 0, mother, father, 0, shapeMix, skinMix, 0.0, false);
    }
    
    if (appearance.hair !== undefined) {
        mp.game.ped.setComponentVariation(handle, 2, parseInt(appearance.hair), 0, 0);
    }
    
    if (appearance.hairColor !== undefined) {
        mp.game.invoke('0x4CFFC65454C93A49', handle, parseInt(appearance.hairColor));
    }
    
    if (appearance.eyeColor !== undefined) {
        mp.game.invoke('0x50B56988B170AFDF', handle, parseInt(appearance.eyeColor));
    }
}

mp.events.add('client:characterCreationResponse', (type, message) => {
    console.log('[Character] Ответ от сервера:', type, message);
    
    if (characterBrowser) {
        characterBrowser.execute(`showMessage('${type}', '${message}')`);
        characterBrowser.execute(`resetCreating()`);
    }
    
    if (type === 'success') {
        setTimeout(() => {
            hideCharacterCreation();
            showTransitionScreen('Подготовка к входу в игру...');
        }, 1000);
    }
});

// === СПАВН ПЕРСОНАЖА ===

mp.events.add('client:spawnCharacter', (characterDataJson) => {
    if (isSpawned) return;
    
    try {
        const character = JSON.parse(characterDataJson);
        const player = mp.players.local;
        
        const spawnPos = new mp.Vector3(
            character.position_x || -1037.7,
            character.position_y || -2738.5,
            character.position_z || 20.0
        );
        
        if (character.appearance) {
            applyFullAppearance(character.appearance, () => {
                setTimeout(() => {
                    hideTransitionScreen();
                    startLoadingScreen(player, spawnPos, character);
                }, 500);
            });
        } else {
            setTimeout(() => {
                hideTransitionScreen();
                startLoadingScreen(player, spawnPos, character);
            }, 500);
        }
        
    } catch (err) {
        console.log('[Spawn] Ошибка: ' + err.message);
    }
});

function startLoadingScreen(player, spawnPos, character) {
    player.position = spawnPos;
    player.heading = character.heading || 0;
    player.setAlpha(0);
    player.freezePosition(true);
    
    const camHeight = spawnPos.z + 300.0;
    const camStartPos = new mp.Vector3(spawnPos.x + 200, spawnPos.y + 200, camHeight);
    const camEndPos = new mp.Vector3(spawnPos.x - 50, spawnPos.y - 50, spawnPos.z + 100);
    
    const loadingCam = mp.cameras.new('default', camStartPos, new mp.Vector3(0, 0, 0), 60);
    loadingCam.pointAtCoord(spawnPos.x, spawnPos.y, spawnPos.z);
    loadingCam.setActive(true);
    mp.game.cam.renderScriptCams(true, false, 0, true, false);
    
    const loadingScreen = mp.browsers.new('package://cef/loading/index.html');
    
    setTimeout(() => {
        loadingScreen.execute(`
            setCharacterInfo('${character.name}', '${character.surname}', ${character.money || 1000}, ${character.bank || 5000});
            startLoading();
        `);
    }, 500);
    
    mp.game.streaming.newLoadSceneStart(spawnPos.x, spawnPos.y, spawnPos.z, spawnPos.x, spawnPos.y, spawnPos.z, 150.0, 0);
    
    let progress = 0;
    const cameraInterval = setInterval(() => {
        if (progress < 1.0) {
            progress += 0.008;
            const newX = camStartPos.x + (camEndPos.x - camStartPos.x) * progress;
            const newY = camStartPos.y + (camEndPos.y - camStartPos.y) * progress;
            const newZ = camStartPos.z + (camEndPos.z - camStartPos.z) * progress;
            loadingCam.setCoord(newX, newY, newZ);
            loadingCam.pointAtCoord(spawnPos.x, spawnPos.y, spawnPos.z + (20 * (1 - progress)));
        }
    }, 50);
    
    setTimeout(() => {
        clearInterval(cameraInterval);
        mp.game.streaming.newLoadSceneStop();
        
        if (loadingScreen) {
            setTimeout(() => loadingScreen.destroy(), 1000);
        }
        
        setTimeout(() => {
            if (loadingCam) {
                loadingCam.setActive(false);
                loadingCam.destroy();
            }
            mp.game.cam.renderScriptCams(false, false, 0, true, false);
            finishSpawn(player, character);
        }, 1500);
    }, 12000);
}

function finishSpawn(player, character) {
    player.setAlpha(255);
    player.freezePosition(false);
    mp.game.ui.displayRadar(true);
    mp.game.ui.displayHud(true);
    mp.gui.chat.show(true);
    enableControls();
    
    setTimeout(() => {
        mp.gui.chat.push(`!{#00FF00}Добро пожаловать, ${character.name} ${character.surname}!`);
    }, 500);
    
    isSpawned = true;
}

function applyFullAppearance(appearance, callback) {
    try {
        const player = mp.players.local;
        const handle = player.handle;
        const modelName = appearance.gender === 0 ? "mp_m_freemode_01" : "mp_f_freemode_01";
        const model = mp.game.joaat(modelName);
        mp.game.streaming.requestModel(model);
        
        let attempts = 0;
        const waitModel = setInterval(() => {
            if (mp.game.streaming.hasModelLoaded(model) || attempts > 100) {
                clearInterval(waitModel);
                
                if (mp.game.streaming.hasModelLoaded(model)) {
                    player.model = model;
                    
                    setTimeout(() => {
                        if (appearance.faceFeatures) {
                            const mother = parseInt(appearance.faceFeatures.mother) || 0;
                            const father = parseInt(appearance.faceFeatures.father) || 0;
                            const shapeMix = parseFloat(appearance.faceFeatures.shapeMix) || 0.5;
                            const skinMix = parseFloat(appearance.faceFeatures.skinMix) || 0.5;
                            mp.game.ped.setHeadBlendData(handle, mother, father, 0, mother, father, 0, shapeMix, skinMix, 0.0, false);
                        }
                        
                        if (appearance.hair !== undefined) {
                            mp.game.ped.setComponentVariation(handle, 2, parseInt(appearance.hair), 0, 0);
                        }
                        
                        if (appearance.hairColor !== undefined) {
                            mp.game.invoke('0x4CFFC65454C93A49', handle, parseInt(appearance.hairColor));
                        }
                        
                        if (appearance.eyeColor !== undefined) {
                            mp.game.invoke('0x50B56988B170AFDF', handle, parseInt(appearance.eyeColor));
                        }
                        
                        if (callback) callback();
                    }, 500);
                } else if (callback) {
                    callback();
                }
            }
            attempts++;
        }, 100);
    } catch (err) {
        console.log('[Внешность] Ошибка: ' + err.message);
        if (callback) callback();
    }
}

mp.events.add('playerCommand', (command) => {
    if (command === 'debug') {
        const player = mp.players.local;
        mp.gui.chat.push('!{#00FF00}===== DEBUG =====');
        mp.gui.chat.push(`!{#FFFF00}Pos: ${player.position.x.toFixed(2)}, ${player.position.y.toFixed(2)}, ${player.position.z.toFixed(2)}`);
        mp.gui.chat.push(`!{#FFFF00}Dimension: ${player.dimension}`);
        mp.gui.chat.push(`!{#FFFF00}Alpha: ${player.getAlpha()}`);
        mp.gui.chat.push(`!{#FFFF00}Preview: ${isPreviewMode}`);
        mp.gui.chat.push(`!{#FFFF00}Camera Mode: ${cameraMode}`);
        mp.gui.chat.push(`!{#FFFF00}Camera Rotation: ${cameraRotation}`);
    }
});

// ===== АДМИН СИСТЕМА =====

let adminBrowser = null;
let isAdminSystemActive = false;
let adminLevel = 0;

mp.gui.chat.push('!{#4caf50}[Admin] Модуль загружен');

// ===== АКТИВАЦИЯ СИСТЕМЫ =====
mp.events.add('client:activateAdminSystem', (level) => {
    isAdminSystemActive = true;
    adminLevel = level;
    
    mp.gui.chat.push(`!{#4caf50}[Админ] ✅ Система активирована! Уровень: ${level}`);
    mp.gui.chat.push(`!{#2196f3}[Админ] Нажмите F3 для открытия панели`);
    mp.game.graphics.notify(`~g~Админ система активирована!~n~~w~Нажмите ~b~F3~w~ для открытия`);
});

// ===== ОТКРЫТИЕ/ЗАКРЫТИЕ ПО F3 =====
mp.keys.bind(0x72, true, () => { // F3
    // Проверяем активен ли чат
    if (isChatActive) {
        console.log('[Admin] Чат активен, панель не открывается');
        mp.game.graphics.notify('~r~Закройте чат перед открытием админ панели!');
        return;
    }
    
    // Проверяем открыт ли инвентарь
    if (isInventoryOpen) {
        console.log('[Admin] Инвентарь открыт, панель не открывается');
        mp.game.graphics.notify('~r~Закройте инвентарь перед открытием админ панели!');
        return;
    }
    
    if (!isAdminSystemActive) {
        mp.gui.chat.push('!{#ff9800}[Админ] Система не активирована! Используйте /admin');
        mp.game.graphics.notify('~r~Используйте /admin для активации!');
        return;
    }
    
    if (isAdminPanelOpen) {
        closeAdminPanel();
    } else {
        mp.events.callRemote('admin:requestOpenPanel');
    }
});

// ===== ОТКРЫТИЕ АДМИН ПАНЕЛИ =====
mp.events.add('client:openAdminPanel', (level) => {
    if (isAdminPanelOpen) {
        mp.gui.chat.push('!{#ff9800}[Админ] Панель уже открыта!');
        return;
    }
    
    mp.gui.chat.push(`!{#ffff00}[Админ] Открытие панели...`);
    
    try {
        // Создаём браузер
        adminBrowser = mp.browsers.new('package://cef/adminpanel/index.html');
        
        mp.gui.chat.push('!{#00ff00}[Админ] ✅ Браузер создан!');
        
        setTimeout(() => {
            // Показываем курсор
            mp.gui.cursor.visible = true;
            
            if (typeof mp.gui.cursor.show === 'function') {
                mp.gui.cursor.show(true, true);
            }
            
            // Отключаем управление
            mp.game.ui.displayRadar(false);
            
            // Блокируем управление персонажем
            mp.players.local.freezePosition(true);

            // Отключаем ввод управления
            mp.game.controls.disableAllControlActions(0);
            mp.game.controls.disableAllControlActions(1);
            mp.game.controls.disableAllControlActions(2);
            
            // Отправляем данные админа
            const adminData = {
                name: mp.players.local.name || 'Admin',
                level: level
            };
            
            if (adminBrowser) {
                adminBrowser.execute(`updateAdminInfo(${JSON.stringify(adminData)})`);
            }
            
            // Запрашиваем данные
            mp.events.callRemote('admin:getPlayers');
            mp.events.callRemote('admin:getEconomyStats');
            
            mp.gui.chat.push('!{#00ff00}[Админ] ✅ Панель открыта! (F3 или ESC для закрытия)');
            mp.game.graphics.notify('~g~Админ панель открыта!~n~~w~F3 или ESC для закрытия');
            
        }, 500);
        
        isAdminPanelOpen = true;
        
    } catch (err) {
        mp.gui.chat.push(`!{#ff0000}[Админ] ❌ ОШИБКА: ${err.message}`);
        mp.game.graphics.notify(`~r~Ошибка: ${err.message}`);
    }
});

// ===== ЗАКРЫТИЕ ПАНЕЛИ =====
function closeAdminPanel() {
    if (!isAdminPanelOpen) return;
    
    mp.gui.chat.push('!{#ffff00}[Админ] Закрытие панели...');
    
    if (adminBrowser) {
        adminBrowser.destroy();
        adminBrowser = null;
    }
    
    mp.gui.cursor.visible = false;
    
    if (typeof mp.gui.cursor.show === 'function') {
        mp.gui.cursor.show(false, false);
    }
    
    // Включаем управление обратно
    mp.game.ui.displayRadar(true);
    
    // Разблокируем управление персонажем
    mp.players.local.freezePosition(false);

    // Включаем управление обратно
    mp.game.controls.enableAllControlActions(0);
    mp.game.controls.enableAllControlActions(1);
    mp.game.controls.enableAllControlActions(2);
    
    isAdminPanelOpen = false;
    
    mp.gui.chat.push('!{#00ff00}[Админ] ✅ Панель закрыта!');
    mp.game.graphics.notify('~g~Панель закрыта');
}

mp.events.add('cef:closeAdminPanel', () => {
    closeAdminPanel();
});

// ===== ПОЛУЧЕНИЕ СПИСКА ИГРОКОВ =====
mp.events.add('client:receivePlayersList', (playersJson) => {
    if (!isAdminPanelOpen || !adminBrowser) return;
    
    adminBrowser.execute(`loadPlayers(${playersJson})`);
});

// ===== ДЕЙСТВИЯ С ИГРОКАМИ =====
mp.events.add('cef:adminAction', (action, playerId) => {
    mp.events.callRemote('admin:playerAction', action, playerId);
});

// ===== СПАВН ТРАНСПОРТА =====
mp.events.add('cef:spawnVehicle', (model) => {
    mp.events.callRemote('admin:spawnVehicle', model);
});

// ===== ТЕЛЕПОРТАЦИЯ =====
mp.events.add('cef:teleport', (x, y, z) => {
    mp.events.callRemote('admin:teleport', x, y, z);
});

// ===== ПОГОДА =====
mp.events.add('cef:setWeather', (weather) => {
    mp.events.callRemote('admin:setWeather', weather);
});

// ===== ВРЕМЯ =====
mp.events.add('cef:setTime', (hour, minute) => {
    mp.events.callRemote('admin:setTime', hour, minute);
});

// ===== ДЕНЬГИ =====
mp.events.add('cef:giveMoney', (playerId, amount, type) => {
    mp.events.callRemote('admin:giveMoney', playerId, amount, type);
});

mp.events.add('cef:takeMoney', (playerId, amount, type) => {
    mp.events.callRemote('admin:takeMoney', playerId, amount, type);
});

// ===== ОБЪЯВЛЕНИЕ =====
mp.events.add('cef:sendAnnouncement', (text) => {
    mp.events.callRemote('admin:sendAnnouncement', text);
});

// ===== СТАТИСТИКА ЭКОНОМИКИ =====
mp.events.add('client:receiveEconomyStats', (statsJson) => {
    if (!isAdminPanelOpen || !adminBrowser) return;
    
    adminBrowser.execute(`updateEconomyStats(${statsJson})`);
});

// ===== ЛОГИ =====
mp.events.add('cef:loadLogs', () => {
    mp.events.callRemote('admin:getLogs');
});

mp.events.add('client:receiveLogs', (logsJson) => {
    if (!isAdminPanelOpen || !adminBrowser) return;
    
    adminBrowser.execute(`displayLogs(${logsJson})`);
});

// ===== УВЕДОМЛЕНИЯ =====
mp.events.add('client:adminNotify', (type, message) => {
    if (isAdminPanelOpen && adminBrowser) {
        adminBrowser.execute(`showNotification('${type}', '${message}')`);
    }
    
    const colors = {
        'success': '#4caf50',
        'error': '#f44336',
        'warning': '#ff9800',
        'info': '#2196f3'
    };
    
    const color = colors[type] || '#ffffff';
    mp.gui.chat.push(`!{${color}}[Admin] ${message}`);
});

// ===== ЗАМОРОЗКА ИГРОКА =====
mp.events.add('client:freezePlayer', (freeze) => {
    mp.players.local.freezePosition(freeze);
    
    if (freeze) {
        mp.game.ui.displayRadar(false);
        mp.gui.chat.push('!{#ff9800}[Система] Вы заморожены администратором!');
        mp.game.graphics.notify('~r~Вы заморожены!');
    } else {
        mp.game.ui.displayRadar(true);
        mp.gui.chat.push('!{#4caf50}[Система] Вы разморожены!');
        mp.game.graphics.notify('~g~Разморожены!');
    }
});

// ===== ДИАЛОГ БАНА =====
mp.events.add('client:openBanDialog', (targetId, targetName) => {
    if (!isAdminPanelOpen || !adminBrowser) return;
    
    adminBrowser.execute(`openBanDialog(${targetId}, '${targetName}')`);
});

mp.events.add('cef:banPlayer', (targetId, reason, duration) => {
    mp.events.callRemote('admin:banPlayer', targetId, reason, duration);
});

// ===== АВТООБНОВЛЕНИЕ СПИСКА ИГРОКОВ =====
setInterval(() => {
    if (isAdminPanelOpen) {
        mp.events.callRemote('admin:getPlayers');
    }
}, 5000);

mp.gui.chat.push('!{#4caf50}[Admin] ✅ Система загружена');
console.log('[Admin Client] Система администрирования загружена');

// ===== СИСТЕМА ИНВЕНТАРЯ =====

let inventoryBrowser = null;

mp.gui.chat.push('!{#4caf50}[Inventory] Модуль загружен');

// ===== ОТКРЫТИЕ/ЗАКРЫТИЕ ПО КНОПКЕ I =====
mp.keys.bind(0x49, true, () => { // I key
    // Проверяем активен ли чат
    if (isChatActive) {
        console.log('[Inventory] Чат активен, инвентарь не открывается');
        mp.game.graphics.notify('~r~Закройте чат перед открытием инвентаря!');
        return;
    }
    
    // Проверяем открыта ли админ панель
    if (typeof isAdminPanelOpen !== 'undefined' && isAdminPanelOpen) {
        console.log('[Inventory] Админ панель открыта, инвентарь не открывается');
        mp.game.graphics.notify('~r~Закройте админ панель перед открытием инвентаря!');
        return;
    }
    
    if (isInventoryOpen) {
        closeInventory();
    } else {
        openInventory();
    }
});

// ===== ОТКРЫТИЕ ИНВЕНТАРЯ =====
function openInventory() {
    if (isInventoryOpen) return;
    
    // Дополнительная проверка чата
    if (isChatActive) {
        mp.gui.chat.push('!{#ff9800}[Inventory] Закройте чат перед открытием инвентаря!');
        mp.game.graphics.notify('~r~Закройте чат!');
        return;
    }
    
    console.log('[Inventory] Открытие инвентаря...');
    
    // Запрашиваем инвентарь с сервера
    mp.events.callRemote('inventory:open');
	mp.events.callRemote('inventory:requestGroundItems');
}

mp.events.add('client:openInventory', (inventoryJson, charDataJson) => {
    try {
        console.log('[Inventory] Данные получены, создаю браузер...');
        
        // Создаём браузер
        inventoryBrowser = mp.browsers.new('package://cef/inventory/index.html');
        
        setTimeout(() => {
            // Показываем курсор
            mp.gui.cursor.visible = true;
            
            if (typeof mp.gui.cursor.show === 'function') {
                mp.gui.cursor.show(true, true);
            }
            
            // Отключаем радар
            mp.game.ui.displayRadar(false);
            
            // Блокируем управление
            mp.game.ui.displayHud(false);
            
            // Блокируем управление персонажем
            mp.players.local.freezePosition(true);

            // Отключаем ввод управления
            mp.game.controls.disableAllControlActions(0);
            mp.game.controls.disableAllControlActions(1);
            mp.game.controls.disableAllControlActions(2);
            
            // Загружаем данные в CEF
            if (inventoryBrowser) {
                inventoryBrowser.execute(`loadInventory(${inventoryJson}, ${charDataJson})`);
            }
            
            mp.gui.chat.push('!{#00ff00}[Inventory] ✅ Инвентарь открыт! (I или ESC для закрытия)');
            mp.game.graphics.notify('~g~Инвентарь открыт!~n~~w~I или ESC для закрытия');
            
        }, 500);
        
        isInventoryOpen = true;
        
    } catch (err) {
        mp.gui.chat.push(`!{#ff0000}[Inventory] ❌ ОШИБКА: ${err.message}`);
        console.error('[Inventory] Ошибка:', err);
    }
});

// ===== ЗАКРЫТИЕ ИНВЕНТАРЯ =====
function closeInventory() {
    if (!isInventoryOpen) return;
    
    console.log('[Inventory] Закрытие инвентаря...');
    
    if (inventoryBrowser) {
        inventoryBrowser.destroy();
        inventoryBrowser = null;
    }
    
    mp.gui.cursor.visible = false;
    
    if (typeof mp.gui.cursor.show === 'function') {
        mp.gui.cursor.show(false, false);
    }
    
    // Включаем радар обратно
    mp.game.ui.displayRadar(true);
    
    // Включаем HUD обратно
    mp.game.ui.displayHud(true);
    
    // Разблокируем управление персонажем
    mp.players.local.freezePosition(false);

    // Включаем управление обратно
    mp.game.controls.enableAllControlActions(0);
    mp.game.controls.enableAllControlActions(1);
    mp.game.controls.enableAllControlActions(2);
    
    isInventoryOpen = false;
    
    mp.gui.chat.push('!{#00ff00}[Inventory] ✅ Инвентарь закрыт!');
}

mp.events.add('cef:closeInventory', () => {
    closeInventory();
});

// ===== ОБНОВЛЕНИЕ ИНВЕНТАРЯ =====
mp.events.add('client:updateInventory', (inventoryJson) => {
    if (!isInventoryOpen || !inventoryBrowser) return;
    
    try {
        // Экранируем одинарные кавычки для передачи в CEF
        const safeJson = inventoryJson.replace(/'/g, "\\'");
        inventoryBrowser.execute(`loadInventory('${safeJson}', null)`);
    } catch (err) {
        console.error('[Inventory] Ошибка обновления:', err);
    }
});

// ===== ОБНОВЛЕНИЕ СТАТОВ =====
mp.events.add('client:updateStats', (statsJson) => {
    if (!isInventoryOpen || !inventoryBrowser) return;
    
    try {
        inventoryBrowser.execute(`updatePlayerInfo(${statsJson})`);
    } catch (err) {
        console.error('[Inventory] Ошибка обновления статов:', err);
    }
});

// ===== СНЯТИЕ ЭКИПИРОВКИ =====
mp.events.add('cef:unequipItem', (slotType) => {
    mp.events.callRemote('inventory:unequipItem', slotType);
});

// ===== ПЕРЕМЕЩЕНИЕ В СЛОТ ЭКИПИРОВКИ =====
mp.events.add('cef:equipToSlot', (fromSlot, slotType) => {
    mp.events.callRemote('inventory:moveItem',
        JSON.stringify({ type: 'main', index: parseInt(fromSlot) }),
        JSON.stringify({ type: 'equipment', index: slotType })
    );
});

// ===== ИСПОЛЬЗОВАНИЕ ПРЕДМЕТА =====
mp.events.add('cef:useItem', (slot) => {
    console.log(`[Inventory] Использование предмета в слоте ${slot}`);
    mp.events.callRemote('inventory:useItem', slot);
});

// ===== ВЫБРОС ПРЕДМЕТА =====
mp.events.add('cef:dropItem', (slot, quantity) => {
    console.log(`[Inventory] Выброс предмета: слот ${slot}, количество ${quantity}`);
    mp.events.callRemote('inventory:dropItem', slot, quantity);
});

// Выброс экипировки
mp.events.add('cef:dropEquipment', (slotType) => {
    mp.events.callRemote('inventory:dropEquipment', slotType);
});

// ===== ПЕРЕМЕЩЕНИЕ ПРЕДМЕТА =====
mp.events.add('cef:moveItem', (fromSlot, toSlot) => {
    console.log(`[Inventory] Перемещение: ${fromSlot} -> ${toSlot}`);
    mp.events.callRemote('inventory:moveItem', fromSlot, toSlot);
});

// Разделение предмета
mp.events.add('cef:splitItem', (slot, quantity) => {
    mp.events.callRemote('inventory:splitItem', slot, quantity);
});

mp.gui.chat.push('!{#4caf50}[Inventory] ✅ Система инвентаря загружена');
console.log('[Inventory Client] Система инвентаря загружена');

// ===== РАСШИРЕННЫЕ АДМИНСКИЕ ФУНКЦИИ (КЛИЕНТ) - ИСПРАВЛЕНО =====

let spectateMode = false;
let spectateTarget = null;
let spectateCamera = null;
let noclipMode = false;
let noclipSpeed = 1.0;

console.log('[Admin Extended Client] 🔧 Загрузка расширенных функций...');

// ===== СЛЕЖКА ЗА ИГРОКОМ =====
mp.events.add('client:startSpectate', (targetId, x, y, z) => {
    console.log('[Spectate] ✅ Начало слежки за ID:', targetId);
    
    spectateMode = true;
    spectateTarget = targetId;
    
    const target = mp.players.atRemoteId(targetId);
    
    if (target) {
        const pos = target.position;
        spectateCamera = mp.cameras.new('default', 
            new mp.Vector3(pos.x, pos.y, pos.z + 2), 
            new mp.Vector3(0, 0, 0), 
            60
        );
        
        spectateCamera.setActive(true);
        mp.game.cam.renderScriptCams(true, false, 0, true, false);
        
        mp.game.ui.displayRadar(false);
        mp.gui.chat.show(false);
        
        mp.gui.chat.push('!{#00ff00}[Spectate] Слежка активирована. ESC для выхода');
    } else {
        console.log('[Spectate] ⚠️ Цель не найдена');
    }
});

mp.events.add('client:stopSpectate', () => {
    console.log('[Spectate] ❌ Остановка слежки');
    
    spectateMode = false;
    spectateTarget = null;
    
    if (spectateCamera) {
        spectateCamera.setActive(false);
        spectateCamera.destroy();
        spectateCamera = null;
        mp.game.cam.renderScriptCams(false, false, 0, true, false);
    }
    
    mp.game.ui.displayRadar(true);
    mp.gui.chat.show(true);
    
    mp.gui.chat.push('!{#00ff00}[Spectate] Слежка остановлена');
});

// Обновление камеры слежки
setInterval(() => {
    if (spectateMode && spectateTarget !== null) {
        const target = mp.players.atRemoteId(spectateTarget);
        
        if (target && spectateCamera) {
            const pos = target.position;
            const heading = target.getHeading();
            
            const distance = 5.0;
            const height = 2.0;
            
            const radians = (heading * Math.PI) / 180;
            
            const camX = pos.x - Math.sin(radians) * distance;
            const camY = pos.y - Math.cos(radians) * distance;
            const camZ = pos.z + height;
            
            spectateCamera.setCoord(camX, camY, camZ);
            spectateCamera.pointAtCoord(pos.x, pos.y, pos.z + 1);
        }
    }
}, 50);

// ===== NOCLIP =====
mp.events.add('client:toggleNoclip', (enabled) => {
    console.log('[Noclip] 🔄 Статус:', enabled);
    noclipMode = enabled;
    
    if (enabled) {
        mp.game.ui.displayRadar(false);
        mp.gui.chat.push('!{#00ff00}[Noclip] Активирован. WASD = движение, Shift = ускорение');
        mp.gui.chat.push('!{#ffff00}[Noclip] F для выключения');
    } else {
        mp.game.ui.displayRadar(true);
        mp.gui.chat.push('!{#ff9800}[Noclip] Отключен');
    }
});

// Обработка Noclip
setInterval(() => {
    if (noclipMode) {
        const player = mp.players.local;
        const camera = mp.cameras.new('gameplay');
        const position = player.position;
        const direction = camera.getDirection();
        
        let speed = noclipSpeed;
        
        if (mp.game.controls.isControlPressed(0, 21)) speed *= 3; // Shift
        if (mp.game.controls.isControlPressed(0, 36)) speed *= 0.3; // Ctrl
        
        let newX = position.x;
        let newY = position.y;
        let newZ = position.z;
        
        // W
        if (mp.game.controls.isControlPressed(0, 32)) {
            newX += direction.x * speed;
            newY += direction.y * speed;
            newZ += direction.z * speed;
        }
        
        // S
        if (mp.game.controls.isControlPressed(0, 33)) {
            newX -= direction.x * speed;
            newY -= direction.y * speed;
            newZ -= direction.z * speed;
        }
        
        // A
        if (mp.game.controls.isControlPressed(0, 34)) {
            const right = camera.getDirection();
            newX -= right.y * speed;
            newY += right.x * speed;
        }
        
        // D
        if (mp.game.controls.isControlPressed(0, 35)) {
            const right = camera.getDirection();
            newX += right.y * speed;
            newY -= right.x * speed;
        }
        
        // Space
        if (mp.game.controls.isControlPressed(0, 321)) newZ += speed;
        // Ctrl
        if (mp.game.controls.isControlPressed(0, 326)) newZ -= speed;
        
        player.position = new mp.Vector3(newX, newY, newZ);
        player.freezePosition(true);
        
        camera.destroy();
    } else {
        mp.players.local.freezePosition(false);
    }
}, 0);

// F для выключения Noclip
mp.keys.bind(0x46, true, () => {
    if (noclipMode) {
        console.log('[Noclip] ⏹️ Отключение через F');
        mp.events.callRemote('admin:toggleNoclip');
    }
});

// ===== СОБЫТИЯ ОТ CEF К СЕРВЕРУ =====
console.log('[Admin Extended Client] 📡 Регистрация событий CEF→Server...');

// Слежка
mp.events.add('cef:startSpectate', (playerId) => {
    console.log('[Client→Server] 🔵 cef:startSpectate →', playerId, 'тип:', typeof playerId);
    mp.events.callRemote('admin:startSpectate', parseInt(playerId));
});

mp.events.add('cef:stopSpectate', () => {
    console.log('[Client→Server] 🔵 cef:stopSpectate');
    mp.events.callRemote('admin:stopSpectate');
});

// Админ способности
mp.events.add('cef:toggleInvisible', () => {
    console.log('[Client→Server] 🔵 cef:toggleInvisible');
    mp.events.callRemote('admin:toggleInvisible');
});

mp.events.add('cef:toggleGodMode', () => {
    console.log('[Client→Server] 🔵 cef:toggleGodMode');
    mp.events.callRemote('admin:toggleGodMode');
});

mp.events.add('cef:toggleNoclip', () => {
    console.log('[Client→Server] 🔵 cef:toggleNoclip');
    mp.events.callRemote('admin:toggleNoclip');
});

// История и списки
mp.events.add('cef:loadTeleportHistory', () => {
    console.log('[Client→Server] 🔵 cef:loadTeleportHistory');
    mp.events.callRemote('admin:getTeleportHistory');
});

mp.events.add('cef:loadBannedList', () => {
    console.log('[Client→Server] 🔵 cef:loadBannedList');
    mp.events.callRemote('admin:getBannedList');
});

mp.events.add('cef:unbanPlayer', (banId, reason) => {
    console.log('[Client→Server] 🔵 cef:unbanPlayer:', banId, reason);
    mp.events.callRemote('admin:unbanPlayer', parseInt(banId), reason);
});

// Оружие и предметы
mp.events.add('cef:giveWeapon', (playerId, weaponHash, ammo) => {
    console.log('[Client→Server] 🔵 cef:giveWeapon:', playerId, weaponHash, ammo);
    mp.events.callRemote('admin:giveWeapon', parseInt(playerId), weaponHash, parseInt(ammo));
});

mp.events.add('cef:clearInventory', (playerId) => {
    console.log('[Client→Server] 🔵 cef:clearInventory:', playerId);
    mp.events.callRemote('admin:clearInventory', parseInt(playerId));
});

// Транспорт
mp.events.add('cef:deleteAllVehicles', () => {
    console.log('[Client→Server] 🔵 cef:deleteAllVehicles');
    mp.events.callRemote('admin:deleteAllVehicles');
});

mp.events.add('cef:repairVehicle', (playerId) => {
    console.log('[Client→Server] 🔵 cef:repairVehicle:', playerId);
    mp.events.callRemote('admin:repairVehicle', parseInt(playerId));
});

mp.events.add('cef:refuelVehicle', (playerId) => {
    console.log('[Client→Server] 🔵 cef:refuelVehicle:', playerId);
    mp.events.callRemote('admin:refuelVehicle', parseInt(playerId));
});

// Статистика
mp.events.add('cef:loadOnlineStats', () => {
    console.log('[Client→Server] 🔵 cef:loadOnlineStats');
    mp.events.callRemote('admin:getOnlineStats');
});

mp.events.add('cef:loadTopPlayers', () => {
    console.log('[Client→Server] 🔵 cef:loadTopPlayers');
    mp.events.callRemote('admin:getTopPlayers');
});

mp.events.add('cef:loadAdminReports', () => {
    console.log('[Client→Server] 🔵 cef:loadAdminReports');
    mp.events.callRemote('admin:getAdminReports');
});

// ===== ПОЛУЧЕНИЕ ДАННЫХ С СЕРВЕРА =====
console.log('[Admin Extended Client] 📥 Регистрация событий Server→Client...');

mp.events.add('client:receiveTeleportHistory', (historyJson) => {
    console.log('[Server→Client] 🟢 receiveTeleportHistory, длина:', historyJson ? historyJson.length : 0);
    
    if (!isAdminPanelOpen || !adminBrowser) {
        console.log('[Client] ⚠️ Панель закрыта или браузер не готов');
        return;
    }
    
    try {
        // Экранируем кавычки и обратные слэши
        const safeJson = historyJson.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
        adminBrowser.execute(`displayTeleportHistory('${safeJson}')`);
        console.log('[Client] ✅ История телепортов передана в CEF');
    } catch (err) {
        console.log('[Client] ❌ Ошибка передачи истории:', err);
    }
});

mp.events.add('client:receiveBannedList', (bansJson) => {
    console.log('[Server→Client] 🟢 receiveBannedList, длина:', bansJson ? bansJson.length : 0);
    
    if (!isAdminPanelOpen || !adminBrowser) {
        console.log('[Client] ⚠️ Панель закрыта');
        return;
    }
    
    try {
        const safeJson = bansJson.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
        adminBrowser.execute(`displayBannedList('${safeJson}')`);
        console.log('[Client] ✅ Список банов передан в CEF');
    } catch (err) {
        console.log('[Client] ❌ Ошибка передачи банов:', err);
    }
});

mp.events.add('client:receiveOnlineStats', (statsJson) => {
    console.log('[Server→Client] 🟢 receiveOnlineStats, длина:', statsJson ? statsJson.length : 0);
    
    if (!isAdminPanelOpen || !adminBrowser) {
        console.log('[Client] ⚠️ Панель закрыта');
        return;
    }
    
    try {
        const safeJson = statsJson.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
        adminBrowser.execute(`displayOnlineStats('${safeJson}')`);
        console.log('[Client] ✅ Статистика онлайна передана в CEF');
    } catch (err) {
        console.log('[Client] ❌ Ошибка передачи статистики:', err);
    }
});

mp.events.add('client:receiveTopPlayers', (playersJson) => {
    console.log('[Server→Client] 🟢 receiveTopPlayers, длина:', playersJson ? playersJson.length : 0);
    
    if (!isAdminPanelOpen || !adminBrowser) {
        console.log('[Client] ⚠️ Панель закрыта');
        return;
    }
    
    try {
        const safeJson = playersJson.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
        adminBrowser.execute(`displayTopPlayers('${safeJson}')`);
        console.log('[Client] ✅ Топ игроков передан в CEF');
    } catch (err) {
        console.log('[Client] ❌ Ошибка передачи топа:', err);
    }
});

mp.events.add('client:receiveAdminReports', (reportsJson) => {
    console.log('[Server→Client] 🟢 receiveAdminReports, длина:', reportsJson ? reportsJson.length : 0);
    
    if (!isAdminPanelOpen || !adminBrowser) {
        console.log('[Client] ⚠️ Панель закрыта');
        return;
    }
    
    try {
        const safeJson = reportsJson.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
        adminBrowser.execute(`displayAdminReports('${safeJson}')`);
        console.log('[Client] ✅ Отчёты админов переданы в CEF');
    } catch (err) {
        console.log('[Client] ❌ Ошибка передачи отчётов:', err);
    }
});

// ===== СОХРАНЕНИЕ ОДЕЖДЫ (КЛИЕНТ) =====
mp.events.add('client:requestClothesData', () => {
    try {
        const player = mp.players.local;
        const clothes = {};
        
        // Собираем компоненты одежды
        for (let i = 0; i < 12; i++) {
            clothes[`comp_${i}_drawable`] = player.getDrawableVariation(i);
            clothes[`comp_${i}_texture`] = player.getTextureVariation(i);
        }
        
        // Props (очки, часы и т.д.)
        for (let i = 0; i < 3; i++) {
            clothes[`prop_${i}_drawable`] = player.getPropIndex(i);
            clothes[`prop_${i}_texture`] = player.getPropTextureIndex(i);
        }
        
        // Отправляем на сервер
        mp.events.callRemote('inventory:saveClothesData', JSON.stringify(clothes));
        
        console.log('[Inventory] Данные одежды отправлены на сервер');
        
    } catch (err) {
        console.error('[Inventory] Ошибка сохранения одежды:', err);
    }
});

// ===== СИСТЕМА ПРЕДМЕТОВ НА ЗЕМЛЕ (КЛИЕНТ) =====

let nearbyGroundItems = [];

// Получаем обновление предметов на земле
mp.events.add('client:updateGroundItems', (itemsJson) => {
    try {
        nearbyGroundItems = JSON.parse(itemsJson);
        
        // Обновляем UI если инвентарь открыт
        if (isInventoryOpen && inventoryBrowser) {
            inventoryBrowser.execute(`updateGroundItems('${itemsJson.replace(/'/g, "\\'")}')`);
        }
        
    } catch (err) {
        console.error('[Inventory] Ошибка обновления предметов на земле:', err);
    }
});

// Запрос предметов на земле при открытии инвентаря
mp.events.add('client:inventoryOpened', () => {
    mp.events.callRemote('inventory:requestGroundItems');
});

// Подбор предмета с земли
mp.events.add('cef:pickupItem', (groundItemId) => {
    mp.events.callRemote('inventory:pickupItem', groundItemId);
});

// Клавиша E для быстрого подбора
mp.keys.bind(0x45, false, () => { // E key
    if (nearbyGroundItems.length > 0 && !isInventoryOpen) {
        const nearest = nearbyGroundItems[0];
        if (nearest.distance <= 3) {
            mp.events.callRemote('inventory:pickupItem', nearest.id);
        }
    }
});

// Периодический запрос предметов на земле
setInterval(() => {
    if (mp.players.local.dimension !== undefined) {
        mp.events.callRemote('inventory:requestGroundItems');
    }
}, 5000);

console.log('[Inventory Client] ✅ Система предметов на земле загружена');
console.log('[Inventory Client] ✅ Система сохранения одежды загружена');
console.log('[Admin Extended Client] ✅ Все расширенные события зарегистрированы');
console.log('[Admin Extended Client] 📋 Список событий:');
console.log('  ✓ cef:startSpectate → admin:startSpectate');
console.log('  ✓ cef:toggleInvisible → admin:toggleInvisible');
console.log('  ✓ cef:toggleGodMode → admin:toggleGodMode');
console.log('  ✓ cef:toggleNoclip → admin:toggleNoclip');
console.log('  ✓ cef:loadTeleportHistory → admin:getTeleportHistory');
console.log('  ✓ cef:loadBannedList → admin:getBannedList');
console.log('  ✓ cef:loadOnlineStats → admin:getOnlineStats');
console.log('  ✓ cef:loadTopPlayers → admin:getTopPlayers');
console.log('  ✓ cef:loadAdminReports → admin:getAdminReports');
console.log('[Admin Extended Client] 🚀 Готов к работе!');
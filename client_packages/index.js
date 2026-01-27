// Клиентская логика для системы авторизации и создания персонажа

let authBrowser = null;
let characterBrowser = null;
let characterSelectionBrowser = null;
let isAuthShown = false;
let isCharacterCreationShown = false;
let isCharacterSelectionShown = false;
let isSpawned = false;
let transitionBrowser = null;

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
let isAdminPanelOpen = false;
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
    if (!isAdminSystemActive) {
        mp.gui.chat.push('!{#ff9800}[Админ] Система не активирована! Используйте /admin');
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
    
    isAdminPanelOpen = false;
    
    mp.gui.chat.push('!{#00ff00}[Админ] ✅ Панель закрыта!');
    mp.game.graphics.notify('~g~Панель закрыта');
}

mp.events.add('cef:closeAdminPanel', () => {
    closeAdminPanel();
});

// Закрытие по ESC
mp.keys.bind(0x1B, true, () => { // ESC
    if (isAdminPanelOpen) {
        closeAdminPanel();
    }
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
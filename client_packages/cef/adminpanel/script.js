// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let currentTab = 'players';
let selectedPlayerId = null;
let adminData = {
    name: 'Admin',
    level: 1
};
let onlinePlayers = [];
let serverStats = {
    onlinePlayers: 0,
    serverTime: '12:00'
};

// ===== ДАННЫЕ ТРАНСПОРТА =====
const vehicles = {
    super: [
        { name: 'Adder', model: 'adder' },
        { name: 'Banshee 900R', model: 'banshee2' },
        { name: 'Bullet', model: 'bullet' },
        { name: 'Cheetah', model: 'cheetah' },
        { name: 'Entity XF', model: 'entityxf' },
        { name: 'Infernus', model: 'infernus' },
        { name: 'Osiris', model: 'osiris' },
        { name: 'T20', model: 't20' },
        { name: 'Turismo R', model: 'turismor' },
        { name: 'Tyrus', model: 'tyrus' },
        { name: 'Zentorno', model: 'zentorno' },
        { name: 'Vagner', model: 'vagner' }
    ],
    sports: [
        { name: 'Alpha', model: 'alpha' },
        { name: 'Banshee', model: 'banshee' },
        { name: 'Carbonizzare', model: 'carbonizzare' },
        { name: 'Comet', model: 'comet2' },
        { name: 'Coquette', model: 'coquette' },
        { name: 'Elegy RH8', model: 'elegy2' },
        { name: 'Feltzer', model: 'feltzer2' },
        { name: 'Furore GT', model: 'furoregt' },
        { name: 'Jester', model: 'jester' },
        { name: 'Massacro', model: 'massacro' },
        { name: 'Penumbra', model: 'penumbra' },
        { name: 'Rapid GT', model: 'rapidgt' }
    ],
    suvs: [
        { name: 'Baller', model: 'baller' },
        { name: 'Cavalcade', model: 'cavalcade' },
        { name: 'Dubsta', model: 'dubsta' },
        { name: 'FQ 2', model: 'fq2' },
        { name: 'Granger', model: 'granger' },
        { name: 'Gresley', model: 'gresley' },
        { name: 'Huntley S', model: 'huntley' },
        { name: 'Landstalker', model: 'landstalker' },
        { name: 'Mesa', model: 'mesa' },
        { name: 'Patriot', model: 'patriot' },
        { name: 'Radius', model: 'radius' },
        { name: 'Rocoto', model: 'rocoto' }
    ],
    motorcycles: [
        { name: 'Akuma', model: 'akuma' },
        { name: 'Bagger', model: 'bagger' },
        { name: 'Bati 801', model: 'bati' },
        { name: 'Carbon RS', model: 'carbonrs' },
        { name: 'Chieftain', model: 'chieftain' },
        { name: 'Cliffhanger', model: 'cliffhanger' },
        { name: 'Daemon', model: 'daemon' },
        { name: 'Double T', model: 'double' },
        { name: 'Hakuchou', model: 'hakuchou' },
        { name: 'Hexer', model: 'hexer' },
        { name: 'Innovation', model: 'innovation' },
        { name: 'Lectro', model: 'lectro' }
    ],
    helicopters: [
        { name: 'Buzzard', model: 'buzzard2' },
        { name: 'Frogger', model: 'frogger' },
        { name: 'Havok', model: 'havok' },
        { name: 'Maverick', model: 'maverick' },
        { name: 'Seasparrow', model: 'seasparrow' },
        { name: 'SuperVolito', model: 'supervolito' },
        { name: 'Swift', model: 'swift' },
        { name: 'Valkyrie', model: 'valkyrie' },
        { name: 'Volatus', model: 'volatus' }
    ],
    planes: [
        { name: 'Alpha Z1', model: 'alphaz1' },
        { name: 'Besra', model: 'besra' },
        { name: 'Cuban 800', model: 'cuban800' },
        { name: 'Dodo', model: 'dodo' },
        { name: 'Duster', model: 'duster' },
        { name: 'Hydra', model: 'hydra' },
        { name: 'Lazer', model: 'lazer' },
        { name: 'Luxor', model: 'luxor' },
        { name: 'Mammatus', model: 'mammatus' },
        { name: 'Velum', model: 'velum' }
    ]
};

// ===== ЛОКАЦИИ ДЛЯ ТЕЛЕПОРТА =====
const locations = [
    { name: 'Мэрия', icon: '🏛️', x: -545.0, y: -204.0, z: 38.0 },
    { name: 'Больница', icon: '🏥', x: 301.0, y: -584.0, z: 43.0 },
    { name: 'Полиция', icon: '👮', x: 425.0, y: -979.0, z: 30.0 },
    { name: 'Аэропорт', icon: '✈️', x: -1037.0, y: -2738.0, z: 20.0 },
    { name: 'Казино', icon: '🎰', x: 925.0, y: 47.0, z: 81.0 },
    { name: 'Винвуд', icon: '🌆', x: -258.0, y: -965.0, z: 31.0 },
    { name: 'Grove Street', icon: '🏠', x: -55.0, y: -1835.0, z: 26.0 },
    { name: 'Пирс', icon: '🎡', x: -1649.0, y: -1071.0, z: 13.0 },
    { name: 'Военная база', icon: '⚔️', x: -2360.0, y: 3249.0, z: 32.0 },
    { name: 'Маунт Чи��иад', icon: '⛰️', x: 501.0, y: 5604.0, z: 797.0 }
];

// ===== ИНИЦИАЛИЗАЦИЯ =====
window.addEventListener('DOMContentLoaded', () => {
    console.log('[Admin Panel] Инициализация...');
    
    setupEventListeners();
    setupTabs();
    loadVehicles('super');
    loadLocations();
    updateTimeDisplay();
    
    console.log('[Admin Panel] ✅ Инициализация завершена');
});

// ===== НАСТРОЙКА ОБРАБОТЧИКОВ =====
function setupEventListeners() {
    // Закрытие панели
    const closeBtn = document.getElementById('closeBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            closeAdminPanel();
        });
    }
    
    // Поиск игроков
    const playerSearch = document.getElementById('playerSearch');
    if (playerSearch) {
        playerSearch.addEventListener('input', (e) => {
            filterPlayers(e.target.value);
        });
    }
    
    // Категории транспорта
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const category = e.currentTarget.getAttribute('data-category');
            
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            loadVehicles(category);
        });
    });
    
    // Погода
    document.querySelectorAll('.weather-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const weather = e.currentTarget.getAttribute('data-weather');
            setWeather(weather);
        });
    });
    
    // Время суток
    const timeSlider = document.getElementById('timeSlider');
    if (timeSlider) {
        timeSlider.addEventListener('input', (e) => {
            const hour = parseInt(e.target.value);
            const timeDisplay = document.getElementById('timeDisplay');
            if (timeDisplay) {
                timeDisplay.textContent = `${hour.toString().padStart(2, '0')}:00`;
            }
        });
    }
    
    const setTimeBtn = document.getElementById('setTimeBtn');
    if (setTimeBtn && timeSlider) {
        setTimeBtn.addEventListener('click', () => {
            const hour = parseInt(timeSlider.value);
            setTime(hour);
        });
    }
    
    // Телепорт по координатам
    const tpCoordBtn = document.getElementById('tpCoordBtn');
    if (tpCoordBtn) {
        tpCoordBtn.addEventListener('click', () => {
            const x = parseFloat(document.getElementById('tpX').value);
            const y = parseFloat(document.getElementById('tpY').value);
            const z = parseFloat(document.getElementById('tpZ').value);
            
            if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                teleportToCoords(x, y, z);
            } else {
                showNotification('error', 'Введите корректные координаты!');
            }
        });
    }
    
    // Деньги
    const giveMoneyBtn = document.getElementById('giveMoneyBtn');
    if (giveMoneyBtn) {
        giveMoneyBtn.addEventListener('click', () => {
            const playerId = parseInt(document.getElementById('moneyPlayerId').value);
            const amount = parseInt(document.getElementById('moneyAmount').value);
            const type = document.getElementById('moneyType').value;
            
            if (!isNaN(playerId) && !isNaN(amount) && amount > 0) {
                giveMoney(playerId, amount, type);
            } else {
                showNotification('error', 'Введите корректные данные!');
            }
        });
    }
    
    const takeMoneyBtn = document.getElementById('takeMoneyBtn');
    if (takeMoneyBtn) {
        takeMoneyBtn.addEventListener('click', () => {
            const playerId = parseInt(document.getElementById('moneyPlayerId').value);
            const amount = parseInt(document.getElementById('moneyAmount').value);
            const type = document.getElementById('moneyType').value;
            
            if (!isNaN(playerId) && !isNaN(amount) && amount > 0) {
                takeMoney(playerId, amount, type);
            } else {
                showNotification('error', 'Введите корректные данные!');
            }
        });
    }
    
    // Объявление
    const sendAnnouncementBtn = document.getElementById('sendAnnouncementBtn');
    const announcementText = document.getElementById('announcementText');
    if (sendAnnouncementBtn && announcementText) {
        sendAnnouncementBtn.addEventListener('click', () => {
            const text = announcementText.value.trim();
            
            if (text.length > 0) {
                sendAnnouncement(text);
                announcementText.value = '';
            } else {
                showNotification('error', 'Введите текст объявления!');
            }
        });
    }
    
    // Обновление логов
    const refreshLogsBtn = document.getElementById('refreshLogsBtn');
    if (refreshLogsBtn) {
        refreshLogsBtn.addEventListener('click', () => {
            loadLogs();
        });
    }
    
    // Закрытие модального окна
    const modalClose = document.getElementById('modalClose');
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            closeModal();
        });
    }
}

// ===== ВКЛАДКИ =====
function setupTabs() {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const tab = e.currentTarget.getAttribute('data-tab');
            switchTab(tab);
        });
    });
}

function switchTab(tabName) {
    currentTab = tabName;
    
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeItem = document.querySelector(`.menu-item[data-tab="${tabName}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    const activeContent = document.getElementById(`tab-${tabName}`);
    if (activeContent) {
        activeContent.classList.add('active');
    }
    
    console.log('[Admin Panel] Переключено на вкладку:', tabName);
}

// ===== ЗАГРУЗКА ИГРОКОВ =====
function loadPlayers(playersJson) {
    try {
        console.log('[Admin Panel] Загрузка игроков, данные:', playersJson);
        
        const players = typeof playersJson === 'string' ? JSON.parse(playersJson) : playersJson;
        onlinePlayers = players;
        
        const grid = document.getElementById('playersGrid');
        if (!grid) {
            console.error('[Admin Panel] playersGrid не найден!');
            return;
        }
        
        grid.innerHTML = '';
        
        if (players.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: rgba(255,255,255,0.5);">Нет игроков онлайн</div>';
            return;
        }
        
        console.log('[Admin Panel] Создание карточек для', players.length, 'игроков');
        
        players.forEach(player => {
            const card = createPlayerCard(player);
            grid.appendChild(card);
        });
        
        console.log('[Admin Panel] ✅ Карточки игроков созданы');
        updateServerStats();
        
    } catch (err) {
        console.error('[Admin Panel] ❌ Ошибка загрузки игроков:', err);
    }
}

function createPlayerCard(player) {
    console.log('[Admin Panel] Создание карточки для игрока:', player.name, 'ID:', player.id);
    
    const card = document.createElement('div');
    card.className = 'player-card';
    
    let statusClass = 'online';
    let statusText = 'В игре';
    
    if (player.afk) {
        statusClass = 'afk';
        statusText = 'AFK';
    }
    
    card.innerHTML = `
        <div class="player-header">
            <div class="player-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="player-info">
                <div class="player-name">${player.name || 'Неизвестно'}</div>
                <div class="player-id">ID: ${player.id}</div>
                <div class="player-status ${statusClass}">${statusText}</div>
            </div>
        </div>
        <div class="player-details">
            <div class="detail-item">
                <i class="fas fa-coins"></i>
                <span>$${player.money ? player.money.toLocaleString() : '0'}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-signal"></i>
                <span>${player.ping || 0}ms</span>
            </div>
            ${player.level ? `
            <div class="detail-item">
                <i class="fas fa-star"></i>
                <span>Level ${player.level}</span>
            </div>
            ` : ''}
        </div>
    `;
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'player-actions';
    
    // Функция-помощник для создания кнопок
    const createButton = (icon, title, className, callback) => {
        const btn = document.createElement('button');
        btn.className = `btn-action ${className}`;
        btn.innerHTML = `<i class="fas ${icon}"></i>`;
        btn.title = title;
        btn.onclick = (e) => {
            e.stopPropagation();
            console.log('[Admin Panel] Клик по кнопке:', title, 'для игрока:', player.id);
            callback();
        };
        return btn;
    };
    
    // Кик
    actionsDiv.appendChild(createButton('fa-shoe-prints', 'Кикнуть', 'btn-warning', () => {
        const reason = prompt('Причина кика:');
        if (reason) {
            kickPlayer(player.id, reason);
        }
    }));
    
    // Бан
    actionsDiv.appendChild(createButton('fa-ban', 'Забанить', 'btn-danger', () => {
        const reason = prompt('Причина бана:');
        if (!reason) return;
        const days = prompt('Количество дней (0 = навсегда):', '7');
        if (days !== null) {
            banPlayer(player.id, reason, parseInt(days));
        }
    }));
    
    // ТП к игроку
    actionsDiv.appendChild(createButton('fa-location-arrow', 'Телепорт к игроку', 'btn-info', () => {
        teleportToPlayer(player.id);
    }));
    
    // ТП к себе
    actionsDiv.appendChild(createButton('fa-person-arrow-down-to-line', 'Телепорт к себе', 'btn-primary', () => {
        teleportPlayerToMe(player.id);
    }));
    
    // Слежка
    actionsDiv.appendChild(createButton('fa-eye', 'Слежка', 'btn-info', () => {
        spectatePlayer(player.id);
    }));
    
    // Оружие - МОДАЛЬНОЕ ОКНО (БЕЗ PROMPT)
    actionsDiv.appendChild(createButton('fa-gun', 'Выдать оружие', 'btn-warning', () => {
        openWeaponModal(player.id);
    }));
    
    // Очистка инвентаря
    actionsDiv.appendChild(createButton('fa-trash', 'Очистить инвентарь', 'btn-danger', () => {
        if (confirm('Вы уверены что хотите очистить инвентарь игрока?')) {
            clearPlayerInventory(player.id);
        }
    }));
    
    // Ремонт
    actionsDiv.appendChild(createButton('fa-wrench', 'Ремонт машины', 'btn-success', () => {
        repairPlayerVehicle(player.id);
    }));
    
    // Заправка
    actionsDiv.appendChild(createButton('fa-gas-pump', 'Заправить', 'btn-primary', () => {
        refuelPlayerVehicle(player.id);
    }));
    
    // Заморозка - БЕЗ CONFIRM
    actionsDiv.appendChild(createButton('fa-snowflake', 'Заморозить', 'btn-warning', () => {
        freezePlayer(player.id);
    }));
    
    card.appendChild(actionsDiv);
    
    return card;
}

function filterPlayers(searchTerm) {
    const term = searchTerm.toLowerCase();
    
    document.querySelectorAll('.player-card').forEach(card => {
        const nameEl = card.querySelector('.player-name');
        const idEl = card.querySelector('.player-id');
        
        if (nameEl && idEl) {
            const name = nameEl.textContent.toLowerCase();
            const id = idEl.textContent;
            
            if (name.includes(term) || id.includes(term)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        }
    });
}

// ===== МОДАЛЬНОЕ ОКНО ИГРОКА =====
function openPlayerModal(player) {
    selectedPlayerId = player.id;
    
    const modalPlayerName = document.getElementById('modalPlayerName');
    const playerModal = document.getElementById('playerModal');
    
    if (modalPlayerName) {
        modalPlayerName.textContent = player.name;
    }
    if (playerModal) {
        playerModal.classList.add('show');
    }
    
    console.log('[Admin Panel] Открыто модальное окно игрока:', player.id);
}

function closeModal() {
    const playerModal = document.getElementById('playerModal');
    if (playerModal) {
        playerModal.classList.remove('show');
    }
    selectedPlayerId = null;
}

// ===== ДЕЙСТВИЯ С ИГРОКАМИ =====
function kickPlayer(playerId, reason) {
    console.log('[Admin Panel] Кик игрока:', playerId, reason);
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:adminAction', 'kick', playerId, reason);
    }
    
    showNotification('success', `Игрок #${playerId} кикнут`);
}

function banPlayer(playerId, reason, days) {
    console.log('[Admin Panel] Бан игрока:', playerId, reason, days);
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:adminAction', 'ban', playerId, reason, days);
    }
    
    showNotification('success', `Игрок #${playerId} забанен`);
}

function teleportToPlayer(playerId) {
    console.log('[Admin Panel] Телепорт к игроку:', playerId);
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:adminAction', 'tpto', playerId);
    }
    
    showNotification('success', `Телепорт к игроку #${playerId}`);
}

function teleportPlayerToMe(playerId) {
    console.log('[Admin Panel] Телепорт игрока к себе:', playerId);
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:adminAction', 'tphere', playerId);
    }
    
    showNotification('success', `Игрок #${playerId} телепортирован к вам`);
}

function freezePlayer(playerId) {
    console.log('[Admin Panel] Заморозка игрока:', playerId);
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:adminAction', 'freeze', playerId);
    }
    
    showNotification('success', `Игрок #${playerId} заморожен/разморожен`);
}

// ===== ТРАНСПОРТ =====
function loadVehicles(category) {
    console.log('[Admin Panel] Загрузка категории транспорта:', category);
    
    const grid = document.getElementById('vehiclesGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    const vehicleList = vehicles[category] || [];
    
    vehicleList.forEach(vehicle => {
        const card = createVehicleCard(vehicle);
        grid.appendChild(card);
    });
}

function createVehicleCard(vehicle) {
    const card = document.createElement('div');
    card.className = 'vehicle-card';
    
    card.innerHTML = `
        <div class="vehicle-icon">
            <i class="fas fa-car"></i>
        </div>
        <div class="vehicle-name">${vehicle.name}</div>
    `;
    
    card.addEventListener('click', () => {
        spawnVehicle(vehicle.model);
    });
    
    return card;
}

function spawnVehicle(model) {
    console.log('[Admin Panel] Спавн транспорта:', model);
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:spawnVehicle', model);
    }
    
    showNotification('success', `Транспорт ${model} заспавнен!`);
}

// ===== ЛОКАЦИИ =====
function loadLocations() {
    const grid = document.getElementById('locationsGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    locations.forEach(location => {
        const card = createLocationCard(location);
        grid.appendChild(card);
    });
}

function createLocationCard(location) {
    const card = document.createElement('div');
    card.className = 'location-card';
    
    card.innerHTML = `
        <div class="location-icon">${location.icon}</div>
        <div class="location-name">${location.name}</div>
        <div class="location-coords">X: ${location.x.toFixed(1)}, Y: ${location.y.toFixed(1)}, Z: ${location.z.toFixed(1)}</div>
    `;
    
    card.addEventListener('click', () => {
        teleportToLocation(location);
    });
    
    return card;
}

function teleportToLocation(location) {
    console.log('[Admin Panel] Телепорт в:', location.name);
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:teleport', location.x, location.y, location.z);
    }
    
    showNotification('success', `Телепортация в ${location.name}!`);
}

function teleportToCoords(x, y, z) {
    console.log('[Admin Panel] Телепорт по координатам:', x, y, z);
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:teleport', x, y, z);
    }
    
    showNotification('success', 'Телепортация выполнена!');
}

// ===== МИР =====
function setWeather(weather) {
    console.log('[Admin Panel] Установка погоды:', weather);
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:setWeather', weather);
    }
    
    showNotification('success', `Погода изменена на ${weather}!`);
}

function setTime(hour) {
    console.log('[Admin Panel] Установка времени:', hour);
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:setTime', hour, 0);
    }
    
    showNotification('success', `Время установлено: ${hour}:00!`);
}

function sendAnnouncement(text) {
    console.log('[Admin Panel] Отправка объявления:', text);
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:sendAnnouncement', text);
    }
    
    showNotification('success', 'Объявление отправлено всем игрокам!');
}

// ===== ЭКОНОМИКА =====
function giveMoney(playerId, amount, type) {
    console.log('[Admin Panel] Выдача денег:', playerId, amount, type);
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:giveMoney', playerId, amount, type);
    }
    
    showNotification('success', `Выдано $${amount.toLocaleString()} игроку #${playerId}!`);
}

function takeMoney(playerId, amount, type) {
    console.log('[Admin Panel] Снятие денег:', playerId, amount, type);
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:takeMoney', playerId, amount, type);
    }
    
    showNotification('success', `Снято $${amount.toLocaleString()} у игрока #${playerId}!`);
}

function updateEconomyStats(stats) {
    const totalMoney = document.getElementById('totalMoney');
    const totalBank = document.getElementById('totalBank');
    const totalCash = document.getElementById('totalCash');
    
    if (totalMoney) totalMoney.textContent = `$${(stats.totalMoney || 0).toLocaleString()}`;
    if (totalBank) totalBank.textContent = `$${(stats.totalBank || 0).toLocaleString()}`;
    if (totalCash) totalCash.textContent = `$${(stats.totalCash || 0).toLocaleString()}`;
}

// ===== ЛОГИ =====
function loadLogs() {
    console.log('[Admin Panel] Загрузка логов...');
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:loadLogs');
    }
}

function displayLogs(logsJson) {
    try {
        const logs = typeof logsJson === 'string' ? JSON.parse(logsJson) : logsJson;
        
        const container = document.getElementById('logsContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (logs.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 50px; color: rgba(255,255,255,0.5);">Логи отсутствуют</div>';
            return;
        }
        
        logs.forEach(log => {
            const item = document.createElement('div');
            item.className = 'log-item';
            
            item.innerHTML = `
                <div class="log-time">${log.time}</div>
                <div class="log-action">${log.action}</div>
                <div class="log-details">${log.details}</div>
            `;
            
            container.appendChild(item);
        });
    } catch (err) {
        console.error('[Admin Panel] Ошибка отображения логов:', err);
    }
}

// ===== ОБНОВЛЕНИЕ ДАННЫХ =====
function updateAdminInfo(data) {
    adminData = data;
    
    const adminName = document.getElementById('adminName');
    const adminLevel = document.getElementById('adminLevel');
    
    if (adminName) adminName.textContent = data.name;
    if (adminLevel) adminLevel.textContent = `Level ${data.level}`;
    
    console.log('[Admin Panel] Данные админа обновлены:', data);
}

function updateServerStats() {
    serverStats.onlinePlayers = onlinePlayers.length;
    
    const onlinePlayersEl = document.getElementById('onlinePlayers');
    if (onlinePlayersEl) {
        onlinePlayersEl.textContent = serverStats.onlinePlayers;
    }
}

function updateTimeDisplay() {
    setInterval(() => {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        
        const serverTime = document.getElementById('serverTime');
        if (serverTime) {
            serverTime.textContent = `${hours}:${minutes}`;
        }
    }, 1000);
}

// ===== УВЕДОМЛЕНИЯ =====
function showNotification(type, message) {
    const container = document.getElementById('notifications');
    if (!container) {
        console.log('[Admin Panel] Уведомление:', type, message);
        return;
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'notificationSlideOut 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
    
    console.log('[Admin Panel] Уведомление:', type, message);
}

// ===== ЗАКРЫТИЕ ПАНЕЛИ =====
function closeAdminPanel() {
    console.log('[Admin Panel] Закрытие панели');
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:closeAdminPanel');
    }
}

// ===== РАСШИРЕННЫЕ ФУНКЦИИ =====

function spectatePlayer(playerId) {
    console.log('[Admin Panel] Слежка за игроком:', playerId);
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:startSpectate', playerId);
    }
    
    showNotification('info', 'Слежка активирована');
}

function stopSpectate() {
    console.log('[Admin Panel] Остановка слежки');
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:stopSpectate');
    }
    
    showNotification('success', 'Слежка остановлена');
}

function toggleInvisible() {
    console.log('[Admin Panel] Переключение невидимости');
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:toggleInvisible');
    }
    
    showNotification('info', 'Невидимость переключена');
}

function toggleGodMode() {
    console.log('[Admin Panel] Переключение бессмертия');
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:toggleGodMode');
    }
    
    showNotification('info', 'Бессмертие переключено');
}

function toggleNoclip() {
    console.log('[Admin Panel] Переключение noclip');
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:toggleNoclip');
    }
    
    showNotification('info', 'Noclip переключен');
}

function loadTeleportHistory() {
    console.log('[Admin Panel] Загрузка истории телепортов');
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:loadTeleportHistory');
    }
}

function displayTeleportHistory(historyJson) {
    try {
        const history = typeof historyJson === 'string' ? JSON.parse(historyJson) : historyJson;
        
        const container = document.getElementById('teleportHistoryList');
        if (!container) {
            console.error('[Admin Panel] Контейнер teleportHistoryList не найден!');
            return;
        }
        
        container.innerHTML = '';
        
        if (history.length === 0) {
            container.innerHTML = '<div class="empty-message">История пуста</div>';
            return;
        }
        
        history.forEach(tp => {
            const item = document.createElement('div');
            item.className = 'history-item';
            
            const date = new Date(tp.created_at);
            const timeStr = date.toLocaleString('ru-RU');
            
            let typeStr = '';
            switch(tp.teleport_type) {
                case 'self': typeStr = 'К себе'; break;
                case 'player': typeStr = 'К игроку'; break;
                case 'to_player': typeStr = 'Игрока к себе'; break;
            }
            
            item.innerHTML = `
                <div class="history-header">
                    <span class="history-type">${typeStr}</span>
                    <span class="history-time">${timeStr}</span>
                </div>
                <div class="history-details">
                    ${tp.target_name ? `<span>Цель: ${tp.target_name}</span>` : ''}
                    <span>От: ${tp.from_x.toFixed(1)}, ${tp.from_y.toFixed(1)}, ${tp.from_z.toFixed(1)}</span>
                    <span>До: ${tp.to_x.toFixed(1)}, ${tp.to_y.toFixed(1)}, ${tp.to_z.toFixed(1)}</span>
                </div>
            `;
            
            container.appendChild(item);
        });
        
        console.log('[Admin Panel] История телепортов загружена:', history.length);
    } catch (err) {
        console.error('[Admin Panel] Ошибка загрузки истории:', err);
    }
}

function loadBannedList() {
    console.log('[Admin Panel] Загрузка списка банов');
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:loadBannedList');
    }
}

function displayBannedList(bansJson) {
    try {
        const bans = typeof bansJson === 'string' ? JSON.parse(bansJson) : bansJson;
        
        const container = document.getElementById('bannedPlayersList');
        if (!container) {
            console.error('[Admin Panel] Контейнер bannedPlayersList не найден!');
            return;
        }
        
        container.innerHTML = '';
        
        if (bans.length === 0) {
            container.innerHTML = '<div class="empty-message">Нет активных банов</div>';
            return;
        }
        
        bans.forEach(ban => {
            const item = document.createElement('div');
            item.className = 'ban-item';
            
            const bannedDate = new Date(ban.created_at);
            const expiresDate = ban.expires_at ? new Date(ban.expires_at) : null;
            
            const isPermanent = !expiresDate || expiresDate.getFullYear() > 2100;
            
            item.innerHTML = `
                <div class="ban-header">
                    <span class="ban-player">${ban.login || 'Неизвестно'}</span>
                    <span class="ban-duration ${isPermanent ? 'permanent' : 'temporary'}">
                        ${isPermanent ? 'Permanent' : 'До ' + expiresDate.toLocaleDateString('ru-RU')}
                    </span>
                </div>
                <div class="ban-reason">${ban.reason || 'Не указана'}</div>
                <div class="ban-info">
                    <span>Админ: ${ban.admin_name || 'Система'}</span>
                    <span>Дата: ${bannedDate.toLocaleDateString('ru-RU')}</span>
                </div>
                <button class="btn-action btn-success" onclick="unbanPlayer(${ban.id}, '${ban.login || 'Unknown'}')">
                    <i class="fas fa-unlock"></i> Разбанить
                </button>
            `;
            
            container.appendChild(item);
        });
        
        console.log('[Admin Panel] Список банов загружен:', bans.length);
    } catch (err) {
        console.error('[Admin Panel] Ошибка загрузки банов:', err);
    }
}

function unbanPlayer(banId, login) {
    const reason = prompt(`Причина разбана для ${login}:`);
    
    if (!reason) return;
    
    console.log('[Admin Panel] Разбан:', banId, reason);
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:unbanPlayer', banId, reason);
    }
    
    showNotification('success', `Игрок ${login} разбанен`);
    
    setTimeout(() => {
        loadBannedList();
    }, 500);
}

function clearPlayerInventory(playerId) {
    console.log('[Admin Panel] Очистка инвентаря:', playerId);
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:clearInventory', playerId);
    }
    
    showNotification('success', 'Инвентарь очищен');
}

function deleteAllVehicles() {
    if (!confirm('Удалить ВСЕ машины на сервере?')) return;
    
    console.log('[Admin Panel] Удаление всех машин');
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:deleteAllVehicles');
    }
    
    showNotification('success', 'Все машины удалены');
}

function repairPlayerVehicle(playerId) {
    console.log('[Admin Panel] Ремонт машины:', playerId);
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:repairVehicle', playerId);
    }
    
    showNotification('success', 'Машина отремонтирована');
}

function refuelPlayerVehicle(playerId) {
    console.log('[Admin Panel] Заправка машины:', playerId);
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:refuelVehicle', playerId);
    }
    
    showNotification('success', 'Машина заправлена');
}

function loadOnlineStats() {
    console.log('[Admin Panel] Загрузка статистики онлайна');
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:loadOnlineStats');
    }
}

function displayOnlineStats(statsJson) {
    try {
        const stats = typeof statsJson === 'string' ? JSON.parse(statsJson) : statsJson;
        console.log('[Admin Panel] Получена статистика:', stats.length, 'записей');
        
        const container = document.getElementById('onlineStatsChart');
        if (!container) {
            console.error('[Admin Panel] Контейнер onlineStatsChart не найден!');
            return;
        }
        
        container.innerHTML = '';
        
        if (stats.length === 0) {
            container.innerHTML = '<div class="empty-message">Нет данных. Статистика будет накапливаться автоматически.</div>';
            return;
        }
        
        const dayStats = {};
        
        stats.forEach(stat => {
            if (!dayStats[stat.date]) {
                dayStats[stat.date] = {
                    date: stat.date,
                    maxPlayers: 0,
                    avgPlayers: 0,
                    count: 0,
                    total: 0
                };
            }
            
            dayStats[stat.date].maxPlayers = Math.max(dayStats[stat.date].maxPlayers, stat.players_online);
            dayStats[stat.date].total += stat.players_online;
            dayStats[stat.date].count++;
        });
        
        Object.keys(dayStats).forEach(date => {
            dayStats[date].avgPlayers = Math.round(dayStats[date].total / dayStats[date].count);
        });
        
        Object.values(dayStats).slice(0, 7).reverse().forEach(day => {
            const item = document.createElement('div');
            item.className = 'stats-item';
            
            const dateStr = new Date(day.date).toLocaleDateString('ru-RU', { 
                weekday: 'short', 
                day: 'numeric', 
                month: 'short' 
            });
            
            item.innerHTML = `
                <div class="stats-date">${dateStr}</div>
                <div class="stats-bar-container">
                    <div class="stats-bar" style="width: ${Math.min((day.maxPlayers / 10) * 100, 100)}%">
                        <span class="stats-value">${day.maxPlayers}</span>
                    </div>
                </div>
                <div class="stats-avg">Среднее: ${day.avgPlayers}</div>
            `;
            
            container.appendChild(item);
        });
        
        console.log('[Admin Panel] Статистика онлайна отображена');
    } catch (err) {
        console.error('[Admin Panel] Ошибка отображения статистики:', err);
    }
}

function loadTopPlayers() {
    console.log('[Admin Panel] Загрузка топа игроков');
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:loadTopPlayers');
    }
}

function displayTopPlayers(playersJson) {
    try {
        const players = typeof playersJson === 'string' ? JSON.parse(playersJson) : playersJson;
        console.log('[Admin Panel] Получен топ игроков:', players.length);
        
        const container = document.getElementById('topPlayersList');
        if (!container) {
            console.error('[Admin Panel] Контейнер topPlayersList не найден!');
            return;
        }
        
        container.innerHTML = '';
        
        if (players.length === 0) {
            container.innerHTML = '<div class="empty-message">Нет данных. Статистика будет накапливаться по мере игры.</div>';
            return;
        }
        
        players.forEach((player, index) => {
            const item = document.createElement('div');
            item.className = 'top-player-item';
            
            const hours = Math.floor(player.total_time / 3600);
            const minutes = Math.floor((player.total_time % 3600) / 60);
            
            let rankClass = '';
            if (index === 0) rankClass = 'gold';
            else if (index === 1) rankClass = 'silver';
            else if (index === 2) rankClass = 'bronze';
            
            item.innerHTML = `
                <div class="top-rank ${rankClass}">#${index + 1}</div>
                <div class="top-player-info">
                    <div class="top-player-name">${player.login}</div>
                    ${player.name ? `<div class="top-character-name">${player.name} ${player.surname}</div>` : ''}
                </div>
                <div class="top-player-stats">
                    <div class="top-stat">
                        <i class="fas fa-clock"></i>
                        ${hours}ч ${minutes}м
                    </div>
                    <div class="top-stat">
                        <i class="fas fa-gamepad"></i>
                        ${player.sessions_count} сессий
                    </div>
                </div>
            `;
            
            container.appendChild(item);
        });
        
        console.log('[Admin Panel] Топ игроков отображен');
    } catch (err) {
        console.error('[Admin Panel] Ошибка отображения топа:', err);
    }
}

function loadAdminReports() {
    console.log('[Admin Panel] Загрузка отчётов админов');
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:loadAdminReports');
    }
}

function displayAdminReports(reportsJson) {
    try {
        const reports = typeof reportsJson === 'string' ? JSON.parse(reportsJson) : reportsJson;
        console.log('[Admin Panel] Получены отчёты:', reports.length);
        
        const container = document.getElementById('adminReportsList');
        if (!container) {
            console.error('[Admin Panel] Контейнер adminReportsList не найден!');
            return;
        }
        
        container.innerHTML = '';
        
        if (reports.length === 0) {
            container.innerHTML = '<div class="empty-message">Нет отчётов</div>';
            return;
        }
        
        reports.forEach(report => {
            const item = document.createElement('div');
            item.className = 'report-item';
            
            const date = new Date(report.report_date);
            const dateStr = date.toLocaleDateString('ru-RU');
            
            item.innerHTML = `
                <div class="report-header">
                    <span class="report-admin">${report.admin_name}</span>
                    <span class="report-date">${dateStr}</span>
                </div>
                <div class="report-stats-grid">
                    <div class="report-stat">
                        <i class="fas fa-bolt"></i>
                        <span class="report-stat-value">${report.actions_count}</span>
                        <span class="report-stat-label">Действий</span>
                    </div>
                    <div class="report-stat">
                        <i class="fas fa-ban"></i>
                        <span class="report-stat-value">${report.bans_count}</span>
                        <span class="report-stat-label">Банов</span>
                    </div>
                    <div class="report-stat">
                        <i class="fas fa-shoe-prints"></i>
                        <span class="report-stat-value">${report.kicks_count}</span>
                        <span class="report-stat-label">Киков</span>
                    </div>
                    <div class="report-stat">
                        <i class="fas fa-location-dot"></i>
                        <span class="report-stat-value">${report.teleports_count}</span>
                        <span class="report-stat-label">ТП</span>
                    </div>
                    <div class="report-stat">
                        <i class="fas fa-box"></i>
                        <span class="report-stat-value">${report.items_given}</span>
                        <span class="report-stat-label">Предметов</span>
                    </div>
                    <div class="report-stat">
                        <i class="fas fa-dollar-sign"></i>
                        <span class="report-stat-value">$${report.money_given.toLocaleString()}</span>
                        <span class="report-stat-label">Денег</span>
                    </div>
                </div>
                ${report.notes ? `<div class="report-notes">${report.notes}</div>` : ''}
            `;
            
            container.appendChild(item);
        });
        
        console.log('[Admin Panel] Отчёты отображены');
    } catch (err) {
        console.error('[Admin Panel] Ошибка отображения отчётов:', err);
    }
}

// ===== МОДАЛЬНОЕ ОКНО ВЫБОРА ОРУЖИЯ =====

let currentWeaponTargetId = null;

function openWeaponModal(playerId) {
    console.log('[Weapon Modal] Открытие модального окна для игрока:', playerId);
    currentWeaponTargetId = playerId;
    
    const modal = document.getElementById('weaponModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }
}

function closeWeaponModal() {
    console.log('[Weapon Modal] Закрытие модального окна');
    
    const modal = document.getElementById('weaponModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
    
    currentWeaponTargetId = null;
}

function selectWeapon(weaponHash, ammo) {
    console.log('[Weapon Modal] Выбрано оружие:', weaponHash, 'патронов:', ammo, 'для игрока:', currentWeaponTargetId);
    
    if (currentWeaponTargetId !== null) {
        if (typeof mp !== 'undefined') {
            mp.trigger('cef:giveWeapon', currentWeaponTargetId, weaponHash, ammo);
        }
        
        showNotification('success', `Оружие ${weaponHash} выдано`);
    }
    
    closeWeaponModal();
}

// Закрытие по клику вне модального окна
document.addEventListener('click', (e) => {
    const modal = document.getElementById('weaponModal');
    if (modal && e.target === modal) {
        closeWeaponModal();
    }
});

// ===== СИСТЕМА ПРЕДМЕТОВ =====
let currentCategory = null;
let allPlayers = [];

function loadItemsSection() {
    mp.trigger('cef:getItemCategories');
}

function displayItemCategories(categoriesJson) {
    try {
        const categories = JSON.parse(categoriesJson);
        const container = document.getElementById('itemCategories');
        
        container.innerHTML = categories.map(cat => `
            <div class="category-card" onclick="loadCategory('${cat.id}')">
                <div class="icon">${cat.icon}</div>
                <div class="name">${cat.name}</div>
                <div class="count">${cat.count} предметов</div>
            </div>
        `).join('');
        
        document.getElementById('categoryItemsContainer').style.display = 'none';
        document.getElementById('itemCategories').style.display = 'grid';
        document.getElementById('searchResults').style.display = 'none';
    } catch (err) {
        console.error('Ошибка:', err);
    }
}

function loadCategory(categoryId) {
    currentCategory = categoryId;
    mp.trigger('cef:getCategoryItems', categoryId);
}

function displayCategoryItems(itemsJson, categoryId) {
    try {
        const items = JSON.parse(itemsJson);
        const container = document.getElementById('categoryItems');
        
        container.innerHTML = items.map(item => `
            <div class="item-card" onclick="openSpawnModal('${item.id}', '${item.name.replace(/'/g, "\\'")}')">
                <div class="item-name">${item.name}</div>
                <div class="item-info">
                    Вес: ${item.weight} кг | Стак: ${item.maxStack}
                </div>
            </div>
        `).join('');
        
        document.getElementById('categoryTitle').textContent = items.length > 0 ? 
            `Категория: ${items.length} предметов` : 'Пустая категория';
        
        document.getElementById('itemCategories').style.display = 'none';
        document.getElementById('categoryItemsContainer').style.display = 'block';
        document.getElementById('searchResults').style.display = 'none';
    } catch (err) {
        console.error('Ошибка:', err);
    }
}

function showCategories() {
    document.getElementById('categoryItemsContainer').style.display = 'none';
    document.getElementById('itemCategories').style.display = 'grid';
    document.getElementById('searchResults').style.display = 'none';
    currentCategory = null;
}

function searchItems(query) {
    if (query.length < 2) {
        showCategories();
        return;
    }
    
    mp.trigger('cef:searchItems', query);
}

function displaySearchResults(resultsJson) {
    try {
        const results = JSON.parse(resultsJson);
        const container = document.getElementById('searchResults');
        
        if (results.length === 0) {
            container.innerHTML = '<div class="no-results">Ничего не найдено</div>';
        } else {
            container.innerHTML = results.map(item => `
                <div class="item-card" onclick="openSpawnModal('${item.id}', '${item.name.replace(/'/g, "\\'")}')">
                    <div class="item-name">${item.name}</div>
                    <div class="item-info">
                        Вес: ${item.weight} кг | Стак: ${item.maxStack}
                    </div>
                    <div class="item-category">${item.categoryName}</div>
                </div>
            `).join('');
        }
        
        document.getElementById('itemCategories').style.display = 'none';
        document.getElementById('categoryItemsContainer').style.display = 'none';
        container.style.display = 'grid';
    } catch (err) {
        console.error('Ошибка:', err);
    }
}

function openSpawnModal(itemId, itemName) {
    document.getElementById('spawnItemId').value = itemId;
    document.getElementById('spawnItemName').textContent = `Спавн: ${itemName}`;
    document.getElementById('spawnQuantity').value = 1;
    
    // Заполняем список игроков
    const select = document.getElementById('spawnTarget');
    select.innerHTML = '<option value="">Себе</option>';
    
    if (allPlayers && allPlayers.length > 0) {
        allPlayers.forEach(p => {
            select.innerHTML += `<option value="${p.id}">${p.name} (ID: ${p.id})</option>`;
        });
    }
    
    document.getElementById('spawnModal').style.display = 'flex';
}

function closeSpawnModal() {
    document.getElementById('spawnModal').style.display = 'none';
}

function confirmSpawn() {
    const itemId = document.getElementById('spawnItemId').value;
    const quantity = document.getElementById('spawnQuantity').value;
    const targetId = document.getElementById('spawnTarget').value || null;
    
    mp.trigger('cef:spawnItem', itemId, quantity, targetId);
    closeSpawnModal();
}

// Сохраняем список игроков при обновлении
const originalLoadPlayers = window.loadPlayers;
window.loadPlayers = function(playersJson) {
    try {
        allPlayers = JSON.parse(playersJson);
    } catch (e) {}
    if (originalLoadPlayers) originalLoadPlayers(playersJson);
};

console.log('[Admin Panel] ===== СКРИПТ ПОЛНОСТЬЮ ЗАГРУЖЕН =====');
console.log('[Weapon Modal] ✅ Модальное окно оружия загружено');
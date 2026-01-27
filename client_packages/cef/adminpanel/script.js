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
    { name: 'Маунт Чилиад', icon: '⛰️', x: 501.0, y: 5604.0, z: 797.0 }
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
    document.getElementById('closeBtn').addEventListener('click', () => {
        closeAdminPanel();
    });
    
    // Поиск игроков
    document.getElementById('playerSearch').addEventListener('input', (e) => {
        filterPlayers(e.target.value);
    });
    
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
    timeSlider.addEventListener('input', (e) => {
        const hour = parseInt(e.target.value);
        document.getElementById('timeDisplay').textContent = `${hour.toString().padStart(2, '0')}:00`;
    });
    
    document.getElementById('setTimeBtn').addEventListener('click', () => {
        const hour = parseInt(document.getElementById('timeSlider').value);
        setTime(hour);
    });
    
    // Телепорт по координатам
    document.getElementById('tpCoordBtn').addEventListener('click', () => {
        const x = parseFloat(document.getElementById('tpX').value);
        const y = parseFloat(document.getElementById('tpY').value);
        const z = parseFloat(document.getElementById('tpZ').value);
        
        if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
            teleportToCoords(x, y, z);
        } else {
            showNotification('error', 'Введите корректные координаты!');
        }
    });
    
    // Деньги
    document.getElementById('giveMoneyBtn').addEventListener('click', () => {
        const playerId = parseInt(document.getElementById('moneyPlayerId').value);
        const amount = parseInt(document.getElementById('moneyAmount').value);
        const type = document.getElementById('moneyType').value;
        
        if (!isNaN(playerId) && !isNaN(amount) && amount > 0) {
            giveMoney(playerId, amount, type);
        } else {
            showNotification('error', 'Введите корректные данные!');
        }
    });
    
    document.getElementById('takeMoneyBtn').addEventListener('click', () => {
        const playerId = parseInt(document.getElementById('moneyPlayerId').value);
        const amount = parseInt(document.getElementById('moneyAmount').value);
        const type = document.getElementById('moneyType').value;
        
        if (!isNaN(playerId) && !isNaN(amount) && amount > 0) {
            takeMoney(playerId, amount, type);
        } else {
            showNotification('error', 'Введите корректные данные!');
        }
    });
    
    // Объявление
    document.getElementById('sendAnnouncementBtn').addEventListener('click', () => {
        const text = document.getElementById('announcementText').value.trim();
        
        if (text.length > 0) {
            sendAnnouncement(text);
            document.getElementById('announcementText').value = '';
        } else {
            showNotification('error', 'Введите текст объявления!');
        }
    });
    
    // Обновление логов
    document.getElementById('refreshLogsBtn').addEventListener('click', () => {
        loadLogs();
    });
    
    // Закрытие модального окна
    document.getElementById('modalClose').addEventListener('click', () => {
        closeModal();
    });
    
    // Действия с игроком в модалке
    document.querySelectorAll('.player-actions .action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.currentTarget.getAttribute('data-action');
            handlePlayerAction(action, selectedPlayerId);
        });
    });
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
    
    // Обновляем меню
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.menu-item[data-tab="${tabName}"]`).classList.add('active');
    
    // Обновляем контент
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    console.log('[Admin Panel] Переключено на вкладку:', tabName);
}

// ===== ЗАГРУЗКА ИГРОКОВ =====
function loadPlayers(players) {
    console.log('[Admin Panel] Загрузка иг��оков:', players.length);
    
    onlinePlayers = players;
    
    const grid = document.getElementById('playersGrid');
    grid.innerHTML = '';
    
    if (players.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: rgba(255,255,255,0.5);">Нет игроков онлайн</div>';
        return;
    }
    
    players.forEach(player => {
        const card = createPlayerCard(player);
        grid.appendChild(card);
    });
    
    updateServerStats();
}

function createPlayerCard(player) {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.setAttribute('data-player-id', player.id);
    
    card.innerHTML = `
        <div class="player-header">
            <div class="player-id">${player.id}</div>
            <div class="player-status">Online</div>
        </div>
        <div class="player-name">${player.name}</div>
        <div class="player-info">
            <div class="info-row">
                <i class="fas fa-user"></i>
                <span>ID: ${player.id}</span>
            </div>
            <div class="info-row">
                <i class="fas fa-clock"></i>
                <span>Ping: ${player.ping || 0}ms</span>
            </div>
            <div class="info-row">
                <i class="fas fa-dollar-sign"></i>
                <span>$${(player.money || 0).toLocaleString()}</span>
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => {
        openPlayerModal(player);
    });
    
    return card;
}

function filterPlayers(searchTerm) {
    const term = searchTerm.toLowerCase();
    
    document.querySelectorAll('.player-card').forEach(card => {
        const name = card.querySelector('.player-name').textContent.toLowerCase();
        const id = card.querySelector('.player-id').textContent;
        
        if (name.includes(term) || id.includes(term)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// ===== МОДАЛЬНОЕ ОКНО ИГРОКА =====
function openPlayerModal(player) {
    selectedPlayerId = player.id;
    
    document.getElementById('modalPlayerName').textContent = player.name;
    document.getElementById('playerModal').classList.add('show');
    
    console.log('[Admin Panel] Открыто модальное окно игрока:', player.id);
}

function closeModal() {
    document.getElementById('playerModal').classList.remove('show');
    selectedPlayerId = null;
}

// ===== ДЕЙСТВИЯ С ИГРОКОМ =====
function handlePlayerAction(action, playerId) {
    console.log('[Admin Panel] Действие:', action, 'для игрока:', playerId);
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:adminAction', action, playerId);
    }
    
    closeModal();
    
    const actionNames = {
        'teleportTo': 'Телепортация к игроку',
        'teleportHere': 'Телепортация игрока',
        'freeze': 'Заморозка игрока',
        'heal': 'Лечение игрока',
        'kick': 'Кик игрока',
        'ban': 'Бан игрока'
    };
    
    showNotification('success', `${actionNames[action]} выполнено!`);
}

// ===== ТРАНСПОРТ =====
function loadVehicles(category) {
    console.log('[Admin Panel] Загрузка категории транспорта:', category);
    
    const grid = document.getElementById('vehiclesGrid');
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
    document.getElementById('totalMoney').textContent = `$${(stats.totalMoney || 0).toLocaleString()}`;
    document.getElementById('totalBank').textContent = `$${(stats.totalBank || 0).toLocaleString()}`;
    document.getElementById('totalCash').textContent = `$${(stats.totalCash || 0).toLocaleString()}`;
}

// ===== ЛОГИ =====
function loadLogs() {
    console.log('[Admin Panel] Загрузка логов...');
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:loadLogs');
    }
}

function displayLogs(logs) {
    const container = document.getElementById('logsContainer');
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
}

// ===== ОБНОВЛЕНИЕ ДАННЫХ =====
function updateAdminInfo(data) {
    adminData = data;
    
    document.getElementById('adminName').textContent = data.name;
    document.getElementById('adminLevel').textContent = `Level ${data.level}`;
    
    console.log('[Admin Panel] Данные админа обновлены:', data);
}

function updateServerStats() {
    serverStats.onlinePlayers = onlinePlayers.length;
    
    document.getElementById('onlinePlayers').textContent = serverStats.onlinePlayers;
}

function updateTimeDisplay() {
    setInterval(() => {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        
        document.getElementById('serverTime').textContent = `${hours}:${minutes}`;
    }, 1000);
}

// ===== УВЕДОМЛЕНИЯ =====
function showNotification(type, message) {
    const container = document.getElementById('notifications');
    
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

// ===== ДИАЛОГ БАНА =====
let banTargetId = null;

function openBanDialog(targetId, targetName) {
    banTargetId = targetId;
    
    // Создаём диалоговое окно
    const dialog = document.createElement('div');
    dialog.className = 'modal show';
    dialog.id = 'banDialog';
    
    dialog.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Бан игрока: ${targetName}</h3>
                <button class="modal-close" onclick="closeBanDialog()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-size: 14px; color: rgba(255,255,255,0.8);">Причина бана:</label>
                        <textarea id="banReason" placeholder="Введите причину бана..." style="width: 100%; min-height: 100px; padding: 12px; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1); border-radius: 10px; color: white; font-size: 14px; resize: vertical; font-family: 'Segoe UI', sans-serif;"></textarea>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-size: 14px; color: rgba(255,255,255,0.8);">Длительность:</label>
                        <select id="banDuration" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1); border-radius: 10px; color: white; font-size: 14px;">
                            <option value="60">1 час</option>
                            <option value="180">3 часа</option>
                            <option value="360">6 часов</option>
                            <option value="720">12 часов</option>
                            <option value="1440">1 день</option>
                            <option value="4320">3 дня</option>
                            <option value="10080">7 дней</option>
                            <option value="43200">30 дней</option>
                            <option value="0">Навсегда</option>
                        </select>
                    </div>
                    <button class="action-btn danger" onclick="confirmBan()" style="width: 100%; justify-content: center;">
                        <i class="fas fa-ban"></i> Забанить
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
}

function closeBanDialog() {
    const dialog = document.getElementById('banDialog');
    if (dialog) {
        dialog.remove();
    }
    banTargetId = null;
}

function confirmBan() {
    const reason = document.getElementById('banReason').value.trim();
    const duration = parseInt(document.getElementById('banDuration').value);
    
    if (reason.length < 3) {
        showNotification('error', 'Причина бана должна содержать минимум 3 символа!');
        return;
    }
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:banPlayer', banTargetId, reason, duration);
    }
    
    closeBanDialog();
    showNotification('success', 'Команда на бан отправлена!');
}

console.log('[Admin Panel] ===== СКРИПТ ЗАГРУЖЕН =====');
// ===== HUD SCRIPT =====

// ===== ОБНОВЛЕНИЕ СТАТУС БАРОВ =====
function updateHealth(value) {
    const bar = document.getElementById('healthBar');
    const text = document.getElementById('healthValue');
    
    value = Math.max(0, Math.min(100, value));
    bar.style.width = value + '%';
    text.textContent = Math.round(value);
    
    if (value <= 25) {
        bar.classList.add('critical');
    } else {
        bar.classList.remove('critical');
    }
}

function updateArmor(value) {
    const container = document.getElementById('armorContainer');
    const bar = document.getElementById('armorBar');
    const text = document.getElementById('armorValue');
    
    value = Math.max(0, Math.min(100, value));
    bar.style.width = value + '%';
    text.textContent = Math.round(value);
    
    // Скрываем если брони нет
    if (value <= 0) {
        container.classList.add('hidden');
    } else {
        container.classList.remove('hidden');
    }
}

function updateHunger(value) {
    const bar = document.getElementById('hungerBar');
    const text = document.getElementById('hungerValue');
    
    value = Math.max(0, Math.min(100, value));
    bar.style.width = value + '%';
    text.textContent = Math.round(value);
    
    if (value <= 25) {
        bar.classList.add('critical');
    } else {
        bar.classList.remove('critical');
    }
}

function updateThirst(value) {
    const bar = document.getElementById('thirstBar');
    const text = document.getElementById('thirstValue');
    
    value = Math.max(0, Math.min(100, value));
    bar.style.width = value + '%';
    text.textContent = Math.round(value);
    
    if (value <= 25) {
        bar.classList.add('critical');
    } else {
        bar.classList.remove('critical');
    }
}

// ===== ОБНОВЛЕНИЕ ДЕНЕГ =====
function updateMoney(cash, bank) {
    document.getElementById('cashAmount').textContent = '$' + formatNumber(cash);
    document.getElementById('bankAmount').textContent = '$' + formatNumber(bank);
}

// ===== ОБНОВЛЕНИЕ УРОВНЯ =====
function updateLevel(level, exp, maxExp) {
    document.getElementById('levelBadge').textContent = level;
    document.getElementById('expText').textContent = `${formatNumber(exp)} / ${formatNumber(maxExp)} XP`;
    
    const percent = Math.min((exp / maxExp) * 100, 100);
    document.getElementById('expBar').style.width = percent + '%';
}

// ===== СПИДОМЕТР =====
function showSpeedometer(show) {
    const speedometer = document.getElementById('speedometer');
    if (show) {
        speedometer.classList.add('visible');
    } else {
        speedometer.classList.remove('visible');
    }
}

function updateSpeed(speed) {
    const speedValue = document.getElementById('speedValue');
    const speedProgress = document.getElementById('speedProgress');
    
    speed = Math.max(0, Math.round(speed));
    speedValue.textContent = speed;
    
    // Прогресс (макс 250 км/ч)
    const maxSpeed = 250;
    const percent = Math.min(speed / maxSpeed, 1);
    const dashOffset = 534 - (534 * percent);
    speedProgress.style.strokeDashoffset = dashOffset;
    
    // Цвет в зависимости от скорости
    if (speed > 180) {
        speedProgress.style.stroke = '#f44336';
    } else if (speed > 120) {
        speedProgress.style.stroke = '#ff9800';
    } else {
        speedProgress.style.stroke = '#4caf50';
    }
}

function updateVehicleInfo(name, fuel, engine) {
    document.getElementById('vehicleName').textContent = name || 'Транспорт';
    
    document.getElementById('fuelBar').style.width = fuel + '%';
    document.getElementById('fuelValue').textContent = Math.round(fuel) + '%';
    
    document.getElementById('engineBar').style.width = engine + '%';
    document.getElementById('engineValue').textContent = Math.round(engine) + '%';
    
    // Цвет топлива
    const fuelBar = document.getElementById('fuelBar');
    if (fuel <= 15) {
        fuelBar.style.background = '#f44336';
    } else if (fuel <= 30) {
        fuelBar.style.background = '#ff9800';
    } else {
        fuelBar.style.background = 'linear-gradient(90deg, #ff9800, #ffc107)';
    }
}

function updateVehicleControls(engine, lights, locked, belt) {
    const engineEl = document.getElementById('engineStatus');
    const lightsEl = document.getElementById('lightsStatus');
    const lockEl = document.getElementById('lockStatus');
    const beltEl = document.getElementById('beltStatus');
    
    engineEl.className = 'control-item' + (engine ? ' active' : '');
    lightsEl.className = 'control-item' + (lights ? ' active' : '');
    lockEl.className = 'control-item' + (locked ? ' warning' : ' active');
    lockEl.innerHTML = locked ? '<i class="fas fa-lock"></i>' : '<i class="fas fa-lock-open"></i>';
    beltEl.className = 'control-item' + (belt ? ' active' : ' danger');
}

// ===== ЛОКАЦИЯ =====
function updateLocation(street, zone) {
    document.getElementById('streetName').textContent = street || 'Los Santos';
    document.getElementById('zoneName').textContent = zone || '';
}

function updateCompass(direction) {
    document.getElementById('compassDirection').textContent = direction || 'N';
}

function updateGameTime(time) {
    document.getElementById('gameTime').textContent = time || '12:00';
}

// ===== СЕРВЕР ИНФО =====
function updateServerInfo(online, myId) {
    document.getElementById('onlineCount').textContent = online || 0;
    document.getElementById('myId').textContent = myId || 0;
}

// ===== ГОЛОСОВОЙ ЧАТ =====
function setVoiceActive(active) {
    const voice = document.getElementById('voiceIndicator');
    if (active) {
        voice.classList.add('active');
    } else {
        voice.classList.remove('active');
    }
}

// ===== УВЕДОМЛЕНИЯ =====
function showNotification(type, title, message, duration = 5000) {
    const container = document.getElementById('notificationsContainer');
    
    const icons = {
        success: 'fa-check',
        error: 'fa-times',
        warning: 'fa-exclamation',
        info: 'fa-info'
    };
    
    const notif = document.createElement('div');
    notif.className = 'notification ' + type;
    notif.innerHTML = `
        <div class="notification-icon">
            <i class="fas ${icons[type] || icons.info}"></i>
        </div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        </div>
        <div class="notification-progress" style="animation-duration: ${duration}ms;"></div>
    `;
    
    container.appendChild(notif);
    
    // Удаление
    setTimeout(() => {
        notif.classList.add('hiding');
        setTimeout(() => notif.remove(), 300);
    }, duration);
    
    // Максимум 5 уведомлений
    while (container.children.length > 5) {
        container.firstChild.remove();
    }
}

// ===== ПОДСКАЗКИ КЛАВИШ =====
function showKeyHint(key, text, id) {
    const container = document.getElementById('keyhints');
    
    // Удаляем старую подсказку с таким же ID
    const existing = document.getElementById('keyhint-' + id);
    if (existing) existing.remove();
    
    const hint = document.createElement('div');
    hint.className = 'keyhint';
    hint.id = 'keyhint-' + id;
    hint.innerHTML = `
        <span class="keyhint-key">${key}</span>
        <span class="keyhint-text">${text}</span>
    `;
    
    container.appendChild(hint);
}

function hideKeyHint(id) {
    const hint = document.getElementById('keyhint-' + id);
    if (hint) {
        hint.style.animation = 'fadeIn 0.3s ease reverse';
        setTimeout(() => hint.remove(), 300);
    }
}

function clearKeyHints() {
    document.getElementById('keyhints').innerHTML = '';
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
console.log('[HUD] ✅ Script loaded');
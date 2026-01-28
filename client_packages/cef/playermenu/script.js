// ===== PLAYER MENU SCRIPT =====

let playerData = {};
let skillsData = {};

// ===== LOAD DATA =====
function loadPlayerData(dataJson) {
    try {
        playerData = JSON.parse(dataJson);
        updateUI();
    } catch (e) {
        console.error('Error loading player data:', e);
    }
}

function loadSkillsData(dataJson) {
    try {
        skillsData = JSON.parse(dataJson);
        updateSkillsUI();
    } catch (e) {
        console.error('Error loading skills data:', e);
    }
}

// ===== UPDATE UI =====
function updateUI() {
    // Name & ID
    document.getElementById('playerName').textContent = playerData.name || 'Неизвестно';
    document.getElementById('playerId').textContent = playerData.id || 0;
    document.getElementById('playerAvatar').innerHTML = `<span style="font-size: 32px;">${(playerData.name || 'U')[0]}</span>`;

    // Level & Exp
    const level = playerData.level || 1;
    const exp = playerData.exp || 0;
    const maxExp = level * 1000;
    const expPercent = Math.min((exp / maxExp) * 100, 100);

    document.getElementById('playerLevel').textContent = level;
    document.getElementById('levelNum').textContent = level;
    document.getElementById('currentExp').textContent = exp.toLocaleString();
    document.getElementById('maxExp').textContent = maxExp.toLocaleString();
    document.getElementById('expFill').style.width = expPercent + '%';

    // Stats
    document.getElementById('playerAge').textContent = (playerData.age || 25) + ' лет';
    document.getElementById('playerGender').textContent = playerData.gender === 'female' ? 'Женский' : 'Мужской';
    document.getElementById('playTime').textContent = formatPlayTime(playerData.playTime || 0);
    document.getElementById('regDate').textContent = playerData.regDate || 'Неизвестно';

    // Faction
    if (playerData.faction && playerData.faction.name) {
        document.getElementById('factionName').textContent = playerData.faction.name;
        document.getElementById('factionRank').textContent = playerData.faction.rank || '';
        document.getElementById('factionIcon').className = 'fas ' + getFactionIcon(playerData.faction.id);
    } else {
        document.getElementById('factionName').textContent = 'Нет фракции';
        document.getElementById('factionRank').textContent = '';
    }

    // Job
    if (playerData.job && playerData.job.name) {
        document.getElementById('jobName').textContent = playerData.job.name;
        document.getElementById('jobSalary').textContent = '$' + (playerData.job.salary || 0).toLocaleString() + '/час';
        document.getElementById('jobIcon').className = 'fas ' + getJobIcon(playerData.job.id);
    } else {
        document.getElementById('jobName').textContent = 'Безработный';
        document.getElementById('jobSalary').textContent = '';
    }

    // Money
    document.getElementById('playerCash').textContent = '$' + (playerData.cash || 0).toLocaleString();
    document.getElementById('playerBank').textContent = '$' + (playerData.bank || 0).toLocaleString();

    // Skill points
    document.getElementById('skillPoints').textContent = playerData.skillPoints || 0;
}

function updateSkillsUI() {
    for (const [skillId, level] of Object.entries(skillsData)) {
        const levelEl = document.getElementById(skillId + '_level');
        if (levelEl) {
            levelEl.textContent = level;
        }

        const node = document.querySelector(`[data-skill="${skillId}"]`);
        if (node) {
            node.classList.remove('locked', 'unlocked', 'maxed');
            
            if (level >= 5) {
                node.classList.add('maxed');
            } else if (level > 0) {
                node.classList.add('unlocked');
            }
        }
    }

    // Check locked skills
    document.querySelectorAll('.skill-node[data-requires]').forEach(node => {
        const requires = node.dataset.requires;
        if (requires) {
            const [reqSkill, reqLevel] = requires.split(':');
            const currentReqLevel = skillsData[reqSkill] || 0;
            
            if (currentReqLevel >= parseInt(reqLevel)) {
                node.classList.remove('locked');
                node.querySelector('.skill-lock')?.remove();
            } else {
                node.classList.add('locked');
            }
        }
    });
}

// ===== TABS =====
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

    event.target.closest('.tab-btn').classList.add('active');
    document.getElementById(tabName + '-tab').classList.add('active');
}

// ===== SKILLS =====
function upgradeSkill(skillId) {
    const node = document.querySelector(`[data-skill="${skillId}"]`);
    
    if (node.classList.contains('locked')) {
        showNotification('error', 'Навык заблокирован!');
        return;
    }

    const currentLevel = skillsData[skillId] || 0;
    if (currentLevel >= 5) {
        showNotification('warning', 'Навык уже максимального уровня!');
        return;
    }

    const cost = parseInt(node.dataset.cost) || 1;
    const skillPoints = playerData.skillPoints || 0;

    if (skillPoints < cost) {
        showNotification('error', `Недостаточно очков навыков! (нужно ${cost})`);
        return;
    }

    if (typeof mp !== 'undefined') {
        mp.trigger('cef:upgradeSkill', skillId, cost);
    }
}

function skillUpgraded(skillId, newLevel, remainingPoints) {
    skillsData[skillId] = newLevel;
    playerData.skillPoints = remainingPoints;
    
    document.getElementById('skillPoints').textContent = remainingPoints;
    updateSkillsUI();
    
    showNotification('success', 'Навык улучшен!');
}

// ===== HELPERS =====
function formatPlayTime(minutes) {
    const hours = Math.floor(minutes / 60);
    if (hours < 1) return minutes + ' мин';
    return hours + ' ч ' + (minutes % 60) + ' мин';
}

function getFactionIcon(factionId) {
    const icons = {
        1: 'fa-shield-alt',     // Police
        2: 'fa-ambulance',      // EMS
        3: 'fa-gavel',          // Government
        4: 'fa-skull',          // Mafia
        5: 'fa-cannabis',       // Gang
    };
    return icons[factionId] || 'fa-users';
}

function getJobIcon(jobId) {
    const icons = {
        1: 'fa-taxi',           // Taxi
        2: 'fa-truck',          // Trucker
        3: 'fa-bus',            // Bus Driver
        4: 'fa-hard-hat',       // Miner
        5: 'fa-tree',           // Lumberjack
        6: 'fa-fish',           // Fisher
        7: 'fa-concierge-bell', // Waiter
    };
    return icons[jobId] || 'fa-briefcase';
}

function showNotification(type, message) {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notif = document.createElement('div');
    notif.className = 'notification ' + type;
    notif.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'exclamation'}"></i> ${message}`;
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 10px;
        color: white;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 1000;
        animation: slideInRight 0.3s ease;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#ff9800'};
    `;
    document.body.appendChild(notif);

    setTimeout(() => notif.remove(), 3000);
}

// ===== CLOSE =====
function closeMenu() {
    if (typeof mp !== 'undefined') mp.trigger('cef:closePlayerMenu');
}

// ===== KEYBOARD =====
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeMenu();
    }
});

console.log('[PlayerMenu] ✅ Script loaded');
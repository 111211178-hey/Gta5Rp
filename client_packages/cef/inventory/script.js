// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let playerData = {
    name: 'Player',
    cash: 0,
    bank: 0,
    weight: 0,
    maxWeight: 30,
    thirst: 100,
    hunger: 100,
    health: 100
};

let inventory = {
    main: [],
    equipment: {
        head: null, mask: null, top: null, undershirt: null, legs: null,
        shoes: null, accessory: null, bag: null, armor: null, backpack: null,
        weapon1: null, weapon2: null, melee: null
    }
};

let draggedItem = null;
let draggedFrom = null;
let draggedFromSlot = null;
let draggedWidth = 1;
let draggedHeight = 1;
let quickSlotsData = [null, null, null, null, null];

// ===== КОНСТАНТЫ СЕТКИ =====
const GRID_WIDTH = 5;
const GRID_HEIGHT = 7;
const CELL_SIZE = 50;
const CELL_GAP = 2;

// ===== БАЗА ДАННЫХ ПРЕДМЕТОВ =====
const itemIcons = {
    'water': '💧', 'bread': '🍞', 'food': '🍔', 'burger': '🍔', 'pizza': '🍕',
    'apple': '🍎', 'cola': '🥤', 'beer': '🍺', 'bandage': '🩹', 'medkit': '💊',
    'firstaid': '🏥', 'phone': '📱', 'keys': '🔑', 'flashlight': '🔦',
    'lockpick': '🔧', 'toolkit': '🧰', 'rope': '🪢', 'money': '💵', 'iron': '🪨',
    'wood': '🪵', 'plastic': '♻️', 'pistol': '🔫', 'rifle': '🔫', 'knife': '🔪',
    'bat': '🏏', 'pistol_ammo': '🔶', 'tshirt_white': '👕', 'jeans_blue': '👖',
    'sneakers_black': '👟', 'cap_red': '🧢', 'jacket': '🧥', 'shirt': '👔',
    'pants': '👖', 'shoes': '👟', 'hat': '🎩', 'glasses': '👓', 'watch': '⌚',
    'mask': '🎭', 'backpack_small': '🎒', 'backpack_medium': '🎒',
    'backpack_large': '🎒', 'weapon_pistol': '🔫', 'weapon_smg': '🔫',
    'weapon_rifle': '🎯', 'weapon_knife': '🔪', 'weapon_shotgun': '🔫',
    'smg': '🔫', 'default': '📦'
};

// ===== ИНИЦИАЛИЗАЦИЯ =====
window.addEventListener('DOMContentLoaded', () => {
    initializeGrids();
    setupEventListeners();
    setupEquipmentSlots();
    setupDropZone();
    console.log('[Inventory] Инициализация завершена');
});

// ===== СОЗДАНИЕ СЕТОК =====
function initializeGrids() {
    const mainInventory = document.getElementById('mainInventory');
    if (mainInventory) {
        mainInventory.innerHTML = '';
        mainInventory.style.display = 'grid';
        mainInventory.style.gridTemplateColumns = `repeat(${GRID_WIDTH}, ${CELL_SIZE}px)`;
        mainInventory.style.gridTemplateRows = `repeat(${GRID_HEIGHT}, ${CELL_SIZE}px)`;
        mainInventory.style.gap = `${CELL_GAP}px`;
        mainInventory.style.position = 'relative';
        mainInventory.style.padding = '5px';
        mainInventory.style.background = 'rgba(0,0,0,0.3)';
        mainInventory.style.borderRadius = '8px';
        
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const slot = document.createElement('div');
                slot.className = 'inventory-cell';
                slot.dataset.type = 'main';
                slot.dataset.x = x;
                slot.dataset.y = y;
                slot.dataset.slot = y * GRID_WIDTH + x;
                
                slot.addEventListener('dragover', handleCellDragOver);
                slot.addEventListener('dragleave', handleCellDragLeave);
                slot.addEventListener('drop', handleCellDrop);
                
                mainInventory.appendChild(slot);
            }
        }
    }
    
    const quickSlots = document.getElementById('quickSlots');
    if (quickSlots) {
        quickSlots.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const slot = document.createElement('div');
            slot.className = 'quick-slot';
            slot.dataset.index = i;
            
            const number = document.createElement('div');
            number.className = 'quick-slot-number';
            number.textContent = i + 1;
            slot.appendChild(number);
            
            slot.addEventListener('click', () => useQuickSlot(i));
            quickSlots.appendChild(slot);
        }
    }
}

function setupEquipmentSlots() {
    document.querySelectorAll('.equipment-slot[data-slot]').forEach(slot => {
        slot.draggable = false;
        slot.addEventListener('dragover', handleEquipDragOver);
        slot.addEventListener('dragleave', handleEquipDragLeave);
        slot.addEventListener('drop', handleEquipmentDrop);
        slot.addEventListener('dragstart', handleEquipDragStart);
        slot.addEventListener('dragend', handleDragEnd);
        slot.addEventListener('contextmenu', handleEquipmentContextMenu);
        slot.addEventListener('mouseenter', handleMouseEnter);
        slot.addEventListener('mouseleave', handleMouseLeave);
        slot.addEventListener('dblclick', handleEquipmentDoubleClick);
    });
}

function setupDropZone() {
    const dropZone = document.getElementById('dropZone');
    if (!dropZone) return;
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drop-hover');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drop-hover');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drop-hover');
        
        if (!draggedItem) return;
        
        if (draggedFrom && draggedFrom.type === 'equipment') {
            if (typeof mp !== 'undefined') {
                mp.trigger('cef:dropEquipment', draggedFrom.slotType);
            }
            showNotification('info', `Выброшено: ${draggedItem.name}`);
        } else if (draggedFromSlot !== null && typeof draggedFromSlot === 'number') {
            const quantity = draggedItem.quantity || 1;
            
            if (quantity > 1) {
                const amount = prompt(`Сколько выбросить? (1-${quantity})`, quantity.toString());
                if (amount && !isNaN(amount)) {
                    const dropAmount = Math.min(Math.max(1, parseInt(amount)), quantity);
                    if (typeof mp !== 'undefined') {
                        mp.trigger('cef:dropItem', draggedFromSlot, dropAmount);
                    }
                    showNotification('info', `Выброшено: ${draggedItem.name} x${dropAmount}`);
                }
            } else {
                if (typeof mp !== 'undefined') {
                    mp.trigger('cef:dropItem', draggedFromSlot, 1);
                }
                showNotification('info', `Выброшено: ${draggedItem.name}`);
            }
        }
        
        draggedItem = null;
        draggedFromSlot = null;
        draggedFrom = null;
    });
}

// ===== РЕНДЕР ИНВЕНТАРЯ =====
function renderInventory() {
    const grid = document.getElementById('mainInventory');
    if (!grid) return;
    
    const cells = grid.querySelectorAll('.inventory-cell');
    cells.forEach(cell => cell.classList.remove('occupied'));
    
    grid.querySelectorAll('.inventory-item').forEach(item => item.remove());
    
    inventory.main.forEach((item, slot) => {
        if (!item) return;
        
        const width = item.width || 1;
        const height = item.height || 1;
        const startX = slot % GRID_WIDTH;
        const startY = Math.floor(slot / GRID_WIDTH);
        
        const itemEl = document.createElement('div');
        itemEl.className = `inventory-item size-${width}x${height} type-${item.type || 'default'}`;
        itemEl.dataset.slot = slot;
        itemEl.dataset.width = width;
        itemEl.dataset.height = height;
        itemEl.draggable = true;
        
        itemEl.style.position = 'absolute';
        itemEl.style.left = `${startX * (CELL_SIZE + CELL_GAP) + 5}px`;
        itemEl.style.top = `${startY * (CELL_SIZE + CELL_GAP) + 5}px`;
        itemEl.style.width = `${width * CELL_SIZE + (width - 1) * CELL_GAP}px`;
        itemEl.style.height = `${height * CELL_SIZE + (height - 1) * CELL_GAP}px`;
        
        const iconContainer = document.createElement('div');
        iconContainer.className = 'item-icon-container';
        
        if (item.icon) {
            const img = document.createElement('img');
            img.className = 'item-image';
            img.src = `icons/${item.icon}`;
            img.alt = item.name;
            img.draggable = false;
            img.onerror = () => {
                iconContainer.innerHTML = `<div class="item-emoji-icon">${getItemIcon(item.id)}</div>`;
            };
            iconContainer.appendChild(img);
        } else {
            iconContainer.innerHTML = `<div class="item-emoji-icon">${getItemIcon(item.id)}</div>`;
        }
        
        itemEl.appendChild(iconContainer);
        
        const infoEl = document.createElement('div');
        infoEl.className = 'item-info';
        
        if (item.quantity > 1) {
            const qtyEl = document.createElement('span');
            qtyEl.className = 'item-quantity';
            qtyEl.textContent = item.quantity;
            infoEl.appendChild(qtyEl);
        }
        
        const weightEl = document.createElement('span');
        weightEl.className = 'item-weight-badge';
        weightEl.textContent = `${((item.weight || 0.1) * (item.quantity || 1)).toFixed(1)}kg`;
        infoEl.appendChild(weightEl);
        
        itemEl.appendChild(infoEl);
        
        itemEl.addEventListener('dragstart', (e) => handleItemDragStart(e, item, slot));
        itemEl.addEventListener('dragend', handleItemDragEnd);
        itemEl.addEventListener('dblclick', () => handleItemDoubleClick(item, slot));
        itemEl.addEventListener('contextmenu', (e) => handleItemContextMenu(e, item, slot));
        itemEl.addEventListener('mouseenter', (e) => showItemTooltip(e, item));
        itemEl.addEventListener('mouseleave', hideTooltip);
        
        grid.appendChild(itemEl);
        
        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                if (dx !== 0 || dy !== 0) {
                    const cellSlot = (startY + dy) * GRID_WIDTH + (startX + dx);
                    const cell = grid.querySelector(`.inventory-cell[data-slot="${cellSlot}"]`);
                    if (cell) cell.classList.add('occupied');
                }
            }
        }
    });
    
    updateWeight();
    renderEquipment();
	renderQuickSlots();
}

// ===== РЕНДЕР ЭКИПИРОВКИ (ИСПРАВЛЕННЫЙ) =====
// ===== РЕНДЕР ЭКИПИРОВКИ (ИСПРАВЛЕННЫЙ) =====
function renderEquipment() {
    const equipmentSlots = document.querySelectorAll('.equipment-slot[data-slot]');
    
    equipmentSlots.forEach(slot => {
        const slotType = slot.dataset.slot;
        const item = inventory.equipment[slotType];
        
        // Удаляем ТОЛЬКО добавленные нами элементы
        slot.querySelectorAll('.equip-item-container, .equip-item-name').forEach(el => el.remove());
        
        // Находим оригинальные элементы слота (иконка FontAwesome и лейбл)
        const slotIcon = slot.querySelector(':scope > i');
        const slotLabel = slot.querySelector(':scope > .slot-label');
        
        // Сбрасываем классы
        slot.classList.remove('has-item', 'item-type-weapon', 'item-type-clothing', 'item-type-medical', 'item-type-tool');
        slot.draggable = false;
        
        // Показываем оригинальные элементы по умолчанию
        if (slotIcon) slotIcon.style.display = '';
        if (slotLabel) slotLabel.style.display = '';
        
        if (item) {
            slot.classList.add('has-item');
            slot.draggable = true;
            
            if (item.type) slot.classList.add(`item-type-${item.type}`);
            
            // Скрываем оригинальные иконку и лейбл
            if (slotIcon) slotIcon.style.display = 'none';
            if (slotLabel) slotLabel.style.display = 'none';
            
            // Создаём контейнер для иконки предмета
            const iconContainer = document.createElement('div');
            iconContainer.className = 'equip-item-container';
            
            if (item.icon) {
                const img = document.createElement('img');
                img.src = `icons/${item.icon}`;
                img.alt = item.name;
                img.draggable = false;
                img.onerror = () => {
                    img.style.display = 'none';
                    const emoji = document.createElement('span');
                    emoji.className = 'equip-emoji';
                    emoji.textContent = getItemIcon(item.id || item.name);
                    iconContainer.appendChild(emoji);
                };
                iconContainer.appendChild(img);
            } else {
                const emoji = document.createElement('span');
                emoji.className = 'equip-emoji';
                emoji.textContent = getItemIcon(item.id || item.name);
                iconContainer.appendChild(emoji);
            }
            
            slot.appendChild(iconContainer);
            
            // Создаём название предмета
            const nameEl = document.createElement('div');
            nameEl.className = 'equip-item-name';
            nameEl.textContent = item.name || item.id;
            slot.appendChild(nameEl);
        }
    });
}

// ===== ПОЛУЧЕНИЕ ИКОНКИ =====
function getItemIcon(itemId) {
    if (!itemId) return itemIcons['default'];
    if (itemIcons[itemId]) return itemIcons[itemId];
    
    const itemIdLower = itemId.toLowerCase();
    for (const [key, icon] of Object.entries(itemIcons)) {
        if (itemIdLower.includes(key) || key.includes(itemIdLower)) return icon;
    }
    return itemIcons['default'];
}

// ===== DRAG & DROP ДЛЯ ПРЕДМЕТОВ =====
function handleItemDragStart(e, item, slot) {
    draggedItem = item;
    draggedFromSlot = slot;
    draggedFrom = { type: 'main', index: slot };
    draggedWidth = item.width || 1;
    draggedHeight = item.height || 1;
    
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ slot, type: 'main' }));
}

function handleItemDragEnd(e) {
    e.target.classList.remove('dragging');
    clearHighlights();
    draggedItem = null;
    draggedFromSlot = null;
    draggedFrom = null;
}

function handleCellDragOver(e) {
    e.preventDefault();
    if (!draggedItem) return;
    
    const cell = e.currentTarget;
    const targetX = parseInt(cell.dataset.x);
    const targetY = parseInt(cell.dataset.y);
    
    const canPlace = checkCanPlace(targetX, targetY, draggedWidth, draggedHeight, draggedFromSlot);
    highlightCells(targetX, targetY, draggedWidth, draggedHeight, canPlace);
}

function handleCellDragLeave(e) {}

function handleCellDrop(e) {
    e.preventDefault();
    clearHighlights();
    
    if (!draggedItem) return;
    
    const cell = e.currentTarget;
    const targetX = parseInt(cell.dataset.x);
    const targetY = parseInt(cell.dataset.y);
    const targetSlot = targetY * GRID_WIDTH + targetX;
    
    if (!checkCanPlace(targetX, targetY, draggedWidth, draggedHeight, draggedFromSlot)) {
        showNotification('error', 'Недостаточно места!');
        return;
    }
    
    if (targetSlot !== draggedFromSlot) {
        if (typeof mp !== 'undefined') {
            mp.trigger('cef:moveItem', 
                JSON.stringify({ type: 'inventory', index: draggedFromSlot }),
                JSON.stringify({ type: 'inventory', index: targetSlot })
            );
        }
    }
}

function checkCanPlace(startX, startY, width, height, ignoreSlot = -1) {
    if (startX + width > GRID_WIDTH || startY + height > GRID_HEIGHT) return false;
    if (startX < 0 || startY < 0) return false;
    
    const ignoreX = ignoreSlot >= 0 ? ignoreSlot % GRID_WIDTH : -1;
    const ignoreY = ignoreSlot >= 0 ? Math.floor(ignoreSlot / GRID_WIDTH) : -1;
    
    for (let dy = 0; dy < height; dy++) {
        for (let dx = 0; dx < width; dx++) {
            const checkX = startX + dx;
            const checkY = startY + dy;
            const slot = checkY * GRID_WIDTH + checkX;
            
            if (ignoreSlot >= 0 && checkX >= ignoreX && checkX < ignoreX + draggedWidth &&
                checkY >= ignoreY && checkY < ignoreY + draggedHeight) continue;
            
            if (inventory.main[slot] && slot !== ignoreSlot) return false;
            
            const cell = document.querySelector(`.inventory-cell[data-slot="${slot}"]`);
            if (cell && cell.classList.contains('occupied')) {
                let isOurCell = false;
                if (ignoreSlot >= 0) {
                    const item = inventory.main[ignoreSlot];
                    if (item) {
                        const itemWidth = item.width || 1;
                        const itemHeight = item.height || 1;
                        if (checkX >= ignoreX && checkX < ignoreX + itemWidth &&
                            checkY >= ignoreY && checkY < ignoreY + itemHeight) isOurCell = true;
                    }
                }
                if (!isOurCell) return false;
            }
        }
    }
    return true;
}

function highlightCells(startX, startY, width, height, isValid) {
    clearHighlights();
    for (let dy = 0; dy < height; dy++) {
        for (let dx = 0; dx < width; dx++) {
            const x = startX + dx;
            const y = startY + dy;
            if (x < GRID_WIDTH && y < GRID_HEIGHT && x >= 0 && y >= 0) {
                const slot = y * GRID_WIDTH + x;
                const cell = document.querySelector(`.inventory-cell[data-slot="${slot}"]`);
                if (cell) cell.classList.add(isValid ? 'drag-over' : 'drag-invalid');
            }
        }
    }
}

function clearHighlights() {
    document.querySelectorAll('.inventory-cell').forEach(cell => {
        cell.classList.remove('drag-over', 'drag-invalid');
    });
    document.querySelectorAll('.equipment-slot').forEach(slot => {
        slot.classList.remove('drag-over');
    });
}

// ===== DRAG & DROP ДЛЯ ЭКИПИРОВКИ =====
function handleEquipDragOver(e) {
    e.preventDefault();
    if (!draggedItem) return;
    const slot = e.currentTarget;
    const slotType = slot.dataset.slot;
    if (canEquipToSlot(draggedItem, slotType)) slot.classList.add('drag-over');
}

function handleEquipDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleEquipDragStart(e) {
    const slot = e.currentTarget;
    const slotType = slot.dataset.slot;
    const item = inventory.equipment[slotType];
    
    if (!item) return;
    
    draggedItem = { ...item };
    draggedFrom = { type: 'equipment', slotType: slotType };
    draggedFromSlot = slotType;
    draggedWidth = 1;
    draggedHeight = 1;
    
    slot.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ slotType, type: 'equipment' }));
}

function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    clearHighlights();
    draggedItem = null;
    draggedFrom = null;
    draggedFromSlot = null;
}

function handleEquipmentDrop(e) {
    e.preventDefault();
    clearHighlights();
    
    if (!draggedItem || draggedFromSlot === null) return;
    
    const targetSlot = e.currentTarget;
    const slotType = targetSlot.dataset.slot;
    
    if (!canEquipToSlot(draggedItem, slotType)) {
        showNotification('error', 'Этот предмет нельзя надеть в этот слот');
        return;
    }
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:equipToSlot', draggedFromSlot, slotType);
    }
    
    draggedItem = null;
    draggedFrom = null;
    draggedFromSlot = null;
}

function canEquipToSlot(item, slotType) {
    if (!item || !item.type) return false;
    
    const slotTypeMapping = {
        'head': ['clothing'], 'hat': ['clothing'], 'mask': ['clothing'],
        'top': ['clothing'], 'undershirt': ['clothing'], 'legs': ['clothing'],
        'shoes': ['clothing'], 'accessory': ['clothing', 'accessory'],
        'bag': ['backpack'], 'armor': ['armor'], 'backpack': ['backpack'],
        'weapon1': ['weapon'], 'weapon2': ['weapon'], 'melee': ['weapon']
    };
    
    const allowedTypes = slotTypeMapping[slotType];
    return allowedTypes ? allowedTypes.includes(item.type) : false;
}

// ===== ДВОЙНОЙ КЛИК =====
function handleItemDoubleClick(item, slot) {
    if (!item) return;
    if (typeof mp !== 'undefined') mp.trigger('cef:useItem', slot);
    
    if (item.type === 'clothing') showNotification('info', `Надеваем: ${item.name}`);
    else if (item.type === 'weapon') showNotification('info', `Экипируем: ${item.name}`);
    else showNotification('success', `Использован: ${item.name}`);
}

function handleEquipmentDoubleClick(e) {
    const slot = e.currentTarget;
    const slotType = slot.dataset.slot;
    const item = inventory.equipment[slotType];
    
    if (!item) return;
    if (typeof mp !== 'undefined') mp.trigger('cef:unequipItem', slotType);
    showNotification('info', `Снимаем: ${item.name}`);
}

// ===== КОНТЕКСТНОЕ МЕНЮ =====
function handleItemContextMenu(e, item, slot) {
    e.preventDefault();
    if (!item) return;
    showContextMenu(e.clientX, e.clientY, item, { type: 'main', index: slot });
}

function handleEquipmentContextMenu(e) {
    e.preventDefault();
    const slot = e.currentTarget;
    const slotType = slot.dataset.slot;
    const item = inventory.equipment[slotType];
    if (!item) return;
    showEquipmentContextMenu(e.clientX, e.clientY, item, slotType);
}

function showContextMenu(x, y, item, location) {
    const menu = document.getElementById('contextMenu');
    if (!menu) return;
    
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.display = 'block';
    
    const newMenu = menu.cloneNode(true);
    menu.parentNode.replaceChild(newMenu, menu);
    
    newMenu.querySelectorAll('.context-item').forEach(menuItem => {
        menuItem.addEventListener('click', () => {
            const action = menuItem.dataset.action;
            handleContextAction(action, item, location);
            newMenu.style.display = 'none';
        });
    });
    
    setTimeout(() => {
        document.addEventListener('click', () => {
            newMenu.style.display = 'none';
        }, { once: true });
    }, 100);
}

function showEquipmentContextMenu(x, y, item, slotType) {
    const menu = document.getElementById('contextMenu');
    if (!menu) return;
    
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.display = 'block';
    
    const newMenu = menu.cloneNode(true);
    menu.parentNode.replaceChild(newMenu, menu);
    
    newMenu.innerHTML = `
        <div class="context-item" data-action="unequip"><i class="fas fa-hand-pointer"></i><span>Снять</span></div>
        <div class="context-item" data-action="drop"><i class="fas fa-trash"></i><span>Выбросить</span></div>
        <div class="context-item" data-action="info"><i class="fas fa-info-circle"></i><span>Информация</span></div>
    `;
    
    newMenu.querySelectorAll('.context-item').forEach(menuItem => {
        menuItem.addEventListener('click', () => {
            const action = menuItem.dataset.action;
            if (action === 'unequip') {
                if (typeof mp !== 'undefined') mp.trigger('cef:unequipItem', slotType);
                showNotification('info', `Снято: ${item.name}`);
            } else if (action === 'drop') {
                if (typeof mp !== 'undefined') mp.trigger('cef:dropEquipment', slotType);
                showNotification('info', `Выброшено: ${item.name}`);
            } else if (action === 'info') {
                alert(`${item.name}\nТип: ${item.type}\nВес: ${item.weight || 0.1} кг`);
            }
            newMenu.style.display = 'none';
        });
    });
    
    setTimeout(() => {
        document.addEventListener('click', () => {
            newMenu.style.display = 'none';
        }, { once: true });
    }, 100);
}

function handleContextAction(action, item, location) {
    switch (action) {
        case 'use':
            if (typeof mp !== 'undefined') mp.trigger('cef:useItem', location.index);
            showNotification('success', `Использован: ${item.name}`);
            break;
        case 'drop':
            const qty = item.quantity || 1;
            if (qty > 1) {
                const amount = prompt(`Сколько выбросить? (1-${qty})`, '1');
                if (amount && !isNaN(amount)) {
                    const dropAmount = Math.min(Math.max(1, parseInt(amount)), qty);
                    if (typeof mp !== 'undefined') mp.trigger('cef:dropItem', location.index, dropAmount);
                    showNotification('info', `Выброшено: ${item.name} x${dropAmount}`);
                }
            } else {
                if (typeof mp !== 'undefined') mp.trigger('cef:dropItem', location.index, 1);
                showNotification('info', `Выброшено: ${item.name}`);
            }
            break;
        case 'split':
            if (item.quantity > 1) {
                const splitAmount = prompt(`Разделить (макс: ${item.quantity - 1}):`, Math.floor(item.quantity / 2));
                if (splitAmount && !isNaN(splitAmount) && parseInt(splitAmount) > 0 && parseInt(splitAmount) < item.quantity) {
                    if (typeof mp !== 'undefined') mp.trigger('cef:splitItem', location.index, parseInt(splitAmount));
                    showNotification('success', 'Предмет разделён');
                }
            } else {
                showNotification('error', 'Нельзя разделить один предмет');
            }
            break;
        case 'info':
            alert(`${item.name}\nТип: ${item.type}\nВес: ${item.weight || 0.1} кг\n${item.description || ''}`);
            break;
    }
}

// ===== TOOLTIP =====
function showItemTooltip(e, item) {
    const tooltip = document.getElementById('itemTooltip');
    if (!tooltip) return;
    
    document.getElementById('tooltipName').textContent = item.name || item.id;
    document.getElementById('tooltipWeight').textContent = `${item.weight || 0.1} kg`;
    const size = `${item.width || 1}x${item.height || 1}`;
    document.getElementById('tooltipDescription').textContent = `Тип: ${item.type || 'Неизвестно'} | Размер: ${size}${item.quantity > 1 ? ` | Кол-во: ${item.quantity}` : ''}`;
    
    tooltip.style.display = 'block';
    tooltip.style.left = `${e.clientX + 15}px`;
    tooltip.style.top = `${e.clientY + 15}px`;
}

function hideTooltip() {
    const tooltip = document.getElementById('itemTooltip');
    if (tooltip) tooltip.style.display = 'none';
}

function handleMouseEnter(e) {
    const slot = e.currentTarget;
    const slotType = slot.dataset.slot;
    const item = inventory.equipment[slotType];
    if (item) showItemTooltip(e, item);
}

function handleMouseLeave() {
    hideTooltip();
}

// ===== БЫСТРЫЕ СЛОТЫ =====
function useQuickSlot(index) {
    if (typeof mp !== 'undefined') mp.trigger('cef:useQuickSlot', index);
}

// ===== ВЕС =====
function updateWeight() {
    let totalWeight = 0;
    
    inventory.main.forEach(item => {
        if (item) totalWeight += (item.weight || 0.1) * (item.quantity || 1);
    });
    
    Object.values(inventory.equipment).forEach(item => {
        if (item) totalWeight += item.weight || 0.1;
    });
    
    playerData.weight = totalWeight;
    
    const weightDisplay = document.getElementById('weightDisplay');
    if (weightDisplay) {
        weightDisplay.textContent = `${totalWeight.toFixed(1)} / ${playerData.maxWeight} kg`;
        const percentage = (totalWeight / playerData.maxWeight) * 100;
        weightDisplay.style.color = percentage >= 90 ? '#f44336' : percentage >= 70 ? '#ff9800' : 'rgba(255, 255, 255, 0.7)';
    }
}

// ===== ОБНОВЛЕНИЕ ДАННЫХ ИГРОКА =====
function updatePlayerInfo(data) {
    if (!data) return;
    playerData = { ...playerData, ...data };
    
    const playerName = document.getElementById('playerName');
    const cashAmount = document.getElementById('cashAmount');
    const bankAmount = document.getElementById('bankAmount');
    
    if (playerName) playerName.textContent = playerData.name;
    if (cashAmount) cashAmount.textContent = `$${(playerData.cash || 0).toLocaleString()}`;
    if (bankAmount) bankAmount.textContent = `$${(playerData.bank || 0).toLocaleString()}`;
    
    ['thirst', 'hunger', 'health'].forEach(stat => {
        const bar = document.getElementById(`${stat}Bar`);
        const valueEl = document.getElementById(`${stat}Value`);
        const value = playerData[stat] || 100;
        if (bar) bar.style.width = `${value}%`;
        if (valueEl) valueEl.textContent = Math.round(value);
    });
}

// ===== УВЕДОМЛЕНИЯ =====
function showNotification(type, message) {
    const notification = document.createElement('div');
    notification.className = `inventory-notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; padding: 12px 20px;
        border-radius: 8px; color: white; font-weight: bold; z-index: 10000;
        animation: slideIn 0.3s ease;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196f3'};
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// ===== ОБРАБОТЧИКИ СОБЫТИЙ =====
function setupEventListeners() {
    const closeBtn = document.getElementById('closeBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeInventory);
    
    document.addEventListener('keydown', (e) => {
        if (e.key >= '1' && e.key <= '5') useQuickSlot(parseInt(e.key) - 1);
        if (e.key === 'Escape') closeInventory();
    });
}

function closeInventory() {
    if (typeof mp !== 'undefined') mp.trigger('cef:closeInventory');
}

// ===== ЗАГРУЗКА ДАННЫХ =====
function loadInventory(inventoryJson, charDataJson) {
    try {
        const invData = typeof inventoryJson === 'string' ? JSON.parse(inventoryJson) : inventoryJson;
        const charData = charDataJson ? (typeof charDataJson === 'string' ? JSON.parse(charDataJson) : charDataJson) : null;
        
        inventory.main = [];
        inventory.equipment = {
            head: null, mask: null, top: null, undershirt: null, legs: null,
            shoes: null, accessory: null, bag: null, armor: null, backpack: null,
            weapon1: null, weapon2: null, melee: null
        };
        
        if (invData) {
            if (Array.isArray(invData)) {
                invData.forEach(item => {
                    if (item && item.slot !== undefined) inventory.main[item.slot] = item;
                });
            } else if (invData.main !== undefined) {
                if (Array.isArray(invData.main)) {
                    invData.main.forEach(item => {
                        if (item && item.slot !== undefined) inventory.main[item.slot] = item;
                    });
                } else {
                    for (const [slot, item] of Object.entries(invData.main)) {
                        if (item) inventory.main[parseInt(slot)] = item;
                    }
                }
                if (invData.equipment) {
                    for (const [slotType, item] of Object.entries(invData.equipment)) {
                        inventory.equipment[slotType] = item || null;
                    }
                }
                // Загружаем быстрые слоты
                if (invData.quickSlots) {
                    quickSlotsData = invData.quickSlots;
                }
            }
        }
        
        if (charData) updatePlayerInfo(charData);
        renderInventory();
        renderQuickSlots();
    } catch (err) {
        console.error('[Inventory] Ошибка загрузки:', err);
    }
}

// ===== ПРЕДМЕТЫ НА ЗЕМЛЕ =====
let groundItems = [];

function updateGroundItems(itemsJson) {
    try {
        groundItems = typeof itemsJson === 'string' ? JSON.parse(itemsJson) : itemsJson;
        renderGroundItems();
    } catch (err) {
        console.error('[Inventory] Ошибка:', err);
    }
}

function renderGroundItems() {
    const container = document.getElementById('environmentGrid');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!groundItems || groundItems.length === 0) {
        container.innerHTML = '<div class="no-items-hint">Предметов рядом нет</div>';
        return;
    }
    
    groundItems.forEach(item => {
        const slot = document.createElement('div');
        slot.className = 'ground-item-slot';
        slot.dataset.groundItemId = item.id;
        
        const iconContainer = document.createElement('div');
        iconContainer.className = 'item-icon-container';
        iconContainer.style.cssText = 'display:flex;align-items:center;justify-content:center;width:100%;height:100%;';
        
        if (item.icon) {
            const img = document.createElement('img');
            img.className = 'item-image';
            img.src = `icons/${item.icon}`;
            img.alt = item.name;
            img.draggable = false;
            img.style.cssText = 'max-width:35px;max-height:35px;';
            img.onerror = () => {
                iconContainer.innerHTML = `<div class="item-icon">${getItemIcon(item.name)}</div>`;
            };
            iconContainer.appendChild(img);
        } else {
            iconContainer.innerHTML = `<div class="item-icon">${getItemIcon(item.name)}</div>`;
        }
        
        slot.appendChild(iconContainer);
        
        if (item.quantity > 1) {
            const quantity = document.createElement('div');
            quantity.className = 'item-quantity';
            quantity.textContent = item.quantity;
            slot.appendChild(quantity);
        }
        
        if (item.distance !== undefined) {
            const distance = document.createElement('div');
            distance.className = 'item-distance';
            distance.textContent = `${item.distance.toFixed(1)}m`;
            slot.appendChild(distance);
        }
        
        slot.addEventListener('click', () => {
            if (typeof mp !== 'undefined') mp.trigger('cef:pickupItem', item.id);
            showNotification('info', 'Подбираем предмет...');
        });
        
        slot.addEventListener('mouseenter', (e) => showItemTooltip(e, item));
        slot.addEventListener('mouseleave', hideTooltip);
        
        container.appendChild(slot);
    });
}

// ===== РЕНДЕР БЫСТРЫХ СЛОТОВ =====
function renderQuickSlots() {
    const container = document.getElementById('quickSlots');
    if (!container) return;
    
    container.innerHTML = '';
    
    for (let i = 0; i < 5; i++) {
        const slot = document.createElement('div');
        slot.className = 'quick-slot';
        slot.dataset.index = i;
        
        const item = quickSlotsData[i];
        
        if (item) {
            slot.classList.add('has-item');
            
            // Иконка предмета
            const iconContainer = document.createElement('div');
            iconContainer.className = 'quick-slot-icon';
            
            if (item.icon) {
                const img = document.createElement('img');
                img.src = `icons/${item.icon}`;
                img.alt = item.name;
                img.draggable = false;
                img.onerror = () => {
                    iconContainer.innerHTML = `<span class="quick-emoji">${getItemIcon(item.id || item.name)}</span>`;
                };
                iconContainer.appendChild(img);
            } else {
                iconContainer.innerHTML = `<span class="quick-emoji">${getItemIcon(item.id || item.name)}</span>`;
            }
            
            slot.appendChild(iconContainer);
        }
        
        // Номер слота
        const number = document.createElement('div');
        number.className = 'quick-slot-number';
        number.textContent = i + 1;
        slot.appendChild(number);
        
        // Клик - использовать
        slot.addEventListener('click', () => {
            if (quickSlotsData[i]) {
                if (typeof mp !== 'undefined') mp.trigger('cef:useQuickSlot', i);
                showNotification('info', `Используем: ${quickSlotsData[i].name}`);
            }
        });
        
        // ПКМ - очистить слот
        slot.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (quickSlotsData[i]) {
                showQuickSlotContextMenu(e.clientX, e.clientY, i);
            }
        });
        
        // Drag & Drop - назначение предмета
        slot.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (draggedItem && canAssignToQuickSlot(draggedItem)) {
                slot.classList.add('drag-over');
            }
        });
        
        slot.addEventListener('dragleave', () => {
            slot.classList.remove('drag-over');
        });
        
        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            slot.classList.remove('drag-over');
            
            if (draggedItem && draggedFromSlot !== null && typeof draggedFromSlot === 'number') {
                if (canAssignToQuickSlot(draggedItem)) {
                    if (typeof mp !== 'undefined') {
                        mp.trigger('cef:assignQuickSlot', draggedFromSlot, i);
                    }
                    showNotification('success', `${draggedItem.name} назначен на слот ${i + 1}`);
                } else {
                    showNotification('error', 'Этот предмет нельзя назначить на быстрый слот');
                }
            }
        });
        
        container.appendChild(slot);
    }
}

// Проверка можно ли назначить на быстрый слот
function canAssignToQuickSlot(item) {
    if (!item) return false;
    const allowedTypes = ['consumable', 'medical', 'weapon', 'tool'];
    return allowedTypes.includes(item.type) || item.usable;
}

// Контекстное меню быстрого слота
function showQuickSlotContextMenu(x, y, slotIndex) {
    const menu = document.getElementById('contextMenu');
    if (!menu) return;
    
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.display = 'block';
    
    const newMenu = menu.cloneNode(true);
    menu.parentNode.replaceChild(newMenu, menu);
    
    newMenu.innerHTML = `
        <div class="context-item" data-action="use"><i class="fas fa-hand-pointer"></i><span>Использовать</span></div>
        <div class="context-item" data-action="clear"><i class="fas fa-times"></i><span>Очистить слот</span></div>
    `;
    
    newMenu.querySelectorAll('.context-item').forEach(menuItem => {
        menuItem.addEventListener('click', () => {
            const action = menuItem.dataset.action;
            if (action === 'use') {
                if (typeof mp !== 'undefined') mp.trigger('cef:useQuickSlot', slotIndex);
            } else if (action === 'clear') {
                if (typeof mp !== 'undefined') mp.trigger('cef:clearQuickSlot', slotIndex);
                showNotification('info', `Слот ${slotIndex + 1} очищен`);
            }
            newMenu.style.display = 'none';
        });
    });
    
    setTimeout(() => {
        document.addEventListener('click', () => {
            newMenu.style.display = 'none';
        }, { once: true });
    }, 100);
}

// ===== ЭКСПОРТ =====
window.loadInventory = loadInventory;
window.updatePlayerInfo = updatePlayerInfo;
window.renderInventory = renderInventory;
window.updateGroundItems = updateGroundItems;

// ===== СТИЛИ АНИМАЦИЙ =====
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
`;
document.head.appendChild(style);

console.log('[Inventory] Скрипт загружен');
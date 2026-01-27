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
        head: null,
        mask: null,
        top: null,
        undershirt: null,
        legs: null,
        shoes: null,
        accessory: null,
        bag: null,
        armor: null,
        weapon1: null,
        weapon2: null,
        melee: null
    }
};

let draggedItem = null;
let draggedFrom = null;

// ===== БАЗА ДАННЫХ ПРЕДМЕТОВ (для иконок) =====
const itemIcons = {
    // Consumables
    'water': '💧',
    'bread': '🍞',
    'food': '🍔',
    'burger': '🍔',
    'pizza': '🍕',
    'apple': '🍎',
    'cola': '🥤',
    'beer': '🍺',
    
    // Medical
    'bandage': '🩹',
    'medkit': '💊',
    'firstaid': '🏥',
    
    // Tools
    'phone': '📱',
    'keys': '🔑',
    'flashlight': '🔦',
    'lockpick': '🔧',
    'toolkit': '🧰',
    'rope': '🪢',
    
    // Resources
    'money': '💵',
    'iron': '🪨',
    'wood': '🪵',
    'plastic': '♻️',
    
    // Weapons
    'pistol': '🔫',
    'rifle': '🔫',
    'knife': '🔪',
    'bat': '🏏',
    'pistol_ammo': '🔶',
    
    // Clothing
    'tshirt_white': '👕',
    'jeans_blue': '👖',
    'sneakers_black': '👟',
    'cap_red': '🧢',
    'jacket': '🧥',
    'shirt': '👔',
    'pants': '👖',
    'shoes': '👟',
    'hat': '🎩',
    'glasses': '👓',
    'watch': '⌚',
    'mask': '🎭',
    
    // Backpacks
    'backpack_small': '🎒',
    'backpack_medium': '🎒',
    'backpack_large': '🎒',
    
    // Default
    'default': '📦'
};

// ===== ИНИЦИАЛИЗАЦИЯ =====
window.addEventListener('DOMContentLoaded', () => {
    initializeGrids();
    setupEventListeners();
    setupEquipmentSlots();
	setupDropZone();
});

// ===== СОЗДАНИЕ СЕТОК =====
function initializeGrids() {
    // Основной инвентарь (5x7 = 35 слотов)
    const mainInventory = document.getElementById('mainInventory');
    if (mainInventory) {
        mainInventory.innerHTML = '';
        for (let i = 0; i < 35; i++) {
            const slot = createSlot('main', i);
            mainInventory.appendChild(slot);
        }
    }
    
    // Быстрые слоты (5 штук)
    const quickSlots = document.getElementById('quickSlots');
    if (quickSlots) {
        quickSlots.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const slot = createQuickSlot(i);
            quickSlots.appendChild(slot);
        }
    }
}

function createSlot(type, index) {
    const slot = document.createElement('div');
    slot.className = 'inventory-slot';
    slot.dataset.type = type;
    slot.dataset.index = index;
    
    slot.addEventListener('dragover', handleDragOver);
    slot.addEventListener('dragleave', handleDragLeave);
    slot.addEventListener('drop', handleDrop);
    slot.addEventListener('dragstart', handleDragStart);
    slot.addEventListener('dragend', handleDragEnd);
    slot.addEventListener('contextmenu', handleContextMenu);
    slot.addEventListener('mouseenter', handleMouseEnter);
    slot.addEventListener('mouseleave', handleMouseLeave);
    slot.addEventListener('dblclick', handleDoubleClick);
    
    return slot;
}

function createQuickSlot(index) {
    const slot = document.createElement('div');
    slot.className = 'quick-slot';
    slot.dataset.index = index;
    
    const number = document.createElement('div');
    number.className = 'quick-slot-number';
    number.textContent = index + 1;
    slot.appendChild(number);
    
    slot.addEventListener('click', () => {
        useQuickSlot(index);
    });
    
    return slot;
}

function setupEquipmentSlots() {
    document.querySelectorAll('.equipment-slot[data-slot]').forEach(slot => {
        slot.draggable = false;
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('dragleave', handleDragLeave);
        slot.addEventListener('drop', handleEquipmentDrop);
        slot.addEventListener('dragstart', handleDragStart);
        slot.addEventListener('dragend', handleDragEnd);
        slot.addEventListener('contextmenu', handleEquipmentContextMenu);
        slot.addEventListener('mouseenter', handleMouseEnter);
        slot.addEventListener('mouseleave', handleMouseLeave);
        slot.addEventListener('dblclick', handleEquipmentDoubleClick);
    });
}

// ===== НАСТРОЙКА ЗОНЫ ОКРУЖЕНИЯ (ВЫБРОС) =====
function setupDropZone() {
    const dropZone = document.getElementById('dropZone') || document.querySelector('.environment-zone');
    
    if (!dropZone) {
        console.log('[Inventory] Зона выброса не найдена, создаём...');
        return;
    }
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drop-hover');
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        dropZone.classList.remove('drop-hover');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drop-hover');
        
        if (!draggedItem || !draggedFrom) return;
        
        // Выбрасываем предмет
        const quantity = draggedItem.quantity || 1;
        
        if (quantity > 1) {
            // Спрашиваем сколько выбросить
            const amount = prompt(`Сколько выбросить? (1-${quantity})`, quantity.toString());
            
            if (amount && !isNaN(amount)) {
                const dropAmount = Math.min(Math.max(1, parseInt(amount)), quantity);
                
                if (typeof mp !== 'undefined') {
                    mp.trigger('cef:dropItem', draggedFrom.index, dropAmount);
                }
                
                showNotification('info', `Выброшено: ${draggedItem.name} x${dropAmount}`);
            }
        } else {
            if (typeof mp !== 'undefined') {
                mp.trigger('cef:dropItem', draggedFrom.index, 1);
            }
            
            showNotification('info', `Выброшено: ${draggedItem.name}`);
        }
        
        draggedItem = null;
        draggedFrom = null;
    });
    
    console.log('[Inventory] Зона выброса настроена');
}

// ===== КОНСТАНТЫ СЕТКИ =====
const GRID_WIDTH = 7;
const GRID_HEIGHT = 8;
const CELL_SIZE = 50;
const CELL_GAP = 2;

// ===== РЕНДЕР ИНВЕНТАРЯ =====
function renderInventory() {
    const grid = document.getElementById('inventoryGrid');
    if (!grid) return;
    
    // Очищаем
    grid.innerHTML = '';
    
    // Создаём ячейки сетки
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const cell = document.createElement('div');
            cell.className = 'inventory-cell';
            cell.dataset.x = x;
            cell.dataset.y = y;
            cell.dataset.slot = y * GRID_WIDTH + x;
            
            cell.addEventListener('dragover', handleCellDragOver);
            cell.addEventListener('dragleave', handleCellDragLeave);
            cell.addEventListener('drop', handleCellDrop);
            
            grid.appendChild(cell);
        }
    }
    
    // Карта занятых ячеек
    const occupiedCells = new Set();
    
    // Рендерим предметы
    inventory.main.forEach((item, slot) => {
        if (!item) return;
        
        const width = item.width || 1;
        const height = item.height || 1;
        const startX = slot % GRID_WIDTH;
        const startY = Math.floor(slot / GRID_WIDTH);
        
        // Создаём элемент предмета
        const itemEl = document.createElement('div');
        itemEl.className = `inventory-item size-${width}x${height} type-${item.type || 'default'}`;
        itemEl.dataset.slot = slot;
        itemEl.dataset.width = width;
        itemEl.dataset.height = height;
        itemEl.draggable = true;
        
        // Позиционирование
        itemEl.style.position = 'absolute';
        itemEl.style.left = `${startX * (CELL_SIZE + CELL_GAP)}px`;
        itemEl.style.top = `${startY * (CELL_SIZE + CELL_GAP)}px`;
        
        // Контейнер для иконки
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
        
        // Информация
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
        
        // События
        itemEl.addEventListener('dragstart', (e) => handleItemDragStart(e, item, slot));
        itemEl.addEventListener('dragend', handleItemDragEnd);
        itemEl.addEventListener('dblclick', () => handleItemDoubleClick(item, slot));
        itemEl.addEventListener('contextmenu', (e) => handleItemContextMenu(e, item, slot));
        itemEl.addEventListener('mouseenter', (e) => showItemTooltip(e, item));
        itemEl.addEventListener('mouseleave', hideTooltip);
        
        grid.appendChild(itemEl);
        
        // Помечаем занятые ячейки
        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                const cellSlot = (startY + dy) * GRID_WIDTH + (startX + dx);
                occupiedCells.add(cellSlot);
                
                if (dx !== 0 || dy !== 0) {
                    const cell = grid.querySelector(`.inventory-cell[data-slot="${cellSlot}"]`);
                    if (cell) cell.classList.add('occupied');
                }
            }
        }
    });
    
    renderEquipment();
}

// ===== DRAG & DROP =====
let draggedItem = null;
let draggedFromSlot = null;
let draggedWidth = 1;
let draggedHeight = 1;

function handleItemDragStart(e, item, slot) {
    draggedItem = item;
    draggedFromSlot = slot;
    draggedWidth = item.width || 1;
    draggedHeight = item.height || 1;
    
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleItemDragEnd(e) {
    e.target.classList.remove('dragging');
    
    document.querySelectorAll('.inventory-cell').forEach(cell => {
        cell.classList.remove('drag-over', 'drag-invalid');
    });
    
    draggedItem = null;
    draggedFromSlot = null;
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

function handleCellDragLeave(e) {
    document.querySelectorAll('.inventory-cell').forEach(cell => {
        cell.classList.remove('drag-over', 'drag-invalid');
    });
}

function handleCellDrop(e) {
    e.preventDefault();
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
    
    document.querySelectorAll('.inventory-cell').forEach(cell => {
        cell.classList.remove('drag-over', 'drag-invalid');
    });
}

function checkCanPlace(startX, startY, width, height, ignoreSlot = -1) {
    if (startX + width > GRID_WIDTH || startY + height > GRID_HEIGHT) {
        return false;
    }
    
    const ignoreX = ignoreSlot % GRID_WIDTH;
    const ignoreY = Math.floor(ignoreSlot / GRID_WIDTH);
    
    for (let dy = 0; dy < height; dy++) {
        for (let dx = 0; dx < width; dx++) {
            const checkX = startX + dx;
            const checkY = startY + dy;
            const slot = checkY * GRID_WIDTH + checkX;
            
            // Проверяем не является ли ячейка частью перетаскиваемого предмета
            if (ignoreSlot !== -1) {
                if (checkX >= ignoreX && checkX < ignoreX + draggedWidth &&
                    checkY >= ignoreY && checkY < ignoreY + draggedHeight) {
                    continue;
                }
            }
            
            // Проверяем занятость
            const cell = document.querySelector(`.inventory-cell[data-slot="${slot}"]`);
            if (cell && cell.classList.contains('occupied')) {
                return false;
            }
            
            // Проверяем есть ли предмет
            if (inventory.main[slot] && slot !== ignoreSlot) {
                return false;
            }
        }
    }
    
    return true;
}

function highlightCells(startX, startY, width, height, isValid) {
    document.querySelectorAll('.inventory-cell').forEach(cell => {
        cell.classList.remove('drag-over', 'drag-invalid');
    });
    
    for (let dy = 0; dy < height; dy++) {
        for (let dx = 0; dx < width; dx++) {
            const x = startX + dx;
            const y = startY + dy;
            
            if (x < GRID_WIDTH && y < GRID_HEIGHT) {
                const slot = y * GRID_WIDTH + x;
                const cell = document.querySelector(`.inventory-cell[data-slot="${slot}"]`);
                
                if (cell) {
                    cell.classList.add(isValid ? 'drag-over' : 'drag-invalid');
                }
            }
        }
    }
}

// ===== DRAG & DROP =====
let draggedItem = null;
let draggedFromSlot = null;
let draggedWidth = 1;
let draggedHeight = 1;

function handleItemDragStart(e, item, slot) {
    draggedItem = item;
    draggedFromSlot = slot;
    draggedWidth = item.width || 1;
    draggedHeight = item.height || 1;
    
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleItemDragEnd(e) {
    e.target.classList.remove('dragging');
    
    document.querySelectorAll('.inventory-cell').forEach(cell => {
        cell.classList.remove('drag-over', 'drag-invalid');
    });
    
    draggedItem = null;
    draggedFromSlot = null;
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

function handleCellDragLeave(e) {
    document.querySelectorAll('.inventory-cell').forEach(cell => {
        cell.classList.remove('drag-over', 'drag-invalid');
    });
}

function handleCellDrop(e) {
    e.preventDefault();
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
    
    document.querySelectorAll('.inventory-cell').forEach(cell => {
        cell.classList.remove('drag-over', 'drag-invalid');
    });
}

function checkCanPlace(startX, startY, width, height, ignoreSlot = -1) {
    if (startX + width > GRID_WIDTH || startY + height > GRID_HEIGHT) {
        return false;
    }
    
    const ignoreX = ignoreSlot % GRID_WIDTH;
    const ignoreY = Math.floor(ignoreSlot / GRID_WIDTH);
    
    for (let dy = 0; dy < height; dy++) {
        for (let dx = 0; dx < width; dx++) {
            const checkX = startX + dx;
            const checkY = startY + dy;
            const slot = checkY * GRID_WIDTH + checkX;
            
            // Проверяем не является ли ячейка частью перетаскиваемого предмета
            if (ignoreSlot !== -1) {
                if (checkX >= ignoreX && checkX < ignoreX + draggedWidth &&
                    checkY >= ignoreY && checkY < ignoreY + draggedHeight) {
                    continue;
                }
            }
            
            // Проверяем занятость
            const cell = document.querySelector(`.inventory-cell[data-slot="${slot}"]`);
            if (cell && cell.classList.contains('occupied')) {
                return false;
            }
            
            // Проверяем есть ли предмет
            if (inventory.main[slot] && slot !== ignoreSlot) {
                return false;
            }
        }
    }
    
    return true;
}

function highlightCells(startX, startY, width, height, isValid) {
    document.querySelectorAll('.inventory-cell').forEach(cell => {
        cell.classList.remove('drag-over', 'drag-invalid');
    });
    
    for (let dy = 0; dy < height; dy++) {
        for (let dx = 0; dx < width; dx++) {
            const x = startX + dx;
            const y = startY + dy;
            
            if (x < GRID_WIDTH && y < GRID_HEIGHT) {
                const slot = y * GRID_WIDTH + x;
                const cell = document.querySelector(`.inventory-cell[data-slot="${slot}"]`);
                
                if (cell) {
                    cell.classList.add(isValid ? 'drag-over' : 'drag-invalid');
                }
            }
        }
    }
}

function renderMainGrid() {
    const slots = document.querySelectorAll('.inventory-slot[data-type="main"]');
    
    slots.forEach((slot, index) => {
        slot.innerHTML = '';
        slot.classList.remove('has-item');
        slot.draggable = false;
        
        const item = inventory.main[index];
        
        if (item) {
            slot.classList.add('has-item');
            slot.draggable = true;
            
            // Иконка
            const icon = document.createElement('div');
            icon.className = 'item-icon';
            icon.textContent = getItemIcon(item.id || item.name);
            slot.appendChild(icon);
            
            // Количество
            if (item.quantity > 1) {
                const quantity = document.createElement('div');
                quantity.className = 'item-quantity';
                quantity.textContent = item.quantity;
                slot.appendChild(quantity);
            }
            
            // Вес
            const weight = document.createElement('div');
            weight.className = 'item-weight';
            const itemWeight = (item.weight || 0.1) * (item.quantity || 1);
            weight.textContent = `${itemWeight.toFixed(1)}kg`;
            slot.appendChild(weight);
            
            // Тип предмета (цветовая индикация)
            if (item.type) {
                slot.classList.add(`item-type-${item.type}`);
            }
        }
    });
}

function renderEquipment() {
    const equipmentSlots = document.querySelectorAll('.equipment-slot[data-slot]');
    
    equipmentSlots.forEach(slot => {
        const slotType = slot.dataset.slot;
        const item = inventory.equipment[slotType];
        
        // ПОЛНОСТЬЮ очищаем слот от старого контента
        const existingIcon = slot.querySelector('.item-icon');
        if (existingIcon) existingIcon.remove();
        
        const existingName = slot.querySelector('.equipped-name');
        if (existingName) existingName.remove();
        
        const existingWeight = slot.querySelector('.item-weight');
        if (existingWeight) existingWeight.remove();
        
        const existingQuantity = slot.querySelector('.item-quantity');
        if (existingQuantity) existingQuantity.remove();
        
        // Убираем классы
        slot.classList.remove('has-item');
        slot.classList.remove('item-type-weapon');
        slot.classList.remove('item-type-clothing');
        slot.draggable = false;
        
        // Если есть предмет - добавляем его
        if (item) {
            slot.classList.add('has-item');
            slot.draggable = true;
            
            // Добавляем класс типа
            if (item.type) {
                slot.classList.add(`item-type-${item.type}`);
            }
            
            const icon = document.createElement('div');
            icon.className = 'item-icon';
            icon.textContent = getItemIcon(item.id || item.name);
            icon.style.fontSize = '28px';
            slot.appendChild(icon);
            
            const name = document.createElement('div');
            name.className = 'equipped-name';
            name.textContent = item.name || item.id;
            slot.appendChild(name);
        }
    });
}

function renderQuickSlots() {
    const quickSlots = document.querySelectorAll('.quick-slot');
    
    quickSlots.forEach((slot, index) => {
        const existingIcon = slot.querySelector('.item-icon');
        if (existingIcon) existingIcon.remove();
        
        // Быстрые слоты могут ссылаться на предметы в инвентаре
        // Пока просто показываем пустые слоты
    });
}

function getItemIcon(itemId) {
    if (!itemId) return itemIcons['default'];
    
    // Проверяем точное совпадение
    if (itemIcons[itemId]) {
        return itemIcons[itemId];
    }
    
    // Проверяем частичное совпадение
    const itemIdLower = itemId.toLowerCase();
    for (const [key, icon] of Object.entries(itemIcons)) {
        if (itemIdLower.includes(key) || key.includes(itemIdLower)) {
            return icon;
        }
    }
    
    return itemIcons['default'];
}

// ===== DRAG & DROP =====
function handleDragStart(e) {
    const slot = e.currentTarget;
    const type = slot.dataset.type;
    const index = parseInt(slot.dataset.index);
    
    let item = null;
    
    if (type === 'main') {
        item = inventory.main[index];
    } else if (slot.classList.contains('equipment-slot')) {
        const slotType = slot.dataset.slot;
        item = inventory.equipment[slotType];
    }
    
    if (item) {
        draggedItem = { ...item };
        draggedFrom = { 
            type: type || 'equipment', 
            index: slot.classList.contains('equipment-slot') ? slot.dataset.slot : index,
            slot: slot.dataset.slot
        };
        
        slot.classList.add('dragging');
        
        // Устанавливаем данные для drag
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify(draggedFrom));
    }
}

function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    
    document.querySelectorAll('.inventory-slot, .equipment-slot').forEach(slot => {
        slot.classList.remove('drag-over');
    });
    
    draggedItem = null;
    draggedFrom = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    
    document.querySelectorAll('.inventory-slot, .equipment-slot').forEach(slot => {
        slot.classList.remove('drag-over');
    });
    
    if (!draggedItem || !draggedFrom) return;
    
    const targetSlot = e.currentTarget;
    const targetType = targetSlot.dataset.type;
    const targetIndex = parseInt(targetSlot.dataset.index);
    
    // Перемещаем предмет
    moveItem(draggedFrom, { type: targetType, index: targetIndex });
    
    draggedItem = null;
    draggedFrom = null;
}

function handleEquipmentDrop(e) {
    e.preventDefault();
    
    document.querySelectorAll('.inventory-slot, .equipment-slot').forEach(slot => {
        slot.classList.remove('drag-over');
    });
    
    if (!draggedItem || !draggedFrom) return;
    
    const targetSlot = e.currentTarget;
    const slotType = targetSlot.dataset.slot;
    
    // Проверяем можно ли экипировать
    if (!canEquipToSlot(draggedItem, slotType)) {
        showNotification('error', 'Этот предмет нельзя надеть в этот слот');
        return;
    }
    
    // Отправляем на сервер
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:equipToSlot', draggedFrom.index, slotType);
    }
    
    draggedItem = null;
    draggedFrom = null;
}

function canEquipToSlot(item, slotType) {
    if (!item || !item.type) return false;
    
    // Проверка типа предмета для слота
    const slotTypeMapping = {
        'head': ['clothing'],
        'hat': ['clothing'],
        'mask': ['clothing'],
        'top': ['clothing'],
        'undershirt': ['clothing'],
        'legs': ['clothing'],
        'shoes': ['clothing'],
        'accessory': ['clothing', 'accessory'],
        'bag': ['backpack'],
        'armor': ['armor'],
        'weapon1': ['weapon'],
        'weapon2': ['weapon'],
        'melee': ['weapon']
    };
    
    const allowedTypes = slotTypeMapping[slotType];
    if (!allowedTypes) return false;
    
    return allowedTypes.includes(item.type);
}

function moveItem(from, to) {
    // Отправляем на сервер
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:moveItem', JSON.stringify(from), JSON.stringify(to));
    }
    
    // Локальное обновление для отзывчивости
    if (from.type === 'main' && to.type === 'main') {
        const temp = inventory.main[to.index];
        inventory.main[to.index] = inventory.main[from.index];
        inventory.main[from.index] = temp;
        renderInventory();
    }
}

// ===== ДВОЙНОЙ КЛИК (ИСПОЛЬЗОВАНИЕ) =====
function handleDoubleClick(e) {
    const slot = e.currentTarget;
    const index = parseInt(slot.dataset.index);
    const item = inventory.main[index];
    
    if (!item) return;
    
    // Если это одежда - надеваем
    if (item.type === 'clothing') {
        if (typeof mp !== 'undefined') {
            mp.trigger('cef:useItem', index);
        }
        showNotification('info', `Надеваем: ${item.name}`);
    } 
    // Если это расходник - используем
    else if (item.type === 'consumable' || item.type === 'medical' || item.type === 'food') {
        if (typeof mp !== 'undefined') {
            mp.trigger('cef:useItem', index);
        }
        showNotification('success', `Использован: ${item.name}`);
    }
    // Другие типы
    else {
        if (typeof mp !== 'undefined') {
            mp.trigger('cef:useItem', index);
        }
    }
}

function handleEquipmentDoubleClick(e) {
    const slot = e.currentTarget;
    const slotType = slot.dataset.slot;
    const item = inventory.equipment[slotType];
    
    if (!item) return;
    
    // Снимаем предмет
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:unequipItem', slotType);
    }
    showNotification('info', `Снимаем: ${item.name}`);
}

// ===== КОНТЕКСТНОЕ МЕНЮ =====
function handleContextMenu(e) {
    e.preventDefault();
    
    const slot = e.currentTarget;
    const index = parseInt(slot.dataset.index);
    const item = inventory.main[index];
    
    if (!item) return;
    
    showContextMenu(e.clientX, e.clientY, item, { type: 'main', index });
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
    
    // Позиционируем меню
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.display = 'block';
    
    // Очищаем старые обработчики
    const newMenu = menu.cloneNode(true);
    menu.parentNode.replaceChild(newMenu, menu);
    
    // Настраиваем пункты меню в зависимости от типа предмета
    const useBtn = newMenu.querySelector('[data-action="use"]');
    const equipBtn = newMenu.querySelector('[data-action="equip"]');
    const dropBtn = newMenu.querySelector('[data-action="drop"]');
    const splitBtn = newMenu.querySelector('[data-action="split"]');
    const infoBtn = newMenu.querySelector('[data-action="info"]');
    
    // Показываем/скрываем кнопки
    if (useBtn) {
        if (item.type === 'consumable' || item.type === 'medical' || item.type === 'food' || item.type === 'tool') {
            useBtn.style.display = 'block';
            useBtn.textContent = 'Использовать';
        } else {
            useBtn.style.display = 'none';
        }
    }
    
    if (equipBtn) {
        if (item.type === 'clothing' || item.type === 'weapon' || item.type === 'backpack') {
            equipBtn.style.display = 'block';
            equipBtn.textContent = item.type === 'clothing' ? 'Надеть' : 'Экипировать';
        } else {
            equipBtn.style.display = 'none';
        }
    }
    
    if (splitBtn) {
        splitBtn.style.display = item.quantity > 1 ? 'block' : 'none';
    }
    
    // Добавляем обработчики
    newMenu.querySelectorAll('.context-item').forEach(menuItem => {
        menuItem.addEventListener('click', () => {
            const action = menuItem.dataset.action;
            handleContextAction(action, item, location);
            newMenu.style.display = 'none';
        });
    });
    
    // Закрытие при клике вне меню
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
    
    // Для экипировки только "Снять" и "Инфо"
    newMenu.innerHTML = `
        <div class="context-item" data-action="unequip">Снять</div>
        <div class="context-item" data-action="info">Информация</div>
    `;
    
    newMenu.querySelectorAll('.context-item').forEach(menuItem => {
        menuItem.addEventListener('click', () => {
            const action = menuItem.dataset.action;
            
            if (action === 'unequip') {
                if (typeof mp !== 'undefined') {
                    mp.trigger('cef:unequipItem', slotType);
                }
                showNotification('info', `Снято: ${item.name}`);
            } else if (action === 'info') {
                showItemInfo(item);
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
        case 'equip':
            if (typeof mp !== 'undefined') {
                mp.trigger('cef:useItem', location.index);
            }
            showNotification('success', `Использован: ${item.name}`);
            break;
            
        case 'drop':
            dropItem(item, location);
            break;
            
        case 'split':
            splitItem(item, location);
            break;
            
        case 'info':
            showItemInfo(item);
            break;
    }
}

function dropItem(item, location) {
    const quantity = item.quantity || 1;
    
    if (quantity > 1) {
        const amount = prompt(`Сколько выбросить? (1-${quantity})`, '1');
        if (amount && !isNaN(amount)) {
            const dropAmount = Math.min(Math.max(1, parseInt(amount)), quantity);
            if (typeof mp !== 'undefined') {
                mp.trigger('cef:dropItem', location.index, dropAmount);
            }
            showNotification('info', `Выброшено: ${item.name} x${dropAmount}`);
        }
    } else {
        if (typeof mp !== 'undefined') {
            mp.trigger('cef:dropItem', location.index, 1);
        }
        showNotification('info', `Выброшено: ${item.name}`);
    }
}

function splitItem(item, location) {
    if (!item.quantity || item.quantity <= 1) {
        showNotification('error', 'Невозможно разделить');
        return;
    }
    
    const amount = prompt(`Разделить (макс: ${item.quantity - 1}):`, Math.floor(item.quantity / 2));
    
    if (amount && !isNaN(amount)) {
        const splitAmount = parseInt(amount);
        
        if (splitAmount > 0 && splitAmount < item.quantity) {
            if (typeof mp !== 'undefined') {
                mp.trigger('cef:splitItem', location.index, splitAmount);
            }
            showNotification('success', 'Предмет разделён');
        }
    }
}

function showItemInfo(item) {
    const info = `
${item.name || item.id}

Тип: ${item.type || 'Неизвестно'}
Вес: ${item.weight || 0.1} kg
${item.quantity > 1 ? `Количество: ${item.quantity}` : ''}
${item.description || ''}
    `.trim();
    
    alert(info);
}

// ===== TOOLTIP =====
function handleMouseEnter(e) {
    const slot = e.currentTarget;
    const type = slot.dataset.type;
    const index = slot.dataset.index || slot.dataset.slot;
    
    let item = null;
    
    if (type === 'main') {
        item = inventory.main[parseInt(index)];
    } else if (slot.classList.contains('equipment-slot')) {
        item = inventory.equipment[index];
    }
    
    if (!item) return;
    
    const tooltip = document.getElementById('itemTooltip');
    if (!tooltip) return;
    
    const tooltipName = document.getElementById('tooltipName');
    const tooltipWeight = document.getElementById('tooltipWeight');
    const tooltipDescription = document.getElementById('tooltipDescription');
    
    if (tooltipName) tooltipName.textContent = item.name || item.id;
    if (tooltipWeight) tooltipWeight.textContent = `${item.weight || 0.1} kg`;
    if (tooltipDescription) {
        tooltipDescription.textContent = `Тип: ${item.type || 'Неизвестно'}${item.quantity > 1 ? ` | Кол-во: ${item.quantity}` : ''}`;
    }
    
    tooltip.style.display = 'block';
    tooltip.style.left = `${e.clientX + 15}px`;
    tooltip.style.top = `${e.clientY + 15}px`;
    
    slot.addEventListener('mousemove', moveTooltip);
}

function handleMouseLeave(e) {
    const tooltip = document.getElementById('itemTooltip');
    if (tooltip) tooltip.style.display = 'none';
    
    e.currentTarget.removeEventListener('mousemove', moveTooltip);
}

function moveTooltip(e) {
    const tooltip = document.getElementById('itemTooltip');
    if (tooltip) {
        tooltip.style.left = `${e.clientX + 15}px`;
        tooltip.style.top = `${e.clientY + 15}px`;
    }
}

// ===== БЫСТРЫЕ СЛОТЫ =====
function useQuickSlot(index) {
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:useQuickSlot', index);
    }
}

// ===== ОБНОВЛЕНИЕ ДАННЫХ =====
function updateWeight() {
    let totalWeight = 0;
    
    // Вес из основного инвентаря
    inventory.main.forEach(item => {
        if (item) {
            totalWeight += (item.weight || 0.1) * (item.quantity || 1);
        }
    });
    
    // Вес экипировки
    Object.values(inventory.equipment).forEach(item => {
        if (item) {
            totalWeight += item.weight || 0.1;
        }
    });
    
    playerData.weight = totalWeight;
    
    const weightDisplay = document.getElementById('weightDisplay');
    if (weightDisplay) {
        weightDisplay.textContent = `${totalWeight.toFixed(1)} / ${playerData.maxWeight} kg`;
        
        const percentage = (totalWeight / playerData.maxWeight) * 100;
        
        if (percentage >= 90) {
            weightDisplay.style.color = '#f44336';
        } else if (percentage >= 70) {
            weightDisplay.style.color = '#ff9800';
        } else {
            weightDisplay.style.color = 'rgba(255, 255, 255, 0.7)';
        }
    }
}

function updatePlayerDisplay() {
    const playerName = document.getElementById('playerName');
    const cashAmount = document.getElementById('cashAmount');
    const bankAmount = document.getElementById('bankAmount');
    
    if (playerName) playerName.textContent = playerData.name;
    if (cashAmount) cashAmount.textContent = `$${(playerData.cash || 0).toLocaleString()}`;
    if (bankAmount) bankAmount.textContent = `$${(playerData.bank || 0).toLocaleString()}`;
    
    // Статы
    updateStat('thirst', playerData.thirst || 100);
    updateStat('hunger', playerData.hunger || 100);
    updateStat('health', playerData.health || 100);
}

function updateStat(stat, value) {
    const bar = document.getElementById(`${stat}Bar`);
    const valueEl = document.getElementById(`${stat}Value`);
    
    if (bar) bar.style.width = `${value}%`;
    if (valueEl) valueEl.textContent = Math.round(value);
}

function updatePlayerInfo(data) {
    if (!data) return;
    
    playerData = { ...playerData, ...data };
    updatePlayerDisplay();
}

// ===== УВЕДОМЛЕНИЯ =====
function showNotification(type, message) {
    // Создаём элемент уведомления
    const notification = document.createElement('div');
    notification.className = `inventory-notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 10000;
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
    if (closeBtn) {
        closeBtn.addEventListener('click', closeInventory);
    }
    
    // Клавиши 1-5 для быстрых слотов
    document.addEventListener('keydown', (e) => {
        if (e.key >= '1' && e.key <= '5') {
            const index = parseInt(e.key) - 1;
            useQuickSlot(index);
        }
        
        // ESC для закрытия
        if (e.key === 'Escape') {
            closeInventory();
        }
    });
}

function closeInventory() {
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:closeInventory');
    }
}

// ===== ЗАГРУЗКА ДАННЫХ =====
function loadInventory(inventoryJson, charDataJson) {
    try {
        // Парсим данные
        const invData = typeof inventoryJson === 'string' ? JSON.parse(inventoryJson) : inventoryJson;
        const charData = charDataJson ? (typeof charDataJson === 'string' ? JSON.parse(charDataJson) : charDataJson) : null;
        
        // СНАЧАЛА очищаем текущий инвентарь полностью
        inventory.main = [];
        inventory.equipment = {
            head: null,
            mask: null,
            top: null,
            undershirt: null,
            legs: null,
            shoes: null,
            accessory: null,
            bag: null,
            armor: null,
            weapon1: null,
            weapon2: null,
            melee: null
        };
        
        // Обрабатываем инвентарь
        if (invData) {
            // Если это массив - это main inventory
            if (Array.isArray(invData)) {
                invData.forEach(item => {
                    if (item && item.slot !== undefined) {
                        inventory.main[item.slot] = item;
                    }
                });
            }
            // Если это объект с main и equipment
            else if (invData.main !== undefined) {
                // Main inventory
                if (Array.isArray(invData.main)) {
                    invData.main.forEach(item => {
                        if (item && item.slot !== undefined) {
                            inventory.main[item.slot] = item;
                        }
                    });
                } else {
                    // Если main это объект (слот -> предмет)
                    for (const [slot, item] of Object.entries(invData.main)) {
                        if (item) {
                            inventory.main[parseInt(slot)] = item;
                        }
                    }
                }
                
                // Equipment - заменяем только те слоты, которые пришли с сервера
                if (invData.equipment) {
                    for (const [slotType, item] of Object.entries(invData.equipment)) {
                        // Если item === null или undefined - слот пустой
                        // Если item есть - записываем его
                        inventory.equipment[slotType] = item || null;
                    }
                }
            }
        }
        
        // Обновляем данные персонажа
        if (charData) {
            updatePlayerInfo(charData);
        }
        
        // Рендерим
        renderInventory();
        
    } catch (err) {
        console.error('[Inventory] Ошибка загрузки:', err);
    }
}

// ===== ПРЕДМЕТЫ НА ЗЕМЛЕ =====
let groundItems = [];

// Обновление предметов на земле
function updateGroundItems(itemsJson) {
    try {
        groundItems = typeof itemsJson === 'string' ? JSON.parse(itemsJson) : itemsJson;
        renderGroundItems();
    } catch (err) {
        console.error('[Inventory] Ошибка обновления предметов на земле:', err);
    }
}

// Рендер предметов на земле
function renderGroundItems() {
    const container = document.getElementById('environmentGrid');
    if (!container) return;
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    if (groundItems.length === 0) {
        container.innerHTML = '<div class="no-items-hint">Предметов рядом нет</div>';
        return;
    }
    
    groundItems.forEach(item => {
        const slot = document.createElement('div');
        slot.className = 'ground-item-slot';
        slot.dataset.groundItemId = item.id;
        
        // Иконка
        const icon = document.createElement('div');
        icon.className = 'item-icon';
        icon.textContent = getItemIcon(item.name);
        slot.appendChild(icon);
        
        // Количество
        if (item.quantity > 1) {
            const quantity = document.createElement('div');
            quantity.className = 'item-quantity';
            quantity.textContent = item.quantity;
            slot.appendChild(quantity);
        }
        
        // Расстояние
        const distance = document.createElement('div');
        distance.className = 'item-distance';
        distance.textContent = `${item.distance.toFixed(1)}m`;
        slot.appendChild(distance);
        
        // Клик для подбора
        slot.addEventListener('click', () => {
            pickupGroundItem(item.id);
        });
        
        // Подсказка при наведении
        slot.addEventListener('mouseenter', (e) => {
            showGroundItemTooltip(e, item);
        });
        
        slot.addEventListener('mouseleave', () => {
            hideTooltip();
        });
        
        container.appendChild(slot);
    });
}

// Подбор предмета
function pickupGroundItem(groundItemId) {
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:pickupItem', groundItemId);
    }
    showNotification('info', 'Подбираем предмет...');
}

// Тултип для предмета на земле
function showGroundItemTooltip(e, item) {
    const tooltip = document.getElementById('itemTooltip');
    if (!tooltip) return;
    
    const tooltipName = document.getElementById('tooltipName');
    const tooltipWeight = document.getElementById('tooltipWeight');
    const tooltipDescription = document.getElementById('tooltipDescription');
    
    if (tooltipName) tooltipName.textContent = item.name;
    if (tooltipWeight) tooltipWeight.textContent = `${item.weight || 0.1} kg`;
    if (tooltipDescription) {
        tooltipDescription.textContent = `Количество: ${item.quantity} | Расстояние: ${item.distance.toFixed(1)}м`;
    }
    
    tooltip.style.display = 'block';
    tooltip.style.left = `${e.clientX + 15}px`;
    tooltip.style.top = `${e.clientY + 15}px`;
}

function hideTooltip() {
    const tooltip = document.getElementById('itemTooltip');
    if (tooltip) tooltip.style.display = 'none';
}

// Экспортируем функции
window.updateGroundItems = updateGroundItems;

// ===== ЭКСПОРТ ФУНКЦИЙ =====
window.loadInventory = loadInventory;
window.updatePlayerInfo = updatePlayerInfo;
window.renderInventory = renderInventory;

// Добавляем стили для анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .inventory-slot.item-type-clothing { border-color: rgba(156, 39, 176, 0.5); }
    .inventory-slot.item-type-weapon { border-color: rgba(244, 67, 54, 0.5); }
    .inventory-slot.item-type-consumable { border-color: rgba(76, 175, 80, 0.5); }
    .inventory-slot.item-type-medical { border-color: rgba(33, 150, 243, 0.5); }
    .inventory-slot.item-type-tool { border-color: rgba(255, 193, 7, 0.5); }
    
    .inventory-slot.drag-over {
        border-color: #4caf50 !important;
        background: rgba(76, 175, 80, 0.2) !important;
    }
    
    .inventory-slot.dragging {
        opacity: 0.5;
    }
    
    .equipment-slot.has-item {
        background: rgba(76, 175, 80, 0.2);
        border-color: rgba(76, 175, 80, 0.5);
    }
    
    .equipped-name {
        position: absolute;
        bottom: 2px;
        left: 0;
        right: 0;
        font-size: 9px;
        text-align: center;
        color: rgba(255,255,255,0.6);
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
    }
`;
document.head.appendChild(style);
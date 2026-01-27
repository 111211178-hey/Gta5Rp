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
    environment: [], // Окружение (4x6 = 24)
    main: [],        // Основной инвентарь (5x6 = 30)
    backpack: [],    // Рюкзак (4x5 = 20)
    equipment: {     // Экипировка
        head: null,
        mask: null,
        top: null,
        legs: null,
        shoes: null,
        backpack: null,
        accessory: null,
        weapon1: null,
        weapon2: null,
        melee: null
    },
    quickSlots: []   // Быстрые с��оты (5 штук)
};

let draggedItem = null;
let draggedFrom = null;

// ===== БАЗА ДАННЫХ ПРЕДМЕТОВ =====
const itemDatabase = {
    'water': { name: 'Вода', icon: '💧', weight: 0.5, stackable: true, maxStack: 10, type: 'consumable' },
    'food': { name: 'Еда', icon: '🍔', weight: 0.3, stackable: true, maxStack: 10, type: 'consumable' },
    'bandage': { name: 'Бинт', icon: '🩹', weight: 0.1, stackable: true, maxStack: 5, type: 'medical' },
    'phone': { name: 'Телефон', icon: '📱', weight: 0.2, stackable: false, type: 'tool' },
    'keys': { name: 'Ключи', icon: '🔑', weight: 0.1, stackable: false, type: 'tool' },
    'money': { name: 'Деньги', icon: '💵', weight: 0.01, stackable: true, maxStack: 999, type: 'currency' },
    'pistol': { name: 'Пистолет', icon: '🔫', weight: 1.5, stackable: false, type: 'weapon' },
    'rifle': { name: 'Винтовка', icon: '🔫', weight: 3.5, stackable: false, type: 'weapon' },
    'knife': { name: 'Нож', icon: '🔪', weight: 0.5, stackable: false, type: 'weapon' },
    'backpack_small': { name: 'Рюкзак (малый)', icon: '🎒', weight: 1.0, stackable: false, type: 'backpack', capacity: 20 },
    'shirt': { name: 'Рубашка', icon: '👕', weight: 0.5, stackable: false, type: 'clothing' },
    'pants': { name: 'Штаны', icon: '👖', weight: 0.6, stackable: false, type: 'clothing' },
    'shoes': { name: 'Ботинки', icon: '👟', weight: 0.8, stackable: false, type: 'clothing' },
    'hat': { name: 'Шапка', icon: '🎩', weight: 0.2, stackable: false, type: 'clothing' },
    'watch': { name: 'Часы', icon: '⌚', weight: 0.1, stackable: false, type: 'accessory' }
};

// ===== ИНИЦИАЛИЗАЦИЯ =====
window.addEventListener('DOMContentLoaded', () => {
    console.log('[Inventory] Инициализация нового инвентаря...');
    
    initializeGrids();
    setupEventListeners();
    loadTestData();
    
    console.log('[Inventory] ✅ Инициализация завершена');
});

// ===== СОЗДАНИЕ СЕТОК =====
function initializeGrids() {
    // Окружение (4x6 = 24 слота)
    const environmentGrid = document.getElementById('environmentGrid');
    for (let i = 0; i < 24; i++) {
        const slot = createSlot('environment', i);
        environmentGrid.appendChild(slot);
    }
    
    // Основной инвентарь (5x6 = 30 слотов)
    const mainInventory = document.getElementById('mainInventory');
    for (let i = 0; i < 30; i++) {
        const slot = createSlot('main', i);
        mainInventory.appendChild(slot);
    }
    
    // Рюкзак (4x5 = 20 слотов)
    const backpackGrid = document.getElementById('backpackGrid');
    for (let i = 0; i < 20; i++) {
        const slot = createSlot('backpack', i);
        backpackGrid.appendChild(slot);
    }
    
    // Быстрые слоты (5 штук)
    const quickSlots = document.getElementById('quickSlots');
    for (let i = 0; i < 5; i++) {
        const slot = createQuickSlot(i);
        quickSlots.appendChild(slot);
    }
    
    console.log('[Inventory] Сетки созданы');
}

function createSlot(type, index) {
    const slot = document.createElement('div');
    slot.className = 'inventory-slot';
    slot.dataset.type = type;
    slot.dataset.index = index;
    
    // Drag & Drop
    slot.addEventListener('dragover', handleDragOver);
    slot.addEventListener('drop', handleDrop);
    slot.addEventListener('dragstart', handleDragStart);
    slot.addEventListener('dragend', handleDragEnd);
    
    // Контекстное меню
    slot.addEventListener('contextmenu', handleContextMenu);
    
    // Tooltip
    slot.addEventListener('mouseenter', handleMouseEnter);
    slot.addEventListener('mouseleave', handleMouseLeave);
    
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

// ===== ОТРИСОВКА ПРЕДМЕТОВ =====
function renderInventory() {
    // Окружение
    renderGrid('environment', inventory.environment);
    
    // Основной инвентарь
    renderGrid('main', inventory.main);
    
    // Рюкзак
    renderGrid('backpack', inventory.backpack);
    
    // Экипировка
    renderEquipment();
    
    // Быстрые слоты
    renderQuickSlots();
    
    // Обновляем вес
    updateWeight();
}

function renderGrid(type, items) {
    const slots = document.querySelectorAll(`.inventory-slot[data-type="${type}"]`);
    
    slots.forEach((slot, index) => {
        slot.innerHTML = '';
        slot.classList.remove('has-item');
        slot.draggable = false;
        
        const item = items[index];
        
        if (item) {
            slot.classList.add('has-item');
            slot.draggable = true;
            
            const itemData = itemDatabase[item.id];
            
            if (itemData) {
                // Иконка
                const icon = document.createElement('div');
                icon.className = 'item-icon';
                icon.textContent = itemData.icon;
                slot.appendChild(icon);
                
                // Количество (для stackable)
                if (itemData.stackable && item.quantity > 1) {
                    const quantity = document.createElement('div');
                    quantity.className = 'item-quantity';
                    quantity.textContent = item.quantity;
                    slot.appendChild(quantity);
                }
                
                // Вес
                const weight = document.createElement('div');
                weight.className = 'item-weight';
                weight.textContent = `${(itemData.weight * (item.quantity || 1)).toFixed(1)}kg`;
                slot.appendChild(weight);
            }
        }
    });
}

function renderEquipment() {
    const equipmentSlots = document.querySelectorAll('.equipment-slot[data-slot]');
    
    equipmentSlots.forEach(slot => {
        const slotType = slot.dataset.slot;
        const item = inventory.equipment[slotType];
        
        // Удаляем старый контент (кроме иконки и label)
        const existingItem = slot.querySelector('.item-icon');
        if (existingItem) existingItem.remove();
        
        slot.classList.remove('has-item');
        slot.draggable = false;
        
        if (item) {
            slot.classList.add('has-item');
            slot.draggable = true;
            
            const itemData = itemDatabase[item.id];
            
            if (itemData) {
                const icon = document.createElement('div');
                icon.className = 'item-icon';
                icon.textContent = itemData.icon;
                icon.style.fontSize = '28px';
                slot.insertBefore(icon, slot.firstChild);
            }
        }
    });
    
    // Обновляем статус рюкзака
    const backpackGrid = document.getElementById('backpackGrid');
    const backpackStatus = document.getElementById('backpackStatus');
    const backpackTitle = document.querySelector('.backpack-title');
    
    if (inventory.equipment.backpack) {
        backpackGrid.classList.add('active');
        if (backpackTitle) backpackTitle.classList.add('active');
        backpackStatus.textContent = 'Надет';
        backpackStatus.style.color = 'rgba(76, 175, 80, 0.8)';
    } else {
        backpackGrid.classList.remove('active');
        if (backpackTitle) backpackTitle.classList.remove('active');
        backpackStatus.textContent = 'Не надет';
        backpackStatus.style.color = 'rgba(244, 67, 54, 0.8)';
    }
}

function renderQuickSlots() {
    const quickSlots = document.querySelectorAll('.quick-slot');
    
    quickSlots.forEach((slot, index) => {
        // Удаляем старую иконку
        const existingIcon = slot.querySelector('.item-icon');
        if (existingIcon) existingIcon.remove();
        
        const item = inventory.quickSlots[index];
        
        if (item) {
            const itemData = itemDatabase[item.id];
            
            if (itemData) {
                const icon = document.createElement('div');
                icon.className = 'item-icon';
                icon.textContent = itemData.icon;
                icon.style.fontSize = '24px';
                slot.appendChild(icon);
            }
        }
    });
}

// ===== DRAG & DROP =====
function handleDragStart(e) {
    const slot = e.currentTarget;
    const type = slot.dataset.type;
    const index = parseInt(slot.dataset.index);
    
    let item = null;
    
    if (type === 'environment') {
        item = inventory.environment[index];
    } else if (type === 'main') {
        item = inventory.main[index];
    } else if (type === 'backpack') {
        item = inventory.backpack[index];
    } else if (slot.classList.contains('equipment-slot')) {
        const slotType = slot.dataset.slot;
        item = inventory.equipment[slotType];
    }
    
    if (item) {
        draggedItem = { ...item };
        draggedFrom = { type, index: type.includes('equipment') ? slot.dataset.slot : index };
        
        slot.classList.add('dragging');
        
        console.log('[Inventory] Начало перетаскивания:', draggedItem);
    }
}

function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    
    // ФИКС: Убираем подсветку со ВСЕХ слотов
    setTimeout(() => {
        document.querySelectorAll('.inventory-slot, .equipment-slot').forEach(slot => {
            slot.classList.remove('drag-over');
        });
    }, 50);
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    
    // ФИКС: Убираем подсветку СРАЗУ
    document.querySelectorAll('.inventory-slot, .equipment-slot').forEach(slot => {
        slot.classList.remove('drag-over');
    });
    
    if (!draggedItem || !draggedFrom) return;
    
    const targetSlot = e.currentTarget;
    const targetType = targetSlot.dataset.type;
    const targetIndex = parseInt(targetSlot.dataset.index);
    
    console.log('[Inventory] Drop:', draggedFrom, '→', { type: targetType, index: targetIndex });
    
    // Проверяем можно ли переместить
    if (canMove(draggedItem, draggedFrom, { type: targetType, index: targetIndex })) {
        moveItem(draggedFrom, { type: targetType, index: targetIndex });
    } else {
        console.log('[Inventory] ❌ Перемещение невозможно');
    }
    
    draggedItem = null;
    draggedFrom = null;
}

function canMove(item, from, to) {
    // Если перемещаем в экипировку, проверяем тип
    if (to.type && to.type.includes('equipment')) {
        const itemData = itemDatabase[item.id];
        const slotType = to.index; // для equipment index = slot name
        
        // Проверка типа предмета
        if (slotType === 'weapon1' || slotType === 'weapon2') {
            return itemData.type === 'weapon' && itemData.name !== 'Нож';
        }
        if (slotType === 'melee') {
            return itemData.type === 'weapon' && itemData.name === 'Нож';
        }
        if (slotType === 'backpack') {
            return itemData.type === 'backpack';
        }
        if (['head', 'mask', 'top', 'legs', 'shoes'].includes(slotType)) {
            return itemData.type === 'clothing';
        }
        if (slotType === 'accessory') {
            return itemData.type === 'accessory';
        }
        
        return false;
    }
    
    // Проверка веса при перемещении из окружения в инвентарь
    if (from.type === 'environment' && (to.type === 'main' || to.type === 'backpack')) {
        const itemData = itemDatabase[item.id];
        const itemWeight = itemData.weight * (item.quantity || 1);
        
        if (playerData.weight + itemWeight > playerData.maxWeight) {
            showNotification('error', 'Недостаточно места! Перевес.');
            return false;
        }
    }
    
    return true;
}

function moveItem(from, to) {
    let sourceArray, targetArray;
    let sourceIndex = from.index;
    let targetIndex = to.index;
    
    // Определяем массивы источника
    if (from.type === 'environment') {
        sourceArray = inventory.environment;
    } else if (from.type === 'main') {
        sourceArray = inventory.main;
    } else if (from.type === 'backpack') {
        sourceArray = inventory.backpack;
    } else if (from.type && from.type.includes('equipment')) {
        sourceArray = null; // equipment не массив
    }
    
    // Определяем массивы назначения
    if (to.type === 'environment') {
        targetArray = inventory.environment;
    } else if (to.type === 'main') {
        targetArray = inventory.main;
    } else if (to.type === 'backpack') {
        targetArray = inventory.backpack;
    } else if (to.type && to.type.includes('equipment')) {
        targetArray = null; // equipment не массив
    }
    
    // Получаем предметы
    let sourceItem, targetItem;
    
    if (sourceArray) {
        sourceItem = sourceArray[sourceIndex];
    } else {
        sourceItem = inventory.equipment[sourceIndex];
    }
    
    if (targetArray) {
        targetItem = targetArray[targetIndex];
    } else {
        targetItem = inventory.equipment[targetIndex];
    }
    
    // Меняем местами или перемещаем
    if (sourceArray && targetArray) {
        // Оба массивы
        if (targetItem && sourceItem.id === targetItem.id) {
            // Стакаем если возможно
            const itemData = itemDatabase[sourceItem.id];
            
            if (itemData.stackable) {
                const totalQuantity = (sourceItem.quantity || 1) + (targetItem.quantity || 1);
                
                if (totalQuantity <= itemData.maxStack) {
                    targetArray[targetIndex].quantity = totalQuantity;
                    sourceArray[sourceIndex] = null;
                } else {
                    // Переполнение
                    targetArray[targetIndex].quantity = itemData.maxStack;
                    sourceArray[sourceIndex].quantity = totalQuantity - itemData.maxStack;
                }
            } else {
                // Swap
                [sourceArray[sourceIndex], targetArray[targetIndex]] = [targetArray[targetIndex], sourceArray[sourceIndex]];
            }
        } else {
            // Swap
            [sourceArray[sourceIndex], targetArray[targetIndex]] = [targetArray[targetIndex], sourceArray[sourceIndex]];
        }
    } else if (sourceArray && !targetArray) {
        // Из массива в equipment
        inventory.equipment[targetIndex] = sourceItem;
        sourceArray[sourceIndex] = targetItem; // может быть null
    } else if (!sourceArray && targetArray) {
        // Из equipment в массив
        inventory.equipment[sourceIndex] = targetItem; // может быть null
        targetArray[targetIndex] = sourceItem;
    } else {
        // Оба equipment (swap)
        [inventory.equipment[sourceIndex], inventory.equipment[targetIndex]] = [inventory.equipment[targetIndex], inventory.equipment[sourceIndex]];
    }
    
    // Отправляем на сервер
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:moveItem', JSON.stringify(from), JSON.stringify(to));
    }
    
    renderInventory();
    
    console.log('[Inventory] ✅ Предмет перемещён');
}

// ===== КОНТЕКСТНОЕ МЕНЮ =====
function handleContextMenu(e) {
    e.preventDefault();
    
    const slot = e.currentTarget;
    const type = slot.dataset.type;
    const index = slot.dataset.index || slot.dataset.slot;
    
    let item = null;
    
    if (type === 'environment') {
        item = inventory.environment[index];
    } else if (type === 'main') {
        item = inventory.main[index];
    } else if (type === 'backpack') {
        item = inventory.backpack[index];
    } else if (slot.classList.contains('equipment-slot')) {
        item = inventory.equipment[index];
    }
    
    if (!item) return;
    
    showContextMenu(e.clientX, e.clientY, item, { type, index });
}

function showContextMenu(x, y, item, location) {
    const menu = document.getElementById('contextMenu');
    
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.display = 'block';
    
    // Удаляем старые обработчики
    const newMenu = menu.cloneNode(true);
    menu.parentNode.replaceChild(newMenu, menu);
    
    // Добавляем новые
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

function handleContextAction(action, item, location) {
    console.log('[Inventory] Действие:', action, item);
    
    switch (action) {
        case 'use':
            useItem(item, location);
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

function useItem(item, location) {
    console.log('[Inventory] Использование:', item.id);
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:useItem', location.index);
    }
    
    showNotification('success', `Использован: ${itemDatabase[item.id].name}`);
}

function dropItem(item, location) {
    console.log('[Inventory] Выброс:', item.id);
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:dropItem', location.index, item.quantity || 1);
    }
    
    // Удаляем из инвентаря
    if (location.type === 'main') {
        inventory.main[location.index] = null;
    } else if (location.type === 'backpack') {
        inventory.backpack[location.index] = null;
    } else if (location.type && location.type.includes('equipment')) {
        inventory.equipment[location.index] = null;
    }
    
    renderInventory();
    showNotification('info', `Выброшен: ${itemDatabase[item.id].name}`);
}

function splitItem(item, location) {
    const itemData = itemDatabase[item.id];
    
    if (!itemData.stackable || item.quantity <= 1) {
        showNotification('error', 'Невозможно разделить этот предмет');
        return;
    }
    
    const amount = prompt(`Разделить стак (макс: ${item.quantity}):`, Math.floor(item.quantity / 2));
    
    if (amount && !isNaN(amount)) {
        const splitAmount = parseInt(amount);
        
        if (splitAmount > 0 && splitAmount < item.quantity) {
            // Находим пустой слот
            const emptySlot = findEmptySlot(location.type);
            
            if (emptySlot !== -1) {
                // Уменьшаем количество в исходном слоте
                if (location.type === 'main') {
                    inventory.main[location.index].quantity -= splitAmount;
                    inventory.main[emptySlot] = { id: item.id, quantity: splitAmount };
                } else if (location.type === 'backpack') {
                    inventory.backpack[location.index].quantity -= splitAmount;
                    inventory.backpack[emptySlot] = { id: item.id, quantity: splitAmount };
                }
                
                renderInventory();
                showNotification('success', 'Предмет разделён');
            } else {
                showNotification('error', 'Нет свободных слотов');
            }
        }
    }
}

function findEmptySlot(type) {
    const array = type === 'main' ? inventory.main : inventory.backpack;
    return array.findIndex(slot => !slot);
}

function showItemInfo(item) {
    const itemData = itemDatabase[item.id];
    alert(`${itemData.name}\n\nВес: ${itemData.weight} kg\nТип: ${itemData.type}\n${itemData.stackable ? `Макс. стак: ${itemData.maxStack}` : 'Не стакается'}`);
}

// ===== TOOLTIP =====
function handleMouseEnter(e) {
    const slot = e.currentTarget;
    const type = slot.dataset.type;
    const index = slot.dataset.index || slot.dataset.slot;
    
    let item = null;
    
    if (type === 'environment') {
        item = inventory.environment[index];
    } else if (type === 'main') {
        item = inventory.main[index];
    } else if (type === 'backpack') {
        item = inventory.backpack[index];
    } else if (slot.classList.contains('equipment-slot')) {
        item = inventory.equipment[index];
    }
    
    if (!item) return;
    
    const itemData = itemDatabase[item.id];
    const tooltip = document.getElementById('itemTooltip');
    
    document.getElementById('tooltipName').textContent = itemData.name;
    document.getElementById('tooltipWeight').textContent = `${itemData.weight} kg`;
    document.getElementById('tooltipDescription').textContent = `Тип: ${itemData.type}${itemData.stackable ? ` | Макс. стак: ${itemData.maxStack}` : ''}`;
    
    tooltip.style.display = 'block';
    tooltip.style.left = `${e.clientX + 15}px`;
    tooltip.style.top = `${e.clientY + 15}px`;
    
    // Двигаем tooltip за курсором
    slot.addEventListener('mousemove', moveTooltip);
}

function handleMouseLeave(e) {
    const tooltip = document.getElementById('itemTooltip');
    tooltip.style.display = 'none';
    
    e.currentTarget.removeEventListener('mousemove', moveTooltip);
}

function moveTooltip(e) {
    const tooltip = document.getElementById('itemTooltip');
    tooltip.style.left = `${e.clientX + 15}px`;
    tooltip.style.top = `${e.clientY + 15}px`;
}

// ===== БЫСТРЫЕ СЛОТЫ =====
function useQuickSlot(index) {
    const item = inventory.quickSlots[index];
    
    if (item) {
        console.log('[Inventory] Использование быстрого слота', index + 1);
        
        if (typeof mp !== 'undefined') {
            mp.trigger('cef:useQuickSlot', index);
        }
        
        showNotification('info', `Использован: ${itemDatabase[item.id].name}`);
    }
}

// ===== ОБНОВЛЕНИЕ ДАННЫХ =====
function updateWeight() {
    let totalWeight = 0;
    
    // Считаем вес из основного инвентаря
    inventory.main.forEach(item => {
        if (item) {
            const itemData = itemDatabase[item.id];
            totalWeight += itemData.weight * (item.quantity || 1);
        }
    });
    
    // Считаем вес из рюкзака
    inventory.backpack.forEach(item => {
        if (item) {
            const itemData = itemDatabase[item.id];
            totalWeight += itemData.weight * (item.quantity || 1);
        }
    });
    
    // Считаем вес экипировки
    Object.values(inventory.equipment).forEach(item => {
        if (item) {
            const itemData = itemDatabase[item.id];
            totalWeight += itemData.weight;
        }
    });
    
    playerData.weight = totalWeight;
    
    const weightDisplay = document.getElementById('weightDisplay');
    weightDisplay.textContent = `${totalWeight.toFixed(2)} / ${playerData.maxWeight} kg`;
    
    // Цвет в зависимости от веса
    const percentage = (totalWeight / playerData.maxWeight) * 100;
    
    if (percentage >= 90) {
        weightDisplay.style.color = '#f44336';
    } else if (percentage >= 70) {
        weightDisplay.style.color = '#ff9800';
    } else {
        weightDisplay.style.color = 'rgba(255, 255, 255, 0.7)';
    }
}

function updatePlayerInfo(data) {
    playerData = { ...playerData, ...data };
    
    // Имя
    document.getElementById('playerName').textContent = data.name || playerData.name;
    
    // Деньги
    document.getElementById('cashAmount').textContent = `$${(data.cash || 0).toLocaleString()}`;
    document.getElementById('bankAmount').textContent = `$${(data.bank || 0).toLocaleString()}`;
    
    // Статы
    updateStat('thirst', data.thirst || 100);
    updateStat('hunger', data.hunger || 100);
    updateStat('health', data.health || 100);
    
    // Максимальный вес
    if (data.maxWeight) {
        playerData.maxWeight = data.maxWeight;
    }
}

function updateStat(stat, value) {
    const bar = document.getElementById(`${stat}Bar`);
    const valueEl = document.getElementById(`${stat}Value`);
    
    if (bar && valueEl) {
        bar.style.width = `${value}%`;
        valueEl.textContent = value;
    }
}

// ===== УВЕДОМЛЕНИЯ =====
function showNotification(type, message) {
    console.log(`[Inventory] ${type.toUpperCase()}: ${message}`);
    
    // Можно добавить визуальные уведомления
    // Пока просто в консоль
}

// ===== ОБРАБОТЧИКИ СОБЫТИЙ =====
function setupEventListeners() {
    // Закрытие инвентаря
    const closeBtn = document.getElementById('closeBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeInventory);
    }
    
    // Экипировка слоты (добавляем drag&drop)
    document.querySelectorAll('.equipment-slot[data-slot]').forEach(slot => {
        slot.draggable = false; // Сначала false, станет true когда там будет предмет
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('drop', handleDrop);
        slot.addEventListener('dragstart', handleDragStart);
        slot.addEventListener('dragend', handleDragEnd);
        slot.addEventListener('contextmenu', handleContextMenu);
        slot.addEventListener('mouseenter', handleMouseEnter);
        slot.addEventListener('mouseleave', handleMouseLeave);
    });
    
    // Клавиши 1-5 для быстрых слотов
    document.addEventListener('keydown', (e) => {
        if (e.key >= '1' && e.key <= '5') {
            const index = parseInt(e.key) - 1;
            useQuickSlot(index);
        }
    });
}

function closeInventory() {
    console.log('[Inventory] Закрытие инвентаря');
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:closeInventory');
    }
}

// ===== СОБЫТИЯ ОТ КЛИЕНТА =====
function loadInventory(inventoryJson, charDataJson) {
    try {
        const invData = typeof inventoryJson === 'string' ? JSON.parse(inventoryJson) : inventoryJson;
        const charData = typeof charDataJson === 'string' ? JSON.parse(charDataJson) : charDataJson;
        
        console.log('[Inventory] Загрузка данных инвентаря:', invData);
        console.log('[Inventory] Данные персонажа:', charData);
        
        // Обновляем инвентарь
        inventory = { ...inventory, ...invData };
        
        // Обновляем данные персонажа
        updatePlayerInfo(charData);
        
        // Рендерим
        renderInventory();
        
        console.log('[Inventory] ✅ Данные загружены');
        
    } catch (err) {
        console.error('[Inventory] ❌ Ошибка загрузки:', err);
    }
}

// ===== ТЕСТОВЫЕ ДАННЫЕ =====
function loadTestData() {
    console.log('[Inventory] Загрузка тестовых данных...');
    
    // Окружение
    inventory.environment[0] = { id: 'water', quantity: 3 };
    inventory.environment[1] = { id: 'food', quantity: 2 };
    inventory.environment[4] = { id: 'bandage', quantity: 5 };
    inventory.environment[8] = { id: 'money', quantity: 500 };
    
    // Основной инвентарь
    inventory.main[0] = { id: 'phone', quantity: 1 };
    inventory.main[1] = { id: 'keys', quantity: 1 };
    inventory.main[2] = { id: 'water', quantity: 2 };
    inventory.main[7] = { id: 'food', quantity: 5 };
    inventory.main[15] = { id: 'bandage', quantity: 3 };
    
    // Экипировка
    inventory.equipment.weapon1 = { id: 'pistol', quantity: 1 };
    inventory.equipment.top = { id: 'shirt', quantity: 1 };
    inventory.equipment.legs = { id: 'pants', quantity: 1 };
    inventory.equipment.shoes = { id: 'shoes', quantity: 1 };
    
    // Быстрые слоты
    inventory.quickSlots[0] = { id: 'water', quantity: 1 };
    inventory.quickSlots[1] = { id: 'food', quantity: 1 };
    inventory.quickSlots[2] = { id: 'bandage', quantity: 1 };
    
    // Данные игрока
    updatePlayerInfo({
        name: 'Kit Tysh',
        cash: 1234,
        bank: 56789,
        thirst: 80,
        hunger: 60,
        health: 100,
        maxWeight: 30
    });
    
    renderInventory();
    
    console.log('[Inventory] ✅ Тестовые данные загружены');
}

// ===== ЭКСПОРТ ФУНКЦИЙ =====
window.loadInventory = loadInventory;
window.updatePlayerInfo = updatePlayerInfo;

console.log('[Inventory Script] ✅ Загружен');
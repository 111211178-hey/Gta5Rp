// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let inventory = [];
let selectedSlot = null;
let draggedSlot = null;
let characterData = {
    name: 'John Doe',
    level: 1,
    currentWeight: 0,
    maxWeight: 50
};

const TOTAL_SLOTS = 35; // 5 хотбар + 30 основной инвентарь

// ===== ИКОНКИ ДЛЯ ТИПОВ ПРЕДМЕТОВ =====
const itemIcons = {
    'weapon': 'fa-gun',
    'food': 'fa-bread-slice',
    'drink': 'fa-bottle-water',
    'medical': 'fa-kit-medical',
    'tool': 'fa-wrench',
    'material': 'fa-cube',
    'misc': 'fa-box'
};

// ===== ИНИЦИАЛИЗАЦИЯ =====
window.addEventListener('DOMContentLoaded', () => {
    console.log('[Inventory] Инициализация...');
    
    createSlots();
    setupEventListeners();
    
    console.log('[Inventory] ✅ Инициализация завершена');
});

// ===== СОЗДАНИЕ СЛОТОВ =====
function createSlots() {
    // Хотбар (слоты 1-5)
    const hotbarContainer = document.getElementById('hotbarSlots');
    for (let i = 1; i <= 5; i++) {
        const slot = createSlot(i, true);
        hotbarContainer.appendChild(slot);
    }
    
    // Основной инвентарь (слоты 6-35)
    const gridContainer = document.getElementById('inventoryGrid');
    for (let i = 6; i <= TOTAL_SLOTS; i++) {
        const slot = createSlot(i, false);
        gridContainer.appendChild(slot);
    }
}

function createSlot(slotNumber, isHotbar) {
    const slot = document.createElement('div');
    slot.className = 'inventory-slot';
    slot.setAttribute('data-slot', slotNumber);
    slot.setAttribute('draggable', 'false');
    
    const slotNum = document.createElement('div');
    slotNum.className = 'slot-number';
    slotNum.textContent = slotNumber;
    slot.appendChild(slotNum);
    
    // События
    slot.addEventListener('click', () => selectSlot(slotNumber));
    slot.addEventListener('dragstart', handleDragStart);
    slot.addEventListener('dragover', handleDragOver);
    slot.addEventListener('drop', handleDrop);
    slot.addEventListener('dragend', handleDragEnd);
    
    return slot;
}

// ===== ОБРАБОТЧИКИ СОБЫТИЙ =====
function setupEventListeners() {
    // Закрытие
    document.getElementById('closeBtn').addEventListener('click', closeInventory);
    
    // Действия с предметом
    document.getElementById('useBtn').addEventListener('click', useItem);
    document.getElementById('dropBtn').addEventListener('click', dropItem);
}

// ===== ВЫБОР СЛОТА =====
function selectSlot(slotNumber) {
    const item = inventory.find(i => i.slot === slotNumber);
    
    if (!item) {
        hideItemInfo();
        return;
    }
    
    // Убираем выделение со всех слотов
    document.querySelectorAll('.inventory-slot').forEach(s => s.classList.remove('selected'));
    
    // Выделяем текущий
    const slotElement = document.querySelector(`.inventory-slot[data-slot="${slotNumber}"]`);
    if (slotElement) {
        slotElement.classList.add('selected');
    }
    
    selectedSlot = slotNumber;
    showItemInfo(item);
}

// ===== ОТОБРАЖЕНИЕ ИНФОРМАЦИИ О ПРЕДМЕТЕ =====
function showItemInfo(item) {
    const infoPanel = document.getElementById('selectedItemInfo');
    
    document.getElementById('previewIcon').className = `fas ${itemIcons[item.type] || 'fa-box'}`;
    document.getElementById('itemName').textContent = item.display_name;
    document.getElementById('itemType').textContent = getTypeName(item.type);
    document.getElementById('itemDescription').textContent = item.description;
    document.getElementById('itemWeight').textContent = `${(item.weight * item.quantity).toFixed(2)} кг`;
    document.getElementById('itemQuantity').textContent = item.quantity;
    
    // Показываем/скрываем кнопку использования
    const useBtn = document.getElementById('useBtn');
    useBtn.style.display = item.usable ? 'flex' : 'none';
    
    infoPanel.style.display = 'block';
}

function hideItemInfo() {
    document.getElementById('selectedItemInfo').style.display = 'none';
    selectedSlot = null;
    
    document.querySelectorAll('.inventory-slot').forEach(s => s.classList.remove('selected'));
}

function getTypeName(type) {
    const types = {
        'weapon': 'Оружие',
        'food': 'Еда',
        'drink': 'Напиток',
        'medical': 'Медицина',
        'tool': 'Инструмент',
        'material': 'Материал',
        'misc': 'Разное'
    };
    return types[type] || 'Неизвестно';
}

// ===== DRAG & DROP =====
function handleDragStart(e) {
    const slot = e.target.closest('.inventory-slot');
    const slotNumber = parseInt(slot.getAttribute('data-slot'));
    const item = inventory.find(i => i.slot === slotNumber);
    
    if (!item) {
        e.preventDefault();
        return;
    }
    
    draggedSlot = slotNumber;
    slot.classList.add('dragging');
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', slotNumber);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e) {
    e.preventDefault();
    
    const targetSlot = e.target.closest('.inventory-slot');
    if (!targetSlot) return;
    
    const targetSlotNumber = parseInt(targetSlot.getAttribute('data-slot'));
    
    if (draggedSlot && draggedSlot !== targetSlotNumber) {
        // Отправляем запрос на сервер для перемещения
        if (typeof mp !== 'undefined') {
            mp.trigger('cef:moveItem', draggedSlot, targetSlotNumber);
        }
    }
}

function handleDragEnd(e) {
    const slot = e.target.closest('.inventory-slot');
    if (slot) {
        slot.classList.remove('dragging');
    }
    draggedSlot = null;
}

// ===== ДЕЙСТВИЯ С ПРЕДМЕТАМИ =====
function useItem() {
    if (!selectedSlot) return;
    
    const item = inventory.find(i => i.slot === selectedSlot);
    if (!item || !item.usable) return;
    
    console.log('[Inventory] Использование предмета:', item.name);
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:useItem', selectedSlot);
    }
}

function dropItem() {
    if (!selectedSlot) return;
    
    const item = inventory.find(i => i.slot === selectedSlot);
    if (!item) return;
    
    // Запрашиваем количество если стак больше 1
    let quantity = item.quantity;
    if (item.quantity > 1) {
        quantity = prompt(`Сколько выбросить? (макс: ${item.quantity})`, item.quantity);
        if (!quantity || quantity <= 0) return;
        quantity = Math.min(parseInt(quantity), item.quantity);
    }
    
    console.log('[Inventory] Выброс предмета:', item.name, 'x', quantity);
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:dropItem', selectedSlot, quantity);
    }
}

// ===== ЗАГРУЗКА ИНВЕНТАРЯ =====
function loadInventory(inventoryData, charData) {
    console.log('[Inventory] Загрузка инвентаря:', inventoryData);
    
    inventory = inventoryData;
    characterData = charData;
    
    // Обновляем данные персонажа
    document.getElementById('characterName').textContent = charData.name;
    document.getElementById('characterLevel').textContent = `Уровень ${charData.level}`;
    
    // Очищаем все слоты
    document.querySelectorAll('.inventory-slot').forEach(slot => {
        const slotNum = slot.querySelector('.slot-number');
        slot.innerHTML = '';
        slot.appendChild(slotNum);
        slot.removeAttribute('data-type');
        slot.setAttribute('draggable', 'false');
    });
    
    // Заполняем слоты предметами
    inventory.forEach(item => {
        const slotElement = document.querySelector(`.inventory-slot[data-slot="${item.slot}"]`);
        if (!slotElement) return;
        
        slotElement.setAttribute('data-type', item.type);
        slotElement.setAttribute('draggable', 'true');
        
        const icon = document.createElement('i');
        icon.className = `fas ${itemIcons[item.type] || 'fa-box'} item-icon`;
        slotElement.appendChild(icon);
        
        if (item.quantity > 1) {
            const quantity = document.createElement('div');
            quantity.className = 'item-quantity';
            quantity.textContent = item.quantity;
            slotElement.appendChild(quantity);
        }
    });
    
    // Обновляем вес
    updateWeight();
    
    console.log('[Inventory] ✅ Инвентарь загружен');
}

// ===== ОБНОВЛЕНИЕ ВЕСА =====
function updateWeight() {
    const currentWeight = inventory.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
    characterData.currentWeight = currentWeight;
    
    document.getElementById('currentWeight').textContent = currentWeight.toFixed(1);
    document.getElementById('maxWeight').textContent = characterData.maxWeight;
    
    const percentage = (currentWeight / characterData.maxWeight) * 100;
    const fill = document.getElementById('weightFill');
    fill.style.width = `${Math.min(percentage, 100)}%`;
    
    fill.classList.remove('warning', 'danger');
    if (percentage >= 90) {
        fill.classList.add('danger');
    } else if (percentage >= 70) {
        fill.classList.add('warning');
    }
}

// ===== ЗАКРЫТИЕ ИНВЕНТАРЯ =====
function closeInventory() {
    console.log('[Inventory] Закрытие инвентаря');
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:closeInventory');
    }
}

// ===== СОБЫТИЯ ОТ КЛИЕНТА =====
if (typeof mp !== 'undefined') {
    // Загрузка инвентаря
    mp.events.add('inventory:load', (inventoryJson, charDataJson) => {
        try {
            const inventoryData = JSON.parse(inventoryJson);
            const charData = JSON.parse(charDataJson);
            loadInventory(inventoryData, charData);
        } catch (err) {
            console.error('[Inventory] Ошибка парсинга:', err);
        }
    });
    
    // Обновление инвентаря
    mp.events.add('inventory:update', (inventoryJson) => {
        try {
            const inventoryData = JSON.parse(inventoryJson);
            loadInventory(inventoryData, characterData);
        } catch (err) {
            console.error('[Inventory] Ошибка обновления:', err);
        }
    });
}

console.log('[Inventory] ===== СКРИПТ ЗАГРУЖЕН =====');
// ===== СИСТЕМА ИНВЕНТАРЯ - СЕРВЕРНАЯ ЧАСТЬ =====

const { db } = require('../database');

// ===== КОНСТАНТЫ =====
const GRID_WIDTH = 5;
const GRID_HEIGHT = 7;

// Хранилище предметов на земле (в памяти)
const groundItems = new Map();
const groundItemObjects = new Map();

const CLOTHING_COMPONENTS = {
    'hat': 0, 'head': 0,
    'mask': 1,
    'top': 11,
    'undershirt': 8,
    'legs': 4,
    'shoes': 6,
    'accessory': 7,
    'bag': 5, 'backpack': 5,
    'armor': 9,
    'glasses': 1,
    'watch': 6
};

// ===== БЕЗОПАСНЫЙ ВЫЗОВ КЛИЕНТСКОГО СОБЫТИЯ =====
function safeCall(player, eventName, args = []) {
    try {
        if (player && mp.players.exists(player)) {
            player.call(eventName, args);
            return true;
        }
    } catch (err) {
        // Игрок отключился - игнорируем
    }
    return false;
}

// ===== ПОЛУЧЕНИЕ ИНВЕНТАРЯ ПЕРСОНАЖА =====
async function getCharacterInventory(characterId) {
    try {
        const [inventory] = await db.query(`
            SELECT 
                ci.id,
                ci.slot,
                ci.quantity,
                ci.metadata,
                ci.equipped,
                i.id as item_id,
                i.name,
                i.display_name,
                i.description,
                i.type,
                i.weight,
                i.max_stack,
                i.usable,
                i.model_data,
                i.icon,
                i.size_width,
                i.size_height
            FROM character_inventory ci
            JOIN items i ON ci.item_id = i.id
            WHERE ci.character_id = ?
            ORDER BY ci.slot ASC
        `, [characterId]);
        
        const formattedInventory = inventory.map(item => ({
            id: item.name,
            dbId: item.id,
            itemId: item.item_id,
            slot: item.slot,
            quantity: item.quantity,
            equipped: item.equipped || 0,
            name: item.display_name || item.name,
            description: item.description,
            type: item.type,
            weight: parseFloat(item.weight) || 0.1,
            maxStack: item.max_stack,
            usable: item.usable,
            metadata: item.metadata ? (typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata) : null,
            modelData: item.model_data ? (typeof item.model_data === 'string' ? JSON.parse(item.model_data) : item.model_data) : null,
            icon: item.icon || null,
            width: item.size_width || 1,
            height: item.size_height || 1
        }));
        
        return formattedInventory;
    } catch (err) {
        console.error('[Inventory] Ошибка получения инвентаря:', err);
        return [];
    }
}

// ===== ПОЛУЧЕНИЕ ЭКИПИРОВКИ =====
async function getCharacterEquipment(characterId) {
    try {
        const [tables] = await db.query("SHOW TABLES LIKE 'character_equipment'");
        if (tables.length === 0) return {};
        
        const [equipment] = await db.query(`
            SELECT 
                ce.slot_type,
                ce.item_id,
                i.name,
                i.display_name,
                i.type,
                i.weight,
                i.model_data,
                i.icon
            FROM character_equipment ce
            JOIN items i ON ce.item_id = i.id
            WHERE ce.character_id = ?
        `, [characterId]);
        
        const equippedItems = {};
        equipment.forEach(item => {
            equippedItems[item.slot_type] = {
                id: item.name,
                itemId: item.item_id,
                name: item.display_name || item.name,
                type: item.type,
                weight: parseFloat(item.weight) || 0.1,
                modelData: item.model_data ? (typeof item.model_data === 'string' ? JSON.parse(item.model_data) : item.model_data) : null,
                icon: item.icon || null
            };
        });
        
        return equippedItems;
    } catch (err) {
        console.error('[Inventory] Ошибка получения экипировки:', err);
        return {};
    }
}

// ===== ПОИСК СВОБОДНОГО МЕСТА С УЧЁТОМ РАЗМЕРА =====
async function findFreeSlotForSize(characterId, width, height) {
    try {
        // Получаем ВСЕ предметы с их р��змерами
        const [items] = await db.query(`
            SELECT ci.slot, i.size_width, i.size_height
            FROM character_inventory ci
            JOIN items i ON ci.item_id = i.id
            WHERE ci.character_id = ?
        `, [characterId]);
        
        // Создаём 2D карту занятости
        const grid = [];
        for (let y = 0; y < GRID_HEIGHT; y++) {
            grid[y] = [];
            for (let x = 0; x < GRID_WIDTH; x++) {
                grid[y][x] = false;
            }
        }
        
        // Отмечаем ВСЕ занятые ячейки (включая ячейки больших предметов)
        items.forEach(item => {
            const startX = item.slot % GRID_WIDTH;
            const startY = Math.floor(item.slot / GRID_WIDTH);
            const itemW = item.size_width || 1;
            const itemH = item.size_height || 1;
            
            // Помечаем все ячейки которые занимает предмет
            for (let dy = 0; dy < itemH; dy++) {
                for (let dx = 0; dx < itemW; dx++) {
                    const x = startX + dx;
                    const y = startY + dy;
                    if (y < GRID_HEIGHT && x < GRID_WIDTH) {
                        grid[y][x] = true;
                    }
                }
            }
        });
        
        // Ищем свободное место для нового предмета
        for (let y = 0; y <= GRID_HEIGHT - height; y++) {
            for (let x = 0; x <= GRID_WIDTH - width; x++) {
                let canPlace = true;
                
                // Проверяем все ячейки которые займёт новый предмет
                for (let dy = 0; dy < height && canPlace; dy++) {
                    for (let dx = 0; dx < width && canPlace; dx++) {
                        if (grid[y + dy][x + dx]) {
                            canPlace = false;
                        }
                    }
                }
                
                if (canPlace) {
                    const slot = y * GRID_WIDTH + x;
                    console.log(`[Inventory] Найден свободный слот ${slot} для предмета ${width}x${height}`);
                    return slot;
                }
            }
        }
        
        console.log(`[Inventory] Нет места для предмета ${width}x${height}`);
        return -1;
    } catch (err) {
        console.error('[Inventory] Ошибка поиска слота:', err);
        return -1;
    }
}

async function findFreeSlot(characterId) {
    return findFreeSlotForSize(characterId, 1, 1);
}

// ===== ПРОВЕРКА ВОЗМОЖНОСТИ РАЗМЕЩЕНИЯ =====
async function checkCanPlaceServer(characterId, startSlot, width, height, ignoreSlot) {
    const startX = startSlot % GRID_WIDTH;
    const startY = Math.floor(startSlot / GRID_WIDTH);
    
    if (startX + width > GRID_WIDTH || startY + height > GRID_HEIGHT) {
        return false;
    }
    
    const [items] = await db.query(`
        SELECT ci.slot, i.size_width, i.size_height
        FROM character_inventory ci
        JOIN items i ON ci.item_id = i.id
        WHERE ci.character_id = ? AND ci.slot != ?
    `, [characterId, ignoreSlot]);
    
    const grid = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
        grid[y] = [];
        for (let x = 0; x < GRID_WIDTH; x++) {
            grid[y][x] = false;
        }
    }
    
    items.forEach(item => {
        const itemX = item.slot % GRID_WIDTH;
        const itemY = Math.floor(item.slot / GRID_WIDTH);
        const itemW = item.size_width || 1;
        const itemH = item.size_height || 1;
        
        for (let dy = 0; dy < itemH; dy++) {
            for (let dx = 0; dx < itemW; dx++) {
                const x = itemX + dx;
                const y = itemY + dy;
                if (y < GRID_HEIGHT && x < GRID_WIDTH) {
                    grid[y][x] = true;
                }
            }
        }
    });
    
    for (let dy = 0; dy < height; dy++) {
        for (let dx = 0; dx < width; dx++) {
            if (grid[startY + dy][startX + dx]) {
                return false;
            }
        }
    }
    
    return true;
}

// ===== ОТКРЫТИЕ ИНВЕНТАРЯ =====
mp.events.add('inventory:open', async (player) => {
    if (!player || !mp.players.exists(player) || !player.characterId) return;
    
    try {
        const inventory = await getCharacterInventory(player.characterId);
        const equipment = await getCharacterEquipment(player.characterId);
        const quickSlots = await getQuickSlots(player.characterId);
        
        const [charResult] = await db.query(
            'SELECT name, surname, level, max_weight, money, bank, health, armor FROM characters WHERE id = ?',
            [player.characterId]
        );
        
        if (charResult.length === 0) return;
        
        const character = charResult[0];
        
        const inventoryData = {
            main: inventory,
            equipment: equipment,
            quickSlots: quickSlots
        };
        
        const charData = {
            name: `${character.name} ${character.surname}`,
            level: character.level || 1,
            maxWeight: character.max_weight || 50,
            cash: character.money || 0,
            bank: character.bank || 0,
            health: player.health || character.health || 100,
            thirst: player.thirst || 100,
            hunger: player.hunger || 100
        };
        
        safeCall(player, 'client:openInventory', [JSON.stringify(inventoryData), JSON.stringify(charData)]);
        
    } catch (err) {
        console.error('[Inventory] Ошибка открытия инвентаря:', err);
    }
});

// ===== ИСПОЛЬЗОВАНИЕ ПРЕДМЕТА =====
mp.events.add('inventory:useItem', async (player, slot) => {
    if (!player || !mp.players.exists(player) || !player.characterId) return;
    
    try {
        const [items] = await db.query(`
            SELECT ci.*, i.name, i.type, i.model_data, i.display_name, i.id as item_id
            FROM character_inventory ci
            JOIN items i ON ci.item_id = i.id
            WHERE ci.character_id = ? AND ci.slot = ?
        `, [player.characterId, slot]);
        
        if (items.length === 0) return;
        
        const item = items[0];
        let used = false;
        let consumed = false;
        
        switch (item.type) {
            case 'consumable':
                used = await useConsumable(player, item);
                consumed = used;
                break;
            case 'medical':
                used = await useMedical(player, item);
                consumed = used;
                break;
            case 'clothing':
                used = await equipClothing(player, item, slot);
                break;
            case 'weapon':
                used = await equipWeapon(player, item, slot);
                break;
            default:
                safeCall(player, 'client:notify', ['warning', 'Предмет', 'Этот предмет нельзя использовать']);
                break;
        }
        
        if (consumed) {
            if (item.quantity > 1) {
                await db.query('UPDATE character_inventory SET quantity = quantity - 1 WHERE id = ?', [item.id]);
            } else {
                await db.query('DELETE FROM character_inventory WHERE id = ?', [item.id]);
            }
        }
        
        if (used) {
            await sendInventoryUpdate(player);
        }
        
    } catch (err) {
        console.error('[Inventory] Ошибка использования предмета:', err);
    }
});

// ===== ИСПОЛЬЗОВАНИЕ CONSUMABLE =====
async function useConsumable(player, item) {
    if (!player || !mp.players.exists(player)) return false;
    
    const itemName = item.name.toLowerCase();
    
    // Еда
    if (itemName.includes('bread') || itemName.includes('food') || itemName.includes('burger') || 
        itemName.includes('pizza') || itemName.includes('apple') || itemName.includes('sandwich')) {
        
        const hungerRestore = getHungerRestore(itemName);
        if (typeof global.restoreHunger === 'function') {
            global.restoreHunger(player, hungerRestore);
        } else {
            player.hunger = Math.min(100, (player.hunger || 0) + hungerRestore);
        }
        player.outputChatBox(`!{#ff9800}🍔 Вы поели (+${hungerRestore} сытости)`);
        return true;
    }
    
    // Напитки
    if (itemName.includes('water') || itemName.includes('cola') || itemName.includes('juice') ||
        itemName.includes('soda') || itemName.includes('drink')) {
        
        const thirstRestore = getThirstRestore(itemName);
        if (typeof global.restoreThirst === 'function') {
            global.restoreThirst(player, thirstRestore);
        } else {
            player.thirst = Math.min(100, (player.thirst || 0) + thirstRestore);
        }
        player.outputChatBox(`!{#03a9f4}💧 Вы попили (+${thirstRestore} жажды)`);
        return true;
    }
    
    // Алкоголь
    if (itemName.includes('beer') || itemName.includes('vodka') || itemName.includes('wine') ||
        itemName.includes('whiskey')) {
        
        if (typeof global.restoreThirst === 'function') {
            global.restoreThirst(player, 20);
            global.restoreHunger(player, 5);
        } else {
            player.thirst = Math.min(100, (player.thirst || 0) + 20);
            player.hunger = Math.min(100, (player.hunger || 0) + 5);
        }
        player.outputChatBox(`!{#9c27b0}🍺 Вы выпили алкоголь (+20 жажды, +5 сытости)`);
        return true;
    }
    
    player.outputChatBox(`!{#4caf50}Вы использовали: ${item.display_name || item.name}`);
    return true;
}

function getHungerRestore(itemName) {
    if (itemName.includes('burger') || itemName.includes('pizza')) return 40;
    if (itemName.includes('sandwich')) return 30;
    if (itemName.includes('bread')) return 20;
    if (itemName.includes('apple')) return 15;
    if (itemName.includes('food')) return 25;
    return 20;
}

function getThirstRestore(itemName) {
    if (itemName.includes('water')) return 35;
    if (itemName.includes('cola') || itemName.includes('soda')) return 25;
    if (itemName.includes('juice')) return 30;
    if (itemName.includes('drink')) return 20;
    return 25;
}

// ===== ИСПОЛЬЗОВАНИЕ MEDICAL =====
async function useMedical(player, item) {
    if (!player || !mp.players.exists(player)) return false;
    
    const itemName = item.name.toLowerCase();
    
    if (itemName.includes('bandage')) {
        if (typeof global.restoreHealth === 'function') {
            global.restoreHealth(player, 20);
        } else {
            player.health = Math.min(100, player.health + 20);
        }
        player.outputChatBox('!{#e91e63}🩹 Вы использов��ли бинт (+20 HP)');
        return true;
    }
    
    if (itemName.includes('medkit') || itemName.includes('firstaid')) {
        if (typeof global.restoreHealth === 'function') {
            global.restoreHealth(player, 50);
        } else {
            player.health = Math.min(100, player.health + 50);
        }
        player.outputChatBox('!{#e91e63}💊 Вы использовали аптечку (+50 HP)');
        return true;
    }
    
    if (itemName.includes('painkiller') || itemName.includes('pills')) {
        if (typeof global.restoreHealth === 'function') {
            global.restoreHealth(player, 15);
        } else {
            player.health = Math.min(100, player.health + 15);
        }
        player.outputChatBox('!{#e91e63}💊 Вы приняли обезболивающее (+15 HP)');
        return true;
    }
    
    if (typeof global.restoreHealth === 'function') {
        global.restoreHealth(player, 10);
    } else {
        player.health = Math.min(100, player.health + 10);
    }
    player.outputChatBox('!{#e91e63}+10 HP');
    return true;
}

// ===== ЭКИПИРОВКА ОДЕЖДЫ =====
async function equipClothing(player, item, fromSlot) {
    if (!player || !mp.players.exists(player)) return false;
    
    try {
        let modelData = item.model_data ? (typeof item.model_data === 'string' ? JSON.parse(item.model_data) : item.model_data) : null;
        
        if (!modelData) {
            player.outputChatBox('!{#f44336}Ошибка: данные одежды отсутствуют');
            return false;
        }
        
        const slotType = modelData.slotType || 'top';
        const componentId = CLOTHING_COMPONENTS[slotType];
        
        if (componentId === undefined) {
            player.outputChatBox('!{#f44336}Ошибка: неизвестный тип слота');
            return false;
        }
        
        const [existingEquip] = await db.query(
            'SELECT * FROM character_equipment WHERE character_id = ? AND slot_type = ?',
            [player.characterId, slotType]
        );
        
        if (existingEquip.length > 0) {
            const freeSlot = await findFreeSlotForSize(player.characterId, 1, 1);
            if (freeSlot === -1) {
                player.outputChatBox('!{#f44336}Нет места в инвентаре!');
                return false;
            }
            
            await db.query(
                'INSERT INTO character_inventory (character_id, item_id, slot, quantity) VALUES (?, ?, ?, 1)',
                [player.characterId, existingEquip[0].item_id, freeSlot]
            );
            
            await db.query(
                'DELETE FROM character_equipment WHERE character_id = ? AND slot_type = ?',
                [player.characterId, slotType]
            );
        }
        
        await db.query(
            'INSERT INTO character_equipment (character_id, slot_type, item_id) VALUES (?, ?, ?)',
            [player.characterId, slotType, item.item_id]
        );
        
        await db.query('DELETE FROM character_inventory WHERE id = ?', [item.id]);
        
        const drawable = modelData.drawable || 0;
        const texture = modelData.texture || 0;
        
        if (modelData.isProp) {
            player.setProp(componentId, drawable, texture);
        } else {
            player.setClothes(componentId, drawable, texture, 0);
        }
        
        saveCharacterClothes(player);
        player.outputChatBox(`!{#4caf50}Вы надели: ${item.display_name || item.name}`);
        
        return true;
    } catch (err) {
        console.error('[Inventory] Ошибка экипировки одежды:', err);
        return false;
    }
}

// ===== ЭКИПИРОВКА ОРУЖИЯ =====
async function equipWeapon(player, item, fromSlot) {
    if (!player || !mp.players.exists(player)) return false;
    
    try {
        let modelData = item.model_data ? (typeof item.model_data === 'string' ? JSON.parse(item.model_data) : item.model_data) : null;
        
        if (!modelData || !modelData.weaponHash) {
            player.outputChatBox('!{#f44336}Ошибка: данные оружия отсутствуют');
            return false;
        }
        
        const weaponHashUpper = modelData.weaponHash.toUpperCase();
        const isMelee = weaponHashUpper.includes('KNIFE') || weaponHashUpper.includes('BAT') || 
                        weaponHashUpper.includes('HAMMER') || weaponHashUpper.includes('CROWBAR') ||
                        weaponHashUpper.includes('MACHETE') || weaponHashUpper.includes('DAGGER');
        
        let slotType = isMelee ? 'melee' : 'weapon1';
        
        if (!isMelee) {
            const [weapon1Check] = await db.query(
                'SELECT * FROM character_equipment WHERE character_id = ? AND slot_type = ?',
                [player.characterId, 'weapon1']
            );
            
            if (weapon1Check.length > 0) {
                const [weapon2Check] = await db.query(
                    'SELECT * FROM character_equipment WHERE character_id = ? AND slot_type = ?',
                    [player.characterId, 'weapon2']
                );
                
                if (weapon2Check.length === 0) {
                    slotType = 'weapon2';
                }
            }
        }
        
        const [existingEquip] = await db.query(
            'SELECT * FROM character_equipment WHERE character_id = ? AND slot_type = ?',
            [player.characterId, slotType]
        );
        
        if (existingEquip.length > 0) {
            const [oldWeaponData] = await db.query(
                'SELECT i.model_data, i.size_width, i.size_height FROM items i WHERE id = ?',
                [existingEquip[0].item_id]
            );
            
            const oldWidth = oldWeaponData[0]?.size_width || 1;
            const oldHeight = oldWeaponData[0]?.size_height || 1;
            
            const freeSlot = await findFreeSlotForSize(player.characterId, oldWidth, oldHeight);
            if (freeSlot === -1) {
                player.outputChatBox('!{#f44336}Нет места в инвентаре!');
                return false;
            }
            
            if (oldWeaponData.length > 0 && oldWeaponData[0].model_data) {
                const oldModelData = typeof oldWeaponData[0].model_data === 'string' 
                    ? JSON.parse(oldWeaponData[0].model_data) : oldWeaponData[0].model_data;
                if (oldModelData.weaponHash) {
                    player.removeWeapon(mp.joaat(oldModelData.weaponHash));
                }
            }
            
            await db.query(
                'INSERT INTO character_inventory (character_id, item_id, slot, quantity) VALUES (?, ?, ?, 1)',
                [player.characterId, existingEquip[0].item_id, freeSlot]
            );
            
            await db.query(
                'DELETE FROM character_equipment WHERE character_id = ? AND slot_type = ?',
                [player.characterId, slotType]
            );
        }
        
        await db.query(
            'INSERT INTO character_equipment (character_id, slot_type, item_id) VALUES (?, ?, ?)',
            [player.characterId, slotType, item.item_id]
        );
        
        await db.query('DELETE FROM character_inventory WHERE id = ?', [item.id]);
        
        player.giveWeapon(mp.joaat(modelData.weaponHash), modelData.ammo || 100);
        player.outputChatBox(`!{#4caf50}Вы экипировали: ${item.display_name || item.name}`);
        
        return true;
    } catch (err) {
        console.error('[Inventory] Ошибка экипировки оружия:', err);
        return false;
    }
}

// ===== СНЯТИЕ ЭКИПИРОВКИ =====
mp.events.add('inventory:unequipItem', async (player, slotType) => {
    if (!player || !mp.players.exists(player) || !player.characterId) return;
    
    try {
        const [equipment] = await db.query(`
            SELECT ce.*, i.model_data, i.type, i.display_name, i.size_width, i.size_height 
            FROM character_equipment ce 
            JOIN items i ON ce.item_id = i.id 
            WHERE ce.character_id = ? AND ce.slot_type = ?
        `, [player.characterId, slotType]);
        
        if (equipment.length === 0) {
            player.outputChatBox('!{#ff9800}В этом слоте ничего нет');
            return;
        }
        
        const equippedItem = equipment[0];
        const width = equippedItem.size_width || 1;
        const height = equippedItem.size_height || 1;
        
        const freeSlot = await findFreeSlotForSize(player.characterId, width, height);
        if (freeSlot === -1) {
            player.outputChatBox('!{#f44336}Нет места в инвентаре!');
            return;
        }
        
        await db.query(
            'DELETE FROM character_equipment WHERE character_id = ? AND slot_type = ?',
            [player.characterId, slotType]
        );
        
        await db.query(
            'INSERT INTO character_inventory (character_id, item_id, slot, quantity) VALUES (?, ?, ?, 1)',
            [player.characterId, equippedItem.item_id, freeSlot]
        );
        
        if (equippedItem.type === 'weapon' && equippedItem.model_data) {
            const modelData = typeof equippedItem.model_data === 'string' 
                ? JSON.parse(equippedItem.model_data) : equippedItem.model_data;
            if (modelData.weaponHash) {
                player.removeWeapon(mp.joaat(modelData.weaponHash));
            }
        } else if (equippedItem.type === 'clothing' && equippedItem.model_data) {
            const modelData = typeof equippedItem.model_data === 'string' 
                ? JSON.parse(equippedItem.model_data) : equippedItem.model_data;
            if (modelData.slotType) {
                const componentId = CLOTHING_COMPONENTS[modelData.slotType];
                if (componentId !== undefined) {
                    if (modelData.isProp) {
                        player.setProp(componentId, -1, 0);
                    } else {
                        player.setClothes(componentId, 0, 0, 0);
                    }
                }
            }
            saveCharacterClothes(player);
        }
        
        player.outputChatBox(`!{#4caf50}Снято: ${equippedItem.display_name || 'Предмет'}`);
        await sendInventoryUpdate(player);
        
    } catch (err) {
        console.error('[Inventory] Ошибка снятия предмета:', err);
    }
});

// ===== ПЕРЕМЕЩЕНИЕ ПРЕДМЕТА =====
mp.events.add('inventory:moveItem', async (player, fromJson, toJson) => {
    if (!player || !mp.players.exists(player) || !player.characterId) return;
    
    try {
        const from = typeof fromJson === 'string' ? JSON.parse(fromJson) : fromJson;
        const to = typeof toJson === 'string' ? JSON.parse(toJson) : toJson;
        
        const [items] = await db.query(`
            SELECT ci.*, i.size_width, i.size_height, i.name, i.type, i.model_data, i.display_name, i.id as item_id
            FROM character_inventory ci
            JOIN items i ON ci.item_id = i.id
            WHERE ci.character_id = ? AND ci.slot = ?
        `, [player.characterId, from.index]);
        
        if (items.length === 0) return;
        
        const item = items[0];
        const width = item.size_width || 1;
        const height = item.size_height || 1;
        
        if (to.type === 'equipment') {
            if (item.type === 'weapon') {
                await equipWeapon(player, item, from.index);
            } else if (item.type === 'clothing') {
                await equipClothing(player, item, from.index);
            }
            await sendInventoryUpdate(player);
            return;
        }
        
        const toX = to.index % GRID_WIDTH;
        const toY = Math.floor(to.index / GRID_WIDTH);
        
        if (toX + width > GRID_WIDTH || toY + height > GRID_HEIGHT) {
            player.outputChatBox('!{#f44336}Предмет не помещается!');
            await sendInventoryUpdate(player);
            return;
        }
        
        const canPlace = await checkCanPlaceServer(player.characterId, to.index, width, height, from.index);
        
        if (!canPlace) {
            player.outputChatBox('!{#f44336}Место занято!');
            await sendInventoryUpdate(player);
            return;
        }
        
        await db.query('UPDATE character_inventory SET slot = ? WHERE id = ?', [to.index, item.id]);
        await sendInventoryUpdate(player);
        
    } catch (err) {
        console.error('[Inventory] Ошибка перемещения:', err);
    }
});

// ===== ВЫБРОС ПРЕДМЕТА НА ЗЕМЛЮ =====
mp.events.add('inventory:dropItem', async (player, slot, quantity) => {
    if (!player || !mp.players.exists(player) || !player.characterId) return;
    
    try {
        const [items] = await db.query(`
            SELECT ci.*, i.name, i.display_name, i.model_data, i.type, i.icon
            FROM character_inventory ci
            JOIN items i ON ci.item_id = i.id
            WHERE ci.character_id = ? AND ci.slot = ?
        `, [player.characterId, slot]);
        
        if (items.length === 0) return;
        
        const item = items[0];
        const dropQuantity = Math.min(quantity, item.quantity);
        
        if (item.quantity > dropQuantity) {
            await db.query('UPDATE character_inventory SET quantity = quantity - ? WHERE id = ?', [dropQuantity, item.id]);
        } else {
            await db.query('DELETE FROM character_inventory WHERE id = ?', [item.id]);
        }
        
		const headingRad = player.heading * Math.PI / 180;
        const dropPos = {
		x: player.position.x - Math.sin(headingRad) * 1.5 + (Math.random() - 0.5) * 0.5,
		y: player.position.y + Math.cos(headingRad) * 1.5 + (Math.random() - 0.5) * 0.5,
		z: player.position.z
	};
        
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        
        try {
            const [result] = await db.query(`
                INSERT INTO ground_items (item_id, quantity, metadata, position_x, position_y, position_z, dimension, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [item.item_id, dropQuantity, item.metadata, dropPos.x, dropPos.y, dropPos.z, player.dimension, expiresAt]);
            
            // Добавляем в Map для отслеживания
            groundItems.set(result.insertId, {
                id: result.insertId,
                itemId: item.item_id,
                name: item.name,
                displayName: item.display_name,
                quantity: dropQuantity,
                position: dropPos,
                dimension: player.dimension
            });
            
            createGroundItemObject(result.insertId, item, dropQuantity, dropPos, player.dimension);
        } catch (dbErr) {
            console.log('[Inventory] Таблица ground_items не найдена');
        }
        
        player.outputChatBox(`!{#ff9800}Вы выбросили: ${item.display_name || item.name} x${dropQuantity}`);
        await sendInventoryUpdate(player);
        updateNearbyGroundItems(player);
        
    } catch (err) {
        console.error('[Inventory] Ошибка выброса предмета:', err);
    }
});

// ===== ПОДБОР ПРЕДМЕТА С ЗЕМЛИ =====
mp.events.add('inventory:pickupItem', async (player, groundItemId) => {
    if (!player || !mp.players.exists(player) || !player.characterId) return;
    
    try {
        const [groundItemsDb] = await db.query(`
            SELECT gi.*, i.name, i.display_name, i.max_stack, i.type, i.size_width, i.size_height
            FROM ground_items gi
            JOIN items i ON gi.item_id = i.id
            WHERE gi.id = ? AND gi.dimension = ?
        `, [groundItemId, player.dimension]);
        
        if (groundItemsDb.length === 0) {
            player.outputChatBox('!{#f44336}Предмет не найден');
            return;
        }
        
        const groundItem = groundItemsDb[0];
        const width = groundItem.size_width || 1;
        const height = groundItem.size_height || 1;
        
        const distance = getDistance(player.position, {
            x: groundItem.position_x,
            y: groundItem.position_y,
            z: groundItem.position_z
        });
        
        if (distance > 5) {
            player.outputChatBox('!{#f44336}Вы слишком далеко от предмета');
            return;
        }
        
        // Сначала проверяем можно ли добавить к существующему стаку
        if (groundItem.max_stack > 1) {
            const [existingItems] = await db.query(
                'SELECT * FROM character_inventory WHERE character_id = ? AND item_id = ? AND quantity < ?',
                [player.characterId, groundItem.item_id, groundItem.max_stack]
            );
            
            if (existingItems.length > 0) {
                const existing = existingItems[0];
                const canAdd = groundItem.max_stack - existing.quantity;
                const toAdd = Math.min(canAdd, groundItem.quantity);
                
                await db.query(
                    'UPDATE character_inventory SET quantity = quantity + ? WHERE id = ?',
                    [toAdd, existing.id]
                );
                
                if (toAdd >= groundItem.quantity) {
                    // Весь предмет добавлен в стак
                    await db.query('DELETE FROM ground_items WHERE id = ?', [groundItemId]);
                    
                    // Удаляем из Map
                    groundItems.delete(groundItemId);
                    
                    const obj = groundItemObjects.get(groundItemId);
                    if (obj && mp.objects.exists(obj)) obj.destroy();
                    groundItemObjects.delete(groundItemId);
                    
                    player.outputChatBox(`!{#4caf50}Подобрано: ${groundItem.display_name || groundItem.name} x${groundItem.quantity}`);
                    await sendInventoryUpdate(player);
                    updateNearbyGroundItems(player);
                    return;
                } else {
                    // Частично добавлено, остаток нужно положить в новый слот
                    groundItem.quantity -= toAdd;
                }
            }
        }
        
        // Ищем свободное место для нового предмета
        const freeSlot = await findFreeSlotForSize(player.characterId, width, height);
        
        if (freeSlot === -1) {
            player.outputChatBox('!{#f44336}Инвентарь полон!');
            return;
        }
        
        // Удаляем с земли
        await db.query('DELETE FROM ground_items WHERE id = ?', [groundItemId]);
        
        // Удаляем из Map
        groundItems.delete(groundItemId);
        
        const obj = groundItemObjects.get(groundItemId);
        if (obj && mp.objects.exists(obj)) obj.destroy();
        groundItemObjects.delete(groundItemId);
        
        // Добавляем в инвентарь
        await db.query(
            'INSERT INTO character_inventory (character_id, item_id, slot, quantity, metadata) VALUES (?, ?, ?, ?, ?)',
            [player.characterId, groundItem.item_id, freeSlot, groundItem.quantity, groundItem.metadata]
        );
        
        player.outputChatBox(`!{#4caf50}Подобрано: ${groundItem.display_name || groundItem.name} x${groundItem.quantity}`);
        await sendInventoryUpdate(player);
        updateNearbyGroundItems(player);
        
    } catch (err) {
        console.error('[Inventory] Ошибка подбора предмета:', err);
        player.outputChatBox('!{#f44336}Ошибка при подборе предмета');
    }
});

// ===== ВЫБРОС ПРЕДМЕТА ИЗ ЭКИПИРОВКИ =====
mp.events.add('inventory:dropEquipment', async (player, slotType) => {
    if (!player || !mp.players.exists(player) || !player.characterId) return;
    
    try {
        const [equipment] = await db.query(`
            SELECT ce.*, i.name, i.display_name, i.model_data, i.type, i.icon, i.id as item_id
            FROM character_equipment ce
            JOIN items i ON ce.item_id = i.id
            WHERE ce.character_id = ? AND ce.slot_type = ?
        `, [player.characterId, slotType]);
        
        if (equipment.length === 0) {
            player.outputChatBox('!{#f44336}В этом слоте ничего нет');
            return;
        }
        
        const item = equipment[0];
        
        // Удаляем из экипировки
        await db.query(
            'DELETE FROM character_equipment WHERE character_id = ? AND slot_type = ?',
            [player.characterId, slotType]
        );
        
        // Если это оружие - убираем из рук
        if (item.type === 'weapon' && item.model_data) {
            const modelData = typeof item.model_data === 'string' ? JSON.parse(item.model_data) : item.model_data;
            if (modelData.weaponHash) {
                player.removeWeapon(mp.joaat(modelData.weaponHash));
            }
        }
        
        // Если это одежда - сбрасываем компонент
        if (item.type === 'clothing' && item.model_data) {
            const modelData = typeof item.model_data === 'string' ? JSON.parse(item.model_data) : item.model_data;
            if (modelData.slotType) {
                const componentId = CLOTHING_COMPONENTS[modelData.slotType];
                if (componentId !== undefined) {
                    if (modelData.isProp) {
                        player.setProp(componentId, -1, 0);
                    } else {
                        player.setClothes(componentId, 0, 0, 0);
                    }
                }
            }
            saveCharacterClothes(player);
        }
        
        // Позиция для выброса
        const headingRad = player.heading * Math.PI / 180;
		const dropPos = {
		x: player.position.x - Math.sin(headingRad) * 1.5 + (Math.random() - 0.5) * 0.5,
		y: player.position.y + Math.cos(headingRad) * 1.5 + (Math.random() - 0.5) * 0.5,
		z: player.position.z
	};
        
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        
        // Создаём предмет на земле
        try {
            const [result] = await db.query(`
                INSERT INTO ground_items (item_id, quantity, metadata, position_x, position_y, position_z, dimension, expires_at)
                VALUES (?, 1, NULL, ?, ?, ?, ?, ?)
            `, [item.item_id, dropPos.x, dropPos.y, dropPos.z, player.dimension, expiresAt]);
            
            // Добавляем в Map
            groundItems.set(result.insertId, {
                id: result.insertId,
                itemId: item.item_id,
                name: item.name,
                displayName: item.display_name,
                quantity: 1,
                position: dropPos,
                dimension: player.dimension
            });
            
            createGroundItemObject(result.insertId, item, 1, dropPos, player.dimension);
        } catch (dbErr) {
            console.log('[Inventory] Таблица ground_items не найдена');
        }
        
        player.outputChatBox(`!{#ff9800}Вы выбросили: ${item.display_name || item.name}`);
        await sendInventoryUpdate(player);
        updateNearbyGroundItems(player);
        
    } catch (err) {
        console.error('[Inventory] Ошибка выброса экипировки:', err);
    }
});

// ===== МОДЕЛИ ДЛЯ ПРЕДМЕТОВ НА ЗЕМЛЕ (ВАНИЛЬНЫЕ GTA V) =====
const GROUND_ITEM_MODELS = {
    // ===== ЕДА =====
    'burger': 'prop_cs_burger_01',
    'pizza': 'prop_pizza_box_02',
    'hotdog': 'prop_cs_hotdog_01',
    'sandwich': 'prop_sandwich_01',
    'donut': 'prop_donut_01',
    'apple': 'prop_fruit_01',          // Зелёное яблоко
    'bread': 'prop_cs_bread_01',
    'chips': 'prop_crisp_small',
    'chocolate': 'prop_candy_pqs',
    'steak': 'prop_cs_steak',
    'food': 'prop_cs_burger_01',
    
    // ===== НАПИТКИ =====
    'water': 'prop_ld_flow_bottle',
    'bottle': 'prop_ld_flow_bottle',
    'cola': 'prop_ecola_can',
    'sprite': 'prop_sprunk_can_01',
    'soda': 'prop_ecola_can',
    'juice': 'prop_energy_drink',
    'energy_drink': 'prop_energy_drink',
    'coffee': 'prop_cs_coffee_cup',
    'beer': 'prop_amb_beer_bottle',
    'vodka': 'prop_vodka_bottle',
    'whiskey': 'prop_whiskey_bottle',
    'wine': 'prop_wine_red',
    'drink': 'prop_ld_flow_bottle',
    
    // ===== МЕДИКАМЕНТЫ =====
    'bandage': 'prop_ld_health_pack',
    'medkit': 'prop_ld_health_pack',
    'firstaid': 'prop_ld_health_pack',
    'painkillers': 'prop_pills_jar',
    'vitamins': 'prop_pills_bottle',
    'adrenaline': 'prop_syringe_01',
    'pills': 'prop_pills_jar',
    
    // ===== ОРУЖИЕ =====
    'weapon_pistol': 'w_pi_pistol',
    'weapon_combatpistol': 'w_pi_combatpistol',
    'weapon_pistol50': 'w_pi_pistol50',
    'weapon_snspistol': 'w_pi_sns_pistol',
    'weapon_microsmg': 'w_sb_microsmg',
    'weapon_smg': 'w_sb_smg',
    'weapon_assaultrifle': 'w_ar_assaultrifle',
    'weapon_carbinerifle': 'w_ar_carbinerifle',
    'weapon_pumpshotgun': 'w_sg_pumpshotgun',
    'weapon_sawnoffshotgun': 'w_sg_sawnoff',
    'weapon_sniperrifle': 'w_sr_sniperrifle',
    'weapon_knife': 'w_me_knife_01',
    'weapon_bat': 'w_me_bat',
    'weapon_crowbar': 'w_me_crowbar',
    
    // ===== ПАТРОНЫ =====
    'ammo_pistol': 'prop_ld_ammo_pack_01',
    'ammo_smg': 'prop_ld_ammo_pack_01',
    'ammo_rifle': 'prop_ld_ammo_pack_02',
    'ammo_shotgun': 'prop_ld_ammo_pack_01',
    'ammo_sniper': 'prop_ld_ammo_pack_02',
    'ammo': 'prop_ld_ammo_pack_01',
    
    // ===== ИНСТРУМЕНТЫ =====
    'lockpick': 'prop_tool_screwdvr02',
    'toolkit': 'prop_tool_box_01',
    'flashlight': 'prop_cs_police_torch',
    'rope': 'prop_rope_hook_01',
    'handcuffs': 'prop_cs_cuffs_01',
    'radio': 'prop_cs_hand_radio',
    'repair_kit': 'prop_tool_box_04',
    'jerrycan': 'prop_jerrycan_01',
    
    // ===== РЕСУРСЫ =====
    'wood': 'prop_mb_cargo_04a',
    'iron': 'prop_barrel_pile_01',
    'plastic': 'prop_cs_cardbox_01',
    'fabric': 'prop_cs_cardbox_01',
    'leather': 'prop_cs_cardbox_01',
    'scrap': 'prop_metal_plates01',
    'electronics': 'prop_cs_cardbox_01',
    
    // ===== ЦЕННОСТИ =====
    'money_stack': 'prop_cash_pile_01',
    'money': 'prop_cash_pile_01',
    'gold_bar': 'prop_gold_bar',
    'diamond': 'prop_diamond_01',
    'jewelry': 'prop_jewel_02a',
    'watch_rolex': 'prop_jewel_02a',
    
    // ===== ОДЕЖДА =====
    'tshirt': 'prop_cs_cardbox_01',
    'jeans': 'prop_cs_cardbox_01',
    'sneakers': 'prop_cs_cardbox_01',
    'cap': 'prop_cs_cardbox_01',
    'mask': 'prop_cs_cardbox_01',
    'clothing': 'prop_cs_cardbox_01',
    
    // ===== РЮКЗАКИ =====
    'backpack_small': 'prop_michael_backpack',
    'backpack_medium': 'p_michael_backpack_s',
    'backpack_large': 'prop_michael_backpack',
    'backpack': 'prop_michael_backpack',
    
    // ===== КЛЮЧИ И ДОКУМЕНТЫ =====
    'car_keys': 'prop_cs_keys_01',
    'house_keys': 'prop_cs_keys_01',
    'keys': 'prop_cs_keys_01',
    'id_card': 'prop_cs_business_card',
    'drivers_license': 'prop_cs_business_card',
    'weapon_license': 'prop_cs_business_card',
    'document': 'prop_cs_business_card',
    
    // ===== ЭЛЕКТРОНИКА =====
    'phone': 'prop_npc_phone',
    'phone_basic': 'prop_npc_phone',
    'phone_smartphone': 'prop_phone_ing',
    'gps': 'prop_cs_tablet',
    
    // ===== ФОЛЛБЭК ПО ТИПУ =====
    '_type_weapon': 'prop_box_guncase_01a',
    '_type_medical': 'prop_ld_health_pack',
    '_type_consumable': 'prop_cs_burger_01',
    '_type_tool': 'prop_tool_box_01',
    '_type_clothing': 'prop_cs_cardbox_01',
    '_type_resource': 'prop_box_wood01a',
    '_type_valuable': 'prop_cash_pile_01',
    '_type_ammo': 'prop_ld_ammo_pack_01',
    '_type_default': 'prop_drug_package_02'
};

function createGroundItemObject(groundItemId, item, quantity, position, dimension) {
    try {
        let modelName = null;
        const itemName = (item.name || '').toLowerCase();
        
        // 1. Сначала ищем точное совпадение по ID предмета
        if (GROUND_ITEM_MODELS[itemName]) {
            modelName = GROUND_ITEM_MODELS[itemName];
        }
        
        // 2. Если не нашли - ищем частичное совпадение
        if (!modelName) {
            for (const [key, model] of Object.entries(GROUND_ITEM_MODELS)) {
                if (!key.startsWith('_type_') && itemName.includes(key)) {
                    modelName = model;
                    break;
                }
            }
        }
        
        // 3. Если всё ещё не нашли - используем по типу
        if (!modelName && item.type) {
            const typeKey = '_type_' + item.type;
            modelName = GROUND_ITEM_MODELS[typeKey] || GROUND_ITEM_MODELS['_type_default'];
        }
        
        // 4. Фоллбэк на дефолт
        if (!modelName) {
            modelName = 'prop_drug_package_02';
        }
        
        // Определяем rotation и смещение Z в зависимости от типа
        let rotX = 0;
        let rotY = 0;
        let zOffset = -0.95;
        const rotZ = Math.random() * 360;
        
        // Оружие - лежит полностью плоско на земле
        if (item.type === 'weapon' || itemName.includes('weapon_')) {
            rotX = 90;   // Повернуть чтобы лежало
            rotY = 90;   // Повернуть на бок
            zOffset = -0.97;
        }
        
        // Создаём объект
        const obj = mp.objects.new(mp.joaat(modelName), new mp.Vector3(position.x, position.y, position.z + zOffset), {
            rotation: new mp.Vector3(rotX, rotY, rotZ),
            alpha: 255,
            dimension: dimension
        });
        
        obj.groundItemId = groundItemId;
        obj.itemData = { 
            id: item.item_id, 
            name: item.name, 
            displayName: item.display_name, 
            quantity, 
            type: item.type 
        };
        
        groundItemObjects.set(groundItemId, obj);
        
        console.log(`[Inventory] Создан объект ${modelName} для ${item.name || 'предмет'}`);
        
    } catch (err) {
        console.error('[Inventory] Ошибка создания объекта на земле:', err);
    }
}

// ===== ОБНОВЛЕНИЕ ПРЕДМЕТОВ НА ЗЕМЛЕ (ИСПРАВЛЕНО) =====
async function updateNearbyGroundItems(player) {
    // Проверяем что игрок существует и онлайн
    if (!player || !mp.players.exists(player) || !player.characterId) {
        return;
    }
    
    try {
        const pos = player.position;
        if (!pos) return;
        
        const nearbyItems = [];
        
        // Используем groundItems Map
        groundItems.forEach((item, id) => {
            if (item.dimension !== player.dimension) return;
            
            const distance = Math.sqrt(
                Math.pow(item.position.x - pos.x, 2) +
                Math.pow(item.position.y - pos.y, 2) +
                Math.pow(item.position.z - pos.z, 2)
            );
            
            if (distance <= 5) {
                nearbyItems.push({
                    id: id,
                    name: item.name,
                    displayName: item.displayName,
                    quantity: item.quantity,
                    distance: distance.toFixed(1)
                });
            }
        });
        
        // Повторная проверка перед отправкой
        safeCall(player, 'client:updateGroundItems', [JSON.stringify(nearbyItems)]);
        
    } catch (err) {
        // Игнорируем ошибки для отключённых игроков
        if (err.message && !err.message.includes('Expired')) {
            console.error('[Inventory] Ошибка обновления предметов:', err);
        }
    }
}

mp.events.add('inventory:requestGroundItems', async (player) => {
    if (!player || !mp.players.exists(player)) return;
    await updateNearbyGroundItems(player);
});

function getDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// ===== ОТПРАВКА ОБНОВЛЕНИЯ ИНВЕНТАРЯ =====
async function sendInventoryUpdate(player) {
    if (!player || !mp.players.exists(player) || !player.characterId) return;
    
    try {
        const inventory = await getCharacterInventory(player.characterId);
        const equipment = await getCharacterEquipment(player.characterId);
        const quickSlots = await getQuickSlots(player.characterId);
        
        safeCall(player, 'client:updateInventory', [JSON.stringify({
            main: inventory,
            equipment: equipment,
            quickSlots: quickSlots
        })]);
    } catch (err) {
        console.error('[Inventory] Ошибка отправки обновления:', err);
    }
}

// ===== СОХРАНЕНИЕ ОДЕЖДЫ =====
function saveCharacterClothes(player) {
    if (!player || !mp.players.exists(player)) return;
    
    try {
        safeCall(player, 'client:requestClothesData');
    } catch (err) {
        console.error('[Inventory] Ошибка запроса сохранения одежды:', err);
    }
}

mp.events.add('inventory:saveClothesData', async (player, clothesJson) => {
    if (!player || !mp.players.exists(player) || !player.characterId) return;
    try {
        await db.query('UPDATE characters SET clothes = ? WHERE id = ?', [clothesJson, player.characterId]);
    } catch (err) {
        console.error('[Inventory] Ошибка сохранения одежды:', err);
    }
});

// ===== ЗАГРУЗКА ОДЕЖДЫ И ОРУЖИЯ =====
async function loadCharacterClothes(player, characterId) {
    if (!player || !mp.players.exists(player)) return;
    
    try {
        const [equipment] = await db.query(`
            SELECT i.model_data, i.type
            FROM character_equipment ce
            JOIN items i ON ce.item_id = i.id
            WHERE ce.character_id = ? AND i.type = 'clothing'
        `, [characterId]);
        
        if (equipment.length > 0) {
            equipment.forEach(item => {
                if (item.model_data && player && mp.players.exists(player)) {
                    const modelData = typeof item.model_data === 'string' ? JSON.parse(item.model_data) : item.model_data;
                    if (modelData.slotType) {
                        const componentId = CLOTHING_COMPONENTS[modelData.slotType];
                        if (componentId !== undefined) {
                            if (modelData.isProp) {
                                player.setProp(componentId, modelData.drawable || 0, modelData.texture || 0);
                            } else {
                                player.setClothes(componentId, modelData.drawable || 0, modelData.texture || 0, 0);
                            }
                        }
                    }
                }
            });
            return;
        }
        
        const [result] = await db.query('SELECT clothes FROM characters WHERE id = ?', [characterId]);
        if (result.length === 0 || !result[0].clothes) return;
        
        const clothes = typeof result[0].clothes === 'string' ? JSON.parse(result[0].clothes) : result[0].clothes;
        
        if (player && mp.players.exists(player)) {
            for (let i = 0; i < 12; i++) {
                player.setClothes(i, clothes[`comp_${i}_drawable`] || 0, clothes[`comp_${i}_texture`] || 0, 0);
            }
            for (let i = 0; i < 3; i++) {
                const drawable = clothes[`prop_${i}_drawable`];
                if (drawable !== undefined && drawable >= 0) {
                    player.setProp(i, drawable, clothes[`prop_${i}_texture`] || 0);
                }
            }
        }
    } catch (err) {
        console.error('[Inventory] Ошибка загрузки одежды:', err);
    }
}

async function loadCharacterWeapons(player, characterId) {
    if (!player || !mp.players.exists(player)) return;
    
    try {
        const [weapons] = await db.query(`
            SELECT i.model_data, i.display_name
            FROM character_equipment ce 
            JOIN items i ON ce.item_id = i.id 
            WHERE ce.character_id = ? AND i.type = 'weapon'
        `, [characterId]);
        
        weapons.forEach(weapon => {
            if (weapon.model_data && player && mp.players.exists(player)) {
                const modelData = typeof weapon.model_data === 'string' ? JSON.parse(weapon.model_data) : weapon.model_data;
                if (modelData.weaponHash) {
                    player.giveWeapon(mp.joaat(modelData.weaponHash), modelData.ammo || 100);
                }
            }
        });
    } catch (err) {
        console.error('[Inventory] Ошибка загрузки оружия:', err);
    }
}

// ===== ДОБАВЛЕНИЕ ПРЕДМЕТА =====
async function addItem(characterId, itemName, quantity = 1, metadata = null) {
    try {
        const [items] = await db.query('SELECT * FROM items WHERE name = ?', [itemName]);
        if (items.length === 0) {
            console.error('[Inventory] Предмет не найден:', itemName);
            return false;
        }
        
        const item = items[0];
        const itemWidth = item.size_width || 1;
        const itemHeight = item.size_height || 1;
        
        if (item.max_stack > 1) {
            const [existingItems] = await db.query(
                'SELECT * FROM character_inventory WHERE character_id = ? AND item_id = ? AND quantity < ?',
                [characterId, item.id, item.max_stack]
            );
            
            if (existingItems.length > 0) {
                const existing = existingItems[0];
                const newQuantity = Math.min(existing.quantity + quantity, item.max_stack);
                const added = newQuantity - existing.quantity;
                
                await db.query('UPDATE character_inventory SET quantity = ? WHERE id = ?', [newQuantity, existing.id]);
                
                notifyPlayer(characterId, item, added);
                
                const remaining = quantity - added;
                if (remaining > 0) {
                    return await addItem(characterId, itemName, remaining, metadata);
                }
                return true;
            }
        }
        
        const freeSlot = await findFreeSlotForSize(characterId, itemWidth, itemHeight);
        if (freeSlot === -1) {
            mp.players.forEach(p => {
                if (p && mp.players.exists(p) && p.characterId === characterId) {
                    p.outputChatBox(`!{#f44336}Инвентарь полон! Нет места для ${item.display_name || item.name}`);
                }
            });
            return false;
        }
        
        await db.query(
            'INSERT INTO character_inventory (character_id, item_id, slot, quantity, metadata) VALUES (?, ?, ?, ?, ?)',
            [characterId, item.id, freeSlot, quantity, metadata ? JSON.stringify(metadata) : null]
        );
        
        notifyPlayer(characterId, item, quantity);
        return true;
    } catch (err) {
        console.error('[Inventory] Ошибка добавления предмета:', err);
        return false;
    }
}

function notifyPlayer(characterId, item, quantity) {
    mp.players.forEach(p => {
        if (p && mp.players.exists(p) && p.characterId === characterId) {
            p.outputChatBox(`!{#4caf50}Получен предмет: ${item.display_name || item.name} x${quantity}`);
            sendInventoryUpdate(p);
        }
    });
}

// ===== РАЗДЕЛЕНИЕ ПРЕДМЕТА =====
mp.events.add('inventory:splitItem', async (player, slot, quantity) => {
    if (!player || !mp.players.exists(player) || !player.characterId) return;
    
    try {
        slot = parseInt(slot);
        quantity = parseInt(quantity);
        
        if (isNaN(slot) || isNaN(quantity) || quantity <= 0) {
            player.outputChatBox('!{#f44336}Ошибка: неверные данные');
            return;
        }
        
        const [items] = await db.query(`
            SELECT ci.*, i.size_width, i.size_height, i.id as item_id, i.name, i.display_name
            FROM character_inventory ci
            JOIN items i ON ci.item_id = i.id
            WHERE ci.character_id = ? AND ci.slot = ?
        `, [player.characterId, slot]);
        
        if (items.length === 0) {
            player.outputChatBox('!{#f44336}Предмет не найден');
            return;
        }
        
        const item = items[0];
        
        if (item.quantity <= quantity) {
            player.outputChatBox('!{#f44336}Невозможно разделить - недостаточно предметов');
            return;
        }
        
        const width = item.size_width || 1;
        const height = item.size_height || 1;
        
        const freeSlot = await findFreeSlotForSize(player.characterId, width, height);
        if (freeSlot === -1) {
            player.outputChatBox('!{#f44336}Нет свободного места для разделения');
            return;
        }
        
        // Уменьшаем количество в оригинальном слоте
        await db.query(
            'UPDATE character_inventory SET quantity = quantity - ? WHERE id = ?',
            [quantity, item.id]
        );
        
        // Создаём новый стак
        await db.query(
            'INSERT INTO character_inventory (character_id, item_id, slot, quantity, metadata) VALUES (?, ?, ?, ?, ?)',
            [player.characterId, item.item_id, freeSlot, quantity, item.metadata]
        );
        
        player.outputChatBox(`!{#4caf50}Разделено: ${item.display_name || item.name} x${quantity}`);
        await sendInventoryUpdate(player);
        
    } catch (err) {
        console.error('[Inventory] Ошибка разделения:', err);
        player.outputChatBox('!{#f44336}Ошибка при разделении');
    }
});

// ===== ЭКСПОРТ =====
global.addItem = addItem;
global.loadCharacterClothes = loadCharacterClothes;
global.loadCharacterWeapons = loadCharacterWeapons;

// ===== КОМАНДЫ =====
mp.events.addCommand('giveitem', async (player, fullText) => {
    if (!player || !mp.players.exists(player) || !player.characterId) {
        player.outputChatBox('!{#f44336}Вы не выбрали персонажа!');
        return;
    }
    
    const args = fullText.split(' ');
    if (args.length < 1 || !args[0]) {
        player.outputChatBox('!{#ff9800}Использование: /giveitem [название] [количество]');
        return;
    }
    
    const itemName = args[0];
    const quantity = args[1] ? parseInt(args[1]) : 1;
    
    const success = await addItem(player.characterId, itemName, quantity);
    if (!success) {
        player.outputChatBox(`!{#f44336}Ошибка! Предмет не найден или инвентарь полон`);
    }
});

mp.events.addCommand('clearinventory', async (player) => {
    if (!player || !mp.players.exists(player) || !player.characterId) return;
    try {
        await db.query('DELETE FROM character_inventory WHERE character_id = ?', [player.characterId]);
        player.outputChatBox('!{#4caf50}Инвентарь очищен!');
        await sendInventoryUpdate(player);
    } catch (err) {
        console.error('[Inventory] Ошибка очистки:', err);
    }
});

mp.events.addCommand('items', async (player) => {
    if (!player || !mp.players.exists(player)) return;
    try {
        const [items] = await db.query('SELECT name, display_name, type, size_width, size_height FROM items');
        player.outputChatBox('!{#2196f3}===== ДОСТУПНЫЕ ПРЕДМЕТЫ =====');
        items.forEach(item => {
            player.outputChatBox(`!{#ffffff}${item.name} - ${item.display_name || item.name} (${item.type}) [${item.size_width || 1}x${item.size_height || 1}]`);
        });
    } catch (err) {
        console.error('[Inventory] Ошибка:', err);
    }
});

// ===== ЗАГРУЗКА ПРЕДМЕТОВ НА ЗЕМЛЕ ПРИ СТАРТЕ =====
async function loadGroundItems() {
    try {
        // Удаляем просроченные предметы
        await db.query('DELETE FROM ground_items WHERE expires_at < NOW()');
        
        const [items] = await db.query(`
            SELECT gi.*, i.name, i.display_name, i.type
            FROM ground_items gi
            JOIN items i ON gi.item_id = i.id
        `);
        
        items.forEach(item => {
            // Добавляем в Map
            groundItems.set(item.id, {
                id: item.id,
                itemId: item.item_id,
                name: item.name,
                displayName: item.display_name,
                quantity: item.quantity,
                position: { x: item.position_x, y: item.position_y, z: item.position_z },
                dimension: item.dimension
            });
            
            createGroundItemObject(item.id, {
                item_id: item.item_id, 
                name: item.name, 
                display_name: item.display_name, 
                type: item.type
            }, item.quantity, { 
                x: item.position_x, 
                y: item.position_y, 
                z: item.position_z 
            }, item.dimension);
        });
        
        console.log(`[Inventory] Загружено предметов на земле: ${items.length}`);
    } catch (err) {
        console.error('[Inventory] Ошибка загрузки предметов на земле:', err);
    }
}

// ===== ОЧИСТКА ПРОСРОЧЕННЫХ ПРЕДМЕТОВ =====
setInterval(async () => {
    try {
        const [expired] = await db.query('SELECT id FROM ground_items WHERE expires_at < NOW()');
        
        for (const item of expired) {
            // Удаляем объект
            const obj = groundItemObjects.get(item.id);
            if (obj && mp.objects.exists(obj)) obj.destroy();
            groundItemObjects.delete(item.id);
            
            // Удаляем из Map
            groundItems.delete(item.id);
        }
        
        await db.query('DELETE FROM ground_items WHERE expires_at < NOW()');
        
        if (expired.length > 0) {
            console.log(`[Inventory] Удалено просроченных предметов: ${expired.length}`);
        }
    } catch (err) {
        // Игнорируем ошибки
    }
}, 5 * 60 * 1000); // Каждые 5 минут

// ===== ПЕРИОДИЧЕСКОЕ ОБНОВЛЕНИЕ ПРЕДМЕТОВ НА ЗЕМЛЕ ДЛЯ ИГРОКОВ =====
setInterval(() => {
    mp.players.forEach((player) => {
        // Проверяем что игрок существует
        if (!player || !mp.players.exists(player)) return;
        if (!player.characterId) return;
        
        try {
            updateNearbyGroundItems(player);
        } catch (err) {
            // Игнорируем ошибки
        }
    });
}, 5000); // Каждые 5 секунд

// Загружаем предметы на земле через 3 секунды после старта
setTimeout(loadGroundItems, 3000);

// ===== СИСТЕМА БЫСТРЫХ СЛОТОВ =====

// Получение быстрых слотов
async function getQuickSlots(characterId) {
    try {
        const [slots] = await db.query(`
            SELECT qs.slot_index, qs.inventory_slot, ci.item_id, i.name, i.display_name, i.icon, i.type
            FROM character_quick_slots qs
            LEFT JOIN character_inventory ci ON qs.inventory_slot = ci.slot AND ci.character_id = qs.character_id
            LEFT JOIN items i ON ci.item_id = i.id
            WHERE qs.character_id = ?
            ORDER BY qs.slot_index
        `, [characterId]);
        
        const quickSlots = [null, null, null, null, null];
        
        slots.forEach(slot => {
            if (slot.slot_index >= 0 && slot.slot_index < 5) {
                if (slot.item_id) {
                    quickSlots[slot.slot_index] = {
                        inventorySlot: slot.inventory_slot,
                        id: slot.name,
                        name: slot.display_name || slot.name,
                        icon: slot.icon,
                        type: slot.type
                    };
                } else {
                    quickSlots[slot.slot_index] = null;
                }
            }
        });
        
        return quickSlots;
    } catch (err) {
        console.error('[Inventory] Ошибка получения быстрых слотов:', err);
        return [null, null, null, null, null];
    }
}

// Назначение предмета на быстрый слот
mp.events.add('inventory:assignQuickSlot', async (player, inventorySlot, quickSlotIndex) => {
    if (!player || !mp.players.exists(player) || !player.characterId) return;
    
    try {
        inventorySlot = parseInt(inventorySlot);
        quickSlotIndex = parseInt(quickSlotIndex);
        
        if (quickSlotIndex < 0 || quickSlotIndex > 4) {
            player.outputChatBox('!{#f44336}Неверный номер слота');
            return;
        }
        
        // Проверяем что предмет существует
        const [items] = await db.query(`
            SELECT ci.*, i.name, i.display_name, i.type, i.usable
            FROM character_inventory ci
            JOIN items i ON ci.item_id = i.id
            WHERE ci.character_id = ? AND ci.slot = ?
        `, [player.characterId, inventorySlot]);
        
        if (items.length === 0) {
            player.outputChatBox('!{#f44336}Предмет не найден');
            return;
        }
        
        const item = items[0];
        
        // Проверяем можно ли использовать предмет
        if (!item.usable && item.type !== 'consumable' && item.type !== 'medical' && item.type !== 'weapon') {
            player.outputChatBox('!{#f44336}Этот предмет нельзя назначить на быстрый слот');
            return;
        }
        
        // Удаляем старую привязку если есть
        await db.query(
            'DELETE FROM character_quick_slots WHERE character_id = ? AND slot_index = ?',
            [player.characterId, quickSlotIndex]
        );
        
        // Удаляем этот предмет из других быстрых слотов
        await db.query(
            'DELETE FROM character_quick_slots WHERE character_id = ? AND inventory_slot = ?',
            [player.characterId, inventorySlot]
        );
        
        // Добавляем новую привязку
        await db.query(
            'INSERT INTO character_quick_slots (character_id, slot_index, inventory_slot) VALUES (?, ?, ?)',
            [player.characterId, quickSlotIndex, inventorySlot]
        );
        
        player.outputChatBox(`!{#4caf50}${item.display_name || item.name} назначен на слот ${quickSlotIndex + 1}`);
        await sendInventoryUpdate(player);
        
    } catch (err) {
        console.error('[Inventory] Ошибка назначения быстрого слота:', err);
    }
});

// Очистка быстрого слота
mp.events.add('inventory:clearQuickSlot', async (player, quickSlotIndex) => {
    if (!player || !mp.players.exists(player) || !player.characterId) return;
    
    try {
        quickSlotIndex = parseInt(quickSlotIndex);
        
        await db.query(
            'DELETE FROM character_quick_slots WHERE character_id = ? AND slot_index = ?',
            [player.characterId, quickSlotIndex]
        );
        
        player.outputChatBox(`!{#ff9800}Слот ${quickSlotIndex + 1} очищен`);
        await sendInventoryUpdate(player);
        
    } catch (err) {
        console.error('[Inventory] Ошибка очистки быстрого слота:', err);
    }
});

// Использование быстрого слота
mp.events.add('inventory:useQuickSlot', async (player, quickSlotIndex) => {
    if (!player || !mp.players.exists(player) || !player.characterId) return;
    
    try {
        quickSlotIndex = parseInt(quickSlotIndex);
        
        const [slots] = await db.query(`
            SELECT qs.inventory_slot
            FROM character_quick_slots qs
            WHERE qs.character_id = ? AND qs.slot_index = ?
        `, [player.characterId, quickSlotIndex]);
        
        if (slots.length === 0) {
            player.outputChatBox('!{#ff9800}Слот пуст');
            return;
        }
        
        const inventorySlot = slots[0].inventory_slot;
        
        // Вызываем использование предмета
        mp.events.call('inventory:useItem', player, inventorySlot);
        
    } catch (err) {
        console.error('[Inventory] Ошибка использования быстрого слота:', err);
    }
});

console.log('[Inventory System] ✅ Система инвентаря загружена!');
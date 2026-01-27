// ===== СИСТЕМА ИНВЕНТАРЯ - СЕРВЕРНАЯ ЧАСТЬ =====

const { db } = require('../database');

// ===== КОНСТАНТЫ =====
const GRID_WIDTH = 5;
const GRID_HEIGHT = 7;

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
        
        // Отмечаем занятые ячейки
        items.forEach(item => {
            const startX = item.slot % GRID_WIDTH;
            const startY = Math.floor(item.slot / GRID_WIDTH);
            const itemW = item.size_width || 1;
            const itemH = item.size_height || 1;
            
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
        
        // Ищем свободное место
        for (let y = 0; y <= GRID_HEIGHT - height; y++) {
            for (let x = 0; x <= GRID_WIDTH - width; x++) {
                let canPlace = true;
                
                for (let dy = 0; dy < height && canPlace; dy++) {
                    for (let dx = 0; dx < width && canPlace; dx++) {
                        if (grid[y + dy][x + dx]) {
                            canPlace = false;
                        }
                    }
                }
                
                if (canPlace) {
                    return y * GRID_WIDTH + x;
                }
            }
        }
        
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
    if (!player.characterId) return;
    
    try {
        const inventory = await getCharacterInventory(player.characterId);
        const equipment = await getCharacterEquipment(player.characterId);
        
        const [charResult] = await db.query(
            'SELECT name, surname, level, max_weight, money, bank, health, armor FROM characters WHERE id = ?',
            [player.characterId]
        );
        
        if (charResult.length === 0) return;
        
        const character = charResult[0];
        
        const inventoryData = {
            main: inventory,
            equipment: equipment
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
        
        player.call('client:openInventory', [JSON.stringify(inventoryData), JSON.stringify(charData)]);
        
    } catch (err) {
        console.error('[Inventory] Ошибка открытия инвентаря:', err);
    }
});

// ===== ИСПОЛЬЗОВАНИЕ ПРЕДМЕТА =====
mp.events.add('inventory:useItem', async (player, slot) => {
    if (!player.characterId) return;
    
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
                player.outputChatBox('!{#ff9800}Этот предмет нельзя использовать');
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

async function useConsumable(player, item) {
    switch (item.name) {
        case 'water':
            player.thirst = Math.min((player.thirst || 0) + 30, 100);
            player.outputChatBox('!{#2196f3}Вы выпили воду (+30 жажда)');
            return true;
        case 'bread':
        case 'food':
            player.hunger = Math.min((player.hunger || 0) + 25, 100);
            player.outputChatBox('!{#ff9800}Вы поели (+25 голод)');
            return true;
        default:
            player.outputChatBox('!{#4caf50}Вы использовали ' + (item.display_name || item.name));
            return true;
    }
}

async function useMedical(player, item) {
    switch (item.name) {
        case 'bandage':
            player.health = Math.min(player.health + 20, 100);
            player.outputChatBox('!{#4caf50}Вы использовали бинт (+20 HP)');
            return true;
        case 'medkit':
            player.health = 100;
            player.outputChatBox('!{#4caf50}Вы использовали аптечку (HP восстановлено)');
            return true;
        default:
            player.health = Math.min(player.health + 10, 100);
            player.outputChatBox('!{#4caf50}+10 HP');
            return true;
    }
}

// ===== ЭКИПИРОВКА ОДЕЖДЫ =====
async function equipClothing(player, item, fromSlot) {
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
    if (!player.characterId) return;
    
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
    if (!player.characterId) return;
    
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
    if (!player.characterId) return;
    
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
        
        const heading = player.heading * Math.PI / 180;
        const dropPos = {
            x: player.position.x - Math.sin(heading) * 1.5 + (Math.random() - 0.5) * 0.5,
            y: player.position.y + Math.cos(heading) * 1.5 + (Math.random() - 0.5) * 0.5,
            z: player.position.z - 0.5
        };
        
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        
        try {
            const [result] = await db.query(`
                INSERT INTO ground_items (item_id, quantity, metadata, position_x, position_y, position_z, dimension, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [item.item_id, dropQuantity, item.metadata, dropPos.x, dropPos.y, dropPos.z, player.dimension, expiresAt]);
            
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
    if (!player.characterId) return;
    
    try {
        const [groundItems] = await db.query(`
            SELECT gi.*, i.name, i.display_name, i.max_stack, i.type, i.size_width, i.size_height
            FROM ground_items gi
            JOIN items i ON gi.item_id = i.id
            WHERE gi.id = ? AND gi.dimension = ?
        `, [groundItemId, player.dimension]);
        
        if (groundItems.length === 0) {
            player.outputChatBox('!{#f44336}Предмет не найден');
            return;
        }
        
        const groundItem = groundItems[0];
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
        
        const freeSlot = await findFreeSlotForSize(player.characterId, width, height);
        
        const [existingItems] = await db.query(
            'SELECT * FROM character_inventory WHERE character_id = ? AND item_id = ? AND quantity < ?',
            [player.characterId, groundItem.item_id, groundItem.max_stack]
        );
        
        if (freeSlot === -1 && existingItems.length === 0) {
            player.outputChatBox('!{#f44336}Инвентарь полон!');
            return;
        }
        
        await db.query('DELETE FROM ground_items WHERE id = ?', [groundItemId]);
        
        const obj = groundItemObjects.get(groundItemId);
        if (obj && mp.objects.exists(obj)) {
            obj.destroy();
        }
        groundItemObjects.delete(groundItemId);
        
        if (existingItems.length > 0 && groundItem.max_stack > 1) {
            const existing = existingItems[0];
            const newQuantity = Math.min(existing.quantity + groundItem.quantity, groundItem.max_stack);
            await db.query('UPDATE character_inventory SET quantity = ? WHERE id = ?', [newQuantity, existing.id]);
        } else {
            await db.query(
                'INSERT INTO character_inventory (character_id, item_id, slot, quantity, metadata) VALUES (?, ?, ?, ?, ?)',
                [player.characterId, groundItem.item_id, freeSlot, groundItem.quantity, groundItem.metadata]
            );
        }
        
        player.outputChatBox(`!{#4caf50}Подобрано: ${groundItem.display_name || groundItem.name} x${groundItem.quantity}`);
        await sendInventoryUpdate(player);
        updateNearbyGroundItems(player);
        
    } catch (err) {
        console.error('[Inventory] Ошибка подбора предмета:', err);
    }
});

// ===== ВЫБРОС ПРЕДМЕТА ИЗ ЭКИПИРОВКИ =====
mp.events.add('inventory:dropEquipment', async (player, slotType) => {
    if (!player.characterId) return;
    
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
        const heading = player.heading * Math.PI / 180;
        const dropPos = {
            x: player.position.x - Math.sin(heading) * 1.5 + (Math.random() - 0.5) * 0.5,
            y: player.position.y + Math.cos(heading) * 1.5 + (Math.random() - 0.5) * 0.5,
            z: player.position.z - 0.5
        };
        
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        
        // Создаём предмет на земле
        try {
            const [result] = await db.query(`
                INSERT INTO ground_items (item_id, quantity, metadata, position_x, position_y, position_z, dimension, expires_at)
                VALUES (?, 1, NULL, ?, ?, ?, ?, ?)
            `, [item.item_id, dropPos.x, dropPos.y, dropPos.z, player.dimension, expiresAt]);
            
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

// ===== СИСТЕМА ПРЕДМЕТОВ НА ЗЕМЛЕ =====
const groundItemObjects = new Map();

function createGroundItemObject(groundItemId, item, quantity, position, dimension) {
    try {
        const modelsByType = {
            'weapon': 'prop_box_guncase_01a',
            'medical': 'prop_ld_health_pack',
            'consumable': 'prop_food_bag1',
            'tool': 'prop_tool_box_01',
            'clothing': 'prop_cs_cardbox_01',
            'resource': 'prop_box_wood01a'
        };
        
        const modelHash = modelsByType[item.type] || 'prop_drug_package_02';
        
        const obj = mp.objects.new(mp.joaat(modelHash), new mp.Vector3(position.x, position.y, position.z), {
            rotation: new mp.Vector3(0, 0, Math.random() * 360),
            alpha: 255,
            dimension: dimension
        });
        
        obj.groundItemId = groundItemId;
        obj.itemData = { id: item.item_id, name: item.name, displayName: item.display_name, quantity, type: item.type };
        
        groundItemObjects.set(groundItemId, obj);
    } catch (err) {
        console.error('[Inventory] Ошибка создания объекта на земле:', err);
    }
}

async function getNearbyGroundItems(player, radius = 10) {
    try {
        const [items] = await db.query(`
            SELECT gi.*, i.name, i.display_name, i.type, i.weight, i.icon
            FROM ground_items gi
            JOIN items i ON gi.item_id = i.id
            WHERE gi.dimension = ?
            AND gi.position_x BETWEEN ? AND ?
            AND gi.position_y BETWEEN ? AND ?
        `, [
            player.dimension,
            player.position.x - radius, player.position.x + radius,
            player.position.y - radius, player.position.y + radius
        ]);
        
        return items.map(item => ({
            id: item.id,
            itemId: item.item_id,
            name: item.display_name || item.name,
            type: item.type,
            quantity: item.quantity,
            weight: item.weight,
            icon: item.icon,
            position: { x: item.position_x, y: item.position_y, z: item.position_z },
            distance: getDistance(player.position, { x: item.position_x, y: item.position_y, z: item.position_z })
        })).sort((a, b) => a.distance - b.distance);
    } catch (err) {
        console.error('[Inventory] Ошибка получения предметов на земле:', err);
        return [];
    }
}

async function updateNearbyGroundItems(player) {
    const nearbyItems = await getNearbyGroundItems(player);
    player.call('client:updateGroundItems', [JSON.stringify(nearbyItems)]);
}

mp.events.add('inventory:requestGroundItems', async (player) => {
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
    const inventory = await getCharacterInventory(player.characterId);
    const equipment = await getCharacterEquipment(player.characterId);
    
    player.call('client:updateInventory', [JSON.stringify({
        main: inventory,
        equipment: equipment
    })]);
}

// ===== СОХРАНЕНИЕ ОДЕЖДЫ =====
function saveCharacterClothes(player) {
    try {
        player.call('client:requestClothesData');
    } catch (err) {
        console.error('[Inventory] Ошибка запроса сохранения одежды:', err);
    }
}

mp.events.add('inventory:saveClothesData', async (player, clothesJson) => {
    if (!player.characterId) return;
    try {
        await db.query('UPDATE characters SET clothes = ? WHERE id = ?', [clothesJson, player.characterId]);
    } catch (err) {
        console.error('[Inventory] Ошибка сохранения одежды:', err);
    }
});

// ===== ЗАГРУЗКА ОДЕЖДЫ И ОРУЖИЯ =====
async function loadCharacterClothes(player, characterId) {
    try {
        const [equipment] = await db.query(`
            SELECT i.model_data, i.type
            FROM character_equipment ce
            JOIN items i ON ce.item_id = i.id
            WHERE ce.character_id = ? AND i.type = 'clothing'
        `, [characterId]);
        
        if (equipment.length > 0) {
            equipment.forEach(item => {
                if (item.model_data) {
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
        
        for (let i = 0; i < 12; i++) {
            player.setClothes(i, clothes[`comp_${i}_drawable`] || 0, clothes[`comp_${i}_texture`] || 0, 0);
        }
        for (let i = 0; i < 3; i++) {
            const drawable = clothes[`prop_${i}_drawable`];
            if (drawable !== undefined && drawable >= 0) {
                player.setProp(i, drawable, clothes[`prop_${i}_texture`] || 0);
            }
        }
    } catch (err) {
        console.error('[Inventory] Ошибка загрузки одежды:', err);
    }
}

async function loadCharacterWeapons(player, characterId) {
    try {
        const [weapons] = await db.query(`
            SELECT i.model_data, i.display_name
            FROM character_equipment ce 
            JOIN items i ON ce.item_id = i.id 
            WHERE ce.character_id = ? AND i.type = 'weapon'
        `, [characterId]);
        
        weapons.forEach(weapon => {
            if (weapon.model_data) {
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
                if (p.characterId === characterId) {
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
        if (p.characterId === characterId) {
            p.outputChatBox(`!{#4caf50}Получен предмет: ${item.display_name || item.name} x${quantity}`);
            sendInventoryUpdate(p);
        }
    });
}

// ===== РАЗДЕЛЕНИЕ ПРЕДМЕТА =====
mp.events.add('inventory:splitItem', async (player, slot, quantity) => {
    if (!player.characterId) return;
    
    try {
        const [items] = await db.query(`
            SELECT ci.*, i.size_width, i.size_height, i.id as item_id
            FROM character_inventory ci
            JOIN items i ON ci.item_id = i.id
            WHERE ci.character_id = ? AND ci.slot = ?
        `, [player.characterId, slot]);
        
        if (items.length === 0) return;
        
        const item = items[0];
        
        if (item.quantity <= quantity || quantity <= 0) {
            player.outputChatBox('!{#f44336}Невозможно разделить!');
            return;
        }
        
        const width = item.size_width || 1;
        const height = item.size_height || 1;
        
        const freeSlot = await findFreeSlotForSize(player.characterId, width, height);
        if (freeSlot === -1) {
            player.outputChatBox('!{#f44336}Нет свободных слотов!');
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
        
        player.outputChatBox('!{#4caf50}Предмет разделён');
        await sendInventoryUpdate(player);
        
    } catch (err) {
        console.error('[Inventory] Ошибка разделения:', err);
        player.outputChatBox('!{#f44336}Ошибка при разделении предмета');
    }
});

// ===== ЭКСПОРТ =====
global.addItem = addItem;
global.loadCharacterClothes = loadCharacterClothes;
global.loadCharacterWeapons = loadCharacterWeapons;

// ===== КОМАНДЫ =====
mp.events.addCommand('giveitem', async (player, fullText) => {
    if (!player.characterId) {
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
    if (!player.characterId) return;
    try {
        await db.query('DELETE FROM character_inventory WHERE character_id = ?', [player.characterId]);
        player.outputChatBox('!{#4caf50}Инвентарь очищен!');
        await sendInventoryUpdate(player);
    } catch (err) {
        console.error('[Inventory] Ошибка очистки:', err);
    }
});

mp.events.addCommand('items', async (player) => {
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

// Загрузка предметов на земле при старте
async function loadGroundItems() {
    try {
        await db.query('DELETE FROM ground_items WHERE expires_at < NOW()');
        const [items] = await db.query(`
            SELECT gi.*, i.name, i.display_name, i.type
            FROM ground_items gi
            JOIN items i ON gi.item_id = i.id
        `);
        
        items.forEach(item => {
            createGroundItemObject(item.id, {
                item_id: item.item_id, name: item.name, display_name: item.display_name, type: item.type
            }, item.quantity, { x: item.position_x, y: item.position_y, z: item.position_z }, item.dimension);
        });
        
        console.log(`[Inventory] Загружено предметов на земле: ${items.length}`);
    } catch (err) {
        console.error('[Inventory] Ошибка загрузки предметов на земле:', err);
    }
}

setInterval(async () => {
    try {
        const [expired] = await db.query('SELECT id FROM ground_items WHERE expires_at < NOW()');
        for (const item of expired) {
            const obj = groundItemObjects.get(item.id);
            if (obj && mp.objects.exists(obj)) obj.destroy();
            groundItemObjects.delete(item.id);
        }
        await db.query('DELETE FROM ground_items WHERE expires_at < NOW()');
    } catch (err) {}
}, 5 * 60 * 1000);

setTimeout(loadGroundItems, 3000);

console.log('[Inventory System] ✅ Система инвентаря загружена!');
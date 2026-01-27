// ===== СИСТЕМА ИНВЕНТАРЯ - СЕРВЕРНАЯ ЧАСТЬ =====

const { db } = require('../database');

// ===== КОНСТАНТЫ ДЛЯ ОДЕЖДЫ =====
const CLOTHING_COMPONENTS = {
    'hat': 0,
    'mask': 1,
    'top': 11,
    'undershirt': 8,
    'legs': 4,
    'shoes': 6,
    'accessory': 7,
    'bag': 5,
    'armor': 9,
    'glasses': 1,
    'watch': 6
};

// ===== ПОЛУЧЕНИЕ ИНВЕНТАРЯ ПЕРСОНАЖА =====
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
        
        if (tables.length === 0) {
            return {};
        }
        
        const [equipment] = await db.query(`
            SELECT 
                ce.slot_type,
                ce.item_id,
                i.name,
                i.display_name,
                i.type,
                i.weight,
                i.model_data
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
                modelData: item.model_data ? (typeof item.model_data === 'string' ? JSON.parse(item.model_data) : item.model_data) : null
            };
        });
        
        return equippedItems;
    } catch (err) {
        console.error('[Inventory] Ошибка получения экипировки:', err);
        return {};
    }
}

// ===== ОТКРЫТИЕ ИНВЕНТАРЯ =====
mp.events.add('inventory:open', async (player) => {
    if (!player.characterId) {
        return;
    }
    
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
        
        if (items.length === 0) {
            return;
        }
        
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
                
            case 'tool':
                used = await useTool(player, item);
                break;
                
            default:
                player.outputChatBox('!{#ff9800}Этот предмет нельзя использовать');
                break;
        }
        
        if (consumed) {
            if (item.quantity > 1) {
                await db.query(
                    'UPDATE character_inventory SET quantity = quantity - 1 WHERE id = ?',
                    [item.id]
                );
            } else {
                await db.query(
                    'DELETE FROM character_inventory WHERE id = ?',
                    [item.id]
                );
            }
        }
        
        if (used) {
            await sendInventoryUpdate(player);
        }
        
    } catch (err) {
        console.error('[Inventory] Ошибка использования предмета:', err);
    }
});

// ===== ФУНКЦИИ ИСПОЛЬЗОВАНИЯ =====
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

async function useTool(player, item) {
    switch (item.name) {
        case 'phone':
            player.outputChatBox('!{#2196f3}Телефон (в разработке)');
            return false;
        default:
            return false;
    }
}

// ===== ЭКИПИРОВКА ОДЕЖДЫ =====
async function equipClothing(player, item, fromSlot) {
    try {
        let modelData = null;
        
        if (item.model_data) {
            modelData = typeof item.model_data === 'string' ? JSON.parse(item.model_data) : item.model_data;
        }
        
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
        
        // Проверяем текущую экипировку
        const [existingEquip] = await db.query(
            'SELECT * FROM character_equipment WHERE character_id = ? AND slot_type = ?',
            [player.characterId, slotType]
        );
        
        if (existingEquip.length > 0) {
            const freeSlot = await findFreeSlot(player.characterId);
            
            if (freeSlot === -1) {
                player.outputChatBox('!{#f44336}Нет места в инвентаре!');
                return false;
            }
            
            // Возвращаем старую одежду в инвентарь
            await db.query(
                'INSERT INTO character_inventory (character_id, item_id, slot, quantity) VALUES (?, ?, ?, 1)',
                [player.characterId, existingEquip[0].item_id, freeSlot]
            );
            
            // Удаляем из экипировки
            await db.query(
                'DELETE FROM character_equipment WHERE character_id = ? AND slot_type = ?',
                [player.characterId, slotType]
            );
        }
        
        // Надеваем новую одежду
        await db.query(
            'INSERT INTO character_equipment (character_id, slot_type, item_id) VALUES (?, ?, ?)',
            [player.characterId, slotType, item.item_id]
        );
        
        // Удаляем из инвентаря
        await db.query(
            'DELETE FROM character_inventory WHERE id = ?',
            [item.id]
        );
        
        // Применяем одежду на персонажа
        const drawable = modelData.drawable || 0;
        const texture = modelData.texture || 0;
        
        if (modelData.isProp) {
            player.setProp(componentId, drawable, texture);
        } else {
            player.setClothes(componentId, drawable, texture, 0);
        }
        
        // Сохраняем одежду через клиент
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
        let modelData = null;
        
        if (item.model_data) {
            modelData = typeof item.model_data === 'string' ? JSON.parse(item.model_data) : item.model_data;
        }
        
        if (!modelData || !modelData.weaponHash) {
            player.outputChatBox('!{#f44336}Ошибка: данные оружия отсутствуют');
            return false;
        }
        
        // Определяем слот для оружия
        const weaponHashUpper = modelData.weaponHash.toUpperCase();
        const isMelee = weaponHashUpper.includes('KNIFE') || 
                        weaponHashUpper.includes('DAGGER') ||
                        weaponHashUpper.includes('BAT') ||
                        weaponHashUpper.includes('HAMMER') ||
                        weaponHashUpper.includes('CROWBAR') ||
                        weaponHashUpper.includes('GOLFCLUB') ||
                        weaponHashUpper.includes('MACHETE') ||
                        weaponHashUpper.includes('SWITCHBLADE');
        
        let slotType = isMelee ? 'melee' : 'weapon1';
        
        // Если weapon1 занят, пробуем weapon2
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
        
        // Проверяем текущую экипировку в этом слоте
        const [existingEquip] = await db.query(
            'SELECT * FROM character_equipment WHERE character_id = ? AND slot_type = ?',
            [player.characterId, slotType]
        );
        
        if (existingEquip.length > 0) {
            const freeSlot = await findFreeSlot(player.characterId);
            
            if (freeSlot === -1) {
                player.outputChatBox('!{#f44336}Нет места в инвентаре!');
                return false;
            }
            
            // Получаем данные старого оружия для удаления из рук
            const [oldWeaponData] = await db.query(
                'SELECT model_data FROM items WHERE id = ?',
                [existingEquip[0].item_id]
            );
            
            if (oldWeaponData.length > 0 && oldWeaponData[0].model_data) {
                const oldModelData = typeof oldWeaponData[0].model_data === 'string' 
                    ? JSON.parse(oldWeaponData[0].model_data) 
                    : oldWeaponData[0].model_data;
                
                if (oldModelData.weaponHash) {
                    player.removeWeapon(mp.joaat(oldModelData.weaponHash));
                }
            }
            
            // Возвращаем старое оружие в инвентарь
            await db.query(
                'INSERT INTO character_inventory (character_id, item_id, slot, quantity) VALUES (?, ?, ?, 1)',
                [player.characterId, existingEquip[0].item_id, freeSlot]
            );
            
            // Удаляем из экипировки
            await db.query(
                'DELETE FROM character_equipment WHERE character_id = ? AND slot_type = ?',
                [player.characterId, slotType]
            );
        }
        
        // Добавляем новое оружие в экипировку
        await db.query(
            'INSERT INTO character_equipment (character_id, slot_type, item_id) VALUES (?, ?, ?)',
            [player.characterId, slotType, item.item_id]
        );
        
        // Удаляем из инвентаря
        await db.query(
            'DELETE FROM character_inventory WHERE id = ?',
            [item.id]
        );
        
        // Выдаём оружие в руки
        const weaponHash = mp.joaat(modelData.weaponHash);
        const ammo = modelData.ammo || 100;
        
        player.giveWeapon(weaponHash, ammo);
        
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
        const [equipment] = await db.query(
            'SELECT ce.*, i.model_data, i.type, i.display_name FROM character_equipment ce JOIN items i ON ce.item_id = i.id WHERE ce.character_id = ? AND ce.slot_type = ?',
            [player.characterId, slotType]
        );
        
        if (equipment.length === 0) {
            player.outputChatBox('!{#ff9800}В этом слоте ничего нет');
            return;
        }
        
        const equippedItem = equipment[0];
        
        const freeSlot = await findFreeSlot(player.characterId);
        
        if (freeSlot === -1) {
            player.outputChatBox('!{#f44336}Нет места в инвентаре!');
            return;
        }
        
        // Удаляем из экипировки СНАЧАЛА
        await db.query(
            'DELETE FROM character_equipment WHERE character_id = ? AND slot_type = ?',
            [player.characterId, slotType]
        );
        
        // Добавляем в инвентарь
        await db.query(
            'INSERT INTO character_inventory (character_id, item_id, slot, quantity) VALUES (?, ?, ?, 1)',
            [player.characterId, equippedItem.item_id, freeSlot]
        );
        
        // Обрабатываем снятие в зависимости от типа
        if (equippedItem.type === 'weapon') {
            // Снимаем оружие из рук
            if (equippedItem.model_data) {
                const modelData = typeof equippedItem.model_data === 'string' 
                    ? JSON.parse(equippedItem.model_data) 
                    : equippedItem.model_data;
                
                if (modelData.weaponHash) {
                    player.removeWeapon(mp.joaat(modelData.weaponHash));
                }
            }
            player.outputChatBox(`!{#4caf50}Оружие снято: ${equippedItem.display_name || 'Оружие'}`);
        } else if (equippedItem.type === 'clothing') {
            // Сбрасываем одежду на дефолтную
            const modelData = equippedItem.model_data 
                ? (typeof equippedItem.model_data === 'string' ? JSON.parse(equippedItem.model_data) : equippedItem.model_data)
                : null;
            
            if (modelData && modelData.slotType) {
                const componentId = CLOTHING_COMPONENTS[modelData.slotType];
                if (componentId !== undefined) {
                    if (modelData.isProp) {
                        player.setProp(componentId, -1, 0);
                    } else {
                        player.setClothes(componentId, 0, 0, 0);
                    }
                }
            }
            
            // Сохраняем одежду через клиент
            saveCharacterClothes(player);
            player.outputChatBox(`!{#4caf50}Одежда снята: ${equippedItem.display_name || 'Одежда'}`);
        }
        
        await sendInventoryUpdate(player);
        
    } catch (err) {
        console.error('[Inventory] Ошибка снятия предмета:', err);
    }
});

// ===== СОХРАНЕНИЕ ОДЕЖДЫ (ЧЕРЕЗ КЛИЕНТ) =====
function saveCharacterClothes(player) {
    try {
        // Запрашиваем данные одежды с клиента
        player.call('client:requestClothesData');
    } catch (err) {
        console.error('[Inventory] Ошибка запроса сохранения одежды:', err);
    }
}

// Получаем данные одежды от клиента
mp.events.add('inventory:saveClothesData', async (player, clothesJson) => {
    if (!player.characterId) return;
    
    try {
        await db.query(
            'UPDATE characters SET clothes = ? WHERE id = ?',
            [clothesJson, player.characterId]
        );
    } catch (err) {
        console.error('[Inventory] Ошибка сохранения одежды в БД:', err);
    }
});

// ===== ЗАГРУЗКА ОДЕЖДЫ =====
async function loadCharacterClothes(player, characterId) {
    try {
        // Сначала пробуем загрузить из character_equipment
        const [equipment] = await db.query(`
            SELECT i.model_data, i.type
            FROM character_equipment ce
            JOIN items i ON ce.item_id = i.id
            WHERE ce.character_id = ? AND i.type = 'clothing'
        `, [characterId]);
        
        if (equipment.length > 0) {
            equipment.forEach(item => {
                if (item.model_data) {
                    const modelData = typeof item.model_data === 'string' 
                        ? JSON.parse(item.model_data) 
                        : item.model_data;
                    
                    if (modelData.slotType) {
                        const componentId = CLOTHING_COMPONENTS[modelData.slotType];
                        
                        if (componentId !== undefined) {
                            const drawable = modelData.drawable || 0;
                            const texture = modelData.texture || 0;
                            
                            if (modelData.isProp) {
                                player.setProp(componentId, drawable, texture);
                            } else {
                                player.setClothes(componentId, drawable, texture, 0);
                            }
                        }
                    }
                }
            });
            return;
        }
        
        // Если нет экипировки - загружаем из поля clothes
        const [result] = await db.query(
            'SELECT clothes FROM characters WHERE id = ?',
            [characterId]
        );
        
        if (result.length === 0 || !result[0].clothes) return;
        
        const clothes = typeof result[0].clothes === 'string' ? JSON.parse(result[0].clothes) : result[0].clothes;
        
        for (let i = 0; i < 12; i++) {
            const drawable = clothes[`comp_${i}_drawable`] || 0;
            const texture = clothes[`comp_${i}_texture`] || 0;
            player.setClothes(i, drawable, texture, 0);
        }
        
        for (let i = 0; i < 3; i++) {
            const drawable = clothes[`prop_${i}_drawable`];
            const texture = clothes[`prop_${i}_texture`] || 0;
            if (drawable !== undefined && drawable >= 0) {
                player.setProp(i, drawable, texture);
            }
        }
        
    } catch (err) {
        console.error('[Inventory] Ошибка загрузки одежды:', err);
    }
}

// ===== ЗАГРУЗКА ЭКИПИРОВАННОГО ОРУЖИЯ =====
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
                const modelData = typeof weapon.model_data === 'string' 
                    ? JSON.parse(weapon.model_data) 
                    : weapon.model_data;
                
                if (modelData.weaponHash) {
                    player.giveWeapon(mp.joaat(modelData.weaponHash), modelData.ammo || 100);
                }
            }
        });
        
        if (weapons.length > 0) {
            console.log(`[Inventory] Загружено оружие для персонажа ${characterId}: ${weapons.length} шт.`);
        }
        
    } catch (err) {
        console.error('[Inventory] Ошибка загрузки оружия:', err);
    }
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
async function findFreeSlot(characterId) {
    const [slots] = await db.query(
        'SELECT slot FROM character_inventory WHERE character_id = ? ORDER BY slot ASC',
        [characterId]
    );
    
    const usedSlots = slots.map(s => s.slot);
    
    for (let i = 0; i < 35; i++) {
        if (!usedSlots.includes(i)) {
            return i;
        }
    }
    
    return -1;
}

async function sendInventoryUpdate(player) {
    const inventory = await getCharacterInventory(player.characterId);
    const equipment = await getCharacterEquipment(player.characterId);
    
    player.call('client:updateInventory', [JSON.stringify({
        main: inventory,
        equipment: equipment
    })]);
}

// ===== ПЕРЕМЕЩЕНИЕ ПРЕДМЕТА =====
mp.events.add('inventory:moveItem', async (player, fromJson, toJson) => {
    if (!player.characterId) return;
    
    try {
        const from = typeof fromJson === 'string' ? JSON.parse(fromJson) : fromJson;
        const to = typeof toJson === 'string' ? JSON.parse(toJson) : toJson;
        
        // Перемещение в слот экипировки
        if (to.type === 'equipment') {
            const [items] = await db.query(`
                SELECT ci.*, i.name, i.type, i.model_data, i.display_name, i.id as item_id
                FROM character_inventory ci
                JOIN items i ON ci.item_id = i.id
                WHERE ci.character_id = ? AND ci.slot = ?
            `, [player.characterId, from.index]);
            
            if (items.length > 0) {
                const item = items[0];
                
                if (item.type === 'weapon') {
                    await equipWeapon(player, item, from.index);
                } else if (item.type === 'clothing') {
                    await equipClothing(player, item, from.index);
                }
                
                await sendInventoryUpdate(player);
            }
            return;
        }
        
        // Обычное перемещение между слотами
        const [fromItems] = await db.query(
            'SELECT * FROM character_inventory WHERE character_id = ? AND slot = ?',
            [player.characterId, from.index]
        );
        
        const [toItems] = await db.query(
            'SELECT * FROM character_inventory WHERE character_id = ? AND slot = ?',
            [player.characterId, to.index]
        );
        
        if (fromItems.length === 0) return;
        
        const fromItem = fromItems[0];
        
        if (toItems.length > 0) {
            const toItem = toItems[0];
            
            // Меняем местами
            await db.query('UPDATE character_inventory SET slot = 999 WHERE id = ?', [fromItem.id]);
            await db.query('UPDATE character_inventory SET slot = ? WHERE id = ?', [from.index, toItem.id]);
            await db.query('UPDATE character_inventory SET slot = ? WHERE id = ?', [to.index, fromItem.id]);
        } else {
            await db.query('UPDATE character_inventory SET slot = ? WHERE id = ?', [to.index, fromItem.id]);
        }
        
        await sendInventoryUpdate(player);
        
    } catch (err) {
        console.error('[Inventory] Ошибка перемещения предмета:', err);
    }
});

// ===== РАЗДЕЛЕНИЕ ПРЕДМЕТА =====
mp.events.add('inventory:splitItem', async (player, slot, quantity) => {
    if (!player.characterId) return;
    
    try {
        const [items] = await db.query(
            'SELECT * FROM character_inventory WHERE character_id = ? AND slot = ?',
            [player.characterId, slot]
        );
        
        if (items.length === 0) return;
        
        const item = items[0];
        
        if (item.quantity <= quantity) {
            player.outputChatBox('!{#f44336}Невозможно разделить!');
            return;
        }
        
        const freeSlot = await findFreeSlot(player.characterId);
        
        if (freeSlot === -1) {
            player.outputChatBox('!{#f44336}Нет свободных слотов!');
            return;
        }
        
        await db.query(
            'UPDATE character_inventory SET quantity = quantity - ? WHERE id = ?',
            [quantity, item.id]
        );
        
        await db.query(
            'INSERT INTO character_inventory (character_id, item_id, slot, quantity) VALUES (?, ?, ?, ?)',
            [player.characterId, item.item_id, freeSlot, quantity]
        );
        
        player.outputChatBox('!{#4caf50}Предмет разделён');
        
        await sendInventoryUpdate(player);
        
    } catch (err) {
        console.error('[Inventory] Ошибка разделения:', err);
    }
});

// ===== ДОБАВЛЕНИЕ ПРЕДМЕТА =====
async function addItem(characterId, itemName, quantity = 1, metadata = null) {
    try {
        const [items] = await db.query(
            'SELECT * FROM items WHERE name = ?',
            [itemName]
        );
        
        if (items.length === 0) {
            console.error('[Inventory] Предмет не найден:', itemName);
            return false;
        }
        
        const item = items[0];
        
        const [existingItems] = await db.query(
            'SELECT * FROM character_inventory WHERE character_id = ? AND item_id = ? AND quantity < ?',
            [characterId, item.id, item.max_stack]
        );
        
        if (existingItems.length > 0 && item.max_stack > 1) {
            const existing = existingItems[0];
            const newQuantity = Math.min(existing.quantity + quantity, item.max_stack);
            
            await db.query(
                'UPDATE character_inventory SET quantity = ? WHERE id = ?',
                [newQuantity, existing.id]
            );
        } else {
            const freeSlot = await findFreeSlot(characterId);
            
            if (freeSlot === -1) {
                console.error('[Inventory] Нет свободных слотов');
                return false;
            }
            
            await db.query(
                'INSERT INTO character_inventory (character_id, item_id, slot, quantity, metadata) VALUES (?, ?, ?, ?, ?)',
                [characterId, item.id, freeSlot, quantity, metadata ? JSON.stringify(metadata) : null]
            );
        }
        
        // Уведомляем игрока
        let foundPlayer = null;
        mp.players.forEach(p => {
            if (p.characterId === characterId) foundPlayer = p;
        });
        
        if (foundPlayer) {
            foundPlayer.outputChatBox(`!{#4caf50}Получен предмет: ${item.display_name || item.name} x${quantity}`);
            await sendInventoryUpdate(foundPlayer);
        }
        
        return true;
        
    } catch (err) {
        console.error('[Inventory] Ошибка добавления предмета:', err);
        return false;
    }
}

// Экспортируем
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
    if (!player.characterId) {
        player.outputChatBox('!{#f44336}Вы не выбрали персонажа!');
        return;
    }
    
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
        const [items] = await db.query('SELECT name, display_name, type FROM items');
        
        player.outputChatBox('!{#2196f3}===== ДОСТУПНЫЕ ПРЕДМЕТЫ =====');
        items.forEach(item => {
            player.outputChatBox(`!{#ffffff}${item.name} - ${item.display_name || item.name} (${item.type})`);
        });
    } catch (err) {
        console.error('[Inventory] Ошибка:', err);
    }
});

// ===== СИСТЕМА ПРЕДМЕТОВ НА ЗЕМЛЕ =====

// Хранилище объектов на земле (для визуализации)
const groundItemObjects = new Map();

// ===== ВЫБРОС ПРЕДМЕТА НА ЗЕМЛЮ =====
mp.events.add('inventory:dropItem', async (player, slot, quantity) => {
    if (!player.characterId) return;
    
    try {
        const [items] = await db.query(`
            SELECT ci.*, i.name, i.display_name, i.model_data, i.type
            FROM character_inventory ci
            JOIN items i ON ci.item_id = i.id
            WHERE ci.character_id = ? AND ci.slot = ?
        `, [player.characterId, slot]);
        
        if (items.length === 0) return;
        
        const item = items[0];
        const dropQuantity = Math.min(quantity, item.quantity);
        
        // Удаляем из инвентаря
        if (item.quantity > dropQuantity) {
            await db.query(
                'UPDATE character_inventory SET quantity = quantity - ? WHERE id = ?',
                [dropQuantity, item.id]
            );
        } else {
            await db.query(
                'DELETE FROM character_inventory WHERE id = ?',
                [item.id]
            );
        }
        
        // Позиция для выброса (перед игроком)
        const forwardX = player.position.x + Math.sin(-player.heading * Math.PI / 180) * 1.5;
        const forwardY = player.position.y + Math.cos(-player.heading * Math.PI / 180) * 1.5;
        const dropPos = {
            x: forwardX + (Math.random() - 0.5) * 0.5,
            y: forwardY + (Math.random() - 0.5) * 0.5,
            z: player.position.z - 0.5
        };
        
        // Время истечения (30 минут)
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        
        // Сохраняем в БД
        const [result] = await db.query(`
            INSERT INTO ground_items (item_id, quantity, metadata, position_x, position_y, position_z, dimension, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [item.item_id, dropQuantity, item.metadata, dropPos.x, dropPos.y, dropPos.z, player.dimension, expiresAt]);
        
        const groundItemId = result.insertId;
        
        // Создаём визуальный объект
        createGroundItemObject(groundItemId, item, dropQuantity, dropPos, player.dimension);
        
        player.outputChatBox(`!{#ff9800}Вы выбросили: ${item.display_name || item.name} x${dropQuantity}`);
        
        // Обновляем инвентарь
        await sendInventoryUpdate(player);
        
        // Отправляем обновление предметов на земле всем игрокам рядом
        updateNearbyGroundItems(player);
        
    } catch (err) {
        console.error('[Inventory] Ошибка выброса предмета:', err);
    }
});

// ===== СОЗДАНИЕ ВИЗУАЛЬНОГО ОБЪЕКТА НА ЗЕМЛЕ =====
function createGroundItemObject(groundItemId, item, quantity, position, dimension) {
    try {
        // Определяем модель для предмета
        let modelHash = 'prop_drug_package_02'; // Дефолтная модель
        
        // Модели для разных типов предметов
        const modelsByType = {
            'weapon': 'prop_box_guncase_01a',
            'medical': 'prop_ld_health_pack',
            'consumable': 'prop_food_bag1',
            'tool': 'prop_tool_box_01',
            'clothing': 'prop_cs_cardbox_01',
            'resource': 'prop_box_wood01a'
        };
        
        if (item.type && modelsByType[item.type]) {
            modelHash = modelsByType[item.type];
        }
        
        // Создаём объект
        const obj = mp.objects.new(mp.joaat(modelHash), new mp.Vector3(position.x, position.y, position.z), {
            rotation: new mp.Vector3(0, 0, Math.random() * 360),
            alpha: 255,
            dimension: dimension
        });
        
        // Сохраняем данные объекта
        obj.groundItemId = groundItemId;
        obj.itemData = {
            id: item.item_id,
            name: item.name,
            displayName: item.display_name,
            quantity: quantity,
            type: item.type
        };
        
        groundItemObjects.set(groundItemId, obj);
        
        console.log(`[Inventory] Создан объект на земле ID: ${groundItemId}`);
        
    } catch (err) {
        console.error('[Inventory] Ошибка создания объекта на земле:', err);
    }
}

// ===== ПОДБОР ПРЕДМЕТА С ЗЕМЛИ (С ЗАЩИТОЙ ОТ ДЮПА) =====
mp.events.add('inventory:pickupItem', async (player, groundItemId) => {
    if (!player.characterId) return;
    
    try {
        // Блокируем предмет для других запросов
        const [groundItems] = await db.query(`
            SELECT gi.*, i.name, i.display_name, i.max_stack, i.type
            FROM ground_items gi
            JOIN items i ON gi.item_id = i.id
            WHERE gi.id = ? AND gi.dimension = ?
            FOR UPDATE
        `, [groundItemId, player.dimension]);
        
        if (groundItems.length === 0) {
            player.outputChatBox('!{#f44336}Предмет уже подобран или не существует');
            return;
        }
        
        const groundItem = groundItems[0];
        
        // Проверяем расстояние
        const distance = getDistance(player.position, {
            x: groundItem.position_x,
            y: groundItem.position_y,
            z: groundItem.position_z
        });
        
        if (distance > 5) {
            player.outputChatBox('!{#f44336}Вы слишком далеко от предмета');
            return;
        }
        
        // СНАЧАЛА удаляем с земли (до добавления в инвентарь)
        await db.query('DELETE FROM ground_items WHERE id = ?', [groundItemId]);
        
        // Удаляем визуальный объект
        const obj = groundItemObjects.get(groundItemId);
        if (obj && mp.objects.exists(obj)) {
            obj.destroy();
        }
        groundItemObjects.delete(groundItemId);
        
        // Теперь добавляем в инвентарь
        const [existingItems] = await db.query(
            'SELECT * FROM character_inventory WHERE character_id = ? AND item_id = ? AND quantity < ?',
            [player.characterId, groundItem.item_id, groundItem.max_stack]
        );
        
        if (existingItems.length > 0 && groundItem.max_stack > 1) {
            // Добавляем к существующему стаку
            const existing = existingItems[0];
            const newQuantity = Math.min(existing.quantity + groundItem.quantity, groundItem.max_stack);
            
            await db.query(
                'UPDATE character_inventory SET quantity = ? WHERE id = ?',
                [newQuantity, existing.id]
            );
        } else {
            // Ищем свободный слот
            const freeSlot = await findFreeSlot(player.characterId);
            
            if (freeSlot === -1) {
                // Нет места - возвращаем на землю
                const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
                const [result] = await db.query(`
                    INSERT INTO ground_items (item_id, quantity, metadata, position_x, position_y, position_z, dimension, expires_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [groundItem.item_id, groundItem.quantity, groundItem.metadata, 
                    groundItem.position_x, groundItem.position_y, groundItem.position_z, 
                    groundItem.dimension, expiresAt]);
                
                createGroundItemObject(result.insertId, groundItem, groundItem.quantity, {
                    x: groundItem.position_x,
                    y: groundItem.position_y,
                    z: groundItem.position_z
                }, groundItem.dimension);
                
                player.outputChatBox('!{#f44336}Инвентарь полон!');
                updateNearbyGroundItems(player);
                return;
            }
            
            // Создаём новый слот
            await db.query(
                'INSERT INTO character_inventory (character_id, item_id, slot, quantity, metadata) VALUES (?, ?, ?, ?, ?)',
                [player.characterId, groundItem.item_id, freeSlot, groundItem.quantity, groundItem.metadata]
            );
        }
        
        player.outputChatBox(`!{#4caf50}Подобрано: ${groundItem.display_name || groundItem.name} x${groundItem.quantity}`);
        
        // Обновляем инвентарь
        await sendInventoryUpdate(player);
        updateNearbyGroundItems(player);
        
    } catch (err) {
        console.error('[Inventory] Ошибка подбора предмета:', err);
    }
});

// ===== УДАЛЕНИЕ ПРЕДМЕТА С ЗЕМЛИ =====
async function removeGroundItem(groundItemId) {
    try {
        // Удаляем из БД
        await db.query('DELETE FROM ground_items WHERE id = ?', [groundItemId]);
        
        // Удаляем визуальный объект
        const obj = groundItemObjects.get(groundItemId);
        if (obj && mp.objects.exists(obj)) {
            obj.destroy();
        }
        groundItemObjects.delete(groundItemId);
        
        console.log(`[Inventory] Удалён предмет с земли ID: ${groundItemId}`);
        
    } catch (err) {
        console.error('[Inventory] Ошибка удаления предмета с земли:', err);
    }
}

// ===== ПОЛУЧЕНИЕ ПРЕДМЕТОВ НА ЗЕМЛЕ РЯДОМ С ИГРОКОМ =====
async function getNearbyGroundItems(player, radius = 10) {
    try {
        const [items] = await db.query(`
            SELECT gi.*, i.name, i.display_name, i.type, i.weight
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
            position: {
                x: item.position_x,
                y: item.position_y,
                z: item.position_z
            },
            distance: getDistance(player.position, {
                x: item.position_x,
                y: item.position_y,
                z: item.position_z
            })
        })).sort((a, b) => a.distance - b.distance);
        
    } catch (err) {
        console.error('[Inventory] Ошибка получения предметов на земле:', err);
        return [];
    }
}

// ===== ОТПРАВКА ОБНОВЛЕНИЯ ПРЕДМЕТОВ НА ЗЕМЛЕ =====
async function updateNearbyGroundItems(player) {
    const nearbyItems = await getNearbyGroundItems(player);
    player.call('client:updateGroundItems', [JSON.stringify(nearbyItems)]);
}

// ===== ЗАПРОС ПРЕДМЕТОВ НА ЗЕМЛЕ ОТ КЛИЕНТА =====
mp.events.add('inventory:requestGroundItems', async (player) => {
    await updateNearbyGroundItems(player);
});

// ===== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ - РАССТОЯНИЕ =====
function getDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// ===== ЗАГРУЗКА ПРЕДМЕТОВ НА ЗЕМЛЕ ПРИ СТАРТЕ СЕРВЕРА =====
async function loadGroundItems() {
    try {
        // Удаляем просроченные предметы
        await db.query('DELETE FROM ground_items WHERE expires_at < NOW()');
        
        // Загружаем оставшиеся
        const [items] = await db.query(`
            SELECT gi.*, i.name, i.display_name, i.type
            FROM ground_items gi
            JOIN items i ON gi.item_id = i.id
        `);
        
        items.forEach(item => {
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

// ===== ОЧИСТКА ПРОСРОЧЕННЫХ ПРЕДМЕТОВ (КАЖДЫЕ 5 МИНУТ) =====
setInterval(async () => {
    try {
        const [expired] = await db.query('SELECT id FROM ground_items WHERE expires_at < NOW()');
        
        for (const item of expired) {
            await removeGroundItem(item.id);
        }
        
        if (expired.length > 0) {
            console.log(`[Inventory] Удалено просроченных предметов: ${expired.length}`);
        }
        
    } catch (err) {
        console.error('[Inventory] Ошибка очистки предметов:', err);
    }
}, 5 * 60 * 1000);

// Загружаем предметы при старте
setTimeout(loadGroundItems, 3000);

// ===== КОМАНДА ДЛЯ ПОДБОРА БЛИЖАЙШЕГО ПРЕДМЕТА =====
mp.events.addCommand('pickup', async (player) => {
    const nearbyItems = await getNearbyGroundItems(player, 3);
    
    if (nearbyItems.length === 0) {
        player.outputChatBox('!{#ff9800}Рядом нет предметов для подбора');
        return;
    }
    
    // Подбираем ближайший
    const nearest = nearbyItems[0];
    mp.events.call('inventory:pickupItem', player, nearest.id);
});

console.log('[Inventory System] ��� Система инвентаря загружена!');
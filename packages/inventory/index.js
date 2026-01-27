// ===== СИСТЕМА ИНВЕНТАРЯ - СЕРВЕРНАЯ ЧАСТЬ =====

const { db } = require('../database');

console.log('[Inventory System] Загрузка системы инвентаря...');

// ===== ПОЛУЧЕНИЕ ИНВЕНТАРЯ ПЕРСОНАЖА =====
async function getCharacterInventory(characterId) {
    try {
        const [inventory] = await db.query(`
            SELECT 
                ci.id,
                ci.slot,
                ci.quantity,
                ci.metadata,
                i.name,
                i.display_name,
                i.description,
                i.type,
                i.weight,
                i.max_stack,
                i.usable
            FROM character_inventory ci
            JOIN items i ON ci.item_id = i.id
            WHERE ci.character_id = ?
            ORDER BY ci.slot ASC
        `, [characterId]);
        
        return inventory;
    } catch (err) {
        console.error('[Inventory] Ошибка получения инвентаря:', err);
        return [];
    }
}

// ===== ОТКРЫТИЕ ИНВЕНТАРЯ =====
mp.events.add('inventory:open', async (player) => {
    if (!player.characterId) {
        console.log('[Inventory] Попытка открыть инвентарь без персонажа');
        return;
    }
    
    try {
        console.log(`[Inventory] ${player.socialClub} открывает инвентарь`);
        
        const inventory = await getCharacterInventory(player.characterId);
        
        // Получаем данные персонажа
        const [charResult] = await db.query(
            'SELECT name, surname, level, max_weight FROM characters WHERE id = ?',
            [player.characterId]
        );
        
        if (charResult.length === 0) return;
        
        const character = charResult[0];
        const charData = {
            name: `${character.name} ${character.surname}`,
            level: character.level || 1,
            maxWeight: character.max_weight || 50
        };
        
        player.call('client:openInventory', [JSON.stringify(inventory), JSON.stringify(charData)]);
        
        console.log(`[Inventory] Отправлено ${inventory.length} предметов`);
        
    } catch (err) {
        console.error('[Inventory] Ошибка открытия инвентаря:', err);
    }
});

// ===== ИСПОЛЬЗОВАНИЕ ПРЕДМЕТА =====
mp.events.add('inventory:useItem', async (player, slot) => {
    if (!player.characterId) return;
    
    try {
        console.log(`[Inventory] ${player.socialClub} использует предмет в слоте ${slot}`);
        
        const [items] = await db.query(`
            SELECT ci.*, i.name, i.type
            FROM character_inventory ci
            JOIN items i ON ci.item_id = i.id
            WHERE ci.character_id = ? AND ci.slot = ?
        `, [player.characterId, slot]);
        
        if (items.length === 0) {
            console.log('[Inventory] Предмет не найден');
            return;
        }
        
        const item = items[0];
        
        // Логика использования в зависимости от типа
        let used = false;
        
        switch (item.name) {
            case 'water':
                // Восстанавливаем жажду (если есть система)
                player.outputChatBox('!{#2196f3}Вы выпили воду');
                used = true;
                break;
                
            case 'bread':
                // Восстанавливаем голод
                player.outputChatBox('!{#ff9800}Вы съели хлеб');
                used = true;
                break;
                
            case 'bandage':
                // Восстанавливаем немного здоровья
                player.health = Math.min(player.health + 20, 100);
                player.outputChatBox('!{#4caf50}Вы использовали бинт (+20 HP)');
                used = true;
                break;
                
            case 'medkit':
                // Полное восстановление здоровья
                player.health = 100;
                player.outputChatBox('!{#4caf50}Вы использовали аптечку (HP восстановлено)');
                used = true;
                break;
                
            case 'phone':
                // Открываем телефон
                player.outputChatBox('!{#2196f3}Телефон (в разработке)');
                break;
                
            default:
                player.outputChatBox('!{#ff9800}Этот предмет нельзя использовать');
                break;
        }
        
        // Если предмет был использован - уменьшаем количество
        if (used) {
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
            
            // Обновляем инвентарь
            const updatedInventory = await getCharacterInventory(player.characterId);
            player.call('client:updateInventory', [JSON.stringify(updatedInventory)]);
            
            console.log(`[Inventory] Предмет ${item.name} использован`);
        }
        
    } catch (err) {
        console.error('[Inventory] Ошибка использования предмета:', err);
    }
});

// ===== ВЫБРОС ПРЕДМЕТА =====
mp.events.add('inventory:dropItem', async (player, slot, quantity) => {
    if (!player.characterId) return;
    
    try {
        console.log(`[Inventory] ${player.socialClub} выбрасывает предмет из слота ${slot}, количество: ${quantity}`);
        
        const [items] = await db.query(
            'SELECT * FROM character_inventory WHERE character_id = ? AND slot = ?',
            [player.characterId, slot]
        );
        
        if (items.length === 0) return;
        
        const item = items[0];
        
        if (item.quantity > quantity) {
            // Уменьшаем количество
            await db.query(
                'UPDATE character_inventory SET quantity = quantity - ? WHERE id = ?',
                [quantity, item.id]
            );
        } else {
            // Удаляем полностью
            await db.query(
                'DELETE FROM character_inventory WHERE id = ?',
                [item.id]
            );
        }
        
        player.outputChatBox(`!{#ff9800}Вы выбросили предмет (x${quantity})`);
        
        // TODO: Создать предмет в мире (worldItem)
        
        // Обновляем инвентарь
        const updatedInventory = await getCharacterInventory(player.characterId);
        player.call('client:updateInventory', [JSON.stringify(updatedInventory)]);
        
        console.log(`[Inventory] Предмет выброшен`);
        
    } catch (err) {
        console.error('[Inventory] Ошибка выброса предмета:', err);
    }
});

// ===== ПЕРЕМЕЩЕНИЕ ПРЕДМЕТА =====
mp.events.add('inventory:moveItem', async (player, fromSlot, toSlot) => {
    if (!player.characterId) return;
    
    try {
        console.log(`[Inventory] ${player.socialClub} перемещает предмет: ${fromSlot} -> ${toSlot}`);
        
        // Получаем предметы
        const [fromItems] = await db.query(
            'SELECT * FROM character_inventory WHERE character_id = ? AND slot = ?',
            [player.characterId, fromSlot]
        );
        
        const [toItems] = await db.query(
            'SELECT * FROM character_inventory WHERE character_id = ? AND slot = ?',
            [player.characterId, toSlot]
        );
        
        if (fromItems.length === 0) {
            console.log('[Inventory] Исходный слот пуст');
            return;
        }
        
        const fromItem = fromItems[0];
        
        if (toItems.length > 0) {
            // Целевой слот занят - меняем местами
            const toItem = toItems[0];
            
            await db.query(
                'UPDATE character_inventory SET slot = ? WHERE id = ?',
                [toSlot, fromItem.id]
            );
            
            await db.query(
                'UPDATE character_inventory SET slot = ? WHERE id = ?',
                [fromSlot, toItem.id]
            );
            
            console.log('[Inventory] Предметы поменяны местами');
        } else {
            // Целевой слот пуст - просто перемещаем
            await db.query(
                'UPDATE character_inventory SET slot = ? WHERE id = ?',
                [toSlot, fromItem.id]
            );
            
            console.log('[Inventory] Предмет перемещён');
        }
        
        // Обновляем инвентарь
        const updatedInventory = await getCharacterInventory(player.characterId);
        player.call('client:updateInventory', [JSON.stringify(updatedInventory)]);
        
    } catch (err) {
        console.error('[Inventory] Ошибка перемещения предмета:', err);
    }
});

// ===== ДОБАВЛЕНИЕ ПРЕДМЕТА (ФУНКЦИЯ ДЛЯ ДРУГИХ СИСТЕМ) =====
async function addItem(characterId, itemName, quantity = 1) {
    try {
        // Получаем информацию о предмете
        const [items] = await db.query(
            'SELECT * FROM items WHERE name = ?',
            [itemName]
        );
        
        if (items.length === 0) {
            console.error('[Inventory] Предмет не найден:', itemName);
            return false;
        }
        
        const item = items[0];
        
        // Ищем свободный слот или слот с таким же предметом
        const [existingItems] = await db.query(
            'SELECT * FROM character_inventory WHERE character_id = ? AND item_id = ? AND quantity < ?',
            [characterId, item.id, item.max_stack]
        );
        
        if (existingItems.length > 0 && item.max_stack > 1) {
            // Добавляем к существующему стаку
            const existing = existingItems[0];
            const newQuantity = Math.min(existing.quantity + quantity, item.max_stack);
            
            await db.query(
                'UPDATE character_inventory SET quantity = ? WHERE id = ?',
                [newQuantity, existing.id]
            );
            
            console.log(`[Inventory] Добавлено к стаку: ${itemName} x${quantity}`);
            return true;
        } else {
            // Ищем свободный слот
            const [allSlots] = await db.query(
                'SELECT slot FROM character_inventory WHERE character_id = ? ORDER BY slot ASC',
                [characterId]
            );
            
            let freeSlot = 1;
            for (let i = 1; i <= 35; i++) {
                if (!allSlots.find(s => s.slot === i)) {
                    freeSlot = i;
                    break;
                }
            }
            
            // Создаём новый стак
            await db.query(
                'INSERT INTO character_inventory (character_id, item_id, slot, quantity) VALUES (?, ?, ?, ?)',
                [characterId, item.id, freeSlot, quantity]
            );
            
            console.log(`[Inventory] Добавлен новый предмет: ${itemName} x${quantity} в слот ${freeSlot}`);
            return true;
        }
        
    } catch (err) {
        console.error('[Inventory] Ошибка добавления предмета:', err);
        return false;
    }
}

// Экспортируем функцию для использования в других модулях
global.addItem = addItem;

console.log('[Inventory System] ✅ Система инвентаря загружена успешно!');

// ===== КОМАНДЫ ДЛЯ ТЕСТИРОВАНИЯ =====

// Выдать предмет себе
mp.events.addCommand('giveitem', async (player, fullText) => {
    if (!player.characterId) {
        player.outputChatBox('!{#f44336}Вы не выбрали персонажа!');
        return;
    }
    
    const args = fullText.split(' ');
    
    if (args.length < 1) {
        player.outputChatBox('!{#ff9800}Использование: /giveitem [название] [количество]');
        player.outputChatBox('!{#2196f3}Доступные: water, bread, bandage, medkit, phone, lockpick, pistol_ammo, iron, wood, rope');
        return;
    }
    
    const itemName = args[0];
    const quantity = args[1] ? parseInt(args[1]) : 1;
    
    const success = await addItem(player.characterId, itemName, quantity);
    
    if (success) {
        player.outputChatBox(`!{#4caf50}[Inventory] Получен предмет: ${itemName} x${quantity}`);
        
        // Если инвентарь открыт - обновляем
        const updatedInventory = await getCharacterInventory(player.characterId);
        player.call('client:updateInventory', [JSON.stringify(updatedInventory)]);
    } else {
        player.outputChatBox(`!{#f44336}[Inventory] Ошибка! Предмет не найден или инвентарь полон`);
    }
});

// Очистить инвентарь
mp.events.addCommand('clearinventory', async (player) => {
    if (!player.characterId) {
        player.outputChatBox('!{#f44336}Вы не выбрали персонажа!');
        return;
    }
    
    try {
        await db.query(
            'DELETE FROM character_inventory WHERE character_id = ?',
            [player.characterId]
        );
        
        player.outputChatBox('!{#4caf50}[Inventory] Инвентарь очищен!');
        
        // Если инвентарь открыт - обновляем
        const updatedInventory = await getCharacterInventory(player.characterId);
        player.call('client:updateInventory', [JSON.stringify(updatedInventory)]);
        
    } catch (err) {
        console.error('[Inventory] Ошибка очистки инвентаря:', err);
        player.outputChatBox('!{#f44336}[Inventory] Ошибка очистки!');
    }
});

// Информация об инвентаре
mp.events.addCommand('invinfo', async (player) => {
    if (!player.characterId) {
        player.outputChatBox('!{#f44336}Вы не выбрали персонажа!');
        return;
    }
    
    try {
        const inventory = await getCharacterInventory(player.characterId);
        
        const totalWeight = inventory.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
        
        player.outputChatBox('!{#2196f3}===== ИНФОРМАЦИЯ ОБ ИНВЕНТАРЕ =====');
        player.outputChatBox(`!{#ffffff}Предметов: ${inventory.length} / 35`);
        player.outputChatBox(`!{#ffffff}Вес: ${totalWeight.toFixed(2)} / ${player.max_weight || 50} кг`);
        
        if (inventory.length > 0) {
            player.outputChatBox('!{#ffffff}Содержимое:');
            inventory.forEach(item => {
                player.outputChatBox(`!{#ffff00}[${item.slot}] ${item.display_name} x${item.quantity} (${(item.weight * item.quantity).toFixed(2)} кг)`);
            });
        }
        
    } catch (err) {
        console.error('[Inventory] Ошибка получения информации:', err);
    }
});
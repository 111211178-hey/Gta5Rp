// ===== БАЗА ДАННЫХ ПРЕДМЕТОВ =====

const ITEMS_DATABASE = {
    food: {
        name: "Еда",
        icon: "🍔",
        items: [
            { id: "burger", name: "Бургер", weight: 0.3, maxStack: 10 },
            { id: "pizza", name: "Пицца", weight: 0.5, maxStack: 5 },
            { id: "hotdog", name: "Хот-дог", weight: 0.2, maxStack: 10 },
            { id: "sandwich", name: "Сэндвич", weight: 0.2, maxStack: 10 },
            { id: "donut", name: "Пончик", weight: 0.1, maxStack: 20 },
            { id: "apple", name: "Яблоко", weight: 0.1, maxStack: 20 },
            { id: "bread", name: "Хлеб", weight: 0.2, maxStack: 10 },
            { id: "chips", name: "Чипсы", weight: 0.1, maxStack: 20 },
            { id: "chocolate", name: "Шоколад", weight: 0.1, maxStack: 20 },
            { id: "steak", name: "Стейк", weight: 0.5, maxStack: 5 }
        ]
    },
    
    drinks: {
        name: "Напитки",
        icon: "🥤",
        items: [
            { id: "water", name: "Вода", weight: 0.3, maxStack: 10 },
            { id: "cola", name: "Кола", weight: 0.3, maxStack: 10 },
            { id: "sprite", name: "Спрайт", weight: 0.3, maxStack: 10 },
            { id: "juice", name: "Сок", weight: 0.3, maxStack: 10 },
            { id: "energy_drink", name: "Энергетик", weight: 0.3, maxStack: 10 },
            { id: "coffee", name: "Кофе", weight: 0.2, maxStack: 10 },
            { id: "beer", name: "Пиво", weight: 0.4, maxStack: 10 },
            { id: "vodka", name: "Водка", weight: 0.5, maxStack: 5 },
            { id: "whiskey", name: "Виски", weight: 0.5, maxStack: 5 }
        ]
    },
    
    medical: {
        name: "Медикаменты",
        icon: "💊",
        items: [
            { id: "bandage", name: "Бинт", weight: 0.1, maxStack: 20 },
            { id: "medkit", name: "Аптечка", weight: 0.5, maxStack: 5 },
            { id: "firstaid", name: "Первая помощь", weight: 0.3, maxStack: 10 },
            { id: "painkillers", name: "Обезболивающее", weight: 0.1, maxStack: 20 },
            { id: "vitamins", name: "Витамины", weight: 0.1, maxStack: 20 },
            { id: "adrenaline", name: "Адреналин", weight: 0.1, maxStack: 10 }
        ]
    },
    
    weapons: {
        name: "Оружие",
        icon: "🔫",
        items: [
            { id: "weapon_pistol", name: "Пистолет", weight: 1.0, maxStack: 1, weaponHash: "WEAPON_PISTOL", size: [2, 1] },
            { id: "weapon_combatpistol", name: "Боевой пистолет", weight: 1.0, maxStack: 1, weaponHash: "WEAPON_COMBATPISTOL", size: [2, 1] },
            { id: "weapon_pistol50", name: "Пистолет .50", weight: 1.2, maxStack: 1, weaponHash: "WEAPON_PISTOL50", size: [2, 1] },
            { id: "weapon_snspistol", name: "SNS Пистолет", weight: 0.5, maxStack: 1, weaponHash: "WEAPON_SNSPISTOL", size: [1, 1] },
            { id: "weapon_microsmg", name: "Микро SMG", weight: 2.5, maxStack: 1, weaponHash: "WEAPON_MICROSMG", size: [2, 1] },
            { id: "weapon_smg", name: "SMG", weight: 3.0, maxStack: 1, weaponHash: "WEAPON_SMG", size: [3, 2] },
            { id: "weapon_assaultrifle", name: "Автомат", weight: 4.0, maxStack: 1, weaponHash: "WEAPON_ASSAULTRIFLE", size: [4, 2] },
            { id: "weapon_carbinerifle", name: "Карабин", weight: 4.0, maxStack: 1, weaponHash: "WEAPON_CARBINERIFLE", size: [4, 2] },
            { id: "weapon_pumpshotgun", name: "Помповый дробовик", weight: 4.5, maxStack: 1, weaponHash: "WEAPON_PUMPSHOTGUN", size: [4, 1] },
            { id: "weapon_sawnoffshotgun", name: "Обрез", weight: 2.5, maxStack: 1, weaponHash: "WEAPON_SAWNOFFSHOTGUN", size: [2, 1] },
            { id: "weapon_sniperrifle", name: "Снайперская винтовка", weight: 5.5, maxStack: 1, weaponHash: "WEAPON_SNIPERRIFLE", size: [5, 1] },
            { id: "weapon_knife", name: "Нож", weight: 0.3, maxStack: 1, weaponHash: "WEAPON_KNIFE", size: [1, 1] },
            { id: "weapon_bat", name: "Бита", weight: 1.0, maxStack: 1, weaponHash: "WEAPON_BAT", size: [3, 1] },
            { id: "weapon_crowbar", name: "Монтировка", weight: 1.2, maxStack: 1, weaponHash: "WEAPON_CROWBAR", size: [2, 1] }
        ]
    },
    
    ammo: {
        name: "Патроны",
        icon: "🔶",
        items: [
            { id: "ammo_pistol", name: "Патроны 9мм", weight: 0.1, maxStack: 500 },
            { id: "ammo_smg", name: "Патроны SMG", weight: 0.1, maxStack: 500 },
            { id: "ammo_rifle", name: "Патроны 5.56", weight: 0.15, maxStack: 300 },
            { id: "ammo_shotgun", name: "Патроны 12 калибр", weight: 0.2, maxStack: 100 },
            { id: "ammo_sniper", name: "Патроны .50", weight: 0.3, maxStack: 50 }
        ]
    },
    
    tools: {
        name: "Инструменты",
        icon: "🔧",
        items: [
            { id: "lockpick", name: "Отмычка", weight: 0.1, maxStack: 10 },
            { id: "toolkit", name: "Набор инструментов", weight: 2.0, maxStack: 1, size: [2, 2] },
            { id: "flashlight", name: "Фонарик", weight: 0.3, maxStack: 1 },
            { id: "rope", name: "Веревка", weight: 0.5, maxStack: 5 },
            { id: "handcuffs", name: "Наручники", weight: 0.3, maxStack: 5 },
            { id: "radio", name: "Рация", weight: 0.4, maxStack: 1 },
            { id: "repair_kit", name: "Ремкомплект", weight: 2.0, maxStack: 3, size: [2, 1] },
            { id: "jerrycan", name: "Канистра", weight: 3.0, maxStack: 2, size: [2, 2] }
        ]
    },
    
    resources: {
        name: "Ресурсы",
        icon: "📦",
        items: [
            { id: "wood", name: "Дерево", weight: 1.0, maxStack: 50 },
            { id: "iron", name: "Железо", weight: 1.5, maxStack: 50 },
            { id: "plastic", name: "Пластик", weight: 0.5, maxStack: 50 },
            { id: "fabric", name: "Ткань", weight: 0.3, maxStack: 50 },
            { id: "leather", name: "Кожа", weight: 0.4, maxStack: 50 },
            { id: "scrap", name: "Металлолом", weight: 0.8, maxStack: 50 },
            { id: "electronics", name: "Электроника", weight: 0.3, maxStack: 30 }
        ]
    },
    
    valuables: {
        name: "Ценности",
        icon: "💎",
        items: [
            { id: "money_stack", name: "Пачка денег", weight: 0.1, maxStack: 100 },
            { id: "gold_bar", name: "Золотой слиток", weight: 2.0, maxStack: 10 },
            { id: "diamond", name: "Алмаз", weight: 0.1, maxStack: 20 },
            { id: "jewelry", name: "Ювелирка", weight: 0.2, maxStack: 20 },
            { id: "watch_rolex", name: "Часы Rolex", weight: 0.2, maxStack: 5 }
        ]
    },
    
    clothing: {
        name: "Одежда",
        icon: "👕",
        items: [
            { id: "tshirt_white", name: "Белая футболка", weight: 0.2, maxStack: 1, slot: "top", drawable: 0, texture: 0 },
            { id: "tshirt_black", name: "Чёрная футболка", weight: 0.2, maxStack: 1, slot: "top", drawable: 0, texture: 1 },
            { id: "jeans_blue", name: "Синие джинсы", weight: 0.3, maxStack: 1, slot: "legs", drawable: 0, texture: 0 },
            { id: "jeans_black", name: "Чёрные джинсы", weight: 0.3, maxStack: 1, slot: "legs", drawable: 0, texture: 1 },
            { id: "sneakers_white", name: "Белые кроссовки", weight: 0.4, maxStack: 1, slot: "shoes", drawable: 1, texture: 0 },
            { id: "sneakers_black", name: "Чёрные кроссовки", weight: 0.4, maxStack: 1, slot: "shoes", drawable: 1, texture: 1 },
            { id: "cap_red", name: "Красная кепка", weight: 0.1, maxStack: 1, slot: "head", drawable: 2, texture: 0, isProp: true },
            { id: "mask_ski", name: "Лыжная маска", weight: 0.1, maxStack: 1, slot: "mask", drawable: 30, texture: 0 }
        ]
    },
    
    backpacks: {
        name: "Рюкзаки",
        icon: "🎒",
        items: [
            { id: "backpack_small", name: "Маленький рюкзак", weight: 0.5, maxStack: 1, extraSlots: 5 },
            { id: "backpack_medium", name: "Средний рюкзак", weight: 0.8, maxStack: 1, extraSlots: 10 },
            { id: "backpack_large", name: "Большой рюкзак", weight: 1.2, maxStack: 1, extraSlots: 15 }
        ]
    },
    
    keys: {
        name: "Ключи",
        icon: "🔑",
        items: [
            { id: "car_keys", name: "Ключи от машины", weight: 0.1, maxStack: 10 },
            { id: "house_keys", name: "Ключи от дома", weight: 0.1, maxStack: 5 }
        ]
    },
    
    documents: {
        name: "Документы",
        icon: "📄",
        items: [
            { id: "id_card", name: "Удостоверение личности", weight: 0.05, maxStack: 1 },
            { id: "drivers_license", name: "Водительские права", weight: 0.05, maxStack: 1 },
            { id: "weapon_license", name: "Лицензия на оружие", weight: 0.05, maxStack: 1 }
        ]
    },
    
    electronics: {
        name: "Электроника",
        icon: "📱",
        items: [
            { id: "phone_basic", name: "Простой телефон", weight: 0.2, maxStack: 1 },
            { id: "phone_smartphone", name: "Смартфон", weight: 0.2, maxStack: 1 },
            { id: "gps", name: "GPS навигатор", weight: 0.3, maxStack: 1 }
        ]
    }
};

function getAllCategories() {
    return Object.keys(ITEMS_DATABASE).map(key => ({
        id: key,
        name: ITEMS_DATABASE[key].name,
        icon: ITEMS_DATABASE[key].icon,
        count: ITEMS_DATABASE[key].items.length
    }));
}

function getCategoryItems(categoryId) {
    const category = ITEMS_DATABASE[categoryId];
    if (!category) return [];
    return category.items;
}

function findItemById(itemId) {
    for (const category of Object.values(ITEMS_DATABASE)) {
        const item = category.items.find(i => i.id === itemId);
        if (item) return item;
    }
    return null;
}

function searchItems(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();
    
    for (const [catId, category] of Object.entries(ITEMS_DATABASE)) {
        for (const item of category.items) {
            if (item.name.toLowerCase().includes(lowerQuery) || item.id.toLowerCase().includes(lowerQuery)) {
                results.push({ ...item, category: catId, categoryName: category.name });
            }
        }
    }
    
    return results;
}

module.exports = {
    ITEMS_DATABASE,
    getAllCategories,
    getCategoryItems,
    findItemById,
    searchItems
};

console.log('[Items] ✅ База предметов загружена!');
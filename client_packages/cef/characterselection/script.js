let characters = [];
let characterToDelete = null;
const MAX_CHARACTERS = 3;

console.log('[CharSelection CEF] Script loaded!');

// Загрузка списка персонажей
function loadCharacters(charactersData) {
    console.log('[CharSelection CEF] ===== loadCharacters вызвана =====');
    console.log('[CharSelection CEF] Тип данных:', typeof charactersData);
    console.log('[CharSelection CEF] Данные:', charactersData);
    
    // Проверяем что данные корректны
    if (!charactersData) {
        console.error('[CharSelection CEF] ❌ charactersData is null or undefined!');
        charactersData = [];
    }
    
    if (!Array.isArray(charactersData)) {
        console.error('[CharSelection CEF] ❌ charactersData не является массивом!');
        console.log('[CharSelection CEF] Пытаемся преобразовать...');
        try {
            charactersData = JSON.parse(charactersData);
        } catch (e) {
            console.error('[CharSelection CEF] ❌ Не удалось распарсить:', e);
            charactersData = [];
        }
    }
    
    characters = charactersData;
    console.log('[CharSelection CEF] ✅ Загружено персонажей:', characters.length);
    
    if (characters.length > 0) {
        console.log('[CharSelection CEF] Список персонажей:');
        characters.forEach((char, index) => {
            console.log(`  ${index + 1}. ID=${char.id}, Name=${char.name} ${char.surname}`);
        });
    }
    
    renderCharacters();
    updateCreateButton();
    
    console.log('[CharSelection CEF] ===== Отображение завершено =====');
}

// Отображение персонажей
function renderCharacters() {
    console.log('[CharSelection CEF] renderCharacters() - отрисовка карточек...');
    
    const grid = document.getElementById('charactersGrid');
    
    if (!grid) {
        console.error('[CharSelection CEF] ❌ Элемент charactersGrid не найден!');
        return;
    }
    
    grid.innerHTML = '';
    console.log('[CharSelection CEF] Контейнер очищен');
    
    // Отображаем существующих персонажей
    characters.forEach((character, index) => {
        console.log(`[CharSelection CEF] Создание карточки ${index + 1} для персонажа ID=${character.id}`);
        const card = createCharacterCard(character);
        grid.appendChild(card);
    });
    
    // Добавляем пустые слоты
    const emptySlots = MAX_CHARACTERS - characters.length;
    console.log(`[CharSelection CEF] Добавление ${emptySlots} пустых слотов`);
    
    for (let i = 0; i < emptySlots; i++) {
        const emptyCard = createEmptyCard();
        grid.appendChild(emptyCard);
    }
    
    console.log('[CharSelection CEF] ✅ Отрисовка завершена');
}

// Создание карточки персонажа
function createCharacterCard(character) {
    const card = document.createElement('div');
    card.className = 'character-card';
    card.onclick = () => selectCharacter(character.id);
    
    const genderText = character.gender === 0 ? 'Мужской' : 'Женский';
    
    // ИСПРАВЛЕНО: Обработка last_active (может быть null)
    let lastActive = 'Недавно';
    if (character.last_active) {
        try {
            lastActive = new Date(character.last_active).toLocaleDateString('ru-RU');
        } catch (e) {
            console.warn('[CharSelection CEF] Ошибка парсинга даты:', e);
            lastActive = 'Недавно';
        }
    }
    
    card.innerHTML = `
        <button class="delete-btn" onclick="event.stopPropagation(); confirmDelete(${character.id}, '${character.name} ${character.surname}')">×</button>
        <div class="character-info">
            <div class="character-name">${character.name} ${character.surname}</div>
            <div class="character-details">
                <div class="detail-row">
                    <span class="detail-label">Возраст:</span>
                    <span>${character.age} лет</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Пол:</span>
                    <span>${genderText}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Уровень:</span>
                    <span>${character.level || 1}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Последний вход:</span>
                    <span>${lastActive}</span>
                </div>
            </div>
            <div class="character-stats">
                <div class="stat">
                    <div class="stat-label">Деньги</div>
                    <div class="stat-value money">$${(character.money || 0).toLocaleString()}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Банк</div>
                    <div class="stat-value money">$${(character.bank || 0).toLocaleString()}</div>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

// Создание пустого слота
function createEmptyCard() {
    const card = document.createElement('div');
    card.className = 'character-card empty';
    
    card.innerHTML = `
        <div class="empty-slot">
            <div class="empty-icon">👤</div>
            <div>Пустой слот</div>
        </div>
    `;
    
    return card;
}

// Обновление кнопки создания
function updateCreateButton() {
    const btn = document.getElementById('createNewBtn');
    
    if (!btn) {
        console.error('[CharSelection CEF] ❌ Кнопка createNewBtn не найдена!');
        return;
    }
    
    if (characters.length >= MAX_CHARACTERS) {
        btn.disabled = true;
        btn.innerHTML = `
            <span class="plus-icon">×</span>
            Достигнут лимит персонажей (${MAX_CHARACTERS})
        `;
        console.log('[CharSelection CEF] Кнопка создания отключена (лимит)');
    } else {
        btn.disabled = false;
        btn.innerHTML = `
            <span class="plus-icon">+</span>
            Создать нового персонажа (${characters.length}/${MAX_CHARACTERS})
        `;
        console.log('[CharSelection CEF] Кнопка создания активна');
    }
}

// Выбор персонажа
function selectCharacter(characterId) {
    console.log('[CharSelection CEF] Выбран персонаж ID:', characterId);
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:selectCharacter', characterId);
    } else {
        console.error('[CharSelection CEF] ❌ mp не определен!');
    }
}

// Создание нового персонажа
document.addEventListener('DOMContentLoaded', () => {
    console.log('[CharSelection CEF] DOM загружен, инициализация обработчиков...');
    
    const createBtn = document.getElementById('createNewBtn');
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            console.log('[CharSelection CEF] Клик по кнопке создания');
            
            if (characters.length < MAX_CHARACTERS) {
                console.log('[CharSelection CEF] Создание нового персонажа (слотов свободно:', MAX_CHARACTERS - characters.length, ')');
                
                if (typeof mp !== 'undefined') {
                    mp.trigger('cef:createNewCharacter');
                } else {
                    console.error('[CharSelection CEF] ❌ mp не определен!');
                }
            } else {
                console.warn('[CharSelection CEF] ⚠️ Лимит персонажей достигнут');
            }
        });
        console.log('[CharSelection CEF] ✅ Обработчик кнопки создания установлен');
    } else {
        console.error('[CharSelection CEF] ❌ Кнопка createNewBtn не найдена!');
    }
    
    const cancelBtn = document.getElementById('cancelDeleteBtn');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            console.log('[CharSelection CEF] Отмена удаления');
            characterToDelete = null;
            document.getElementById('deleteModal').classList.remove('show');
        });
    }
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            if (characterToDelete !== null) {
                console.log('[CharSelection CEF] Подтверждение удаления персонажа ID:', characterToDelete);
                
                if (typeof mp !== 'undefined') {
                    mp.trigger('cef:deleteCharacter', characterToDelete);
                } else {
                    console.error('[CharSelection CEF] ❌ mp не определен!');
                }
                
                document.getElementById('deleteModal').classList.remove('show');
                characterToDelete = null;
            }
        });
    }
    
    console.log('[CharSelection CEF] ✅ Все обработчики установлены');
});

// Подтверждение удаления
function confirmDelete(characterId, characterName) {
    console.log('[CharSelection CEF] Запрос на удаление:', characterId, characterName);
    
    characterToDelete = characterId;
    
    const nameElement = document.getElementById('deleteCharacterName');
    if (nameElement) {
        nameElement.textContent = characterName;
    }
    
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.classList.add('show');
    } else {
        console.error('[CharSelection CEF] ❌ Модальное окно deleteModal не найдено!');
    }
}

// Показ сообщения
function showMessage(type, text) {
    console.log('[CharSelection CEF] Показ сообщения:', type, '-', text);
    
    const message = document.getElementById('message');
    
    if (!message) {
        console.error('[CharSelection CEF] ❌ Элемент message не найден!');
        return;
    }
    
    message.textContent = text;
    message.className = `message ${type} show`;
    
    setTimeout(() => {
        message.classList.remove('show');
    }, 3000);
}

console.log('[CharSelection CEF] ===== Скрипт полностью инициализирован =====');
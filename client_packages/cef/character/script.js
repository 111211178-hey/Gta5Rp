let currentGender = 0;
let currentMother = 21;
let currentFather = 0;
let currentShapeMix = 0.5;
let currentSkinMix = 0.5;
let currentHair = 0;
let currentHairColor = 0;
let currentEyeColor = 0;
let isCreating = false;
let autoRotateEnabled = false;

// Названия родителей (БЕЗ Chloe и Madison)
const parentNames = [
    'Benjamin', 'Daniel', 'Joshua', 'Noah', 'Andrew', 'Juan', 'Alex', 'Isaac', 'Evan', 'Ethan',
    'Vincent', 'Angel', 'Diego', 'Adrian', 'Gabriel', 'Michael', 'Santiago', 'Kevin', 'Louis', 'Samuel',
    'Anthony', 'Hannah', 'Audrey', 'Jasmine', 'Giselle', 'Amelia', 'Isabella', 'Zoe', 'Ava', 'Camilla',
    'Violet', 'Sophia', 'Evelyn', 'Nicole', 'Ashley', 'Grace', 'Brianna', 'Natalie', 'Olivia', 'Elizabeth',
    'Charlotte', 'Emma', 'Niko', 'Claude'
];

// URL фото родителей (44 ШТУКИ)
const parentImages = [];
for (let i = 0; i < 44; i++) {
    parentImages.push(`images/parents/${i}.png`);
}

// МАССИВ МУЖСКИХ ПРИЧЕСОК (БЕЗ #23) - 36 штук
const maleHairstyleMap = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
    // 23 ПРОПУСКАЕМ
    24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36
];

// МАССИВ ЖЕНСКИХ ПРИЧЕСОК (БЕЗ #24) - 38 штук
const femaleHairstyleMap = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
    // 24 ПРОПУСКАЕМ
    25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38
];

// Цвета волос (HEX для превью)
const hairColors = [
    '#1C1C1C', '#2E2E2E', '#3F3F3F', '#4F4F4F', '#5E5E5E', '#6E6E6E', '#7D7D7D', '#8D8D8D',
    '#9C9C9C', '#ACACAC', '#BBBBBB', '#CBCBCB', '#DADADA', '#E9E9E9', '#F8F8F8', '#FFFFFF',
    '#8B4513', '#A0522D', '#CD853F', '#DEB887', '#D2691E', '#B8860B', '#DAA520', '#FFD700',
    '#FFA500', '#FF8C00', '#FF7F50', '#FF6347', '#FF4500', '#DC143C', '#B22222', '#8B0000',
    '#FF1493', '#FF69B4', '#FFB6C1', '#FFC0CB', '#DB7093', '#C71585', '#8B008B', '#9370DB',
    '#BA55D3', '#DDA0DD', '#EE82EE', '#DA70D6', '#FF00FF', '#8A2BE2', '#9400D3', '#9932CC',
    '#4B0082', '#483D8B', '#6A5ACD', '#7B68EE', '#00BFFF', '#1E90FF', '#4169E1', '#0000FF',
    '#00008B', '#000080', '#191970', '#4682B4', '#5F9EA0', '#00CED1', '#40E0D0', '#48D1CC'
];

// Цвета глаз (HEX для превью)
const eyeColors = [
    '#1C3A29', '#2E5C42', '#3F7D5A', '#4F9E72', '#5EBF8A', '#6EE0A2', '#7DFFBA', '#8DFFD2',
    '#2C1E0F', '#4D3319', '#6E4823', '#8F5D2D', '#B07237', '#D18741', '#F29C4B', '#FFB165',
    '#1E3A5F', '#2F5B90', '#407CC1', '#519DF2', '#62BEFF', '#73DFFF', '#84F0FF', '#95FFFF',
    '#3D1F1F', '#5E3030', '#7F4141', '#A05252', '#C16363', '#E27474', '#FF8585', '#FF9696',
    '#4A4A4A', '#6B6B6B', '#8C8C8C', '#ADADAD', '#CECECE', '#EFEFEF', '#FFFFFF', '#D3D3D3'
];

// Инициализация
window.addEventListener('DOMContentLoaded', () => {
    console.log('[Character Creator] Загрузка интерфейса...');
    
    generateParentGalleries();
    generateHairstyleGallery();
    generateColorPalettes();
    updateAllSliders();
    setupEventListeners();
    sendPreviewUpdate();
    updateParentNames();
    
    console.log('[Character Creator] ✅ Интерфейс загружен');
    console.log('[Character Creator] 44 родителя, 36 муж. причесок, 38 жен. причесок');
});

// ===== ГЕНЕРАЦИЯ ГАЛЕРЕИ РОДИТЕЛЕЙ =====
function generateParentGalleries() {
    console.log('[Parent Gallery] Генерация галерей родителей (44 шт)...');
    
    // Галерея матерей
    const motherGallery = document.getElementById('motherGallery');
    const motherGrid = document.createElement('div');
    motherGrid.className = 'parent-grid';
    
    for (let i = 0; i < 44; i++) {
        const item = document.createElement('div');
        item.className = 'parent-item';
        if (i === 21) item.classList.add('active');
        item.dataset.parentId = i;
        
        item.style.backgroundImage = `url('${parentImages[i]}')`;
        
        item.innerHTML = `
            <span class="parent-item-name">${parentNames[i] || `#${i}`}</span>
        `;
        
        item.addEventListener('click', () => {
            selectMother(i, item);
        });
        
        motherGrid.appendChild(item);
    }
    
    motherGallery.appendChild(motherGrid);
    
    // Галерея отцов
    const fatherGallery = document.getElementById('fatherGallery');
    const fatherGrid = document.createElement('div');
    fatherGrid.className = 'parent-grid';
    
    for (let i = 0; i < 44; i++) {
        const item = document.createElement('div');
        item.className = 'parent-item';
        if (i === 0) item.classList.add('active');
        item.dataset.parentId = i;
        
        item.style.backgroundImage = `url('${parentImages[i]}')`;
        
        item.innerHTML = `
            <span class="parent-item-name">${parentNames[i] || `#${i}`}</span>
        `;
        
        item.addEventListener('click', () => {
            selectFather(i, item);
        });
        
        fatherGrid.appendChild(item);
    }
    
    fatherGallery.appendChild(fatherGrid);
    
    console.log('[Parent Gallery] ✅ Галереи родителей созданы');
}

// Выбор матери
function selectMother(parentId, itemElement) {
    console.log('[Mother] Выбрана мать:', parentId, parentNames[parentId]);
    
    currentMother = parentId;
    
    document.querySelectorAll('#motherGallery .parent-item').forEach(item => {
        item.classList.remove('active');
    });
    
    itemElement.classList.add('active');
    
    updateParentNames();
    sendPreviewUpdate();
}

// Выбор отца
function selectFather(parentId, itemElement) {
    console.log('[Father] Выбран отец:', parentId, parentNames[parentId]);
    
    currentFather = parentId;
    
    document.querySelectorAll('#fatherGallery .parent-item').forEach(item => {
        item.classList.remove('active');
    });
    
    itemElement.classList.add('active');
    
    updateParentNames();
    sendPreviewUpdate();
}

// Обновление имен родителей
function updateParentNames() {
    const motherNameCurrent = document.getElementById('motherNameCurrent');
    const fatherNameCurrent = document.getElementById('fatherNameCurrent');
    
    if (motherNameCurrent && currentMother >= 0 && currentMother < parentNames.length) {
        motherNameCurrent.textContent = parentNames[currentMother];
    }
    
    if (fatherNameCurrent && currentFather >= 0 && currentFather < parentNames.length) {
        fatherNameCurrent.textContent = parentNames[currentFather];
    }
}

// ===== ГЕНЕРАЦИЯ ГАЛЕРЕИ ПРИЧЕСОК (БЕЗ #23 И #24) =====
function generateHairstyleGallery() {
    console.log('[Hairstyle Gallery] Генерация галереи причесок...');
    
    const hairstyleGallery = document.getElementById('hairstyleGallery');
    const hairstyleGrid = document.createElement('div');
    hairstyleGrid.className = 'hairstyle-grid';
    
    const hairstyleMap = currentGender === 0 ? maleHairstyleMap : femaleHairstyleMap;
    const genderFolder = currentGender === 0 ? 'male' : 'female';
    
    hairstyleMap.forEach((hairstyleId, displayIndex) => {
        const item = document.createElement('div');
        item.className = 'hairstyle-item';
        if (displayIndex === 0) item.classList.add('active');
        item.dataset.hairstyleId = hairstyleId;
        item.dataset.displayIndex = displayIndex;
        
        // УСТАНАВЛИВАЕМ ФОТО КАК ФОН
        item.style.backgroundImage = `url('images/hairstyles/${genderFolder}/${hairstyleId}.png')`;
        
        item.innerHTML = `
            <span class="hairstyle-item-number">#${hairstyleId}</span>
        `;
        
        item.addEventListener('click', () => {
            selectHairstyle(hairstyleId, displayIndex, item);
        });
        
        hairstyleGrid.appendChild(item);
    });
    
    hairstyleGallery.appendChild(hairstyleGrid);
    
    const maleCount = maleHairstyleMap.length;
    const femaleCount = femaleHairstyleMap.length;
    console.log(`[Hairstyle Gallery] ✅ Галерея создана (муж: ${maleCount}, жен: ${femaleCount})`);
}

// Выбор прически
function selectHairstyle(hairstyleId, displayIndex, itemElement) {
    console.log('[Hairstyle] Выбрана прическа:', hairstyleId);
    
    currentHair = hairstyleId;
    
    document.querySelectorAll('#hairstyleGallery .hairstyle-item').forEach(item => {
        item.classList.remove('active');
    });
    
    itemElement.classList.add('active');
    
    document.getElementById('currentHairstyleNumber').textContent = `#${hairstyleId}`;
    
    sendPreviewUpdate();
}

// Пересоздание галереи причесок при смене пола
function regenerateHairstyleGallery() {
    const hairstyleGallery = document.getElementById('hairstyleGallery');
    hairstyleGallery.innerHTML = '';
    
    const hairstyleGrid = document.createElement('div');
    hairstyleGrid.className = 'hairstyle-grid';
    
    const hairstyleMap = currentGender === 0 ? maleHairstyleMap : femaleHairstyleMap;
    const genderFolder = currentGender === 0 ? 'male' : 'female';
    
    hairstyleMap.forEach((hairstyleId, displayIndex) => {
        const item = document.createElement('div');
        item.className = 'hairstyle-item';
        if (hairstyleId === currentHair) item.classList.add('active');
        item.dataset.hairstyleId = hairstyleId;
        item.dataset.displayIndex = displayIndex;
        
        item.style.backgroundImage = `url('images/hairstyles/${genderFolder}/${hairstyleId}.png')`;
        
        item.innerHTML = `
            <span class="hairstyle-item-number">#${hairstyleId}</span>
        `;
        
        item.addEventListener('click', () => {
            selectHairstyle(hairstyleId, displayIndex, item);
        });
        
        hairstyleGrid.appendChild(item);
    });
    
    hairstyleGallery.appendChild(hairstyleGrid);
    
    console.log('[Hairstyle Gallery] Галерея пересоздана для пола:', currentGender);
}

// ===== ГЕНЕРАЦИЯ ЦВЕТОВЫХ ПАЛИТР =====
function generateColorPalettes() {
    console.log('[Color Palettes] Генерация цветовых палитр...');
    
    // Палитра волос
    const hairColorPalette = document.getElementById('hairColorPalette');
    hairColors.forEach((color, index) => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.background = `linear-gradient(135deg, ${color} 0%, ${adjustBrightness(color, -20)} 100%)`;
        swatch.dataset.colorId = index;
        swatch.title = `Цвет ${index}`;
        
        if (index === 0) {
            swatch.classList.add('active');
        }
        
        swatch.addEventListener('click', () => {
            selectHairColor(index, swatch);
        });
        
        hairColorPalette.appendChild(swatch);
    });
    
    // Палитра глаз
    const eyeColorPalette = document.getElementById('eyeColorPalette');
    eyeColors.forEach((color, index) => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.background = `radial-gradient(circle, ${color} 0%, ${adjustBrightness(color, -30)} 100%)`;
        swatch.dataset.colorId = index;
        swatch.title = `Цвет глаз ${index}`;
        
        if (index === 0) {
            swatch.classList.add('active');
        }
        
        swatch.addEventListener('click', () => {
            selectEyeColor(index, swatch);
        });
        
        eyeColorPalette.appendChild(swatch);
    });
    
    console.log('[Color Palettes] ✅ Палитры сгенерированы');
}

// Функция для изменения яркости цвета
function adjustBrightness(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255))
        .toString(16).slice(1).toUpperCase();
}

// Выбор цвета волос из палитры
function selectHairColor(colorId, swatchElement) {
    console.log('[Hair Color] Выбран цвет:', colorId);
    
    currentHairColor = colorId;
    
    document.querySelectorAll('#hairColorPalette .color-swatch').forEach(s => {
        s.classList.remove('active');
    });
    
    swatchElement.classList.add('active');
    
    sendPreviewUpdate();
}

// Выбор цвета глаз из палитры
function selectEyeColor(colorId, swatchElement) {
    console.log('[Eye Color] Выбран цвет глаз:', colorId);
    
    currentEyeColor = colorId;
    
    document.querySelectorAll('#eyeColorPalette .color-swatch').forEach(s => {
        s.classList.remove('active');
    });
    
    swatchElement.classList.add('active');
    
    sendPreviewUpdate();
}

// ===== НАСТРОЙКА ОБРАБОТЧИКОВ =====
function setupEventListeners() {
    console.log('[Character Creator] Настройка обработчиков событий...');
    
    setupTabs();
    setupGenderButtons();
    setupExpandableGalleries();
    setupAppearanceSliders();
    setupActionButtons();
    setupCameraControls();
    
    console.log('[Character Creator] ✅ Обработчики настроены');
}

// ===== ВКЛАДКИ =====
function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            
            const targetTab = tab.getAttribute('data-tab');
            
            tabs.forEach(t => t.classList.remove('active'));
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            tab.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            console.log('[Tabs] Переключено на вкладку:', targetTab);
        });
    });
}

// ===== РАСКРЫВАЮЩИЕСЯ ГАЛЕРЕИ =====
function setupExpandableGalleries() {
    const motherHeader = document.getElementById('motherHeader');
    const motherGallery = document.getElementById('motherGallery');
    
    motherHeader.addEventListener('click', () => {
        motherHeader.classList.toggle('active');
        motherGallery.classList.toggle('open');
    });
    
    const fatherHeader = document.getElementById('fatherHeader');
    const fatherGallery = document.getElementById('fatherGallery');
    
    fatherHeader.addEventListener('click', () => {
        fatherHeader.classList.toggle('active');
        fatherGallery.classList.toggle('open');
    });
    
    const hairstyleHeader = document.getElementById('hairstyleHeader');
    const hairstyleGallery = document.getElementById('hairstyleGallery');
    
    hairstyleHeader.addEventListener('click', () => {
        hairstyleHeader.classList.toggle('active');
        hairstyleGallery.classList.toggle('open');
    });
}

// ===== ПОЛ =====
function setupGenderButtons() {
    const maleBtn = document.getElementById('maleBtn');
    const femaleBtn = document.getElementById('femaleBtn');
    
    if (maleBtn) {
        maleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            selectGender(0);
        });
    }
    
    if (femaleBtn) {
        femaleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            selectGender(1);
        });
    }
}

function selectGender(gender) {
    console.log('[Gender] Выбран пол:', gender === 0 ? 'Мужской' : 'Женский');
    
    currentGender = gender;
    
    const maleBtn = document.getElementById('maleBtn');
    const femaleBtn = document.getElementById('femaleBtn');
    
    if (gender === 0) {
        maleBtn.classList.add('active');
        femaleBtn.classList.remove('active');
    } else {
        femaleBtn.classList.add('active');
        maleBtn.classList.remove('active');
    }
    
    currentHair = 0;
    document.getElementById('currentHairstyleNumber').textContent = '#0';
    
    regenerateHairstyleGallery();
    
    sendPreviewUpdate();
}

// ===== СЛАЙДЕРЫ ВНЕШНОСТИ =====
function setupAppearanceSliders() {
    const ageInput = document.getElementById('ageInput');
    ageInput.addEventListener('input', (e) => {
        const age = parseInt(e.target.value);
        document.getElementById('ageValue').textContent = age;
    });
    
    document.getElementById('shapeMixSlider').addEventListener('input', (e) => {
        currentShapeMix = parseFloat(e.target.value);
        document.getElementById('shapeMixValue').textContent = Math.round(currentShapeMix * 100) + '%';
        sendPreviewUpdate();
    });
    
    document.getElementById('skinMixSlider').addEventListener('input', (e) => {
        currentSkinMix = parseFloat(e.target.value);
        document.getElementById('skinMixValue').textContent = Math.round(currentSkinMix * 100) + '%';
        sendPreviewUpdate();
    });
}

// ===== КНОПКИ ДЕЙСТВИЙ =====
function setupActionButtons() {
    document.getElementById('createBtn').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        createCharacter();
    });
    
    document.getElementById('randomBtn').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        randomizeCharacter();
    });
}

// ===== УПРАВЛЕНИЕ КАМЕРОЙ =====
function setupCameraControls() {
    const cameraModeBtns = document.querySelectorAll('.camera-mode-btn');
    
    cameraModeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            
            const mode = btn.getAttribute('data-mode');
            
            cameraModeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (typeof mp !== 'undefined') {
                mp.trigger('cef:setCameraMode', mode);
            }
            
            console.log('[Camera] Режим камеры:', mode);
        });
    });
    
    document.getElementById('rotateLeft').addEventListener('click', (e) => {
        e.preventDefault();
        
        if (typeof mp !== 'undefined') {
            mp.trigger('cef:rotateCameraLeft');
        }
        
        console.log('[Camera] Поворот влево');
    });
    
    document.getElementById('rotateRight').addEventListener('click', (e) => {
        e.preventDefault();
        
        if (typeof mp !== 'undefined') {
            mp.trigger('cef:rotateCameraRight');
        }
        
        console.log('[Camera] Поворот вправо');
    });
    
    const autoRotateBtn = document.getElementById('autoRotate');
    
    autoRotateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        autoRotateEnabled = !autoRotateEnabled;
        
        if (autoRotateEnabled) {
            autoRotateBtn.classList.add('active');
        } else {
            autoRotateBtn.classList.remove('active');
        }
        
        if (typeof mp !== 'undefined') {
            mp.trigger('cef:toggleAutoRotate', autoRotateEnabled);
        }
        
        console.log('[Camera] Автоматическое вращение:', autoRotateEnabled ? 'Включено' : 'Выключено');
    });
}

// ===== ОБНОВЛЕНИЕ СЛАЙДЕРОВ =====
function updateAllSliders() {
    document.getElementById('ageValue').textContent = document.getElementById('ageInput').value;
    document.getElementById('shapeMixValue').textContent = Math.round(currentShapeMix * 100) + '%';
    document.getElementById('skinMixValue').textContent = Math.round(currentSkinMix * 100) + '%';
}

// ===== ОТПРАВКА НА ПРЕДПРОСМОТР =====
function sendPreviewUpdate() {
    const appearance = {
        gender: currentGender,
        faceFeatures: {
            mother: currentMother,
            father: currentFather,
            shapeMix: currentShapeMix,
            skinMix: currentSkinMix
        },
        hair: currentHair,
        hairColor: currentHairColor,
        eyeColor: currentEyeColor
    };
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:updateAppearance', JSON.stringify(appearance));
    }
}

// ===== СОЗДАНИЕ ПЕРСОНАЖА =====
function createCharacter() {
    if (isCreating) {
        console.log('[Create] Уже создается...');
        return;
    }
    
    console.log('[Create] Начало создания персонажа...');
    
    const name = document.getElementById('nameInput').value.trim();
    const surname = document.getElementById('surnameInput').value.trim();
    const age = parseInt(document.getElementById('ageInput').value);
    
    if (!name || name.length < 2) {
        showMessage('error', 'Имя должно содержать минимум 2 символа');
        return;
    }
    
    if (!surname || surname.length < 2) {
        showMessage('error', 'Фамилия должна содержать минимум 2 символа');
        return;
    }
    
    if (isNaN(age) || age < 18 || age > 80) {
        showMessage('error', 'Возраст должен быть от 18 до 80 лет');
        return;
    }
    
    const latinRegex = /^[a-zA-Z]+$/;
    if (!latinRegex.test(name)) {
        showMessage('error', 'Имя д��лжно содержать только латинские буквы');
        return;
    }
    
    if (!latinRegex.test(surname)) {
        showMessage('error', 'Фамилия должна содержать только латинские буквы');
        return;
    }
    
    isCreating = true;
    
    const createBtn = document.getElementById('createBtn');
    createBtn.disabled = true;
    createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Создание...';
    
    const characterData = {
        name: name,
        surname: surname,
        age: age,
        gender: currentGender,
        appearance: {
            gender: currentGender,
            faceFeatures: {
                mother: currentMother,
                father: currentFather,
                shapeMix: currentShapeMix,
                skinMix: currentSkinMix
            },
            hair: currentHair,
            hairColor: currentHairColor,
            eyeColor: currentEyeColor
        }
    };
    
    console.log('[Create] Отправка данных персонажа:', characterData);
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:createCharacter', JSON.stringify(characterData));
    } else {
        console.error('[Create] mp не определен!');
        resetCreating();
    }
}

// ===== СБРОС СОЗДАНИЯ =====
function resetCreating() {
    isCreating = false;
    
    const createBtn = document.getElementById('createBtn');
    createBtn.disabled = false;
    createBtn.innerHTML = '<i class="fas fa-check-circle"></i> Создать персонажа';
    
    console.log('[Create] Сброс состояния создания');
}

// ===== РАНДОМИЗАЦИЯ =====
function randomizeCharacter() {
    console.log('[Random] Генерация случайного персонажа...');
    
    currentMother = Math.floor(Math.random() * 44);
    currentFather = Math.floor(Math.random() * 44);
    currentShapeMix = Math.random();
    currentSkinMix = Math.random();
    
    const hairstyleMap = currentGender === 0 ? maleHairstyleMap : femaleHairstyleMap;
    const randomIndex = Math.floor(Math.random() * hairstyleMap.length);
    currentHair = hairstyleMap[randomIndex];
    
    currentHairColor = Math.floor(Math.random() * 64);
    currentEyeColor = Math.floor(Math.random() * 32);
    
    document.getElementById('shapeMixSlider').value = currentShapeMix;
    document.getElementById('skinMixSlider').value = currentSkinMix;
    
    updateAllSliders();
    updateParentNames();
    
    document.querySelectorAll('#motherGallery .parent-item').forEach(item => {
        item.classList.remove('active');
        if (parseInt(item.dataset.parentId) === currentMother) {
            item.classList.add('active');
        }
    });
    
    document.querySelectorAll('#fatherGallery .parent-item').forEach(item => {
        item.classList.remove('active');
        if (parseInt(item.dataset.parentId) === currentFather) {
            item.classList.add('active');
        }
    });
    
    document.querySelectorAll('#hairstyleGallery .hairstyle-item').forEach(item => {
        item.classList.remove('active');
        if (parseInt(item.dataset.hairstyleId) === currentHair) {
            item.classList.add('active');
        }
    });
    document.getElementById('currentHairstyleNumber').textContent = `#${currentHair}`;
    
    document.querySelectorAll('#hairColorPalette .color-swatch').forEach(s => {
        s.classList.remove('active');
    });
    const hairSwatch = document.querySelector(`#hairColorPalette .color-swatch[data-color-id="${currentHairColor}"]`);
    if (hairSwatch) {
        hairSwatch.classList.add('active');
    }
    
    document.querySelectorAll('#eyeColorPalette .color-swatch').forEach(s => {
        s.classList.remove('active');
    });
    const eyeSwatch = document.querySelector(`#eyeColorPalette .color-swatch[data-color-id="${currentEyeColor}"]`);
    if (eyeSwatch) {
        eyeSwatch.classList.add('active');
    }
    
    sendPreviewUpdate();
    
    showMessage('success', '✨ Персонаж рандомизирован!');
    
    console.log('[Random] ✅ Персонаж рандомизирован');
}

// ===== ПОКАЗ СООБЩЕНИЯ =====
function showMessage(type, text) {
    const message = document.getElementById('message');
    message.textContent = text;
    message.className = `message ${type} show`;
    
    console.log(`[Message] ${type.toUpperCase()}: ${text}`);
    
    setTimeout(() => {
        message.classList.remove('show');
    }, 3000);
}

// ===== ЛОГИРОВАНИЕ =====
console.log('[Character Creator] ===== СКРИПТ ИНИЦИАЛИЗИРОВАН =====');
console.log('[Character Creator] Версия: 6.1 - Final Edition');
console.log('[Character Creator] 44 родителя, 36 муж. (без #23), 38 жен. (без #24)');
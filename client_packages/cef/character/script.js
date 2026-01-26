let currentGender = 0;
let currentMother = 21;
let currentFather = 0;
let currentShapeMix = 0.5;
let currentSkinMix = 0.5;
let currentHair = 0;
let currentHairColor = 0;
let currentEyeColor = 0;
let isCreating = false;

// Инициализация
window.addEventListener('DOMContentLoaded', () => {
    console.log('Character Creator loaded');
    
    updateAllSliders();
    setupEventListeners();
    sendPreviewUpdate();
});

// Настройка обработчиков
function setupEventListeners() {
    // Пол
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
    
    // Слайдеры
    document.getElementById('motherSlider').addEventListener('input', (e) => {
        currentMother = parseInt(e.target.value);
        document.getElementById('motherValue').textContent = currentMother;
        sendPreviewUpdate();
    });
    
    document.getElementById('fatherSlider').addEventListener('input', (e) => {
        currentFather = parseInt(e.target.value);
        document.getElementById('fatherValue').textContent = currentFather;
        sendPreviewUpdate();
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
    
    document.getElementById('hairSlider').addEventListener('input', (e) => {
        currentHair = parseInt(e.target.value);
        document.getElementById('hairValue').textContent = currentHair;
        sendPreviewUpdate();
    });
    
    document.getElementById('hairColorSlider').addEventListener('input', (e) => {
        currentHairColor = parseInt(e.target.value);
        document.getElementById('hairColorValue').textContent = currentHairColor;
        sendPreviewUpdate();
    });
    
    document.getElementById('eyeColorSlider').addEventListener('input', (e) => {
        currentEyeColor = parseInt(e.target.value);
        document.getElementById('eyeColorValue').textContent = currentEyeColor;
        sendPreviewUpdate();
    });
    
    // Кнопки
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

// Выбор пола
function selectGender(gender) {
    console.log('Выбран пол:', gender);
    
    currentGender = gender;
    
    const maleBtn = document.getElementById('maleBtn');
    const femaleBtn = document.getElementById('femaleBtn');
    
    if (gender === 0) {
        maleBtn.classList.add('active');
        femaleBtn.classList.remove('active');
        document.getElementById('hairSlider').max = 36;
    } else {
        femaleBtn.classList.add('active');
        maleBtn.classList.remove('active');
        document.getElementById('hairSlider').max = 38;
    }
    
    currentHair = 0;
    document.getElementById('hairSlider').value = 0;
    document.getElementById('hairValue').textContent = 0;
    
    sendPreviewUpdate();
}

// Обновление слайдеров
function updateAllSliders() {
    document.getElementById('motherValue').textContent = currentMother;
    document.getElementById('fatherValue').textContent = currentFather;
    document.getElementById('shapeMixValue').textContent = Math.round(currentShapeMix * 100) + '%';
    document.getElementById('skinMixValue').textContent = Math.round(currentSkinMix * 100) + '%';
    document.getElementById('hairValue').textContent = currentHair;
    document.getElementById('hairColorValue').textContent = currentHairColor;
    document.getElementById('eyeColorValue').textContent = currentEyeColor;
}

// Отправка на предпросмотр
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

// Создание персонажа
function createCharacter() {
    if (isCreating) return;
    
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
    
    if (isNaN(age) || age < 18 || age > 100) {
        showMessage('error', 'Возраст должен быть от 18 до 100 лет');
        return;
    }
    
    const latinRegex = /^[a-zA-Z]+$/;
    if (!latinRegex.test(name)) {
        showMessage('error', 'Имя должно содержать только латинские буквы');
        return;
    }
    
    if (!latinRegex.test(surname)) {
        showMessage('error', 'Фамилия должна содержать только латинские буквы');
        return;
    }
    
    isCreating = true;
    
    const createBtn = document.getElementById('createBtn');
    createBtn.disabled = true;
    createBtn.textContent = 'Создание...';
    
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
    
    console.log('Отправка данных персонажа:', characterData);
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:createCharacter', JSON.stringify(characterData));
    }
}

// Показ сообщения
function showMessage(type, text) {
    const message = document.getElementById('message');
    message.textContent = text;
    message.className = `message ${type} show`;
    
    setTimeout(() => {
        message.classList.remove('show');
    }, 3000);
}

// Сброс создания
function resetCreating() {
    isCreating = false;
    
    const createBtn = document.getElementById('createBtn');
    createBtn.disabled = false;
    createBtn.textContent = 'Создать персонажа';
}

// Рандомизация
function randomizeCharacter() {
    console.log('Генерация случайного персонажа');
    
    currentMother = Math.floor(Math.random() * 46);
    currentFather = Math.floor(Math.random() * 46);
    currentShapeMix = Math.random();
    currentSkinMix = Math.random();
    currentHair = Math.floor(Math.random() * (currentGender === 0 ? 37 : 39));
    currentHairColor = Math.floor(Math.random() * 64);
    currentEyeColor = Math.floor(Math.random() * 32);
    
    document.getElementById('motherSlider').value = currentMother;
    document.getElementById('fatherSlider').value = currentFather;
    document.getElementById('shapeMixSlider').value = currentShapeMix;
    document.getElementById('skinMixSlider').value = currentSkinMix;
    document.getElementById('hairSlider').value = currentHair;
    document.getElementById('hairColorSlider').value = currentHairColor;
    document.getElementById('eyeColorSlider').value = currentEyeColor;
    
    updateAllSliders();
    sendPreviewUpdate();
    
    showMessage('success', 'Персонаж рандомизирован!');
}
// Переключение на форму регистрации
function switchToRegister() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
    hideMessage();
    document.getElementById('registerUsername').focus();
}

// Переключение на форму входа
function switchToLogin() {
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
    hideMessage();
    document.getElementById('loginUsername').focus();
}

// Показать сообщение
function showMessage(type, text) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = 'message ' + type;
    messageEl.classList.remove('hidden');
}

// Скрыть сообщение
function hideMessage() {
    const messageEl = document.getElementById('message');
    messageEl.classList.add('hidden');
}

// Обработка входа
function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!username) {
        showMessage('error', 'Введите логин');
        return;
    }
    
    if (!password) {
        showMessage('error', 'Введите пароль');
        return;
    }
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:login', username, password);
    } else {
        showMessage('error', 'Ошибка подключения к игре');
    }
}

// Обработка регистрации
function handleRegister() {
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    
    if (!username) {
        showMessage('error', 'Введите логин');
        return;
    }
    
    if (username.length < 3) {
        showMessage('error', 'Логин должен содержать минимум 3 символа');
        return;
    }
    
    if (!password) {
        showMessage('error', 'Введите пароль');
        return;
    }
    
    if (password.length < 6) {
        showMessage('error', 'Пароль должен содержать минимум 6 символов');
        return;
    }
    
    if (password !== passwordConfirm) {
        showMessage('error', 'Пароли не совпадают');
        return;
    }
    
    if (typeof mp !== 'undefined') {
        mp.trigger('cef:register', username, password);
    } else {
        showMessage('error', 'Ошибка подключения к игре');
    }
}

// Обработка нажатия Enter
document.addEventListener('DOMContentLoaded', () => {
    const loginInputs = document.querySelectorAll('#loginForm input');
    loginInputs.forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    });
    
    const registerInputs = document.querySelectorAll('#registerForm input');
    registerInputs.forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleRegister();
            }
        });
    });
});
// ===== SECURITY UTILITIES =====

const bcrypt = require('bcrypt');
const validator = require('validator');
const config = require('./config');

// Password hashing
async function hashPassword(password) {
    try {
        const salt = await bcrypt.genSalt(config.SECURITY.BCRYPT_ROUNDS);
        const hash = await bcrypt.hash(password, salt);
        return hash;
    } catch (err) {
        console.error('[Security] Error hashing password:', err);
        throw err;
    }
}

// Password verification
async function verifyPassword(password, hash) {
    try {
        return await bcrypt.compare(password, hash);
    } catch (err) {
        console.error('[Security] Error verifying password:', err);
        return false;
    }
}

// Input validation
function validateLogin(login) {
    if (!login || typeof login !== 'string') {
        return { valid: false, error: 'Логин обязателен' };
    }
    
    const length = login.length;
    if (length < config.REGISTRATION.MIN_LOGIN_LENGTH || length > config.REGISTRATION.MAX_LOGIN_LENGTH) {
        return { 
            valid: false, 
            error: `Логин должен быть от ${config.REGISTRATION.MIN_LOGIN_LENGTH} до ${config.REGISTRATION.MAX_LOGIN_LENGTH} символов` 
        };
    }
    
    // Only alphanumeric and underscore allowed
    if (!/^[a-zA-Z0-9_]+$/.test(login)) {
        return { valid: false, error: 'Логин может содержать только буквы, цифры и знак подчеркивания' };
    }
    
    return { valid: true };
}

function validatePassword(password) {
    if (!password || typeof password !== 'string') {
        return { valid: false, error: 'Пароль обязателен' };
    }
    
    const length = password.length;
    if (length < config.REGISTRATION.MIN_PASSWORD_LENGTH || length > config.REGISTRATION.MAX_PASSWORD_LENGTH) {
        return { 
            valid: false, 
            error: `Пароль должен быть от ${config.REGISTRATION.MIN_PASSWORD_LENGTH} до ${config.REGISTRATION.MAX_PASSWORD_LENGTH} символов` 
        };
    }
    
    return { valid: true };
}

function validateCharacterName(name) {
    if (!name || typeof name !== 'string') {
        return { valid: false, error: 'Имя обязательно' };
    }
    
    const trimmed = name.trim();
    const length = trimmed.length;
    
    if (length < config.CHARACTER.MIN_NAME_LENGTH || length > config.CHARACTER.MAX_NAME_LENGTH) {
        return { 
            valid: false, 
            error: `Имя должно быть от ${config.CHARACTER.MIN_NAME_LENGTH} до ${config.CHARACTER.MAX_NAME_LENGTH} символов` 
        };
    }
    
    // Only letters allowed (including Russian)
    if (!/^[a-zA-Zа-яА-ЯёЁ]+$/.test(trimmed)) {
        return { valid: false, error: 'Имя может содержать только буквы' };
    }
    
    // Capitalize first letter
    return { valid: true, value: trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase() };
}

function validateAge(age) {
    const numAge = parseInt(age);
    
    if (isNaN(numAge)) {
        return { valid: false, error: 'Возраст должен быть числом' };
    }
    
    if (numAge < config.CHARACTER.MIN_AGE || numAge > config.CHARACTER.MAX_AGE) {
        return { 
            valid: false, 
            error: `Возраст должен быть от ${config.CHARACTER.MIN_AGE} до ${config.CHARACTER.MAX_AGE} лет` 
        };
    }
    
    return { valid: true, value: numAge };
}

// SQL injection prevention (already covered by mysql2 parameterized queries, but extra check)
function sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return validator.escape(str.trim());
}

// Rate limiting storage (in-memory, simple implementation)
const loginAttempts = new Map();

function checkRateLimit(identifier) {
    const now = Date.now();
    const attempts = loginAttempts.get(identifier) || { count: 0, firstAttempt: now };
    
    // Reset if cooldown period passed
    if (now - attempts.firstAttempt > config.SECURITY.LOGIN_COOLDOWN_MS) {
        loginAttempts.set(identifier, { count: 1, firstAttempt: now });
        return { allowed: true, remaining: config.SECURITY.MAX_LOGIN_ATTEMPTS - 1 };
    }
    
    // Check if exceeded limit
    if (attempts.count >= config.SECURITY.MAX_LOGIN_ATTEMPTS) {
        const timeLeft = Math.ceil((config.SECURITY.LOGIN_COOLDOWN_MS - (now - attempts.firstAttempt)) / 1000);
        return { 
            allowed: false, 
            error: `Слишком много попыток входа. Попробуйте через ${timeLeft} секунд` 
        };
    }
    
    // Increment counter
    attempts.count++;
    loginAttempts.set(identifier, attempts);
    
    return { allowed: true, remaining: config.SECURITY.MAX_LOGIN_ATTEMPTS - attempts.count };
}

function resetRateLimit(identifier) {
    loginAttempts.delete(identifier);
}

// Clean up old rate limit entries periodically (every 5 minutes)
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of loginAttempts.entries()) {
        if (now - value.firstAttempt > config.SECURITY.LOGIN_COOLDOWN_MS) {
            loginAttempts.delete(key);
        }
    }
}, 300000); // Clean every 5 minutes instead of every minute

module.exports = {
    hashPassword,
    verifyPassword,
    validateLogin,
    validatePassword,
    validateCharacterName,
    validateAge,
    sanitizeString,
    checkRateLimit,
    resetRateLimit
};

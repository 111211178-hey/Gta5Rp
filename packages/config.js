// ===== SERVER CONFIGURATION =====

module.exports = {
    // Character System
    CHARACTER: {
        MAX_PER_ACCOUNT: 3,
        MIN_NAME_LENGTH: 2,
        MAX_NAME_LENGTH: 20,
        MIN_AGE: 18,
        MAX_AGE: 80,
        START_MONEY: 1000,
        START_BANK: 5000,
        START_POSITION: {
            x: -1037.7,
            y: -2738.5,
            z: 20.0,
            heading: 0
        }
    },
    
    // Inventory System
    INVENTORY: {
        MAX_SLOTS: 35,
        DEFAULT_MAX_WEIGHT: 50,
        STARTER_ITEMS: [
            { name: 'water', quantity: 2 },
            { name: 'bread', quantity: 3 },
            { name: 'phone', quantity: 1 }
        ]
    },
    
    // Dimension System
    DIMENSION: {
        WORLD: 0,
        CREATION_START: 1000
    },
    
    // Admin System
    ADMIN: {
        LEVELS: {
            NONE: 0,
            HELPER: 1,
            MODERATOR: 2,
            ADMIN: 3,
            SENIOR_ADMIN: 4,
            OWNER: 5
        }
    },
    
    // Registration
    REGISTRATION: {
        MIN_LOGIN_LENGTH: 3,
        MAX_LOGIN_LENGTH: 32,
        MIN_PASSWORD_LENGTH: 6,
        MAX_PASSWORD_LENGTH: 128,
        START_MONEY: 5000,
        START_BANK: 10000
    },
    
    // Security
    SECURITY: {
        MAX_LOGIN_ATTEMPTS: 5,
        LOGIN_COOLDOWN_MS: 60000, // 1 minute
        BCRYPT_ROUNDS: 10
    },
    
    // Transactions
    TRANSACTIONS: {
        SUSPICIOUS_THRESHOLD: 100000 // Threshold for suspicious transactions
    }
};

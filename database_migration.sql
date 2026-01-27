-- ===========================================
-- МИГРАЦИЯ БАЗЫ ДАННЫХ - ОБНОВЛЕНИЕ ПАРОЛЕЙ
-- ===========================================
-- 
-- ⚠️ ВНИМАНИЕ: Эта миграция изменит формат хранения паролей
-- После выполнения старые пароли перестанут работать!
-- Все пользователи должны будут зарегистрироваться заново.
--
-- Альтернатива: Можно установить временные пароли для существующих пользователей

-- Шаг 1: Создаем резервную копию таблицы users
CREATE TABLE users_backup AS SELECT * FROM users;

-- Шаг 2: Изменяем размер поля password для bcrypt хешей (255 символов)
ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NOT NULL;

-- Шаг 3: (ОПЦИОНАЛЬНО) Если нужно сохранить пользователей, установите временные пароли
-- Замените 'temp_password_hash' на хеш пароля "temppass123" сгенерированный bcrypt
-- Пример с хешем пароля "temppass123":
-- UPDATE users SET password = '$2b$10$X.T7j0xZN8k7VpKx.YJ8.OBwE3yIQ8FmxCJiY8G0K3C4L5G6H7J8K';

-- Шаг 4: Или очистить пароли и попросить пользователей зарегистрироваться заново
-- UPDATE users SET password = '';

-- Шаг 5: Добавить индексы для оптимизации (если еще не добавлены)
CREATE INDEX IF NOT EXISTS idx_login ON users(login);
CREATE INDEX IF NOT EXISTS idx_admin ON users(admin_level);
CREATE INDEX IF NOT EXISTS idx_user_char ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_name_char ON characters(name, surname);
CREATE INDEX IF NOT EXISTS idx_item_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_char_inv ON character_inventory(character_id);
CREATE INDEX IF NOT EXISTS idx_ban_social ON bans(social_club);
CREATE INDEX IF NOT EXISTS idx_ban_ip ON bans(ip_address);
CREATE INDEX IF NOT EXISTS idx_ban_expires ON bans(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_log ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_log_date ON admin_logs(created_at);

-- Шаг 6: Добавить недостающие таблицы (если их нет)

-- Проверка существования таблицы items
CREATE TABLE IF NOT EXISTS items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    type ENUM('consumable', 'tool', 'weapon', 'resource', 'other') DEFAULT 'other',
    weight DECIMAL(5,2) DEFAULT 0.0,
    max_stack INT DEFAULT 1,
    usable BOOLEAN DEFAULT TRUE,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Проверка существования таблицы character_inventory
CREATE TABLE IF NOT EXISTS character_inventory (
    id INT PRIMARY KEY AUTO_INCREMENT,
    character_id INT NOT NULL,
    item_id INT NOT NULL,
    slot TINYINT NOT NULL,
    quantity INT DEFAULT 1,
    metadata TEXT,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    UNIQUE KEY unique_slot (character_id, slot),
    INDEX idx_character (character_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Проверка существования таблицы bans
CREATE TABLE IF NOT EXISTS bans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    social_club VARCHAR(50),
    ip_address VARCHAR(45),
    banned_by INT,
    reason TEXT,
    duration INT DEFAULT 0,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_social_club (social_club),
    INDEX idx_ip (ip_address),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Проверка существования таблицы admin_logs
CREATE TABLE IF NOT EXISTS admin_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT,
    action_type VARCHAR(50),
    target_player VARCHAR(50),
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin (admin_id),
    INDEX idx_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Шаг 7: Добавить базовые предметы (если таблица пуста)
INSERT IGNORE INTO items (name, display_name, description, type, weight, max_stack, usable) VALUES
('water', 'Вода', 'Бутылка воды', 'consumable', 0.5, 5, TRUE),
('bread', 'Хлеб', 'Буханка хлеба', 'consumable', 0.3, 10, TRUE),
('bandage', 'Бинт', 'Медицинский бинт', 'consumable', 0.1, 5, TRUE),
('medkit', 'Аптечка', 'Полная аптечка', 'consumable', 1.0, 3, TRUE),
('phone', 'Телефон', 'Мобильный телефон', 'tool', 0.2, 1, TRUE),
('lockpick', 'Отмычка', 'Набор отмычек', 'tool', 0.1, 3, TRUE),
('pistol_ammo', 'Патроны 9мм', 'Патроны для пистолета', 'resource', 0.5, 50, FALSE),
('iron', 'Железо', 'Железная руда', 'resource', 2.0, 20, FALSE),
('wood', 'Дерево', 'Деревянные доски', 'resource', 1.5, 30, FALSE),
('rope', 'Веревка', 'Прочная веревка', 'tool', 0.5, 5, FALSE);

-- Шаг 8: Добавить поле max_weight в characters если его нет
ALTER TABLE characters ADD COLUMN IF NOT EXISTS max_weight INT DEFAULT 50;

-- ГОТОВО! Миграция завершена.
-- 
-- СЛЕДУЮЩИЕ ШАГИ:
-- 1. Проверьте, что все таблицы созданы
-- 2. Запустите сервер с новым кодом
-- 3. Протестируйте регистрацию нового пользователя
-- 4. Убедитесь, что пароли хешируются правильно

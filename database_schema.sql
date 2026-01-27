-- ===============================================
-- GTA5 RP DATABASE SCHEMA
-- ===============================================
-- Version: 1.0.0
-- Description: Complete database schema for GTA5 RP server
-- Author: GTA5 RP Team
-- ===============================================

-- Set character set
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ===============================================
-- TABLE: users
-- Description: Player accounts
-- ===============================================
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `login` VARCHAR(32) UNIQUE NOT NULL COMMENT 'Username for login',
    `password` VARCHAR(255) NOT NULL COMMENT 'Bcrypt hashed password',
    `ip_address` VARCHAR(45) NULL COMMENT 'Last known IP address',
    `registered_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Registration timestamp',
    `last_login` DATETIME NULL COMMENT 'Last login timestamp',
    `money` INT DEFAULT 5000 COMMENT 'Cash money (legacy, not used)',
    `bank` INT DEFAULT 10000 COMMENT 'Bank money (legacy, not used)',
    `level` INT DEFAULT 1 COMMENT 'Account level (legacy)',
    `exp` INT DEFAULT 0 COMMENT 'Experience points (legacy)',
    `admin_level` TINYINT DEFAULT 0 COMMENT 'Admin level (0-5)',
    INDEX `idx_login` (`login`),
    INDEX `idx_admin` (`admin_level`),
    INDEX `idx_last_login` (`last_login`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Player accounts';

-- ===============================================
-- TABLE: characters
-- Description: Player characters (roleplay personas)
-- ===============================================
CREATE TABLE IF NOT EXISTS `characters` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `user_id` INT NOT NULL COMMENT 'Reference to users table',
    `name` VARCHAR(20) NOT NULL COMMENT 'First name',
    `surname` VARCHAR(20) NOT NULL COMMENT 'Last name',
    `age` TINYINT NOT NULL COMMENT 'Character age (18-80)',
    `gender` ENUM('male', 'female') NOT NULL COMMENT 'Character gender',
    `money` INT DEFAULT 1000 COMMENT 'Cash on hand',
    `bank` INT DEFAULT 5000 COMMENT 'Bank account balance',
    `level` INT DEFAULT 1 COMMENT 'Character level',
    `exp` INT DEFAULT 0 COMMENT 'Experience points',
    `health` INT DEFAULT 100 COMMENT 'Health points',
    `armor` INT DEFAULT 0 COMMENT 'Armor points',
    `position_x` FLOAT DEFAULT -1037.7 COMMENT 'Last X coordinate',
    `position_y` FLOAT DEFAULT -2738.5 COMMENT 'Last Y coordinate',
    `position_z` FLOAT DEFAULT 20.0 COMMENT 'Last Z coordinate',
    `heading` FLOAT DEFAULT 0 COMMENT 'Last heading/rotation',
    `dimension` INT DEFAULT 0 COMMENT 'Last dimension',
    `max_weight` INT DEFAULT 50 COMMENT 'Maximum inventory weight',
    `appearance` TEXT NULL COMMENT 'JSON with character appearance data',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation timestamp',
    `last_active` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Last active timestamp',
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_name` (`name`, `surname`),
    INDEX `idx_user` (`user_id`),
    INDEX `idx_name` (`name`, `surname`),
    INDEX `idx_last_active` (`last_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Player characters';

-- ===============================================
-- TABLE: items
-- Description: Master list of all items in game
-- ===============================================
CREATE TABLE IF NOT EXISTS `items` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(50) UNIQUE NOT NULL COMMENT 'Item identifier (code)',
    `display_name` VARCHAR(100) NOT NULL COMMENT 'Display name for UI',
    `description` TEXT NULL COMMENT 'Item description',
    `type` ENUM('consumable', 'tool', 'weapon', 'resource', 'other') DEFAULT 'other' COMMENT 'Item category',
    `weight` DECIMAL(5,2) DEFAULT 0.0 COMMENT 'Weight in kg',
    `max_stack` INT DEFAULT 1 COMMENT 'Maximum stack size',
    `usable` BOOLEAN DEFAULT TRUE COMMENT 'Can be used/consumed',
    INDEX `idx_name` (`name`),
    INDEX `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Master items list';

-- Insert default items
INSERT IGNORE INTO `items` (`name`, `display_name`, `description`, `type`, `weight`, `max_stack`, `usable`) VALUES
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

-- ===============================================
-- TABLE: character_inventory
-- Description: Character inventory items
-- ===============================================
CREATE TABLE IF NOT EXISTS `character_inventory` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `character_id` INT NOT NULL COMMENT 'Reference to characters table',
    `item_id` INT NOT NULL COMMENT 'Reference to items table',
    `slot` TINYINT NOT NULL COMMENT 'Inventory slot (1-35)',
    `quantity` INT DEFAULT 1 COMMENT 'Quantity of items in stack',
    `metadata` TEXT NULL COMMENT 'JSON with item-specific data',
    FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_slot` (`character_id`, `slot`),
    INDEX `idx_character` (`character_id`),
    INDEX `idx_item` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Character inventories';

-- ===============================================
-- TABLE: bans
-- Description: Player bans (temporary and permanent)
-- ===============================================
CREATE TABLE IF NOT EXISTS `bans` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `user_id` INT NULL COMMENT 'Reference to users table (if known)',
    `social_club` VARCHAR(50) NULL COMMENT 'Social Club name',
    `ip_address` VARCHAR(45) NULL COMMENT 'IP address',
    `banned_by` INT NULL COMMENT 'Admin user_id who issued ban',
    `reason` TEXT NULL COMMENT 'Ban reason',
    `duration` INT DEFAULT 0 COMMENT 'Ban duration in minutes (0 = permanent)',
    `expires_at` DATETIME NULL COMMENT 'Ban expiration time (NULL = permanent)',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Ban creation time',
    INDEX `idx_social_club` (`social_club`),
    INDEX `idx_ip` (`ip_address`),
    INDEX `idx_expires` (`expires_at`),
    INDEX `idx_active` (`expires_at`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Player bans';

-- ===============================================
-- TABLE: admin_logs
-- Description: Admin action logs
-- ===============================================
CREATE TABLE IF NOT EXISTS `admin_logs` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `admin_id` INT NULL COMMENT 'Admin user_id',
    `action_type` VARCHAR(50) NOT NULL COMMENT 'Type of action performed',
    `target_player` VARCHAR(50) NULL COMMENT 'Target player name',
    `details` TEXT NULL COMMENT 'Action details',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Action timestamp',
    INDEX `idx_admin` (`admin_id`),
    INDEX `idx_date` (`created_at`),
    INDEX `idx_action` (`action_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Admin action logs';

-- ===============================================
-- TABLE: transactions
-- Description: Economy transaction logs
-- ===============================================
CREATE TABLE IF NOT EXISTS `transactions` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `character_id` INT NOT NULL COMMENT 'Reference to characters table',
    `transaction_type` VARCHAR(50) NOT NULL COMMENT 'Type of transaction',
    `amount` INT NOT NULL COMMENT 'Amount (positive = income, negative = expense)',
    `currency` ENUM('cash', 'bank') NOT NULL COMMENT 'Currency type',
    `description` TEXT NULL COMMENT 'Transaction description',
    `related_character_id` INT NULL COMMENT 'Related character (for transfers)',
    `admin_id` INT NULL COMMENT 'Admin user_id (for admin actions)',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Transaction timestamp',
    FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE,
    INDEX `idx_character` (`character_id`),
    INDEX `idx_type` (`transaction_type`),
    INDEX `idx_date` (`created_at`),
    INDEX `idx_amount` (`amount`),
    INDEX `idx_admin` (`admin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Transaction logs';

-- ===============================================
-- Enable foreign key checks
-- ===============================================
SET FOREIGN_KEY_CHECKS = 1;

-- ===============================================
-- VIEWS
-- ===============================================

-- Active bans view
CREATE OR REPLACE VIEW `active_bans` AS
SELECT 
    b.*,
    u.login,
    a.login as banned_by_login
FROM bans b
LEFT JOIN users u ON b.user_id = u.id
LEFT JOIN users a ON b.banned_by = a.id
WHERE b.expires_at IS NULL OR b.expires_at > NOW();

-- Character statistics view
CREATE OR REPLACE VIEW `character_stats` AS
SELECT 
    c.*,
    u.login,
    COALESCE(SUM(ci.quantity * i.weight), 0) as current_weight,
    COUNT(DISTINCT ci.id) as item_count
FROM characters c
JOIN users u ON c.user_id = u.id
LEFT JOIN character_inventory ci ON c.id = ci.character_id
LEFT JOIN items i ON ci.item_id = i.id
GROUP BY c.id;

-- ===============================================
-- STORED PROCEDURES
-- ===============================================

-- Procedure to clean expired bans
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS clean_expired_bans()
BEGIN
    DELETE FROM bans 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
    
    SELECT ROW_COUNT() as deleted_count;
END //
DELIMITER ;

-- ===============================================
-- EVENTS
-- ===============================================

-- Enable event scheduler
SET GLOBAL event_scheduler = ON;

-- Event to clean expired bans daily
CREATE EVENT IF NOT EXISTS `clean_bans_daily`
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 1 DAY + INTERVAL 3 HOUR)
DO CALL clean_expired_bans();

-- ===============================================
-- DATABASE INFO
-- ===============================================

SELECT 
    'GTA5 RP Database Schema v1.0.0 installed successfully!' as message,
    DATABASE() as database_name,
    COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = DATABASE()
AND table_type = 'BASE TABLE';

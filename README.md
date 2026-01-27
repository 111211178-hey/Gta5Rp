# GTA V Roleplay Server

Сервер ролевой игры для GTA V на базе RAGE:MP.

## 🎮 Особенности

- **Система аутентификации** с хешированием паролей (bcrypt)
- **Многоперсонажная система** (до 3 персонажей на аккаунт)
- **Система инвентаря** (35 слотов, стакаемые предметы)
- **Админ панель** (5 уровней администрирования)
- **Экономическая система** (наличные и банковские счета)
- **Система банов** (временные и постоянные)
- **Логирование действий** администраторов

## 📋 Требования

- **RAGE:MP Server** (последняя версия)
- **Node.js** >= 16.0.0
- **MySQL** >= 5.7 или **MariaDB** >= 10.0
- **npm** или **yarn**

## 🚀 Установка

### 1. Клонирование репозитория

```bash
git clone https://github.com/111211178-hey/Gta5Rp.git
cd Gta5Rp
```

### 2. Установка зависимостей

```bash
npm install
```

### 3. Настройка базы данных

#### Создание базы данных

```sql
CREATE DATABASE gtas_rp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gtas_rp;
```

#### Создание таблиц

```sql
-- Таблица пользователей
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    login VARCHAR(32) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    money INT DEFAULT 5000,
    bank INT DEFAULT 10000,
    level INT DEFAULT 1,
    exp INT DEFAULT 0,
    admin_level TINYINT DEFAULT 0,
    INDEX idx_login (login),
    INDEX idx_admin (admin_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица персонажей
CREATE TABLE characters (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(20) NOT NULL,
    surname VARCHAR(20) NOT NULL,
    age TINYINT NOT NULL,
    gender ENUM('male', 'female') NOT NULL,
    money INT DEFAULT 1000,
    bank INT DEFAULT 5000,
    level INT DEFAULT 1,
    exp INT DEFAULT 0,
    health INT DEFAULT 100,
    armor INT DEFAULT 0,
    position_x FLOAT DEFAULT -1037.7,
    position_y FLOAT DEFAULT -2738.5,
    position_z FLOAT DEFAULT 20.0,
    heading FLOAT DEFAULT 0,
    dimension INT DEFAULT 0,
    max_weight INT DEFAULT 50,
    appearance TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_name (name, surname),
    INDEX idx_user (user_id),
    INDEX idx_name (name, surname)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица предметов
CREATE TABLE items (
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

-- Вставка базовых предметов
INSERT INTO items (name, display_name, description, type, weight, max_stack, usable) VALUES
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

-- Таблица инвентаря персонажей
CREATE TABLE character_inventory (
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

-- Таблица банов
CREATE TABLE bans (
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

-- Таблица логов админов
CREATE TABLE admin_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT,
    action_type VARCHAR(50),
    target_player VARCHAR(50),
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin (admin_id),
    INDEX idx_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 4. Настройка переменных окружения

Скопируйте `.env.example` в `.env`:

```bash
cp .env.example .env
```

Отредактируйте `.env`:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_secure_password_here
DB_NAME=gtas_rp
DB_CONNECTION_LIMIT=10

# Server Configuration
SERVER_PORT=22005
SERVER_NAME=GTA5 RP Server

# Admin Configuration
OWNER_SOCIAL_CLUB=your_social_club_name
```

### 5. Запуск сервера

Запустите RAGE:MP сервер согласно документации RAGE:MP.

## 🔧 Конфигурация

Настройки сервера находятся в файле `/packages/config.js`:

- **Лимиты персонажей**: Максимум 3 персонажа на аккаунт
- **Инвентарь**: 35 слотов, максимальный вес 50 кг
- **Стартовые деньги**: $1,000 наличными + $5,000 в банке
- **Безопасность**: Максимум 5 попыток входа за 60 секунд

## 👮 Администрирование

### Уровни администраторов

1. **Helper** (1) - Базовые команды (kick, mute, freeze, heal, tp)
2. **Moderator** (2) - + Временные баны, управление погодой/временем
3. **Admin** (3) - + Выдача денег, объявления
4. **Senior Admin** (4) - + Постоянные баны, управление админами
5. **Owner** (5) - Полный доступ

### Команды

- `/admin` - Активация админ режима
- `/setadmin [ID] [уровень]` - Назначить администратора (только уровень 5)
- `/removeadmin [ID]` - Снять администратора (только уровень 5)
- `F3` - Открыть админ панель (после активации `/admin`)

### Команды для игроков

- `/giveitem [название] [количество]` - Выдать предмет себе (для тестирования)
- `/clearinventory` - Очистить инвентарь
- `/invinfo` - Информация об инвентаре

## 🔒 Безопасность

### Реализованная защита

✅ **Хеширование паролей** - Пароли хешируются с использованием bcrypt  
✅ **Защита от SQL-инъекций** - Все запросы параметризованы  
✅ **Ограничение попыток входа** - Максимум 5 попыток за 60 секунд  
✅ **Валидация ввода** - Проверка всех пользовательских данных  
✅ **Проверка банов** - Автоматическая проверка при входе  
✅ **Логирование действий** - Все действия админов записываются

### Рекомендации

⚠️ **Никогда не коммитьте файл `.env` в репозиторий!**  
⚠️ Используйте сильные пароли для базы данных  
⚠️ Регулярно делайте резервные копии базы данных  
⚠️ Обновляйте зависимости npm для исправления уязвимостей

## 📝 Логи

Все действия администраторов записываются в таблицу `admin_logs`:

- Действия с игроками (кик, бан, телепорт)
- Выдача/снятие денег
- Спавн транспорта
- Изменение погоды/времени
- Назначение/снятие администраторов

## 🐛 Отладка

### Проблемы с подключением к БД

1. Проверьте правильность данных в `.env`
2. Убедитесь, что MySQL сервер запущен
3. Проверьте права доступа пользователя БД

### Проблемы с авторизацией

1. Убедитесь, что пароли были хешированы (новые регистрации)
2. Старые аккаунты с незашифрованными паролями не будут работать
3. Пересоздайте тестовые аккаунты

## 🤝 Разработка

### Структура проекта

```
Gta5Rp/
├── packages/           # Серверные модули
│   ├── admin/         # Система администрирования
│   ├── gamemode/      # Основная логика игры
│   ├── inventory/     # Система инвентаря
│   ├── config.js      # Конфигурация сервера
│   ├── database.js    # Подключение к БД
│   └── security.js    # Утилиты безопасности
├── client_packages/   # Клиентские скрипты
│   ├── cef/          # CEF интерфейсы
│   └── index.js      # Главный клиентский скрипт
├── .env              # Переменные окружения (не коммитить!)
├── .env.example      # Пример конфигурации
├── package.json      # Зависимости npm
└── README.md         # Документация
```

### Добавление новых предметов

1. Добавьте предмет в таблицу `items`
2. Реализуйте логику использования в `/packages/inventory/index.js`
3. Добавьте иконку в CEF интерфейс

### Добавление новых админ команд

1. Добавьте разрешение в `ADMIN_PERMISSIONS` (`/packages/admin/index.js`)
2. Создайте обработчик события
3. Добавьте логирование через `logAdminAction()`

## 📄 Лицензия

MIT

## ⚠️ Дисклеймер

Этот проект предназначен только для образовательных целей. Убедитесь, что вы соблюдаете правила использования RAGE:MP и законодательство вашей страны.

## 🔗 Полезные ссылки

- [RAGE:MP Wiki](https://wiki.rage.mp/)
- [RAGE:MP Forums](https://rage.mp/forums/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [MySQL Documentation](https://dev.mysql.com/doc/)

# Руководство по установке GTA5 RP Server

## Содержание
1. [Требования](#требования)
2. [Установка RAGE:MP](#установка-ragemp)
3. [Настройка базы данных](#настройка-базы-данных)
4. [Установка проекта](#установка-проекта)
5. [Конфигурация](#конфигурация)
6. [Первый запуск](#первый-запуск)
7. [Создание первого администратора](#создание-первого-администратора)
8. [Решение проблем](#решение-проблем)

## Требования

### Системные требования
- **ОС**: Windows Server 2012+ или Linux (Ubuntu 18.04+)
- **RAM**: Минимум 2 GB, рекомендуется 4 GB+
- **CPU**: 2 ядра или больше
- **Диск**: Минимум 5 GB свободного места

### Программное обеспечение
- **Node.js**: версия 16.0.0 или выше
- **MySQL**: версия 5.7+ или **MariaDB**: версия 10.0+
- **RAGE:MP Server**: последняя стабильная версия

## Установка RAGE:MP

### Windows

1. Скачайте RAGE:MP Server с официального сайта:
   ```
   https://rage.mp/
   ```

2. Распакуйте архив в папку (например, `C:\RAGEMP\`)

3. Структура должна выглядеть так:
   ```
   C:\RAGEMP\
   ├── ragemp-server.exe
   ├── conf.json
   ├── client_packages\
   ├── packages\
   └── ...
   ```

### Linux

1. Скачайте RAGE:MP Server для Linux

2. Распакуйте:
   ```bash
   tar -xzf ragemp-server-linux.tar.gz
   cd ragemp-server
   ```

3. Дайте права на выполнение:
   ```bash
   chmod +x ragemp-server
   ```

## Настройка базы данных

### 1. Установка MySQL/MariaDB

#### Windows
- Скачайте и установите MySQL Community Server с официального сайта
- Во время установки запомните root пароль

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install mysql-server
sudo mysql_secure_installation
```

### 2. Создание базы данных

Войдите в MySQL:
```bash
mysql -u root -p
```

Выполните команды:
```sql
CREATE DATABASE gtas_rp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'ragemp'@'localhost' IDENTIFIED BY 'your_secure_password';

GRANT ALL PRIVILEGES ON gtas_rp.* TO 'ragemp'@'localhost';

FLUSH PRIVILEGES;

EXIT;
```

### 3. Импорт схемы

Вернитесь в папку проекта и выполните:
```bash
mysql -u ragemp -p gtas_rp < database_schema.sql
```

Или используйте скрипт миграции:
```bash
mysql -u ragemp -p gtas_rp < database_migration.sql
```

## Установка проекта

### 1. Клонирование репозитория

```bash
git clone https://github.com/111211178-hey/Gta5Rp.git
cd Gta5Rp
```

### 2. Установка зависимостей

```bash
npm install
```

Это установит:
- `bcrypt` - для хеширования паролей
- `dotenv` - для управления переменными окружения
- `mysql2` - драйвер MySQL
- `validator` - для валидации данных

### 3. Копирование файлов в RAGE:MP сервер

#### Windows (PowerShell)
```powershell
# Копируем серверные пакеты
Copy-Item -Path .\packages\* -Destination C:\RAGEMP\packages\ -Recurse -Force

# Копируем клиентские пакеты  
Copy-Item -Path .\client_packages\* -Destination C:\RAGEMP\client_packages\ -Recurse -Force

# Копируем node_modules
Copy-Item -Path .\node_modules -Destination C:\RAGEMP\ -Recurse -Force
```

#### Linux (Bash)
```bash
# Замените /path/to/ragemp на ваш путь
cp -r packages/* /path/to/ragemp/packages/
cp -r client_packages/* /path/to/ragemp/client_packages/
cp -r node_modules /path/to/ragemp/
```

## Конфигурация

### 1. Создание .env файла

```bash
cp .env.example .env
```

Откройте `.env` в текстовом редакторе и настройте:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=ragemp
DB_PASSWORD=your_secure_password
DB_NAME=gtas_rp
DB_CONNECTION_LIMIT=10

# Server Configuration
SERVER_PORT=22005
SERVER_NAME=My GTA5 RP Server

# Admin Configuration
OWNER_SOCIAL_CLUB=YourSocialClubName
```

**ВАЖНО**: Замените `your_secure_password` на реальный пароль!

### 2. Копирование .env в папку RAGE:MP

```bash
# Windows
copy .env C:\RAGEMP\.env

# Linux
cp .env /path/to/ragemp/.env
```

### 3. Настройка conf.json

Отредактируйте `conf.json` в папке RAGE:MP сервера:

```json
{
  "announce": true,
  "bind": "0.0.0.0",
  "gamemode": "Roleplay",
  "encryption": true,
  "maxplayers": 100,
  "name": "My GTA5 RP Server",
  "stream-distance": 500.0,
  "port": 22005,
  "disallow-multiple-connections-per-ip": true,
  "limit-time-of-connections-per-ip": 5,
  "url": "",
  "language": "ru",
  "sync-rate": 40,
  "resource-scan-thread-limit": 0,
  "max-ping": 150,
  "min-fps": 30,
  "max-packet-loss": 0.2,
  "allow-cef-debugging": false,
  "enable-nodejs": true,
  "csharp": "disabled"
}
```

**Ключевые параметры**:
- `enable-nodejs`: **ОБЯЗАТЕЛЬНО** должно быть `true`!
- `csharp`: установите `disabled` если не используете C#
- `maxplayers`: настройте под ваш сервер

## Первый запуск

### 1. Запуск сервера

#### Windows
```cmd
cd C:\RAGEMP
ragemp-server.exe
```

#### Linux
```bash
cd /path/to/ragemp
./ragemp-server
```

### 2. Проверка логов

В консоли должны появиться сообщения:
```
[Database] ✅ База данных gtas_rp подключена успешно!
[Database] ✅ Модуль базы данных экспортирован
[Inventory System] ✅ Система инвентаря загружена успешно!
[Admin System] ✅ Система администрирования загружена успешно!
[Server] ✅ Игровой режим загружен успешно!
[Transactions] ✅ Transaction system initialized
```

Если видите ошибки подключения к БД:
- Проверьте правильность данных в `.env`
- Убедитесь, что MySQL запущен
- Проверьте права пользователя БД

## Создание первого администратора

### Метод 1: Через базу данных

1. Зарегистрируйтесь на сервере через игру

2. Войдите в MySQL:
   ```bash
   mysql -u ragemp -p gtas_rp
   ```

3. Установите админ уровень:
   ```sql
   UPDATE users SET admin_level = 5 WHERE login = 'YourLogin';
   EXIT;
   ```

### Метод 2: Через консоль сервера (после входа в игру)

1. Зайдите на сервер
2. В консоли сервера найдите ваш ID (обычно выводится при подключении)
3. Остановите сервер
4. Обновите БД как в Методе 1
5. Запустите сервер снова

### Метод 3: Через команду (требуется временный admin_level 5)

После того как у вас есть admin_level 5, вы можете назначать других:
```
/setadmin [ID игрока] [уровень 1-5]
```

## Проверка установки

### 1. Подключение к серверу

Запустите GTA V и RAGE:MP клиент:
1. Откройте RAGE:MP Launcher
2. Нажмите "Direct Connect"
3. Введите: `127.0.0.1:22005` (для локального сервера)
4. Нажмите "Connect"

### 2. Тест регистрации

1. На экране авторизации нажмите "Регистрация"
2. Введите логин и пароль (минимум 6 символов)
3. После успешной регистрации должен открыться выбор персонажей

### 3. Тест создания персонажа

1. Нажмите "Создать персонажа"
2. Заполните данные:
   - Имя: только буквы, 2-20 символов
   - Фамилия: только буквы, 2-20 символов
   - Возраст: 18-80 лет
   - Пол: male или female
3. Настройте внешность
4. Нажмите "Создать"

### 4. Тест админ панели

1. Войдите в игру
2. Откройте консоль (F8) и введите: `/admin`
3. Нажмите F3 для открытия админ панели
4. Проверьте доступные функции

## Решение проблем

### Ошибка "Cannot find module"

**Проблема**: Не найдены зависимости npm

**Решение**:
```bash
cd /path/to/ragemp
npm install
```

### Ошибка подключения к БД

**Проблема**: `Error: Access denied for user`

**Решение**:
1. Проверьте правильность данных в `.env`
2. Проверьте права пользователя:
   ```sql
   SHOW GRANTS FOR 'ragemp'@'localhost';
   ```
3. Если нужно, пересоздайте пользователя

### Пароли не работают после обновления

**Проблема**: Старые пароли в открытом виде

**Решение**:
1. Выполните миграцию: `mysql -u ragemp -p gtas_rp < database_migration.sql`
2. Попросите пользователей зарегистрироваться заново
3. Или установите временные пароли через скрипт

### Сервер не запускается

**Проблема**: Ошибки в conf.json

**Решение**:
1. Проверьте синтаксис JSON на [jsonlint.com](https://jsonlint.com/)
2. Убедитесь что `enable-nodejs: true`
3. Проверьте что порт не занят: `netstat -an | grep 22005`

### Админ команды не работают

**Проблема**: Нет прав или не активирована система

**Решение**:
1. Проверьте admin_level в БД: `SELECT login, admin_level FROM users;`
2. В игре введите `/admin` для активации
3. Проверьте логи сервера на ошибки

## Дополнительные настройки

### Автозапуск (Linux)

Создайте systemd service:
```bash
sudo nano /etc/systemd/system/ragemp.service
```

Содержимое:
```ini
[Unit]
Description=RAGE:MP GTA5 RP Server
After=network.target mysql.service

[Service]
Type=simple
User=ragemp
WorkingDirectory=/path/to/ragemp
ExecStart=/path/to/ragemp/ragemp-server
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Активация:
```bash
sudo systemctl enable ragemp
sudo systemctl start ragemp
```

### Резервное копирование

Создайте скрипт для бекапа БД:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u ragemp -p'your_password' gtas_rp > backup_$DATE.sql
find . -name "backup_*.sql" -mtime +7 -delete
```

Добавьте в cron:
```bash
crontab -e
# Добавьте строку (бекап каждый день в 3:00)
0 3 * * * /path/to/backup_script.sh
```

## Полезные команды

### MySQL
```sql
-- Просмотр всех пользователей
SELECT id, login, admin_level, last_login FROM users;

-- Просмотр персонажей пользователя
SELECT * FROM characters WHERE user_id = 1;

-- Очистка банов
DELETE FROM bans WHERE expires_at < NOW();

-- Топ самых богатых
SELECT name, surname, money + bank as total FROM characters ORDER BY total DESC LIMIT 10;
```

### Консоль сервера
```
players - список игроков
kick [id] - кикнуть игрока
say [message] - сообщение всем
stop - остановить сервер
```

## Следующие шаги

1. Настройте точки спавна и локации
2. Добавьте работы и фракции
3. Настройте экономику (зарплаты, цены)
4. Создайте правила сервера
5. Настройте Discord интеграцию
6. Добавьте whitelist если нужен

---

**Нужна помощь?**
- RAGE:MP Wiki: https://wiki.rage.mp/
- RAGE:MP Forums: https://rage.mp/forums/
- Документация Node.js: https://nodejs.org/docs/

**Безопасность:**
- Регулярно обновляйте npm пакеты
- Делайте резервные копии БД
- Используйте сильные пароли
- Не публикуйте .env файл!

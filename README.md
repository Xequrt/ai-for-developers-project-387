### Hexlet tests and linter status:
[![Actions Status](https://github.com/Xequrt/ai-for-developers-project-387/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/Xequrt/ai-for-developers-project-387/actions)

### Приложение:
https://calendar-booking-app-9g9h.onrender.com

---

# Calendar — сервис записи на встречи

Веб-приложение для быстрой записи на встречи. Гость выбирает тип события, находит свободный слот в календаре и подтверждает бронирование. Владелец управляет типами событий и видит предстоящие встречи через защищённую панель администратора.

## Стек

| Слой | Технологии |
|------|-----------|
| Бэкенд | Python 3.12, FastAPI, Pydantic v2 |
| Фронтенд | React 18, TypeScript, Vite, Mantine UI 7, Motion |
| API-контракт | TypeSpec → OpenAPI 3.0 |
| Хранилище | SQLite (SQLAlchemy 2.0) |
| Аутентификация | JWT (python-jose) + bcrypt |
| Юнит-тесты | pytest (60 тестов) |
| E2E-тесты | Playwright (Chromium) |
| CI | GitHub Actions |

## Быстрый старт

### Установка зависимостей

```bash
make install
```

### Настройка окружения

1. Скопируйте шаблон конфигурации:
```bash
cp backend/.env.example backend/.env
```

2. Отредактируйте `backend/.env` и установите секретный ключ:
```env
JWT_SECRET_KEY=your-secret-key-min-32-chars-long
```

### Конфигурация через .env файл

| Переменная | Описание | Обязательная | По умолчанию |
|------------|----------|--------------|--------------|
| `APP_ENV` | Окружение: `development` или `production` | Нет | `development` |
| `JWT_SECRET_KEY` | Секретный ключ для JWT токенов | Только в `production` | — |
| `JWT_EXPIRE_DAYS` | Срок действия токена в днях | Нет | `7` |
| `DATABASE_URL` | URL базы данных | Нет | `sqlite:///./calendar.db` |
| `CORS_ORIGINS` | Разрешённые CORS origins (через запятую) | Нет | `http://localhost:5173` |

### Запуск

Бэкенд и фронтенд одновременно:

```bash
make dev

```

Или по отдельности:

```bash
make dev-backend    # FastAPI на http://localhost:8000
make dev-frontend   # Vite на http://localhost:5173
```

### Тесты

```bash
make test             # все тесты бэкенда (60 тестов)
make test-verbose     # с подробным выводом

make test-owner       # тесты владельца
make test-guest       # тесты гостя
make test-occupancy   # тесты правила занятости
make test-e2e         # e2e тесты (Playwright, нужен запущенный dev-сервер)

```

E2E тесты покрывают:
- полный путь бронирования (гость)
- создание типа события (владелец)
- правило занятости слота (409 при повторном бронировании)

### TypeSpec → OpenAPI

```bash
make typespec-compile
```

## Маршруты фронтенда

### Публичные маршруты
| Путь | Страница | Описание |
|------|----------|----------|
| `/` | Лендинг | Главная страница |
| `/book` | Выбор типа события | Список доступных типов встреч |
| `/book/:eventTypeId` | Календарь и слоты | Выбор даты и времени |
| `/confirm` | Форма бронирования | Подтверждение записи |
| `/login` | Вход | Авторизация пользователя |
| `/register` | Регистрация | Создание нового аккаунта |

### Защищённые маршруты (требуют авторизации)
| Путь | Страница | Описание |
|------|----------|----------|
| `/admin` | Панель владельца | Управление типами событий и бронированиями |

## API

Документация доступна после запуска бэкенда: [http://localhost:8000/docs](http://localhost:8000/docs)

### Публичные эндпоинты (без авторизации)

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/api/v1/event-types` | GET | Список типов событий |
| `/api/v1/available-slots` | GET | Доступные слоты на дату |
| `/api/v1/available-slots/summary` | GET | Сводка слотов по месяцу |
| `/api/v1/bookings` | POST | Создание бронирования |
| `/api/v1/auth/register` | POST | Регистрация нового пользователя |
| `/api/v1/auth/login` | POST | Вход (устанавливает httpOnly cookie) |

### Защищённые эндпоинты (требуют авторизации)

Аутентификация через httpOnly cookie `auth_token` (устанавливается при логине) или заголовок `Authorization: Bearer <token>`.

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/api/v1/auth/me` | GET | Профиль текущего пользователя |
| `/api/v1/auth/me` | PUT | Обновление профиля (JSON-тело) |
| `/api/v1/owner/profile` | GET | Профиль владельца |
| `/api/v1/owner/event-types` | POST | Создание типа события |
| `/api/v1/owner/event-types/:id` | GET / PUT / DELETE | CRUD типа события |
| `/api/v1/owner/bookings/upcoming` | GET | Предстоящие бронирования |
| `/api/v1/owner/bookings/:id` | GET / DELETE | Просмотр и отмена бронирования |

### Дефолтный пользователь

При первом запуске создаётся пользователь-владелец:
- Username: `owner`
- Email: `owner@calendar.app`
- Пароль: `Changeme1`

## CI

GitHub Actions запускает e2e тесты при каждом пуше в `develop` и `main`, а также при открытии PR в `main`. При падении тестов сохраняется Playwright-отчёт как артефакт.


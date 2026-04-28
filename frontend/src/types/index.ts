/**
 * Типы и интерфейсы для системы бронирования «Calendar of Calls»
 *
 * Стек: React + TypeScript + Vite + Mantine
 * API-контракт: TypeSpec → OpenAPI 3.0
 */

// ─────────────────────────────────────────────
// Скалярные алиасы
// ─────────────────────────────────────────────

/** UUID v4 идентификатор (формат: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx) */
export type UUID = string;

/** ISO 8601 дата-время в UTC (например, "2026-03-15T09:00:00.000Z") */
export type DateTime = string;

/**
 * Время в формате HH:MM (например, "09:00", "18:30")
 * Используется для задания рабочих часов владельца
 */
export type TimeString = string;

/**
 * Дата в формате YYYY-MM-DD (например, "2026-03-15")
 * Используется в запросах к API и в состоянии календаря
 */
export type DateString = string;

// ─────────────────────────────────────────────
// Доменные модели
// ─────────────────────────────────────────────

/**
 * Тип события, создаваемый владельцем календаря.
 * Определяет название, описание и длительность встречи.
 *
 * Правила валидации:
 * - id: UUID v4 формат
 * - name: 1–100 символов, не пустая строка
 * - description: 0–500 символов
 * - durationMinutes: положительное целое число, кратное 15 (15, 30, 45, 60, ...)
 * - createdAt: ISO 8601 формат
 */
export interface EventType {
  /** Уникальный идентификатор типа события (UUID v4) */
  id: UUID;
  /** Название типа события (1–100 символов) */
  name: string;
  /** Описание события (0–500 символов) */
  description: string;
  /**
   * Длительность встречи в минутах.
   * Должна быть положительным числом, кратным 15 (15, 30, 45, 60, ...)
   */
  durationMinutes: number;
  /** Дата и время создания записи (ISO 8601 UTC) */
  createdAt: DateTime;
}

/**
 * Статус бронирования.
 * - confirmed: бронирование подтверждено и активно
 * - cancelled: бронирование отменено владельцем
 */
export enum BookingStatus {
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
}

/**
 * Бронирование временного слота гостем.
 * Ключевое правило: на одно время может быть только одно бронирование
 * независимо от типа события.
 *
 * Правила валидации:
 * - id: UUID v4 формат
 * - eventTypeId: должен существовать в системе
 * - startTime: ISO 8601, не в прошлом, в пределах рабочих часов
 * - endTime: ISO 8601, после startTime; разница = durationMinutes типа события
 * - guestName: 1–100 символов
 * - guestEmail: валидный email формат (RFC 5322)
 * - guestPhone: опционально, формат E.164 если указан (например, "+79001234567")
 * - notes: 0–1000 символов
 * - status: одно из значений BookingStatus
 */
export interface Booking {
  /** Уникальный идентификатор бронирования (UUID v4) */
  id: UUID;
  /** Ссылка на тип события (UUID v4) */
  eventTypeId: UUID;
  /** Начало встречи (ISO 8601 UTC) */
  startTime: DateTime;
  /** Конец встречи (ISO 8601 UTC); endTime - startTime = durationMinutes */
  endTime: DateTime;
  /** Имя гостя (1–100 символов) */
  guestName: string;
  /** Email гостя (валидный формат RFC 5322) */
  guestEmail: string;
  /** Телефон гостя в формате E.164 (опционально, например "+79001234567") */
  guestPhone?: string;
  /** Заметки гостя (0–1000 символов, опционально) */
  notes?: string;
  /** Текущий статус бронирования */
  status: BookingStatus;
  /** Дата и время создания записи (ISO 8601 UTC) */
  createdAt: DateTime;
  /** Встреча идёт прямо сейчас */
  isOngoing?: boolean;
}

/**
 * Временной слот для отображения доступности в панели «Статус слотов».
 * Отображается в формате "HH:MM – HH:MM" со статусом «Свободно» / «Занято».
 *
 * Правила:
 * - startTime < endTime
 * - Если available = false, bookingId содержит ID занимающего бронирования
 */
export interface TimeSlot {
  /** Начало слота (ISO 8601 UTC) */
  startTime: DateTime;
  /** Конец слота (ISO 8601 UTC) */
  endTime: DateTime;
  /** Доступен ли слот для бронирования */
  available: boolean;
  /** ID бронирования, если слот занят (UUID v4) */
  bookingId?: UUID;
}

/**
 * Количество свободных слотов для конкретной даты.
 * Используется для отображения счётчиков под датами в сетке календаря
 * (например, «33 св.», «35 св.»).
 *
 * Правила:
 * - date: формат YYYY-MM-DD
 * - availableCount: неотрицательное целое число
 */
export interface DayAvailability {
  /** Дата в формате YYYY-MM-DD */
  date: DateString;
  /** Количество свободных слотов на эту дату */
  availableCount: number;
}

/**
 * Расписание одного дня недели.
 * Если enabled = false, день считается нерабочим и слоты не генерируются.
 *
 * Правила:
 * - startTime и endTime: формат HH:MM
 * - startTime < endTime (если enabled = true)
 */
export interface DaySchedule {
  /** Является ли день рабочим */
  enabled: boolean;
  /** Начало рабочего дня (HH:MM, например "09:00") */
  startTime: TimeString;
  /** Конец рабочего дня (HH:MM, например "18:00") */
  endTime: TimeString;
}

/**
 * Рабочие часы владельца по дням недели.
 * Используется для генерации доступных слотов.
 * Каждый день может быть включён или отключён независимо.
 */
export interface WorkingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

/**
 * Профиль владельца календаря (предустановленный, единственный).
 * Владелец создаёт типы событий и просматривает предстоящие встречи.
 *
 * Правила:
 * - id: фиксированный UUID v4
 * - email: валидный email формат
 * - timezone: формат IANA (например, "Europe/Moscow", "UTC")
 */
export interface Owner {
  /** Фиксированный UUID владельца */
  id: UUID;
  /** Имя владельца (отображается в шапке страниц бронирования) */
  name: string;
  /** Email владельца (валидный формат RFC 5322) */
  email: string;
  /** Часовой пояс в формате IANA (например, "Europe/Moscow") */
  timezone: string;
  /** Рабочие часы по дням недели */
  workingHours: WorkingHours;
}

// ─────────────────────────────────────────────
// Request / Response типы
// ─────────────────────────────────────────────

/**
 * Тело запроса на создание нового типа события.
 * POST /api/v1/owner/event-types
 *
 * Правила валидации:
 * - name: 1–100 символов
 * - description: 0–500 символов
 * - durationMinutes: положительное целое, кратное 15
 */
export interface CreateEventTypeRequest {
  /** Пользовательский идентификатор типа события */
  id: string;
  /** Название типа события (1–100 символов) */
  name: string;
  /** Описание события (0–500 символов) */
  description: string;
  /**
   * Длительность встречи в минутах.
   * Допустимые значения: 15, 30, 45, 60, 75, 90, ...
   */
  durationMinutes: number;
}

/**
 * Тело запроса на обновление типа события.
 * PUT /api/v1/owner/event-types/:id
 * Все поля опциональны — передаются только изменяемые.
 *
 * Правила валидации (для переданных полей):
 * - name: 1–100 символов
 * - description: 0–500 символов
 * - durationMinutes: положительное целое, кратное 15
 */
export interface UpdateEventTypeRequest {
  /** Новое название (1–100 символов) */
  name?: string;
  /** Новое описание (0–500 символов) */
  description?: string;
  /** Новая длительность в минутах (кратно 15) */
  durationMinutes?: number;
}

/**
 * Тело запроса на создание бронирования гостем.
 * POST /api/v1/bookings
 *
 * Правила валидации:
 * - eventTypeId: должен существовать в системе
 * - startTime: ISO 8601, не в прошлом, в пределах рабочих часов
 * - guestName: 1–100 символов
 * - guestEmail: валидный email формат (RFC 5322)
 * - guestPhone: опционально, формат E.164
 * - notes: 0–1000 символов
 */
export interface CreateBookingRequest {
  /** ID типа события (UUID v4) */
  eventTypeId: UUID;
  /** Желаемое время начала встречи (ISO 8601 UTC) */
  startTime: DateTime;
  /** Имя гостя (1–100 символов) */
  guestName: string;
  /** Email гостя (валидный формат RFC 5322) */
  guestEmail: string;
  /** Телефон гостя в формате E.164 (опционально) */
  guestPhone?: string;
  /** Заметки к встрече (0–1000 символов, опционально) */
  notes?: string;
}

/**
 * Пагинированный список бронирований.
 * Используется в ответе GET /api/v1/owner/bookings/upcoming
 */
export interface PaginatedBookings {
  /** Массив бронирований на текущей странице */
  items: Booking[];
  /** Общее количество бронирований */
  total: number;
  /** Максимальное количество элементов на странице */
  limit: number;
  /** Смещение от начала списка */
  offset: number;
}

/**
 * Стандартный ответ об ошибке от API.
 *
 * Коды ошибок:
 * - SLOT_OCCUPIED: слот уже занят (409)
 * - EVENT_TYPE_NOT_FOUND: тип события не найден (404)
 * - VALIDATION_ERROR: ошибка валидации данных (400)
 */
export interface ErrorResponse {
  error: {
    /** Машиночитаемый код ошибки (например, "SLOT_OCCUPIED") */
    code: string;
    /** Человекочитаемое сообщение об ошибке */
    message: string;
    /** Дополнительные детали ошибки (опционально) */
    details?: Record<string, unknown>;
  };
}

// ─────────────────────────────────────────────
// UI State — публичный сценарий гостя
// ─────────────────────────────────────────────

/**
 * Состояние страницы выбора слота (/book/:eventTypeId).
 *
 * Публичный сценарий гостя:
 * 1. Гость открывает /book → видит список типов событий (EventType[])
 * 2. Гость выбирает тип события → переходит на /book/:eventTypeId
 * 3. Гость выбирает дату в календаре → selectedDate обновляется,
 *    загружаются слоты (TimeSlot[]) для этой даты
 * 4. Гость выбирает слот → selectedSlot обновляется,
 *    активируется кнопка «Продолжить»
 * 5. Гость нажимает «Продолжить» → форма бронирования (CreateBookingRequest)
 * 6. Успешное бронирование → подтверждение (Booking)
 *
 * Навигация по месяцам меняет currentMonth и перезагружает
 * счётчики слотов (DayAvailability[]) для нового месяца.
 */
export interface BookingPageState {
  /** Выбранная дата в формате YYYY-MM-DD, null если не выбрана */
  selectedDate: DateString | null;
  /** Выбранный временной слот, null если не выбран */
  selectedSlot: TimeSlot | null;
  /** Отображаемый месяц в формате YYYY-MM (например, "2026-03") */
  currentMonth: string;
}

// ─────────────────────────────────────────────
// Аутентификация и пользователи
// ─────────────────────────────────────────────

/**
 * Пользователь системы (владелец календаря).
 */
export interface User {
  /** Уникальный идентификатор (UUID v4) */
  id: UUID;
  /** Имя пользователя (уникальное, для URL) */
  username: string;
  /** Email пользователя */
  email: string;
  /** Отображаемое имя */
  name: string;
  /** Часовой пояс в формате IANA */
  timezone: string;
}

/**
 * Ответ при успешном входе — JWT токен.
 */
export interface AuthToken {
  /** JWT токен для авторизации */
  access_token: string;
  /** Тип токена (всегда "bearer") */
  token_type: string;
}

/**
 * Данные для входа.
 */
export interface LoginRequest {
  /** Имя пользователя или email */
  username: string;
  /** Пароль */
  password: string;
}

/**
 * Данные для регистрации.
 */
export interface RegisterRequest {
  /** Имя пользователя (уникальное) */
  username: string;
  /** Email */
  email: string;
  /** Пароль */
  password: string;
  /** Отображаемое имя */
  name: string;
}

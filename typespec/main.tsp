import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";

using TypeSpec.Http;
using TypeSpec.Rest;

@service({
  title: "Calendar of Calls — Booking API",
  version: "1.0.0",
})
@server("http://localhost:8000", "Local development server")
namespace CalendarBooking;

// ─────────────────────────────────────────────
// Скалярные типы
// ─────────────────────────────────────────────

/** UUID v4 идентификатор */
scalar UUID extends string;

/** ISO 8601 дата-время (UTC) */
scalar DateTime extends string;

/** Время в формате HH:MM */
scalar TimeString extends string;

/** Дата в формате YYYY-MM-DD */
scalar DateString extends string;

// ─────────────────────────────────────────────
// Доменные модели
// ─────────────────────────────────────────────

/** Тип события, создаваемый владельцем календаря */
model EventType {
  /** Уникальный идентификатор */
  id: UUID;

  /** Название типа события (1–100 символов) */
  name: string;

  /** Описание события (0–500 символов) */
  description: string;

  /** Длительность встречи в минутах (кратно 15, > 0) */
  durationMinutes: int32;

  /** Дата и время создания */
  createdAt: DateTime;
}

/** Статус бронирования */
enum BookingStatus {
  confirmed: "confirmed",
  cancelled: "cancelled",
}

/** Бронирование слота гостем */
model Booking {
  /** Уникальный идентификатор */
  id: UUID;

  /** Ссылка на тип события */
  eventTypeId: UUID;

  /** Начало встречи (ISO 8601 UTC) */
  startTime: DateTime;

  /** Конец встречи (ISO 8601 UTC) */
  endTime: DateTime;

  /** Имя гостя (1–100 символов) */
  guestName: string;

  /** Email гостя */
  guestEmail: string;

  /** Телефон гостя в формате E.164 (опционально) */
  guestPhone?: string;

  /** Заметки гостя (0–1000 символов, опционально) */
  notes?: string;

  /** Статус бронирования */
  status: BookingStatus;

  /** Дата и время создания записи */
  createdAt: DateTime;
}

/** Временной слот для отображения доступности */
model TimeSlot {
  /** Начало слота (ISO 8601 UTC) */
  startTime: DateTime;

  /** Конец слота (ISO 8601 UTC) */
  endTime: DateTime;

  /** Доступен ли слот для бронирования */
  available: boolean;

  /** ID бронирования, если слот занят */
  bookingId?: UUID;
}

/** Количество свободных слотов для конкретной даты (для счётчика в календаре) */
model DayAvailability {
  /** Дата в формате YYYY-MM-DD */
  date: DateString;

  /** Количество свободных слотов */
  availableCount: int32;
}

/** Расписание одного дня */
model DaySchedule {
  /** Является ли день рабочим */
  enabled: boolean;

  /** Начало рабочего дня (HH:MM) */
  startTime: TimeString;

  /** Конец рабочего дня (HH:MM) */
  endTime: TimeString;
}

/** Рабочие часы владельца по дням недели */
model WorkingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

/** Профиль владельца календаря (предустановленный) */
model Owner {
  /** Фиксированный UUID владельца */
  id: UUID;

  /** Имя владельца */
  name: string;

  /** Email владельца */
  email: string;

  /** Часовой пояс в формате IANA (например, "Europe/Moscow") */
  timezone: string;

  /** Рабочие часы */
  workingHours: WorkingHours;
}

// ─────────────────────────────────────────────
// Request / Response модели
// ─────────────────────────────────────────────

/** Тело запроса на создание типа события */
model CreateEventTypeRequest {
  /** Название (1–100 символов) */
  name: string;

  /** Описание (0–500 символов) */
  description: string;

  /** Длительность в минутах (кратно 15, > 0) */
  durationMinutes: int32;
}

/** Тело запроса на обновление типа события (все поля опциональны) */
model UpdateEventTypeRequest {
  name?: string;
  description?: string;
  durationMinutes?: int32;
}

/** Тело запроса на создание бронирования */
model CreateBookingRequest {
  /** ID типа события */
  eventTypeId: UUID;

  /** Желаемое время начала (ISO 8601 UTC) */
  startTime: DateTime;

  /** Имя гостя */
  guestName: string;

  /** Email гостя */
  guestEmail: string;

  /** Телефон гостя (опционально) */
  guestPhone?: string;

  /** Заметки (опционально) */
  notes?: string;
}

/** Пагинированный список бронирований */
model PaginatedBookings {
  items: Booking[];
  total: int32;
  limit: int32;
  offset: int32;
}

/** Стандартный ответ об ошибке */
model ErrorResponse {
  error: {
    /** Машиночитаемый код ошибки */
    code: string;

    /** Человекочитаемое сообщение */
    message: string;

    /** Дополнительные детали (опционально) */
    details?: Record<unknown>;
  };
}

// ─────────────────────────────────────────────
// Публичные эндпоинты (гость)
// ─────────────────────────────────────────────

@route("/api/v1")
namespace Public {

  /** Получить список всех типов событий */
  @route("/event-types")
  @get
  op listEventTypes(): EventType[];

  /**
   * Получить доступные слоты для выбранного типа события и даты.
   * Если дата является нерабочим днём (workingHours.enabled = false),
   * возвращается пустой массив [].
   * Слоты в прошлом не включаются в ответ.
   */
  @route("/available-slots")
  @get
  op getAvailableSlots(
    @query eventTypeId: UUID,
    @query date: DateString,
  ): TimeSlot[] | {
    /** Тип события не найден */
    @statusCode statusCode: 404;
    @body error: ErrorResponse;
  };

  /**
   * Получить сводку по количеству свободных слотов на каждый день месяца.
   * Нерабочие дни возвращаются с availableCount = 0.
   * Используется для счётчиков под датами в календаре.
   */
  @route("/available-slots/summary")
  @get
  op getAvailableSlotsSummary(
    @query eventTypeId: UUID,
    @query month: string,
  ): DayAvailability[] | {
    /** Тип события не найден */
    @statusCode statusCode: 404;
    @body error: ErrorResponse;
  };

  /**
   * Создать бронирование на выбранный слот.
   * Правило занятости: на одно время может быть только одно бронирование
   * независимо от типа события.
   * Граничные случаи:
   * - startTime в прошлом → 400 VALIDATION_ERROR
   * - несуществующий eventTypeId → 404 EVENT_TYPE_NOT_FOUND
   * - слот уже занят → 409 SLOT_OCCUPIED
   */
  @route("/bookings")
  @post
  op createBooking(
    @body body: CreateBookingRequest,
  ): {
    @statusCode statusCode: 201;
    @body booking: Booking;
  } | {
    /** Ошибка валидации: startTime в прошлом, невалидный email, пустое имя и т.д. */
    @statusCode statusCode: 400;
    @body error: ErrorResponse;
  } | {
    /** Тип события не найден (EVENT_TYPE_NOT_FOUND) */
    @statusCode statusCode: 404;
    @body error: ErrorResponse;
  } | {
    /** Слот уже занят (SLOT_OCCUPIED) — пересечение с существующим бронированием */
    @statusCode statusCode: 409;
    @body error: ErrorResponse;
  };
}

// ─────────────────────────────────────────────
// Эндпоинты владельца
// ─────────────────────────────────────────────

@route("/api/v1/owner")
namespace OwnerApi {

  /** Получить профиль владельца */
  @route("/profile")
  @get
  op getProfile(): Owner;

  // ── Управление типами событий ──

  /** Создать новый тип события */
  @route("/event-types")
  @post
  op createEventType(
    @body body: CreateEventTypeRequest,
  ): {
    @statusCode statusCode: 201;
    @body eventType: EventType;
  } | {
    @statusCode statusCode: 400;
    @body error: ErrorResponse;
  };

  /** Получить тип события по ID */
  @route("/event-types/{id}")
  @get
  op getEventType(@path id: UUID): EventType | {
    @statusCode statusCode: 404;
    @body error: ErrorResponse;
  };

  /** Обновить тип события */
  @route("/event-types/{id}")
  @put
  op updateEventType(
    @path id: UUID,
    @body body: UpdateEventTypeRequest,
  ): EventType | {
    @statusCode statusCode: 404;
    @body error: ErrorResponse;
  } | {
    @statusCode statusCode: 400;
    @body error: ErrorResponse;
  };

  /** Удалить тип события */
  @route("/event-types/{id}")
  @delete
  op deleteEventType(@path id: UUID): {
    @statusCode statusCode: 204;
  } | {
    @statusCode statusCode: 404;
    @body error: ErrorResponse;
  };

  // ── Управление бронированиями ──

  /** Получить все предстоящие бронирования */
  @route("/bookings/upcoming")
  @get
  op listUpcomingBookings(
    @query limit?: int32,
    @query offset?: int32,
  ): PaginatedBookings;

  /** Получить бронирование по ID */
  @route("/bookings/{id}")
  @get
  op getBooking(@path id: UUID): Booking | {
    @statusCode statusCode: 404;
    @body error: ErrorResponse;
  };

  /** Отменить бронирование */
  @route("/bookings/{id}")
  @delete
  op cancelBooking(@path id: UUID): {
    @statusCode statusCode: 204;
  } | {
    @statusCode statusCode: 404;
    @body error: ErrorResponse;
  };
}

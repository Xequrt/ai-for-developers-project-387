import type {
  EventType,
  Owner,
  TimeSlot,
  DayAvailability,
  Booking,
  CreateBookingRequest,
  CreateEventTypeRequest,
  UpdateEventTypeRequest,
  PaginatedBookings,
} from '../types'

const BASE_URL = '/api/v1'

// Базовая функция для публичных запросов (без авторизации)
async function tryFetch<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

// Функция для защищенных запросов — токен передаётся через httpOnly cookie
async function tryFetchWithAuth<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // отправляем httpOnly cookie автоматически
  })

  if (res.status === 401) {
    throw new Error('Сессия истекла. Пожалуйста, войдите снова.')
  }

  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

export async function getEventTypes(): Promise<EventType[]> {
  return tryFetch<EventType[]>(`${BASE_URL}/event-types`)
}

export async function getAvailableSlots(
  eventTypeId: string,
  date: string,
  _durationMinutes?: number,
): Promise<TimeSlot[]> {
  return tryFetch<TimeSlot[]>(
    `${BASE_URL}/available-slots?eventTypeId=${eventTypeId}&date=${date}`,
  )
}

export async function getAvailableSlotsSummary(
  eventTypeId: string,
  month: string,
  _durationMinutes?: number,
): Promise<DayAvailability[]> {
  return tryFetch<DayAvailability[]>(
    `${BASE_URL}/available-slots/summary?eventTypeId=${eventTypeId}&month=${month}`,
  )
}

export async function createBooking(request: CreateBookingRequest): Promise<Booking> {
  const res = await fetch(`${BASE_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message ?? `Ошибка ${res.status}`)
  }
  return res.json() as Promise<Booking>
}

export async function getOwnerProfile(): Promise<Owner> {
  return tryFetchWithAuth<Owner>(`${BASE_URL}/owner/profile`)
}

export async function getUpcomingBookings(limit = 100, offset = 0): Promise<PaginatedBookings> {
  return tryFetchWithAuth<PaginatedBookings>(
    `${BASE_URL}/owner/bookings/upcoming?limit=${limit}&offset=${offset}`,
  )
}

export async function createEventType(request: CreateEventTypeRequest): Promise<EventType> {
  const res = await tryFetchWithAuth(`${BASE_URL}/owner/event-types`, {
    method: 'POST',
    body: JSON.stringify(request),
  })
  return res as EventType
}

export async function updateEventType(id: string, request: UpdateEventTypeRequest): Promise<EventType> {
  const res = await tryFetchWithAuth(`${BASE_URL}/owner/event-types/${id}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  })
  return res as EventType
}

export async function deleteEventType(id: string): Promise<void> {
  await tryFetchWithAuth(`${BASE_URL}/owner/event-types/${id}`, {
    method: 'DELETE',
  })
}

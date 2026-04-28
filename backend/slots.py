"""
Логика генерации временных слотов на основе рабочих часов владельца.
Рабочие часы — локальное время без timezone-конвертации.
"""
from datetime import date, datetime, timedelta, timezone
from models import DaySchedule, TimeSlot, WorkingHours

DAY_MAP = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


def get_day_schedule(working_hours: WorkingHours, weekday: int) -> DaySchedule:
    """weekday: 0=Monday … 6=Sunday"""
    return getattr(working_hours, DAY_MAP[weekday])


def generate_slots(
    date_str: str,
    duration_minutes: int,
    working_hours: WorkingHours,
    booked_intervals: list[tuple[datetime, datetime, str]],
    owner_timezone: str = "UTC",
) -> list[TimeSlot]:
    d = date.fromisoformat(date_str)
    schedule = get_day_schedule(working_hours, d.weekday())

    if not schedule.enabled:
        return []

    start_h, start_m = map(int, schedule.startTime.split(":"))
    end_h, end_m = map(int, schedule.endTime.split(":"))

    # Наивные datetime без timezone — рабочие часы как есть
    day_start = datetime(d.year, d.month, d.day, start_h, start_m)
    day_end = datetime(d.year, d.month, d.day, end_h, end_m)

    # Текущее время тоже без timezone для сравнения
    now = datetime.now()

    slots: list[TimeSlot] = []
    current = day_start

    while current < day_end:
        slot_end = current + timedelta(minutes=duration_minutes)
        if slot_end > day_end:
            break

        # Пропускаем слоты, начало которых в прошлом
        if current <= now:
            current += timedelta(minutes=duration_minutes)
            continue

        # Проверяем пересечение с существующими бронированиями
        # booked_intervals хранят naive datetime для сравнения
        booking_id = None
        for b_start, b_end, b_id in booked_intervals:
            if current < b_end and slot_end > b_start:
                booking_id = b_id
                break

        slots.append(TimeSlot(
            startTime=current.strftime("%Y-%m-%dT%H:%M:%S"),
            endTime=slot_end.strftime("%Y-%m-%dT%H:%M:%S"),
            available=booking_id is None,
            bookingId=booking_id,
        ))

        current += timedelta(minutes=duration_minutes)

    return slots


def get_booked_intervals(bookings: dict) -> list[tuple[datetime, datetime, str]]:
    """Возвращает список (start, end, booking_id) для confirmed бронирований."""
    intervals = []
    for b in bookings.values():
        if b.status == "confirmed":
            # Парсим как naive datetime для сравнения с локальными слотами
            start = datetime.fromisoformat(b.startTime.replace("Z", ""))
            end = datetime.fromisoformat(b.endTime.replace("Z", ""))
            intervals.append((start, end, b.id))
    return intervals

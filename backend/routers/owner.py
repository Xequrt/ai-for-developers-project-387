import json
from datetime import datetime

from fastapi import APIRouter, Query, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from models import (
    Booking, BookingStatus, BookingWithStatus, CreateEventTypeRequest,
    ErrorDetail, ErrorResponse, PaginatedBookingsWithStatus,
    UpdateEventTypeRequest, WorkingHours, Owner,
)
import database as db
from database import get_db, EventTypeRow, BookingRow, OwnerRow, UserRow
from auth import get_current_user

router = APIRouter(prefix="/api/v1/owner", tags=["OwnerApi"])


def error_response(status_code: int, code: str, message: str):
    body = ErrorResponse(error=ErrorDetail(code=code, message=message))
    return JSONResponse(status_code=status_code, content=body.model_dump())


def row_to_owner(row: OwnerRow) -> Owner:
    wh = WorkingHours(**json.loads(row.working_hours_json))
    return Owner(id=row.id, name=row.name, email=row.email, timezone=row.timezone, workingHours=wh)


def user_to_owner(user: UserRow) -> Owner:
    """Конвертирует UserRow в Owner модель (для совместимости)."""
    wh = WorkingHours(**json.loads(user.working_hours_json))
    return Owner(id=user.id, name=user.name, email=user.email, timezone=user.timezone, workingHours=wh)


def row_to_booking(row: BookingRow) -> Booking:
    return Booking(
        id=row.id,
        eventTypeId=row.event_type_id,
        startTime=row.start_time,
        endTime=row.end_time,
        guestName=row.guest_name,
        guestEmail=row.guest_email,
        guestPhone=row.guest_phone,
        notes=row.notes,
        status=BookingStatus(row.status),
        createdAt=row.created_at,
    )


@router.get("/profile")
def get_profile(current_user: UserRow = Depends(get_current_user)):
    """Получение профиля текущего аутентифицированного пользователя."""
    return user_to_owner(current_user)


# ── Типы событий ──────────────────────────────────────────────────────────────

@router.post("/event-types", status_code=201)
def create_event_type(
    body: CreateEventTypeRequest, 
    session: Session = Depends(get_db),
    current_user: UserRow = Depends(get_current_user)
):
    if not body.id or len(body.id) > 100:
        return error_response(400, "VALIDATION_ERROR", "Некорректный id.")
    if session.get(EventTypeRow, body.id):
        return error_response(409, "DUPLICATE_ID", "Тип события с таким id уже существует.")
    if not body.name or len(body.name) > 100:
        return error_response(400, "VALIDATION_ERROR", "Некорректное название.")
    if body.durationMinutes <= 0:
        return error_response(400, "VALIDATION_ERROR", "durationMinutes должно быть > 0.")

    row = EventTypeRow(
        id=body.id,
        name=body.name,
        description=body.description,
        duration_minutes=body.durationMinutes,
        created_at=db.now_iso(),
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return {"id": row.id, "name": row.name, "description": row.description,
            "durationMinutes": row.duration_minutes, "createdAt": row.created_at}


@router.get("/event-types/{id}")
def get_event_type(
    id: str, 
    session: Session = Depends(get_db),
    current_user: UserRow = Depends(get_current_user)
):
    row = session.get(EventTypeRow, id)
    if not row:
        return error_response(404, "EVENT_TYPE_NOT_FOUND", "Тип события не найден.")
    return {"id": row.id, "name": row.name, "description": row.description,
            "durationMinutes": row.duration_minutes, "createdAt": row.created_at}


@router.put("/event-types/{id}")
def update_event_type(
    id: str, 
    body: UpdateEventTypeRequest, 
    session: Session = Depends(get_db),
    current_user: UserRow = Depends(get_current_user)
):
    row = session.get(EventTypeRow, id)
    if not row:
        return error_response(404, "EVENT_TYPE_NOT_FOUND", "Тип события не найден.")

    if body.name is not None:
        row.name = body.name
    if body.description is not None:
        row.description = body.description
    if body.durationMinutes is not None:
        if body.durationMinutes <= 0:
            return error_response(400, "VALIDATION_ERROR", "durationMinutes должно быть > 0.")
        row.duration_minutes = body.durationMinutes

    session.commit()
    session.refresh(row)
    return {"id": row.id, "name": row.name, "description": row.description,
            "durationMinutes": row.duration_minutes, "createdAt": row.created_at}


@router.delete("/event-types/{id}", status_code=204)
def delete_event_type(
    id: str, 
    session: Session = Depends(get_db),
    current_user: UserRow = Depends(get_current_user)
):
    row = session.get(EventTypeRow, id)
    if not row:
        return error_response(404, "EVENT_TYPE_NOT_FOUND", "Тип события не найден.")
    
    active_bookings = session.query(BookingRow).filter(
        BookingRow.event_type_id == id,
        BookingRow.status == "confirmed"
    ).count()
    if active_bookings > 0:
        return error_response(409, "EVENT_TYPE_HAS_BOOKINGS", 
            f"Нельзя удалить тип события: имеется {active_bookings} активных бронирований.")
    
    session.delete(row)
    session.commit()


# ── Бронирования ──────────────────────────────────────────────────────────────

@router.get("/bookings/upcoming", response_model=PaginatedBookingsWithStatus)
def list_upcoming_bookings(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_db),
    current_user: UserRow = Depends(get_current_user)
):
    now = datetime.now()
    rows = session.query(BookingRow).filter(BookingRow.status == "confirmed").all()

    upcoming = []
    for r in rows:
        end = datetime.fromisoformat(r.end_time.replace("Z", ""))
        if end > now:
            start = datetime.fromisoformat(r.start_time.replace("Z", ""))
            is_ongoing = start <= now < end
            b = row_to_booking(r)
            upcoming.append(BookingWithStatus(**b.model_dump(), isOngoing=is_ongoing))

    upcoming.sort(key=lambda b: b.startTime)
    total = len(upcoming)
    page = upcoming[offset: offset + limit]
    return PaginatedBookingsWithStatus(items=page, total=total, limit=limit, offset=offset)


@router.get("/bookings/{id}")
def get_booking(
    id: str, 
    session: Session = Depends(get_db),
    current_user: UserRow = Depends(get_current_user)
):
    row = session.get(BookingRow, id)
    if not row:
        return error_response(404, "BOOKING_NOT_FOUND", "Бронирование не найдено.")
    return row_to_booking(row)


@router.delete("/bookings/{id}", status_code=204)
def cancel_booking(
    id: str, 
    session: Session = Depends(get_db),
    current_user: UserRow = Depends(get_current_user)
):
    row = session.get(BookingRow, id)
    if not row:
        return error_response(404, "BOOKING_NOT_FOUND", "Бронирование не найдено.")
    row.status = "cancelled"
    session.commit()

import json
from datetime import datetime, timedelta, date
from calendar import monthrange

from fastapi import APIRouter, Query, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from models import (
    Booking, BookingStatus, CreateBookingRequest,
    DayAvailability, ErrorDetail, ErrorResponse, TimeSlot,
    WorkingHours, Owner,
)
import database as db
from database import get_db, EventTypeRow, BookingRow, OwnerRow
from slots import generate_slots, get_booked_intervals

router = APIRouter(prefix="/api/v1", tags=["Public"])


def error_response(status_code: int, code: str, message: str, details: dict | None = None):
    body = ErrorResponse(error=ErrorDetail(code=code, message=message, details=details))
    return JSONResponse(status_code=status_code, content=body.model_dump())


def row_to_owner(row: OwnerRow) -> Owner:
    wh = WorkingHours(**json.loads(row.working_hours_json))
    return Owner(id=row.id, name=row.name, email=row.email, timezone=row.timezone, workingHours=wh)


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


@router.get("/event-types")
def list_event_types(session: Session = Depends(get_db)):
    rows = session.query(EventTypeRow).all()
    return [{"id": r.id, "name": r.name, "description": r.description,
             "durationMinutes": r.duration_minutes, "createdAt": r.created_at} for r in rows]


@router.get("/available-slots", response_model=list[TimeSlot])
def get_available_slots(
    eventTypeId: str = Query(...),
    date: str = Query(...),
    session: Session = Depends(get_db),
):
    et = session.get(EventTypeRow, eventTypeId)
    if not et:
        return error_response(404, "EVENT_TYPE_NOT_FOUND", "Тип события не найден.")

    owner_row = session.query(OwnerRow).first()
    owner = row_to_owner(owner_row)

    bookings_dict = {r.id: row_to_booking(r) for r in session.query(BookingRow).all()}
    booked = get_booked_intervals(bookings_dict)
    return generate_slots(date, et.duration_minutes, owner.workingHours, booked, owner.timezone)


@router.get("/available-slots/summary", response_model=list[DayAvailability])
def get_available_slots_summary(
    eventTypeId: str = Query(...),
    month: str = Query(...),
    session: Session = Depends(get_db),
):
    et = session.get(EventTypeRow, eventTypeId)
    if not et:
        return error_response(404, "EVENT_TYPE_NOT_FOUND", "Тип события не найден.")

    owner_row = session.query(OwnerRow).first()
    owner = row_to_owner(owner_row)

    year, mon = map(int, month.split("-"))
    _, days_in_month = monthrange(year, mon)

    today = date.today()
    window_end = today + timedelta(days=14)

    bookings_dict = {r.id: row_to_booking(r) for r in session.query(BookingRow).all()}
    booked = get_booked_intervals(bookings_dict)

    result = []
    for day in range(1, days_in_month + 1):
        date_str = f"{year}-{mon:02d}-{day:02d}"
        current_date = date(year, mon, day)
        if current_date < today or current_date > window_end:
            result.append(DayAvailability(date=date_str, availableCount=0))
            continue
        slots = generate_slots(date_str, et.duration_minutes, owner.workingHours, booked, owner.timezone)
        result.append(DayAvailability(
            date=date_str,
            availableCount=sum(1 for s in slots if s.available),
        ))
    return result


@router.post("/bookings", status_code=201)
def create_booking(body: CreateBookingRequest, session: Session = Depends(get_db)):
    et = session.get(EventTypeRow, body.eventTypeId)
    if not et:
        return error_response(404, "EVENT_TYPE_NOT_FOUND", "Тип события не найден.")

    try:
        start_dt = datetime.fromisoformat(body.startTime.replace("Z", ""))
    except ValueError:
        return error_response(400, "VALIDATION_ERROR", "Некорректный формат startTime.")

    if start_dt <= datetime.now():
        return error_response(400, "VALIDATION_ERROR", "Время начала не может быть в прошлом.")

    end_dt = start_dt + timedelta(minutes=et.duration_minutes)

    confirmed = session.query(BookingRow).filter(BookingRow.status == "confirmed").all()
    for b in confirmed:
        b_start = datetime.fromisoformat(b.start_time.replace("Z", ""))
        b_end = datetime.fromisoformat(b.end_time.replace("Z", ""))
        if start_dt < b_end and end_dt > b_start:
            return error_response(409, "SLOT_OCCUPIED",
                "Выбранное время уже занято. Пожалуйста, выберите другой слот.",
                {"conflictingBookingId": b.id})

    row = BookingRow(
        id=db.new_id(),
        event_type_id=body.eventTypeId,
        start_time=start_dt.strftime("%Y-%m-%dT%H:%M:%S"),
        end_time=end_dt.strftime("%Y-%m-%dT%H:%M:%S"),
        guest_name=body.guestName,
        guest_email=body.guestEmail,
        guest_phone=body.guestPhone,
        notes=body.notes,
        status="confirmed",
        created_at=db.now_iso(),
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return row_to_booking(row)

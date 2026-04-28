from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr


class BookingStatus(str, Enum):
    confirmed = "confirmed"
    cancelled = "cancelled"


class DaySchedule(BaseModel):
    enabled: bool
    startTime: str  # HH:MM
    endTime: str    # HH:MM


class WorkingHours(BaseModel):
    monday: DaySchedule
    tuesday: DaySchedule
    wednesday: DaySchedule
    thursday: DaySchedule
    friday: DaySchedule
    saturday: DaySchedule
    sunday: DaySchedule


class Owner(BaseModel):
    id: str
    name: str
    email: str
    timezone: str
    workingHours: WorkingHours


class EventType(BaseModel):
    id: str
    name: str
    description: str
    durationMinutes: int
    createdAt: str


class Booking(BaseModel):
    id: str
    eventTypeId: str
    startTime: str
    endTime: str
    guestName: str
    guestEmail: str
    guestPhone: Optional[str] = None
    notes: Optional[str] = None
    status: BookingStatus
    createdAt: str


class TimeSlot(BaseModel):
    startTime: str
    endTime: str
    available: bool
    bookingId: Optional[str] = None


class DayAvailability(BaseModel):
    date: str
    availableCount: int


class CreateEventTypeRequest(BaseModel):
    id: str
    name: str
    description: str
    durationMinutes: int


class UpdateEventTypeRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    durationMinutes: Optional[int] = None


class CreateBookingRequest(BaseModel):
    eventTypeId: str
    startTime: str
    guestName: str
    guestEmail: str
    guestPhone: Optional[str] = None
    notes: Optional[str] = None


class PaginatedBookings(BaseModel):
    items: list[Booking]
    total: int
    limit: int
    offset: int


class BookingWithStatus(BaseModel):
    """Бронирование с вычисляемым флагом isOngoing для страницы владельца."""
    id: str
    eventTypeId: str
    startTime: str
    endTime: str
    guestName: str
    guestEmail: str
    guestPhone: Optional[str] = None
    notes: Optional[str] = None
    status: BookingStatus
    createdAt: str
    isOngoing: bool = False


class PaginatedBookingsWithStatus(BaseModel):
    items: list[BookingWithStatus]
    total: int
    limit: int
    offset: int


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[dict] = None


class ErrorResponse(BaseModel):
    error: ErrorDetail

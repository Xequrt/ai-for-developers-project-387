"""
SQLite-хранилище через SQLAlchemy.
При старте создаёт таблицы и заполняет предустановленными данными.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import create_engine, Column, String, Integer, Boolean, Text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from config import settings

engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


# ── ORM-модели ────────────────────────────────────────────────────────────────

class OwnerRow(Base):
    __tablename__ = "owner"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    timezone = Column(String, nullable=False)
    # рабочие часы хранятся как JSON-строка
    working_hours_json = Column(Text, nullable=False)


class UserRow(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    timezone = Column(String, nullable=False, default="Europe/Moscow")
    working_hours_json = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)


class EventTypeRow(Base):
    __tablename__ = "event_types"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=False, default="")
    duration_minutes = Column(Integer, nullable=False)
    created_at = Column(String, nullable=False)


class BookingRow(Base):
    __tablename__ = "bookings"
    id = Column(String, primary_key=True)
    event_type_id = Column(String, nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    guest_name = Column(String, nullable=False)
    guest_email = Column(String, nullable=False)
    guest_phone = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    status = Column(String, nullable=False, default="confirmed")
    created_at = Column(String, nullable=False)


# ── Вспомогательные функции ───────────────────────────────────────────────────

def new_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def get_db():
    """FastAPI dependency — yields DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _get_default_password_hash() -> str:
    """Возвращает bcrypt-хеш пароля 'Changeme1' для seed-данных."""
    import bcrypt as _bcrypt
    return _bcrypt.hashpw(b"Changeme1", _bcrypt.gensalt()).decode()


# ── Инициализация БД ──────────────────────────────────────────────────────────

_SEED_WORKING_HOURS = '{"monday":{"enabled":true,"startTime":"09:00","endTime":"18:00"},"tuesday":{"enabled":true,"startTime":"09:00","endTime":"18:00"},"wednesday":{"enabled":true,"startTime":"09:00","endTime":"18:00"},"thursday":{"enabled":true,"startTime":"09:00","endTime":"18:00"},"friday":{"enabled":true,"startTime":"09:00","endTime":"18:00"},"saturday":{"enabled":false,"startTime":"09:00","endTime":"18:00"},"sunday":{"enabled":false,"startTime":"09:00","endTime":"18:00"}}'


def init_db():
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        owner_id = "550e8400-e29b-41d4-a716-446655440001"
        
        # Create default owner if not exists
        if not session.get(OwnerRow, owner_id):
            session.add(OwnerRow(
                id=owner_id,
                name="Владелец",
                email="owner@calendar.app",
                timezone="Europe/Moscow",
                working_hours_json=_SEED_WORKING_HOURS,
            ))
        
        # Create default user from owner if not exists (for auth migration)
        if not session.get(UserRow, owner_id):
            session.add(UserRow(
                id=owner_id,
                username="owner",
                email="owner@calendar.app",
                password_hash=_get_default_password_hash(),
                name="Владелец",
                timezone="Europe/Moscow",
                working_hours_json=_SEED_WORKING_HOURS,
                is_active=True,
                created_at=now_iso(),
                updated_at=now_iso(),
            ))
        
        if not session.get(EventTypeRow, "evt-001"):
            session.add(EventTypeRow(
                id="evt-001",
                name="Встреча 15 минут",
                description="Короткий звонок для быстрого знакомства или обсуждения одного вопроса.",
                duration_minutes=15,
                created_at="2026-01-01T00:00:00.000Z",
            ))
        if not session.get(EventTypeRow, "evt-002"):
            session.add(EventTypeRow(
                id="evt-002",
                name="Встреча 30 минут",
                description="Полноценная встреча для детального обсуждения проекта или задачи.",
                duration_minutes=30,
                created_at="2026-01-01T00:00:00.000Z",
            ))
        session.commit()

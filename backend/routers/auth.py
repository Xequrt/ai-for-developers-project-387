"""
Роутер аутентификации — регистрация, вход, выход, профиль пользователя.
"""
import re

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, field_validator
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

import database as db
from database import get_db, UserRow
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    set_auth_cookie,
    clear_auth_cookie,
)

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
limiter = Limiter(key_func=get_remote_address)

# Минимальные требования к паролю
_PASSWORD_MIN_LEN = 8
_PASSWORD_RE = re.compile(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$')


# ── Pydantic модели ────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    name: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Имя пользователя должно быть не менее 3 символов")
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError("Имя пользователя может содержать только буквы, цифры, _ и -")
        return v

    @field_validator("password")
    @classmethod
    def password_strong(cls, v: str) -> str:
        if len(v) < _PASSWORD_MIN_LEN:
            raise ValueError(f"Пароль должен быть не менее {_PASSWORD_MIN_LEN} символов")
        if not _PASSWORD_RE.match(v):
            raise ValueError(
                "Пароль должен содержать минимум одну строчную букву, "
                "одну заглавную букву и одну цифру"
            )
        return v

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Имя не может быть пустым")
        return v


class LoginRequest(BaseModel):
    username: str  # username или email
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserProfile(BaseModel):
    id: str
    username: str
    email: str
    name: str
    timezone: str


# ── Хелперы ───────────────────────────────────────────────────────────────────

_DEFAULT_WORKING_HOURS = (
    '{"monday":{"enabled":true,"startTime":"09:00","endTime":"18:00"},'
    '"tuesday":{"enabled":true,"startTime":"09:00","endTime":"18:00"},'
    '"wednesday":{"enabled":true,"startTime":"09:00","endTime":"18:00"},'
    '"thursday":{"enabled":true,"startTime":"09:00","endTime":"18:00"},'
    '"friday":{"enabled":true,"startTime":"09:00","endTime":"18:00"},'
    '"saturday":{"enabled":false,"startTime":"09:00","endTime":"18:00"},'
    '"sunday":{"enabled":false,"startTime":"09:00","endTime":"18:00"}}'
)


def user_to_profile(user: UserRow) -> UserProfile:
    return UserProfile(
        id=user.id,
        username=user.username,
        email=user.email,
        name=user.name,
        timezone=user.timezone,
    )


# ── Эндпоинты ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserProfile, status_code=201)
def register(request: RegisterRequest, session: Session = Depends(get_db)):
    """Регистрация нового пользователя."""
    if session.query(UserRow).filter_by(username=request.username).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Имя пользователя уже занято")

    if session.query(UserRow).filter_by(email=request.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email уже зарегистрирован")

    now = db.now_iso()
    user = UserRow(
        id=db.new_id(),
        username=request.username,
        email=str(request.email),
        password_hash=hash_password(request.password),
        name=request.name,
        timezone="Europe/Moscow",
        working_hours_json=_DEFAULT_WORKING_HOURS,
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    return user_to_profile(user)


@router.post("/login", response_model=UserProfile)
@limiter.limit("10/minute")
def login(
    request: Request,
    response: Response,
    body: LoginRequest,
    session: Session = Depends(get_db),
):
    """Вход в систему — устанавливает httpOnly cookie с JWT токеном."""
    user = session.query(UserRow).filter(
        (UserRow.username == body.username) | (UserRow.email == body.username)
    ).first()

    # Одинаковое сообщение для username и пароля — не раскрываем что именно неверно
    invalid_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Неверные учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not user or not verify_password(body.password, user.password_hash):
        raise invalid_exc

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Пользователь неактивен")

    token = create_access_token(user.id)
    set_auth_cookie(response, token)

    return user_to_profile(user)


@router.post("/logout", status_code=204)
def logout(response: Response):
    """Выход — удаляет auth cookie."""
    clear_auth_cookie(response)


@router.get("/me", response_model=UserProfile)
def get_me(current_user: UserRow = Depends(get_current_user)):
    """Профиль текущего аутентифицированного пользователя."""
    return user_to_profile(current_user)


class UpdateProfileRequest(BaseModel):
    name: str | None = None
    timezone: str | None = None


@router.put("/me", response_model=UserProfile)
def update_me(
    body: UpdateProfileRequest,
    current_user: UserRow = Depends(get_current_user),
    session: Session = Depends(get_db),
):
    """Обновление профиля текущего пользователя."""
    if body.name is not None:
        current_user.name = body.name.strip()
    if body.timezone is not None:
        current_user.timezone = body.timezone

    current_user.updated_at = db.now_iso()
    session.commit()
    session.refresh(current_user)

    return user_to_profile(current_user)

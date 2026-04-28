"""
Аутентификация и авторизация — JWT, хеширование паролей, зависимости FastAPI.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt as _bcrypt
from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import get_db, UserRow
from config import settings

ALGORITHM = "HS256"
COOKIE_NAME = "auth_token"

# HTTP Bearer — опциональный, чтобы не падать если токен в cookie
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Хеширование пароля с использованием bcrypt."""
    return _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверка пароля против хеша."""
    try:
        return _bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def create_access_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """Создание JWT токена доступа."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.jwt_expire_days)

    to_encode = {"sub": user_id, "exp": expire}
    return jwt.encode(to_encode, settings.effective_jwt_secret, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[str]:
    """Декодирование JWT токена, возвращает user_id или None."""
    try:
        payload = jwt.decode(token, settings.effective_jwt_secret, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


def set_auth_cookie(response: Response, token: str) -> None:
    """Устанавливает httpOnly cookie с JWT токеном."""
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,       # недоступен из JS
        secure=settings.cookie_secure,  # True в prod (HTTPS), False в dev
        samesite="lax",      # защита от CSRF
        max_age=settings.jwt_expire_days * 24 * 3600,
        path="/",
    )


def clear_auth_cookie(response: Response) -> None:
    """Удаляет auth cookie."""
    response.delete_cookie(key=COOKIE_NAME, path="/")


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: Session = Depends(get_db),
) -> UserRow:
    """
    FastAPI dependency — извлекает текущего пользователя из JWT.
    Принимает токен из httpOnly cookie или Authorization: Bearer заголовка.
    """
    token: Optional[str] = None

    # 1. Сначала пробуем cookie
    token = request.cookies.get(COOKIE_NAME)

    # 2. Fallback на Bearer заголовок (для API-клиентов)
    if not token and credentials:
        token = credentials.credentials

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Не авторизован",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = decode_token(token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный токен аутентификации",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = session.get(UserRow, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь неактивен",
        )

    return user

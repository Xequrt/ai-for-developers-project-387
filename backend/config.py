"""
Конфигурация приложения через pydantic-settings.
Поддерживает .env файл и переменные окружения.
"""
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

# Путь к .env относительно этого файла, а не рабочей директории
_ENV_FILE = Path(__file__).parent / ".env"

_DEV_JWT_SECRET = "dev-only-secret-not-for-production"


class Settings(BaseSettings):
    """Настройки приложения с загрузкой из .env файла."""
    
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",  # Игнорировать лишние переменные в .env
    )

    # Окружение: development | production
    app_env: str = "development"

    # JWT Configuration
    jwt_secret_key: Optional[str] = None
    jwt_expire_days: int = 7

    @property
    def effective_jwt_secret(self) -> str:
        """Возвращает JWT секрет. В production требует явного задания через env."""
        if self.jwt_secret_key:
            return self.jwt_secret_key
        if self.app_env == "production":
            raise RuntimeError("JWT_SECRET_KEY is required in production (APP_ENV=production)")
        return _DEV_JWT_SECRET
    
    # Cookie security
    cookie_secure: bool = False  # True в prod (HTTPS), False в dev (HTTP)
    
    # Database
    database_url: str = "sqlite:///./calendar.db"
    
    # CORS
    cors_origins: str = "http://localhost:5173"


# Singleton экземпляр настроек
settings = Settings()

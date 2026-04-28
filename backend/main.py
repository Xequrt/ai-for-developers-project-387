from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from database import init_db
from routers import public, owner, auth
from config import settings

# Rate limiter — ключ по IP
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Calendar of Calls — Booking API",
    version="1.0.0",
    lifespan=lifespan,
)

# Подключаем rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Parse CORS origins from comma-separated string
cors_origins = [origin.strip() for origin in settings.cors_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,   # нужно для передачи cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(public.router)
app.include_router(owner.router)
app.include_router(auth.router)

# ── Статика фронтенда (продакшен) ─────────────────────────────────────────────
_static = Path(__file__).parent / "static"
if _static.exists():
    app.mount("/assets", StaticFiles(directory=_static / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa_fallback(full_path: str):
        return FileResponse(_static / "index.html")

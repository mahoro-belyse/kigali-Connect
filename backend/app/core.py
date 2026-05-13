import secrets, logging
from datetime import datetime,  timezone, timedelta
from typing import Optional
from pathlib import Path

from pydantic_settings import BaseSettings
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger(__name__)


# ─── Settings ────────────────────────────────────────────────────────────────

class Settings(BaseSettings):
    APP_NAME: str = "Smart Event & Booking Management System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    DATABASE_URL: str = "sqlite:///./smart_events.db"

    SECRET_KEY: str = secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    BCRYPT_ROUNDS: int = 12
    MAX_LOGIN_ATTEMPTS: int = 3
    LOCKOUT_DURATION_MINUTES: int = 1

    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 5
    FRONTEND_URL: str = "http://localhost:3000"

    def get_origins(self):
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()


# ─── Database ─────────────────────────────────────────────────────────────────

if settings.DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(conn, _):
        cur = conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL")
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()
else:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        pool_recycle=3600,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        db.rollback()
        raise
    finally:
        db.close()

def create_tables():
    Base.metadata.create_all(bind=engine)


# ─── Security — Password & JWT ────────────────────────────────────────────────

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto",
                           bcrypt__rounds=settings.BCRYPT_ROUNDS)

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires: timedelta = None) -> str:
    payload = {**data, "exp": datetime.now(timezone.utc) + (expires or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)), "type": "access"}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_refresh_token(data: dict) -> str:
    payload = {**data, "exp": datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS), "type": "refresh"}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


# ─── Login Attempt Tracker (in-memory) ───────────────────────────────────────
#  { email: { attempts: int, locked_until: datetime | None } }

_attempts: dict = {}

def check_lockout(email: str) -> tuple[bool, Optional[int]]:
    """Returns (is_locked, seconds_remaining)."""
    rec = _attempts.get(email.lower())
    if not rec:
        return False, None
    lu = rec.get("locked_until")
    if lu and datetime.now(timezone.utc) < lu:
        return True, int((lu - datetime.now(timezone.utc)).total_seconds())
    if lu:
        _attempts[email.lower()] = {"attempts": 0, "locked_until": None}
    return False, None

def record_failure(email: str) -> dict:
    email = email.lower()
    _attempts.setdefault(email, {"attempts": 0, "locked_until": None})
    _attempts[email]["attempts"] += 1
    n = _attempts[email]["attempts"]
    remaining = settings.MAX_LOGIN_ATTEMPTS - n
    if n >= settings.MAX_LOGIN_ATTEMPTS:
        lock_until = datetime.now(timezone.utc) + timedelta(minutes=settings.LOCKOUT_DURATION_MINUTES)
        _attempts[email]["locked_until"] = lock_until
        return {"locked": True, "message": f"Too many failed attempts. Account locked for {settings.LOCKOUT_DURATION_MINUTES} minute(s)."}
    return {"locked": False, "message": f"Invalid credentials. {remaining} attempt(s) remaining before lockout."}

def reset_attempts(email: str):
    _attempts.pop(email.lower(), None)


# ─── Auth Dependencies ────────────────────────────────────────────────────────

_bearer = HTTPBearer()
_bearer_optional = HTTPBearer(auto_error=False)

def _get_user_from_token(token: str, db):
    from app.models import User
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled. Contact support.")
    return user

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(_bearer), db=Depends(get_db)):
    return _get_user_from_token(creds.credentials, db)

def get_optional_user(creds: HTTPAuthorizationCredentials = Depends(_bearer_optional), db=Depends(get_db)):
    if not creds:
        return None
    try:
        return _get_user_from_token(creds.credentials, db)
    except Exception:
        return None

def require_admin(user=Depends(get_current_user)):
    from app.models import UserRole
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def require_manager(user=Depends(get_current_user)):
    from app.models import UserRole
    if user.role not in [UserRole.ADMIN, UserRole.EVENT_MANAGER]:
        raise HTTPException(status_code=403, detail="Admin or Event Manager access required")
    return user

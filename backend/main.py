from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from pathlib import Path
import logging, time

from app.core import settings, create_tables
from app.routes import router

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} starting ({settings.ENVIRONMENT})")
    create_tables()
    for folder in ["events/covers", "events/banners", "avatars"]:
        Path(f"{settings.UPLOAD_DIR}/{folder}").mkdir(parents=True, exist_ok=True)
    logger.info("✅ Ready")
    yield
    logger.info("👋 Shutting down")


app = FastAPI(
    title=settings.APP_NAME,
    description="""
**Smart Event & Booking Management System** — Full-featured REST API.

### Quick Start
1. `POST /api/v1/auth/register` — create account
2. `POST /api/v1/auth/login` — get JWT token
3. Click **Authorize** → paste your `access_token`

### Security
- JWT Bearer authentication
- Account locked after **3 failed login attempts** (1-minute cooldown)
- Role-based access: **Admin · Event Manager · Client**
    """,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count", "Retry-After"],
)

# ─── Request timing ───────────────────────────────────────────────────────────
@app.middleware("http")
async def timing(request: Request, call_next):
    t = time.time()
    resp = await call_next(request)
    resp.headers["X-Process-Time"] = f"{time.time()-t:.4f}s"
    return resp

# ─── Error handlers ───────────────────────────────────────────────────────────
@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={
        "detail": "Validation error",
        "errors": [{"field": " → ".join(str(l) for l in e["loc"]), "message": e["msg"]} for e in exc.errors()]
    })

# ─── Static files (uploads) ───────────────────────────────────────────────────
Path(settings.UPLOAD_DIR).mkdir(exist_ok=True)
app.mount(f"/{settings.UPLOAD_DIR}", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# ─── Routes ───────────────────────────────────────────────────────────────────
app.include_router(router)

# ─── Health ───────────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {"app": settings.APP_NAME, "version": settings.APP_VERSION, "docs": "/docs", "status": "running"}

@app.get("/health", tags=["Health"])
def health():
    from app.core import engine
    import sqlalchemy
    try:
        with engine.connect() as c: c.execute(sqlalchemy.text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False
    return {"status": "healthy" if db_ok else "degraded", "database": "connected" if db_ok else "error",
            "environment": settings.ENVIRONMENT, "version": settings.APP_VERSION}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)

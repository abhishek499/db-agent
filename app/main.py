import logging
from contextlib import asynccontextmanager
from pathlib import Path

logger = logging.getLogger(__name__)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.auth import router as auth_router
from app.api.onboarding import router as onboarding_router
from app.api.chat import router as chat_router
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.database_url:
        logger.info("Storage backend: PostgreSQL (DATABASE_URL is set)")
        from app.storage.pg import init_db
        init_db()
        logger.info("PostgreSQL tables verified")
    else:
        logger.warning("Storage backend: file-based (DATABASE_URL is not set)")
    yield


app = FastAPI(
    title="DB Agent",
    description="Natural language query agent for SQL and MongoDB databases",
    version="0.1.0",
    lifespan=lifespan,
)

_origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(onboarding_router)
app.include_router(chat_router)


@app.exception_handler(NotImplementedError)
async def not_implemented_handler(request: Request, exc: NotImplementedError):
    return JSONResponse(
        status_code=501,
        content={"error": "Not implemented yet", "detail": str(exc)},
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=400,
        content={"error": "Bad request", "detail": str(exc)},
    )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "version": "0.1.0",
        "storage": "postgresql" if settings.database_url else "file",
    }


# Serve the built React frontend (production mode)
_DIST = Path(__file__).parent.parent / "frontend" / "dist"
if _DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=str(_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        """Serve a static file if it exists in dist/, otherwise return index.html
        so React Router can handle client-side navigation."""
        candidate = (_DIST / full_path).resolve()
        # Security: only serve files that are inside _DIST
        if candidate.is_file() and str(candidate).startswith(str(_DIST.resolve())):
            return FileResponse(str(candidate))
        return FileResponse(str(_DIST / "index.html"))

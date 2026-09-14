"""
VaaniShield — Production FastAPI Application Entry Point & Composition Layer
============================================================================
Application bootstrap and composition layer for VaaniShield:
  - Initializes FastAPI application with lifespan management
  - Registers CORS middleware
  - Mounts modular routers (health, session, transaction, enroll, stream)
  - Preserves backwards-compatible re-exports (app, app_state, ThreatLevel, settings)

DPDP Act 2023 Compliance:
  - Zero persistent raw audio files on disk
  - Ephemeral Redis audio buffers enforce 15-second TTL
  - Stored data contains derived mathematical features and embeddings only
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Dual-path imports to support both root repo execution and container/backend execution
try:
    from backend.core.config import (
        Settings,
        settings,
        log,
        PARSELMOUTH_AVAILABLE,
        ONNX_AVAILABLE,
        LIBROSA_AVAILABLE,
        REDIS_AVAILABLE,
        ASYNCPG_AVAILABLE,
        aioredis,
        asyncpg,
    )
    from backend.core.state import AppState, app_state
    from backend.schemas.models import (
        ThreatLevel,
        ChunkTelemetry,
        PITCH_CHALLENGES,
        TransactionRequest,
        TransactionResponse,
        EnrollRequest,
        WebSocketOutboundMessage,
    )
    from backend.risk.threat_state import ThreatState
    from backend.risk.session_manager import SessionManager
    from backend.audio.buffer import RedisBufferManager
    from backend.audio.prosody import ProsodyAnalyser
    from backend.ai.inference import InferenceEngine
    from backend.db.database import DatabaseManager
    from backend.services.pipeline import process_audio_window

    from backend.api.health import router as health_router
    from backend.api.session import router as session_router
    from backend.api.transaction import router as transaction_router
    from backend.api.enroll import router as enroll_router
    from backend.api.stream import router as stream_router
except ImportError:
    from core.config import (
        Settings,
        settings,
        log,
        PARSELMOUTH_AVAILABLE,
        ONNX_AVAILABLE,
        LIBROSA_AVAILABLE,
        REDIS_AVAILABLE,
        ASYNCPG_AVAILABLE,
        aioredis,
        asyncpg,
    )
    from core.state import AppState, app_state
    from schemas.models import (
        ThreatLevel,
        ChunkTelemetry,
        PITCH_CHALLENGES,
        TransactionRequest,
        TransactionResponse,
        EnrollRequest,
        WebSocketOutboundMessage,
    )
    from risk.threat_state import ThreatState
    from risk.session_manager import SessionManager
    from audio.buffer import RedisBufferManager
    from audio.prosody import ProsodyAnalyser
    from ai.inference import InferenceEngine
    from db.database import DatabaseManager
    from services.pipeline import process_audio_window

    from api.health import router as health_router
    from api.session import router as session_router
    from api.transaction import router as transaction_router
    from api.enroll import router as enroll_router
    from api.stream import router as stream_router


# ──────────────────────────────────────────────
# Lifespan Management
# ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    log.info("VaaniShield starting up…")
    if REDIS_AVAILABLE and aioredis is not None:
        try:
            r = aioredis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=False,
            )
            await r.ping()
            app_state.redis = r
            log.info("Redis connected", url=settings.redis_url)
        except Exception as exc:
            app_state.redis = None
            log.warning("Redis connection failed (using in-memory fallback)", error=str(exc))
    else:
        app_state.redis = None
        log.warning("Redis client unavailable (using in-memory fallback)")

    app_state.buffer = RedisBufferManager(app_state.redis)
    await app_state.db.connect()
    app_state.engine.load_models()
    log.info("VaaniShield ready")

    yield

    # Shutdown
    log.info("VaaniShield shutting down…")
    await app_state.db.disconnect()
    if app_state.redis:
        await app_state.redis.aclose()


# ──────────────────────────────────────────────
# FastAPI Application Construction
# ──────────────────────────────────────────────

app = FastAPI(
    title="VaaniShield API",
    description="Real-time AI Voice Clone Detection & Financial Fraud Prevention",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register modular routers
app.include_router(health_router)
app.include_router(session_router)
app.include_router(transaction_router)
app.include_router(enroll_router)
app.include_router(stream_router)


# ──────────────────────────────────────────────
# Backwards-Compatibility Re-Exports
# ──────────────────────────────────────────────

__all__ = [
    "app",
    "app_state",
    "ThreatLevel",
    "settings",
    "log",
    "Settings",
    "AppState",
    "InferenceEngine",
    "ProsodyAnalyser",
    "RedisBufferManager",
    "SessionManager",
    "DatabaseManager",
    "ThreatState",
    "process_audio_window",
    "TransactionRequest",
    "TransactionResponse",
    "EnrollRequest",
    "WebSocketOutboundMessage",
    "ChunkTelemetry",
    "PITCH_CHALLENGES",
    "PARSELMOUTH_AVAILABLE",
    "ONNX_AVAILABLE",
    "LIBROSA_AVAILABLE",
    "REDIS_AVAILABLE",
    "ASYNCPG_AVAILABLE",
]


# ──────────────────────────────────────────────
# Entry Point
# ──────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info" if not settings.debug else "debug",
    )

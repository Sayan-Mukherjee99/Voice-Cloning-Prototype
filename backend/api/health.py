"""
VaaniShield — Health & Diagnostic Endpoint
==========================================
GET /health
Reports system status, component availability, and neural model loaded state.
"""

from __future__ import annotations

from fastapi import APIRouter

try:
    from backend.core.config import (
        ONNX_AVAILABLE,
        PARSELMOUTH_AVAILABLE,
        LIBROSA_AVAILABLE,
    )
    from backend.core.state import app_state
except ImportError:
    from core.config import (
        ONNX_AVAILABLE,
        PARSELMOUTH_AVAILABLE,
        LIBROSA_AVAILABLE,
    )
    from core.state import app_state

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    redis_ok = False
    db_ok = False

    if app_state.redis:
        try:
            await app_state.redis.ping()
            redis_ok = True
        except Exception:
            pass

    if app_state.db.pool:
        try:
            async with app_state.db.pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            db_ok = True
        except Exception:
            pass

    return {
        "status": "healthy" if redis_ok and db_ok else "degraded",
        "redis": redis_ok,
        "postgres": db_ok,
        "onnx_available": ONNX_AVAILABLE,
        "parselmouth_available": PARSELMOUTH_AVAILABLE,
        "librosa_available": LIBROSA_AVAILABLE,
        "vad_model_loaded": app_state.engine.vad_session is not None,
        "resnet_model_loaded": app_state.engine.resnet_session is not None,
        "ecapa_model_loaded": app_state.engine.ecapa_session is not None,
    }

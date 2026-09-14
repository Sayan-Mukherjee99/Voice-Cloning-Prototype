"""
VaaniShield — Core Configuration and Shared State
"""

from .config import (
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
from .state import AppState, app_state

__all__ = [
    "Settings",
    "settings",
    "log",
    "PARSELMOUTH_AVAILABLE",
    "ONNX_AVAILABLE",
    "LIBROSA_AVAILABLE",
    "REDIS_AVAILABLE",
    "ASYNCPG_AVAILABLE",
    "aioredis",
    "asyncpg",
    "AppState",
    "app_state",
]

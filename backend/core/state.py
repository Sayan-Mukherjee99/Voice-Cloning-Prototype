"""
VaaniShield — Global Application State Singleton
================================================
Encapsulates runtime singletons for:
  - Redis client connection
  - DatabaseManager (PostgreSQL pool)
  - RedisBufferManager (audio sliding window)
  - InferenceEngine (ONNX models + mock fallbacks)
  - ProsodyAnalyser (biomechanical feature extraction)
  - SessionManager (threat state tracking)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

try:
    from backend.ai.inference import InferenceEngine
    from backend.audio.buffer import RedisBufferManager
    from backend.audio.prosody import ProsodyAnalyser
    from backend.db.database import DatabaseManager
    from backend.risk.session_manager import SessionManager
except ImportError:
    from ai.inference import InferenceEngine
    from audio.buffer import RedisBufferManager
    from audio.prosody import ProsodyAnalyser
    from db.database import DatabaseManager
    from risk.session_manager import SessionManager


@dataclass
class AppState:
    redis: Any | None = None
    db: DatabaseManager = field(default_factory=DatabaseManager)
    buffer: RedisBufferManager | None = None
    engine: InferenceEngine = field(default_factory=InferenceEngine)
    prosody: ProsodyAnalyser = field(default_factory=ProsodyAnalyser)
    sessions: SessionManager = field(default_factory=SessionManager)


app_state = AppState()

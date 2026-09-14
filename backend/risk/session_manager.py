"""
VaaniShield — In-Memory Session Threat State Registry
=====================================================
Thread-safe session state registry tracking ongoing threat state
and chunk indices per active streaming call session.
"""

from __future__ import annotations

import asyncio

try:
    from backend.risk.threat_state import ThreatState
    from backend.schemas.models import ThreatLevel
except ImportError:
    from risk.threat_state import ThreatState
    from schemas.models import ThreatLevel


class SessionManager:
    """Thread-safe in-memory threat state registry per session."""

    def __init__(self) -> None:
        self._states: dict[str, ThreatState] = {}
        self._chunk_counters: dict[str, int] = {}
        self._lock = asyncio.Lock()

    async def get_or_create(self, session_id: str) -> ThreatState:
        async with self._lock:
            if session_id not in self._states:
                self._states[session_id] = ThreatState()
                self._chunk_counters[session_id] = 0
            return self._states[session_id]

    async def increment_chunk(self, session_id: str) -> int:
        async with self._lock:
            self._chunk_counters[session_id] = self._chunk_counters.get(session_id, 0) + 1
            return self._chunk_counters[session_id]

    async def get_risk_score(self, session_id: str) -> float:
        async with self._lock:
            state = self._states.get(session_id)
            return state.ema_score if state else 0.0

    async def get_threat_level(self, session_id: str) -> ThreatLevel:
        async with self._lock:
            state = self._states.get(session_id)
            return state.threat_level if state else ThreatLevel.GREEN

    async def remove(self, session_id: str) -> None:
        async with self._lock:
            self._states.pop(session_id, None)
            self._chunk_counters.pop(session_id, None)

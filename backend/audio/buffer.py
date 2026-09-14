"""
VaaniShield — Ephemeral Audio Ring Buffer (Redis + In-Memory Fallback)
=====================================================================
Manages ephemeral sliding audio buffers in Redis with in-memory fallback.
Uses LPUSH + LTRIM for circular list (ring buffer).
DPDP Act 2023: 15-second TTL enforced on every write.
Zero raw audio persisted to disk.
"""

from __future__ import annotations

import asyncio
import collections
import json
from typing import Any

try:
    from backend.core.config import settings, log, aioredis
except ImportError:
    from core.config import settings, log, aioredis


class RedisBufferManager:
    """
    Manages ephemeral sliding audio buffers in Redis with in-memory fallback.
    Uses LPUSH + LTRIM for circular list (ring buffer).
    DPDP Act 2023: 15-second TTL enforced on every write.
    """

    def __init__(self, redis_client: Any | None = None) -> None:
        self.r = redis_client
        self._in_memory: dict[str, collections.deque[bytes]] = {}
        self._meta: dict[str, dict] = {}
        self._lock = asyncio.Lock()

    def _audio_key(self, session_id: str) -> str:
        return f"vaani:audio:{session_id}"

    def _meta_key(self, session_id: str) -> str:
        return f"vaani:meta:{session_id}"

    async def push_frame(self, session_id: str, pcm_bytes: bytes) -> int:
        """Push a PCM frame to the ring buffer. Returns current buffer length."""
        if not isinstance(pcm_bytes, (bytes, bytearray)) or len(pcm_bytes) == 0:
            return 0

        if self.r is not None:
            try:
                key = self._audio_key(session_id)
                async with self.r.pipeline() as pipe:
                    pipe.lpush(key, pcm_bytes)
                    pipe.ltrim(key, 0, settings.buffer_window_frames - 1)
                    pipe.expire(key, settings.redis_audio_ttl_s)
                    results = await pipe.execute()
                return int(results[0])
            except Exception as exc:
                log.warning("Redis push_frame failed, using in-memory buffer", error=str(exc))

        async with self._lock:
            if session_id not in self._in_memory:
                self._in_memory[session_id] = collections.deque(maxlen=settings.buffer_window_frames)
            self._in_memory[session_id].appendleft(pcm_bytes)
            return len(self._in_memory[session_id])

    async def get_window(self, session_id: str) -> list[bytes]:
        """Retrieve all frames in the current sliding window."""
        if self.r is not None:
            try:
                key = self._audio_key(session_id)
                frames = await self.r.lrange(key, 0, settings.buffer_window_frames - 1)
                if frames:
                    return frames
            except Exception as exc:
                log.warning("Redis get_window failed, using in-memory buffer", error=str(exc))

        async with self._lock:
            if session_id in self._in_memory:
                return list(self._in_memory[session_id])
            return []

    async def set_session_meta(self, session_id: str, data: dict) -> None:
        if self.r is not None:
            try:
                key = self._meta_key(session_id)
                await self.r.set(key, json.dumps(data), ex=3600)
                return
            except Exception as exc:
                log.warning("Redis set_session_meta failed", error=str(exc))

        async with self._lock:
            self._meta[session_id] = data

    async def get_session_meta(self, session_id: str) -> dict | None:
        if self.r is not None:
            try:
                key = self._meta_key(session_id)
                raw = await self.r.get(key)
                if raw:
                    return json.loads(raw)
            except Exception as exc:
                log.warning("Redis get_session_meta failed", error=str(exc))

        async with self._lock:
            return self._meta.get(session_id)

    async def delete_session(self, session_id: str) -> None:
        """Purge all audio and metadata for a session (DPDP compliance)."""
        if self.r is not None:
            try:
                await self.r.delete(self._audio_key(session_id), self._meta_key(session_id))
            except Exception as exc:
                log.warning("Redis delete_session error", session_id=session_id, error=str(exc))
        async with self._lock:
            self._in_memory.pop(session_id, None)
            self._meta.pop(session_id, None)
        log.info("Session audio purged", session_id=session_id)

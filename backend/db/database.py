"""
VaaniShield — Database Manager (PostgreSQL + pgvector)
======================================================
Manages async connection pool to PostgreSQL.
Handles persistence for:
  - call_sessions
  - chunk_telemetry
  - enrolled_voiceprints (192-dim vector)
  - transaction_evaluations
Complies with DPDP Act 2023: stores derived embeddings and scores only.
Zero raw audio persisted.
"""

from __future__ import annotations

from typing import Any
import numpy as np

try:
    from backend.core.config import settings, log, ASYNCPG_AVAILABLE, asyncpg
    from backend.schemas.models import ChunkTelemetry, ThreatLevel
except ImportError:
    from core.config import settings, log, ASYNCPG_AVAILABLE, asyncpg
    from schemas.models import ChunkTelemetry, ThreatLevel


class DatabaseManager:
    def __init__(self) -> None:
        self.pool: Any | None = None

    async def connect(self) -> None:
        if not ASYNCPG_AVAILABLE:
            log.warning("asyncpg unavailable – database operations disabled")
            return

        try:
            self.pool = await asyncpg.create_pool(
                settings.postgres_dsn,
                min_size=2,
                max_size=10,
                command_timeout=30,
            )
            log.info("PostgreSQL pool established")
        except Exception as exc:
            log.error("PostgreSQL connection failed", error=str(exc))
            self.pool = None

    async def disconnect(self) -> None:
        if self.pool:
            await self.pool.close()

    async def upsert_session(self, session_id: str, **kwargs) -> None:
        if not self.pool:
            return
        try:
            async with self.pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO call_sessions (session_id, status, composite_risk_score, threat_level)
                    VALUES ($1, 'ACTIVE', 0.0, 'GREEN')
                    ON CONFLICT (session_id) DO UPDATE
                    SET composite_risk_score = EXCLUDED.composite_risk_score,
                        threat_level = EXCLUDED.threat_level,
                        last_activity_at = NOW()
                    """,
                    session_id,
                )
        except Exception as exc:
            log.warning("DB upsert_session failed", error=str(exc))

    async def update_session_risk(
        self, session_id: str, risk_score: float, threat_level: ThreatLevel
    ) -> None:
        if not self.pool:
            return
        try:
            async with self.pool.acquire() as conn:
                await conn.execute(
                    """
                    UPDATE call_sessions
                    SET composite_risk_score = $2, threat_level = $3, last_activity_at = NOW()
                    WHERE session_id = $1
                    """,
                    session_id,
                    risk_score,
                    threat_level.value,
                )
        except Exception as exc:
            log.warning("DB update_session_risk failed", error=str(exc))

    async def insert_chunk_telemetry(self, t: ChunkTelemetry) -> None:
        if not self.pool:
            return
        try:
            async with self.pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO chunk_telemetry (
                        session_id, chunk_index, tier1_risk_score, log_mel_mean, log_mel_std,
                        f0_mean_hz, f0_std_hz, f0_variance, jitter_local, shimmer_local,
                        hnr_db, respiration_gap_ms, tier2_triggered, cosine_similarity,
                        tier2_risk_score, ema_composite_score, ema_threat_level,
                        tier1_latency_ms, tier2_latency_ms, total_latency_ms,
                        vad_speech_ratio, chunk_discarded_silence
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
                    )
                    """,
                    t.session_id, t.chunk_index, t.tier1_risk_score, t.log_mel_mean, t.log_mel_std,
                    t.f0_mean_hz, t.f0_std_hz, t.f0_variance, t.jitter_local, t.shimmer_local,
                    t.hnr_db, t.respiration_gap_ms, t.tier2_triggered, t.cosine_similarity,
                    t.tier2_risk_score, t.ema_composite_score, t.ema_threat_level.value,
                    t.tier1_latency_ms, t.tier2_latency_ms, t.total_latency_ms,
                    t.vad_speech_ratio, t.chunk_discarded_silence,
                )
        except Exception as exc:
            log.warning("DB insert_chunk_telemetry failed", error=str(exc))

    async def get_enrolled_voiceprint(self, speaker_id: str) -> np.ndarray | None:
        if not self.pool:
            return None
        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT embedding FROM enrolled_voiceprints WHERE speaker_id = $1 AND is_active = TRUE",
                    speaker_id,
                )
                if row and row["embedding"]:
                    # pgvector returns as string "[0.1, 0.2, ...]"
                    raw = str(row["embedding"]).strip("[]")
                    return np.array([float(x) for x in raw.split(",")], dtype=np.float32)
        except Exception as exc:
            log.warning("DB get_enrolled_voiceprint failed", error=str(exc))
        return None

    async def upsert_voiceprint(self, speaker_id: str, embedding: np.ndarray, display_name: str | None) -> None:
        if not self.pool:
            return
        vec_str = "[" + ",".join(f"{v:.8f}" for v in embedding) + "]"
        try:
            async with self.pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO enrolled_voiceprints (speaker_id, embedding, display_name, enrollment_quality)
                    VALUES ($1, $2::vector, $3, 0.85)
                    ON CONFLICT (speaker_id) DO UPDATE
                    SET embedding = EXCLUDED.embedding,
                        display_name = EXCLUDED.display_name,
                        updated_at = NOW()
                    """,
                    speaker_id,
                    vec_str,
                    display_name,
                )
        except Exception as exc:
            log.warning("DB upsert_voiceprint failed", error=str(exc))

    async def log_transaction_evaluation(
        self,
        session_id: str,
        amount_inr: float,
        beneficiary_vpa: str,
        risk_score: float,
        threat_level: ThreatLevel,
        decision: str,
        block_reason: str | None,
        http_status: int,
    ) -> None:
        if not self.pool:
            return
        try:
            async with self.pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO transaction_evaluations (
                        session_id, amount_inr, beneficiary_vpa, risk_score_at_eval,
                        threat_level_at_eval, decision, block_reason, http_status_code
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    """,
                    session_id, amount_inr, beneficiary_vpa, risk_score,
                    threat_level.value, decision, block_reason, http_status,
                )
        except Exception as exc:
            log.warning("DB log_transaction_evaluation failed", error=str(exc))

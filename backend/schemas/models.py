"""
VaaniShield — Schemas, Enums & Telemetry Data Models
===================================================
Defines domain data types, request/response models, and telemetry structures.
Preserves exact frozen contract signatures from Phase A0.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from pydantic import BaseModel, Field, field_validator


# ──────────────────────────────────────────────
# Enums
# ──────────────────────────────────────────────

class ThreatLevel(str, Enum):
    GREEN = "GREEN"
    AMBER = "AMBER"
    RED = "RED"


# ──────────────────────────────────────────────
# Internal Chunk Telemetry
# ──────────────────────────────────────────────

@dataclass
class ChunkTelemetry:
    session_id: str
    chunk_index: int
    # Tier 1
    tier1_risk_score: float = 0.0
    log_mel_mean: float = 0.0
    log_mel_std: float = 0.0
    # Prosody
    f0_mean_hz: float = 0.0
    f0_std_hz: float = 0.0
    f0_variance: float = 0.0
    jitter_local: float = 0.0
    shimmer_local: float = 0.0
    hnr_db: float = 0.0
    respiration_gap_ms: float = 0.0
    # Tier 2
    tier2_triggered: bool = False
    cosine_similarity: float | None = None
    tier2_risk_score: float | None = None
    # EMA
    ema_composite_score: float = 0.0
    ema_threat_level: ThreatLevel = ThreatLevel.GREEN
    # Latency
    tier1_latency_ms: float = 0.0
    tier2_latency_ms: float = 0.0
    total_latency_ms: float = 0.0
    # VAD
    vad_speech_ratio: float = 0.0
    chunk_discarded_silence: bool = False


# ──────────────────────────────────────────────
# PITCH Challenge Phrases (Hindi Phonetic Set)
# ──────────────────────────────────────────────

PITCH_CHALLENGES: list[str] = [
    "Kachha Papad, Pakka Papad, Kachha Papad, Pakka Papad",
    "Pital ke bartan mein papita peela peela",
    "Chandu ke chacha ne Chandu ki chachi ko chandni chowk mein chandni raat mein chaand dikha ke chaar kadam chalwaye",
    "Oonth uncha, unth ki peeth unchi, unchi peeth unth ki",
    "Kaala kadha, kadha kaala, kaali kaado mein kadha kaala",
]


# ──────────────────────────────────────────────
# Pydantic Request / Response Models
# ──────────────────────────────────────────────

class TransactionRequest(BaseModel):
    session_id: str = Field(..., description="Active WebSocket session identifier")
    amount_inr: float = Field(..., gt=0, description="Transaction amount in INR")
    beneficiary_vpa: str = Field(..., description="Beneficiary Virtual Payment Address (UPI VPA)")

    @field_validator("beneficiary_vpa")
    @classmethod
    def validate_vpa(cls, v: str) -> str:
        if "@" not in v:
            raise ValueError("beneficiary_vpa must be a valid UPI VPA (contains @)")
        return v.lower().strip()


class TransactionResponse(BaseModel):
    session_id: str
    decision: str
    risk_score: float
    threat_level: str
    reason: str | None = None
    http_status: int


class EnrollRequest(BaseModel):
    speaker_id: str = Field(..., description="Stable speaker identifier (hashed phone/customer ID)")
    audio_b64: str = Field(..., description="Base64-encoded 16kHz 16-bit mono WAV for enrollment")
    display_name: str | None = None


class WebSocketOutboundMessage(BaseModel):
    type: str
    session_id: str
    chunk_index: int
    risk_score: float
    threat_level: str
    jitter: float
    shimmer: float
    f0_mean: float
    f0_variance: float
    hnr_db: float
    vad_speech_ratio: float
    tier2_triggered: bool
    cosine_similarity: float | None
    latency_ms: float
    pitch_challenge: str | None
    timestamp_ms: int

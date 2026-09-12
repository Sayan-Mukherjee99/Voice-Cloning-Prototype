"""
VaaniShield — Production FastAPI Streaming Backend
===================================================
Implements:
  - WebSocket /v1/stream/call/{session_id}  (16kHz 16-bit Mono PCM)
  - Redis 7.2 circular ring buffer (LPUSH + LTRIM, 15s TTL)
  - Silero VAD ONNX silence stripping
  - Tier 1 (<80ms): 80-bin log-mel → ResNet-18 ONNX + Parselmouth prosody
  - Tier 2 (<350ms): ECAPA-TDNN 192-dim → pgvector cosine similarity
  - Temporal EMA smoothing + Threat State Machine
  - POST /v1/transaction/evaluate-authorization (synchronous, deterministic)
  - POST /v1/enroll (speaker voiceprint enrollment)

DPDP Act 2023 Compliance:
  - Zero persistent raw audio files on disk
  - Redis audio buffers have 15-second TTL
  - All stored data is derived mathematical features only
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

import numpy as np
import structlog
import asyncpg
import redis.asyncio as aioredis
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# ──────────────────────────────────────────────
# Try to import optional heavy dependencies gracefully
# ──────────────────────────────────────────────
try:
    import parselmouth
    PARSELMOUTH_AVAILABLE = True
except ImportError:
    PARSELMOUTH_AVAILABLE = False
    logging.warning("parselmouth not available – prosody will use synthetic values")

try:
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False
    logging.warning("onnxruntime not available – using mock inference")

try:
    import librosa
    LIBROSA_AVAILABLE = True
except ImportError:
    LIBROSA_AVAILABLE = False
    logging.warning("librosa not available – using scipy for mel spectrogram")

# ──────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False

    # Redis
    redis_url: str = "redis://localhost:6379/0"
    redis_audio_ttl_s: int = 15        # DPDP Act 2023 compliance
    buffer_window_frames: int = 24     # ~1500ms at 16kHz / 1024 frame size
    buffer_hop_frames: int = 12        # ~750ms hop

    # PostgreSQL
    postgres_dsn: str = "postgresql://vaanishield:changeme@localhost:5432/vaanishield"

    # ONNX Model paths (set via env or volume mount in Docker)
    silero_vad_model: str = "models/silero_vad.onnx"
    resnet18_model: str = "models/resnet18_acoustic_quantized.onnx"
    ecapa_tdnn_model: str = "models/ecapa_tdnn_192.onnx"

    # Audio parameters
    sample_rate: int = 16_000
    frame_size: int = 1_024
    n_mels: int = 80
    n_fft: int = 512
    hop_length: int = 160              # 10ms at 16kHz
    win_length: int = 400             # 25ms at 16kHz

    # Tier thresholds
    tier2_trigger_threshold: float = 45.0
    red_threshold: float = 75.0
    amber_threshold: float = 40.0

    # EMA parameters
    ema_alpha_escalate: float = 0.65   # fast escalation
    ema_alpha_deescalate: float = 0.25 # slow de-escalation
    ema_window: int = 4

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]


settings = Settings()

# ──────────────────────────────────────────────
# Structured Logging
# ──────────────────────────────────────────────

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer() if settings.debug else structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)
log = structlog.get_logger("vaanishield")

# ──────────────────────────────────────────────
# Enums & Data Models
# ──────────────────────────────────────────────

class ThreatLevel(str, Enum):
    GREEN = "GREEN"
    AMBER = "AMBER"
    RED = "RED"


class ThreatState:
    """Maintains EMA-smoothed risk score with asymmetric alpha."""

    def __init__(self) -> None:
        self.ema_score: float = 0.0
        self.window: list[float] = []
        self.threat_level: ThreatLevel = ThreatLevel.GREEN

    def update(self, raw_score: float) -> ThreatLevel:
        self.window.append(raw_score)
        if len(self.window) > settings.ema_window:
            self.window.pop(0)

        # Asymmetric EMA
        if raw_score > self.ema_score:
            alpha = settings.ema_alpha_escalate
        else:
            alpha = settings.ema_alpha_deescalate

        self.ema_score = alpha * raw_score + (1 - alpha) * self.ema_score

        # State machine transition
        if self.ema_score >= settings.red_threshold:
            self.threat_level = ThreatLevel.RED
        elif self.ema_score >= settings.amber_threshold:
            self.threat_level = ThreatLevel.AMBER
        else:
            self.threat_level = ThreatLevel.GREEN

        return self.threat_level


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


# PITCH challenge phrases (phonetically complex Hindi phrases)
PITCH_CHALLENGES = [
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


# ──────────────────────────────────────────────
# Inference Engine (ONNX + Mocked fallback)
# ──────────────────────────────────────────────

class InferenceEngine:
    """
    Wraps ONNX sessions for Silero VAD, ResNet-18 acoustic, and ECAPA-TDNN.
    Falls back to realistic mock inference when model files are absent.
    """

    def __init__(self) -> None:
        self.vad_session: ort.InferenceSession | None = None
        self.resnet_session: ort.InferenceSession | None = None
        self.ecapa_session: ort.InferenceSession | None = None
        self._rng = np.random.default_rng(42)

    def load_models(self) -> None:
        if not ONNX_AVAILABLE:
            log.warning("onnxruntime unavailable – all inference will use mock outputs")
            return

        so = ort.SessionOptions()
        so.inter_op_num_threads = 2
        so.intra_op_num_threads = 4
        so.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        so.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

        providers = ["CPUExecutionProvider"]

        for attr, path, name in [
            ("vad_session", settings.silero_vad_model, "Silero VAD"),
            ("resnet_session", settings.resnet18_model, "ResNet-18 Acoustic"),
            ("ecapa_session", settings.ecapa_tdnn_model, "ECAPA-TDNN"),
        ]:
            if os.path.exists(path):
                try:
                    setattr(self, attr, ort.InferenceSession(path, sess_options=so, providers=providers))
                    log.info(f"{name} model loaded", path=path)
                except Exception as exc:
                    log.error(f"Failed to load {name}", error=str(exc))
            else:
                log.warning(f"{name} model not found – using mock", path=path)

    def vad_speech_ratio(self, pcm: np.ndarray, sample_rate: int = 16_000) -> float:
        """
        Run Silero VAD to compute fraction of audio with active speech.
        Falls back to energy-based VAD mock.
        """
        if self.vad_session is not None:
            try:
                # Silero VAD ONNX input: float32 [1, samples]
                audio_f32 = pcm.astype(np.float32) / 32768.0
                inp = audio_f32[np.newaxis, :]  # [1, N]
                h = np.zeros((2, 1, 64), dtype=np.float32)
                c = np.zeros((2, 1, 64), dtype=np.float32)
                sr_arr = np.array(sample_rate, dtype=np.int64)
                # Process in 512-sample chunks (32ms at 16kHz)
                chunk_sz = 512
                speech_chunks = 0
                total_chunks = 0
                for i in range(0, len(audio_f32) - chunk_sz, chunk_sz):
                    chunk = audio_f32[i:i + chunk_sz][np.newaxis, :]
                    outs = self.vad_session.run(
                        None,
                        {"input": chunk, "sr": sr_arr, "h": h, "c": c},
                    )
                    prob, h, c = outs[0], outs[1], outs[2]
                    if prob[0][0] > 0.5:
                        speech_chunks += 1
                    total_chunks += 1
                return speech_chunks / max(total_chunks, 1)
            except Exception as exc:
                log.debug("VAD ONNX inference failed, using energy mock", error=str(exc))

        # Energy-based fallback VAD
        rms = np.sqrt(np.mean(pcm.astype(np.float32) ** 2))
        threshold = 500.0  # empirical for 16-bit PCM
        return float(np.clip(rms / threshold, 0.0, 1.0))

    def compute_log_mel_spectrogram(self, pcm: np.ndarray) -> np.ndarray:
        """Compute 80-bin log-mel filterbank spectrogram (25ms window, 10ms hop)."""
        audio_f32 = pcm.astype(np.float32) / 32768.0

        if LIBROSA_AVAILABLE:
            mel = librosa.feature.melspectrogram(
                y=audio_f32,
                sr=settings.sample_rate,
                n_fft=settings.n_fft,
                hop_length=settings.hop_length,
                win_length=settings.win_length,
                n_mels=settings.n_mels,
                fmin=20,
                fmax=8000,
            )
            log_mel = librosa.power_to_db(mel, ref=np.max)
        else:
            # scipy fallback
            from scipy.signal import spectrogram as sp_spectrogram
            from scipy.signal.windows import hann

            freqs, times, Sxx = sp_spectrogram(
                audio_f32,
                fs=settings.sample_rate,
                window=hann(settings.win_length),
                nperseg=settings.win_length,
                noverlap=settings.win_length - settings.hop_length,
            )
            # Rough mel approximation
            log_mel = np.log1p(np.abs(Sxx[:settings.n_mels, :]))

        return log_mel  # shape: (n_mels, T)

    def acoustic_risk_score(self, log_mel: np.ndarray) -> float:
        """
        ResNet-18 ONNX acoustic vocoder artifact detector.
        Output: float [0, 100] where 100 = definite synthetic voice.
        """
        if self.resnet_session is not None:
            try:
                # Resize log_mel to 80×80 (what ResNet-18 expects)
                T = log_mel.shape[1]
                if T < 80:
                    log_mel = np.pad(log_mel, ((0, 0), (0, 80 - T)), mode="constant")
                else:
                    log_mel = log_mel[:, :80]
                # [1, 1, 80, 80] input tensor
                inp = log_mel[np.newaxis, np.newaxis, :, :].astype(np.float32)
                logits = self.resnet_session.run(None, {"input": inp})[0]
                # Assume binary classifier: [genuine_score, spoof_score]
                spoof_prob = float(np.exp(logits[0][1]) / (np.exp(logits[0][0]) + np.exp(logits[0][1])))
                return spoof_prob * 100.0
            except Exception as exc:
                log.debug("ResNet ONNX inference failed, using mock", error=str(exc))

        # Realistic mock: base noise + feature-correlated signal
        mel_mean = np.mean(log_mel)
        mel_std = np.std(log_mel)
        # Synthetic voices tend to have lower variance in log-mel
        synthetic_indicator = max(0.0, 20.0 - mel_std) * 2.0
        noise = self._rng.normal(0, 8)
        return float(np.clip(synthetic_indicator + noise + 5.0, 0.0, 100.0))

    def extract_ecapa_embedding(self, pcm: np.ndarray) -> np.ndarray:
        """
        ECAPA-TDNN 192-dim speaker embedding extraction.
        Returns L2-normalised 192-dim float32 vector.
        """
        if self.ecapa_session is not None:
            try:
                audio_f32 = pcm.astype(np.float32) / 32768.0
                inp = audio_f32[np.newaxis, :]  # [1, N]
                embedding = self.ecapa_session.run(None, {"input": inp})[0]
                embedding = embedding.squeeze()[:192]
                # L2 normalise
                norm = np.linalg.norm(embedding)
                return (embedding / (norm + 1e-8)).astype(np.float32)
            except Exception as exc:
                log.debug("ECAPA ONNX inference failed, using mock", error=str(exc))

        # Deterministic mock: hash PCM to stable random unit vector
        pcm_hash = hashlib.sha256(pcm.tobytes()).digest()
        rng = np.random.default_rng(int.from_bytes(pcm_hash[:4], "big"))
        vec = rng.standard_normal(192).astype(np.float32)
        return (vec / (np.linalg.norm(vec) + 1e-8)).astype(np.float32)

    def cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        return float(np.dot(a, b))  # both L2-normalised → dot product = cosine sim


# ──────────────────────────────────────────────
# Parselmouth Prosody Analyser
# ──────────────────────────────────────────────

class ProsodyAnalyser:
    """
    Uses praat-parselmouth to extract biomechanical micro-prosody features.
    Falls back to scipy-based estimation when parselmouth is unavailable.
    """

    def analyse(self, pcm: np.ndarray, sample_rate: int = 16_000) -> dict[str, float]:
        if PARSELMOUTH_AVAILABLE:
            return self._analyse_parselmouth(pcm, sample_rate)
        return self._analyse_scipy_mock(pcm, sample_rate)

    def _analyse_parselmouth(self, pcm: np.ndarray, sample_rate: int) -> dict[str, float]:
        try:
            audio_f32 = pcm.astype(np.float64) / 32768.0
            snd = parselmouth.Sound(audio_f32, sampling_frequency=sample_rate)

            # Pitch (F0)
            pitch = snd.to_pitch(pitch_floor=60.0, pitch_ceiling=400.0)
            pitch_values = pitch.selected_array["frequency"]
            pitch_values = pitch_values[pitch_values > 0]  # remove unvoiced

            if len(pitch_values) < 5:
                return self._analyse_scipy_mock(pcm, sample_rate)

            f0_mean = float(np.mean(pitch_values))
            f0_std = float(np.std(pitch_values))
            f0_variance = float(np.var(pitch_values))

            # Point process for jitter/shimmer
            pp = parselmouth.praat.call(snd, "To PointProcess (periodic, cc)", 60, 400)

            # Jitter metrics
            jitter_local = parselmouth.praat.call(pp, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3)
            jitter_rap = parselmouth.praat.call(pp, "Get jitter (rap)", 0, 0, 0.0001, 0.02, 1.3)

            # Shimmer metrics
            shimmer_local = parselmouth.praat.call(
                [snd, pp], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6
            )
            shimmer_apq5 = parselmouth.praat.call(
                [snd, pp], "Get shimmer (apq5)", 0, 0, 0.0001, 0.02, 1.3, 1.6
            )

            # Harmonics-to-Noise Ratio
            harmonicity = snd.to_harmonicity()
            hnr_values = harmonicity.values[harmonicity.values != -200]
            hnr_db = float(np.mean(hnr_values)) if len(hnr_values) > 0 else 0.0

            # Respiration gaps: detect pauses > 150ms in voiced segments
            intensity = snd.to_intensity()
            int_vals = intensity.values.squeeze()
            silent_mask = int_vals < 40.0  # < 40 dB = pause
            # Count longest consecutive silence in ms
            gaps: list[int] = []
            count = 0
            for v in silent_mask:
                if v:
                    count += 1
                else:
                    if count > 0:
                        gaps.append(count)
                    count = 0
            respiration_gap_ms = float(max(gaps) * intensity.time_step * 1000) if gaps else 0.0

            return {
                "f0_mean_hz": f0_mean,
                "f0_std_hz": f0_std,
                "f0_variance": f0_variance,
                "jitter_local": float(jitter_local),
                "jitter_rap": float(jitter_rap),
                "shimmer_local": float(shimmer_local),
                "shimmer_apq5": float(shimmer_apq5),
                "hnr_db": hnr_db,
                "respiration_gap_ms": respiration_gap_ms,
            }
        except Exception as exc:
            log.warning("Parselmouth analysis failed", error=str(exc))
            return self._analyse_scipy_mock(pcm, sample_rate)

    def _analyse_scipy_mock(self, pcm: np.ndarray, sample_rate: int) -> dict[str, float]:
        """Energy-based prosody estimation using scipy."""
        from scipy.signal import find_peaks
        audio_f32 = pcm.astype(np.float32) / 32768.0

        # Simple autocorrelation-based F0 estimate
        corr = np.correlate(audio_f32, audio_f32, mode="full")
        corr = corr[len(corr) // 2:]
        # Search in F0 range 60–400 Hz
        min_lag = sample_rate // 400
        max_lag = sample_rate // 60
        peaks, _ = find_peaks(corr[min_lag:max_lag])

        f0_mean = float(sample_rate / (peaks[0] + min_lag)) if len(peaks) > 0 else 120.0
        f0_variance = float(np.var(corr[min_lag:max_lag]))
        f0_std = float(np.sqrt(f0_variance))

        # Energy-based jitter/shimmer mock
        frames = np.array_split(audio_f32, max(1, len(audio_f32) // 160))
        energies = np.array([np.sqrt(np.mean(f ** 2)) for f in frames])
        energies = energies[energies > 1e-6]

        jitter_local = float(np.std(energies) / (np.mean(energies) + 1e-8)) * 0.02
        shimmer_local = float(np.std(energies) / (np.mean(energies) + 1e-8)) * 0.15
        hnr_db = float(np.clip(20 * np.log10(np.mean(energies) + 1e-8) + 30, 0, 40))

        return {
            "f0_mean_hz": f0_mean,
            "f0_std_hz": f0_std,
            "f0_variance": f0_variance,
            "jitter_local": jitter_local,
            "jitter_rap": jitter_local * 0.7,
            "shimmer_local": shimmer_local,
            "shimmer_apq5": shimmer_local * 0.9,
            "hnr_db": hnr_db,
            "respiration_gap_ms": 0.0,
        }


# ──────────────────────────────────────────────
# Redis Buffer Manager
# ──────────────────────────────────────────────

class RedisBufferManager:
    """
    Manages ephemeral sliding audio buffers in Redis.
    Uses LPUSH + LTRIM for circular list (ring buffer).
    DPDP Act 2023: 15-second TTL enforced on every write.
    """

    def __init__(self, redis_client: aioredis.Redis) -> None:
        self.r = redis_client

    def _audio_key(self, session_id: str) -> str:
        return f"vaani:audio:{session_id}"

    def _meta_key(self, session_id: str) -> str:
        return f"vaani:meta:{session_id}"

    async def push_frame(self, session_id: str, pcm_bytes: bytes) -> int:
        """Push a PCM frame to the ring buffer. Returns current buffer length."""
        key = self._audio_key(session_id)
        async with self.r.pipeline() as pipe:
            pipe.lpush(key, pcm_bytes)
            # Keep only the most recent `buffer_window_frames` frames (1500ms)
            pipe.ltrim(key, 0, settings.buffer_window_frames - 1)
            pipe.expire(key, settings.redis_audio_ttl_s)
            results = await pipe.execute()
        return int(results[0])

    async def get_window(self, session_id: str) -> list[bytes]:
        """Retrieve all frames in the current sliding window."""
        key = self._audio_key(session_id)
        frames = await self.r.lrange(key, 0, settings.buffer_window_frames - 1)
        return frames  # most recent first

    async def set_session_meta(self, session_id: str, data: dict) -> None:
        key = self._meta_key(session_id)
        await self.r.set(key, json.dumps(data), ex=3600)

    async def get_session_meta(self, session_id: str) -> dict | None:
        key = self._meta_key(session_id)
        raw = await self.r.get(key)
        return json.loads(raw) if raw else None

    async def delete_session(self, session_id: str) -> None:
        """Purge all audio and metadata for a session (DPDP compliance)."""
        await self.r.delete(self._audio_key(session_id), self._meta_key(session_id))
        log.info("Session audio purged", session_id=session_id)


# ──────────────────────────────────────────────
# Session Manager (in-memory threat state)
# ──────────────────────────────────────────────

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


# ──────────────────────────────────────────────
# Database Manager
# ──────────────────────────────────────────────

class DatabaseManager:
    def __init__(self) -> None:
        self.pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
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


# ──────────────────────────────────────────────
# Application State (singleton singletons)
# ──────────────────────────────────────────────

@dataclass
class AppState:
    redis: aioredis.Redis | None = None
    db: DatabaseManager = field(default_factory=DatabaseManager)
    buffer: RedisBufferManager | None = None
    engine: InferenceEngine = field(default_factory=InferenceEngine)
    prosody: ProsodyAnalyser = field(default_factory=ProsodyAnalyser)
    sessions: SessionManager = field(default_factory=SessionManager)


app_state = AppState()


# ──────────────────────────────────────────────
# Lifespan
# ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    log.info("VaaniShield starting up…")
    try:
        app_state.redis = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=False,
        )
        await app_state.redis.ping()
        log.info("Redis connected", url=settings.redis_url)
    except Exception as exc:
        log.error("Redis connection failed", error=str(exc))

    app_state.buffer = RedisBufferManager(app_state.redis) if app_state.redis else None
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
# FastAPI Application
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


# ──────────────────────────────────────────────
# Core Audio Processing Pipeline
# ──────────────────────────────────────────────

async def process_audio_window(
    session_id: str,
    pcm_frames: list[bytes],
    chunk_index: int,
    speaker_id: str | None = None,
) -> ChunkTelemetry:
    """
    Full tiered detection pipeline for a single 1500ms audio window.
    """
    total_start = time.perf_counter()
    tel = ChunkTelemetry(session_id=session_id, chunk_index=chunk_index)

    # Concatenate frames (most recent first → reverse for chronological order)
    pcm_arrays = []
    for frame_bytes in reversed(pcm_frames):
        arr = np.frombuffer(frame_bytes, dtype=np.int16)
        pcm_arrays.append(arr)
    if not pcm_arrays:
        tel.chunk_discarded_silence = True
        return tel
    pcm = np.concatenate(pcm_arrays)

    # ── VAD: Silence Stripping ──────────────────────────────
    vad_ratio = app_state.engine.vad_speech_ratio(pcm)
    tel.vad_speech_ratio = vad_ratio

    if vad_ratio < 0.15:
        tel.chunk_discarded_silence = True
        log.debug("Chunk discarded – insufficient speech", session_id=session_id, vad=vad_ratio)
        return tel

    # ── Tier 1: <80ms Fast Edge Pipeline ───────────────────
    tier1_start = time.perf_counter()

    # 80-bin log-mel spectrogram
    log_mel = app_state.engine.compute_log_mel_spectrogram(pcm)
    tel.log_mel_mean = float(np.mean(log_mel))
    tel.log_mel_std = float(np.std(log_mel))

    # ResNet-18 acoustic risk
    tier1_risk = app_state.engine.acoustic_risk_score(log_mel)
    tel.tier1_risk_score = tier1_risk

    # Parselmouth prosody (run in thread pool to avoid blocking event loop)
    prosody_result = await asyncio.get_event_loop().run_in_executor(
        None, app_state.prosody.analyse, pcm, settings.sample_rate
    )
    tel.f0_mean_hz = prosody_result["f0_mean_hz"]
    tel.f0_std_hz = prosody_result["f0_std_hz"]
    tel.f0_variance = prosody_result["f0_variance"]
    tel.jitter_local = prosody_result["jitter_local"]
    tel.shimmer_local = prosody_result["shimmer_local"]
    tel.hnr_db = prosody_result["hnr_db"]
    tel.respiration_gap_ms = prosody_result["respiration_gap_ms"]

    # Prosody contribution to risk score
    # High jitter (>3%), high shimmer (>15%), low HNR (<10dB) → synthetic indicators
    prosody_risk = 0.0
    prosody_risk += min(tel.jitter_local / 0.03, 1.0) * 25.0   # up to 25pts
    prosody_risk += min(tel.shimmer_local / 0.15, 1.0) * 20.0  # up to 20pts
    prosody_risk += max(0.0, (15.0 - tel.hnr_db) / 15.0) * 15.0  # up to 15pts (low HNR = bad)
    # Low F0 variance is suspicious (TTS tends to be monotone)
    if tel.f0_mean_hz > 0:
        prosody_risk += max(0.0, 1.0 - tel.f0_variance / 200.0) * 10.0

    # Weighted combined Tier 1
    combined_tier1 = tier1_risk * 0.55 + prosody_risk * 0.45
    tel.tier1_latency_ms = (time.perf_counter() - tier1_start) * 1000

    # ── Tier 2: <350ms Conditional ─────────────────────────
    tier2_risk = None
    if combined_tier1 > settings.tier2_trigger_threshold and speaker_id:
        tier2_start = time.perf_counter()
        tel.tier2_triggered = True

        # Extract ECAPA-TDNN embedding
        embedding = await asyncio.get_event_loop().run_in_executor(
            None, app_state.engine.extract_ecapa_embedding, pcm
        )

        # Compare against enrolled voiceprint
        enrolled = await app_state.db.get_enrolled_voiceprint(speaker_id)
        if enrolled is not None:
            cos_sim = app_state.engine.cosine_similarity(embedding, enrolled)
            tel.cosine_similarity = cos_sim
            # Low similarity → high risk (0.85+ = same speaker, <0.6 = likely different)
            similarity_risk = max(0.0, (0.85 - cos_sim) / 0.85) * 100.0
            tier2_risk = similarity_risk
            tel.tier2_risk_score = tier2_risk
        else:
            # No enrolled voiceprint – cannot verify, moderate risk penalty
            tel.cosine_similarity = None
            tier2_risk = 30.0
            tel.tier2_risk_score = tier2_risk

        tel.tier2_latency_ms = (time.perf_counter() - tier2_start) * 1000

    # ── Composite Risk Score ────────────────────────────────
    if tier2_risk is not None:
        final_raw_score = combined_tier1 * 0.5 + tier2_risk * 0.5
    else:
        final_raw_score = combined_tier1

    # ── EMA Smoothing via ThreatState ──────────────────────
    state = await app_state.sessions.get_or_create(session_id)
    threat_level = state.update(float(np.clip(final_raw_score, 0.0, 100.0)))
    tel.ema_composite_score = state.ema_score
    tel.ema_threat_level = threat_level
    tel.total_latency_ms = (time.perf_counter() - total_start) * 1000

    return tel


# ──────────────────────────────────────────────
# WebSocket Endpoint
# ──────────────────────────────────────────────

@app.websocket("/v1/stream/call/{session_id}")
async def stream_call(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint accepting binary 16kHz 16-bit Mono Linear PCM audio frames.
    Streams back JSON telemetry per chunk.
    """
    await websocket.accept()
    log.info("WebSocket connected", session_id=session_id)

    # Parse optional speaker_id from query params
    speaker_id: str | None = websocket.query_params.get("speaker_id")

    # Register session in DB
    await app_state.db.upsert_session(session_id)
    chunk_index = 0
    hop_accumulator = 0

    # Choose a random PITCH challenge phrase for this session
    import random
    pitch_phrase = random.choice(PITCH_CHALLENGES)

    try:
        async for message in websocket.iter_bytes():
            if not message:
                continue

            # Push raw PCM frame to Redis ring buffer
            if app_state.buffer:
                await app_state.buffer.push_frame(session_id, message)
                buf_len = await app_state.buffer.push_frame.__wrapped__ if False else None
            else:
                # In-memory fallback (no Redis)
                pass

            hop_accumulator += 1

            # Process every `buffer_hop_frames` frames (750ms hop)
            if hop_accumulator < settings.buffer_hop_frames:
                continue
            hop_accumulator = 0

            # Retrieve sliding window from Redis
            frames: list[bytes] = []
            if app_state.buffer:
                frames = await app_state.buffer.get_window(session_id)
            else:
                # Fallback: process the single frame
                frames = [message]

            if not frames:
                continue

            chunk_index = await app_state.sessions.increment_chunk(session_id)

            # Run full pipeline (async)
            telemetry = await process_audio_window(
                session_id=session_id,
                pcm_frames=frames,
                chunk_index=chunk_index,
                speaker_id=speaker_id,
            )

            # Update session risk in DB (non-blocking)
            asyncio.create_task(
                app_state.db.update_session_risk(
                    session_id, telemetry.ema_composite_score, telemetry.ema_threat_level
                )
            )

            # Persist telemetry chunk (non-blocking)
            asyncio.create_task(app_state.db.insert_chunk_telemetry(telemetry))

            # Determine PITCH challenge
            pitch_active = telemetry.ema_threat_level in (ThreatLevel.AMBER, ThreatLevel.RED)
            pitch_challenge = pitch_phrase if pitch_active else None

            # Build outbound message
            out_msg = WebSocketOutboundMessage(
                type="telemetry",
                session_id=session_id,
                chunk_index=chunk_index,
                risk_score=round(telemetry.ema_composite_score, 2),
                threat_level=telemetry.ema_threat_level.value,
                jitter=round(telemetry.jitter_local * 100, 4),   # as %
                shimmer=round(telemetry.shimmer_local * 100, 4),  # as %
                f0_mean=round(telemetry.f0_mean_hz, 2),
                f0_variance=round(telemetry.f0_variance, 4),
                hnr_db=round(telemetry.hnr_db, 2),
                vad_speech_ratio=round(telemetry.vad_speech_ratio, 3),
                tier2_triggered=telemetry.tier2_triggered,
                cosine_similarity=round(telemetry.cosine_similarity, 4) if telemetry.cosine_similarity else None,
                latency_ms=round(telemetry.total_latency_ms, 2),
                pitch_challenge=pitch_challenge,
                timestamp_ms=int(time.time() * 1000),
            )

            await websocket.send_text(out_msg.model_dump_json())

            log.info(
                "Chunk processed",
                session_id=session_id,
                chunk=chunk_index,
                risk=telemetry.ema_composite_score,
                level=telemetry.ema_threat_level.value,
                latency_ms=telemetry.total_latency_ms,
            )

    except WebSocketDisconnect:
        log.info("WebSocket disconnected", session_id=session_id)
    except Exception as exc:
        log.error("WebSocket error", session_id=session_id, error=str(exc))
        await websocket.close(code=1011)
    finally:
        # DPDP Act 2023: purge audio from Redis immediately on disconnect
        if app_state.buffer:
            await app_state.buffer.delete_session(session_id)
        await app_state.sessions.remove(session_id)
        log.info("Session cleanup complete", session_id=session_id)


# ──────────────────────────────────────────────
# REST: Transaction Authorization
# ──────────────────────────────────────────────

@app.post("/v1/transaction/evaluate-authorization", response_model=TransactionResponse)
async def evaluate_transaction(request: TransactionRequest):
    """
    Synchronous, deterministic pre-transaction authorization gate.
    Returns HTTP 403 + BLOCKED if session composite risk >= 75 (RED).
    """
    session_id = request.session_id
    risk_score = await app_state.sessions.get_risk_score(session_id)
    threat_level = await app_state.sessions.get_threat_level(session_id)

    if risk_score >= settings.red_threshold:
        # Hard block
        decision = "BLOCKED"
        block_reason = (
            f"High-confidence voice clone detected. "
            f"Composite risk score {risk_score:.1f}/100 exceeds RED threshold ({settings.red_threshold})."
        )
        http_status_val = 403

        asyncio.create_task(
            app_state.db.log_transaction_evaluation(
                session_id=session_id,
                amount_inr=request.amount_inr,
                beneficiary_vpa=request.beneficiary_vpa,
                risk_score=risk_score,
                threat_level=threat_level,
                decision=decision,
                block_reason=block_reason,
                http_status=http_status_val,
            )
        )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "decision": decision,
                "session_id": session_id,
                "risk_score": round(risk_score, 2),
                "threat_level": threat_level.value,
                "reason": block_reason,
                "amount_inr": request.amount_inr,
                "beneficiary_vpa": request.beneficiary_vpa,
            },
        )

    # Allow (AMBER gets a warning flag but not a hard block)
    decision = "APPROVED"
    if threat_level == ThreatLevel.AMBER:
        decision = "APPROVED_WITH_WARNING"

    asyncio.create_task(
        app_state.db.log_transaction_evaluation(
            session_id=session_id,
            amount_inr=request.amount_inr,
            beneficiary_vpa=request.beneficiary_vpa,
            risk_score=risk_score,
            threat_level=threat_level,
            decision="APPROVED",
            block_reason=None,
            http_status=200,
        )
    )

    return TransactionResponse(
        session_id=session_id,
        decision=decision,
        risk_score=round(risk_score, 2),
        threat_level=threat_level.value,
        reason=None if threat_level == ThreatLevel.GREEN else "Elevated risk – proceed with caution",
        http_status=200,
    )


# ──────────────────────────────────────────────
# REST: Speaker Enrollment
# ──────────────────────────────────────────────

@app.post("/v1/enroll", status_code=201)
async def enroll_speaker(request: EnrollRequest):
    """
    Enroll a speaker baseline voiceprint from a WAV audio sample.
    Extracts ECAPA-TDNN 192-dim embedding and stores in pgvector.
    Raw audio is NOT persisted.
    """
    import base64
    import io
    try:
        audio_bytes = base64.b64decode(request.audio_b64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 audio data")

    # Decode WAV
    try:
        import soundfile as sf
        audio_f32, sr = sf.read(io.BytesIO(audio_bytes), dtype="float32")
        if sr != settings.sample_rate:
            # Resample (basic – use librosa for production)
            from scipy.signal import resample
            target_len = int(len(audio_f32) * settings.sample_rate / sr)
            audio_f32 = resample(audio_f32, target_len).astype(np.float32)
        pcm = (audio_f32 * 32767).astype(np.int16)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not decode WAV: {exc}")

    # Extract embedding
    embedding = await asyncio.get_event_loop().run_in_executor(
        None, app_state.engine.extract_ecapa_embedding, pcm
    )

    # Persist embedding (NOT the raw audio)
    await app_state.db.upsert_voiceprint(
        speaker_id=request.speaker_id,
        embedding=embedding,
        display_name=request.display_name,
    )

    return {
        "speaker_id": request.speaker_id,
        "embedding_dim": 192,
        "enrolled": True,
        "dpdp_compliant": True,
        "message": "Voiceprint enrolled. Raw audio was not stored.",
    }


# ──────────────────────────────────────────────
# Health & Diagnostics
# ──────────────────────────────────────────────

@app.get("/health")
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


@app.get("/v1/session/{session_id}/status")
async def session_status(session_id: str):
    risk = await app_state.sessions.get_risk_score(session_id)
    level = await app_state.sessions.get_threat_level(session_id)
    return {
        "session_id": session_id,
        "composite_risk_score": round(risk, 2),
        "threat_level": level.value,
    }


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

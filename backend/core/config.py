"""
VaaniShield — Core Configuration & Structured Logging
=====================================================
Centralized environment settings and structured logger.
Preserves DPDP Act 2023 parameters, tier thresholds, audio specs,
and graceful dependency availability flags.
"""

from __future__ import annotations

import logging
from typing import Any
import structlog
from pydantic_settings import BaseSettings, SettingsConfigDict

# ──────────────────────────────────────────────
# Graceful dependency availability checks
# ──────────────────────────────────────────────

try:
    import parselmouth
    PARSELMOUTH_AVAILABLE = True
except ImportError:
    parselmouth = None  # type: ignore
    PARSELMOUTH_AVAILABLE = False
    logging.warning("parselmouth not available – prosody will use synthetic values")

try:
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except ImportError:
    ort = None  # type: ignore
    ONNX_AVAILABLE = False
    logging.warning("onnxruntime not available – using mock inference")

try:
    import librosa
    LIBROSA_AVAILABLE = True
except ImportError:
    librosa = None  # type: ignore
    LIBROSA_AVAILABLE = False
    logging.warning("librosa not available – using scipy for mel spectrogram")

try:
    import redis.asyncio as aioredis
    REDIS_AVAILABLE = True
except ImportError:
    aioredis = None  # type: ignore
    REDIS_AVAILABLE = False
    logging.warning("redis not available – using in-memory buffer fallback")

try:
    import asyncpg
    ASYNCPG_AVAILABLE = True
except ImportError:
    asyncpg = None  # type: ignore
    ASYNCPG_AVAILABLE = False
    logging.warning("asyncpg not available – database operations will run in fallback mode")


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

    # Phase B3: Offline Dataset & Manifest paths
    asvspoof_la_root: str = "datasets/LA/LA"
    manifest_dir: str = "data/manifests"

    def resolve_dataset_root(self) -> str:
        """Dynamically resolve ASVspoof 2019 LA root directory."""
        from pathlib import Path
        candidate = Path(self.asvspoof_la_root)
        if (candidate / "ASVspoof2019_LA_cm_protocols").is_dir():
            return str(candidate)
        # Check parent if double-nested or flat
        alt1 = candidate / "LA"
        if (alt1 / "ASVspoof2019_LA_cm_protocols").is_dir():
            return str(alt1)
        alt2 = Path("datasets/LA")
        if (alt2 / "ASVspoof2019_LA_cm_protocols").is_dir():
            return str(alt2)
        if (alt2 / "LA" / "ASVspoof2019_LA_cm_protocols").is_dir():
            return str(alt2 / "LA")
        return str(candidate)



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

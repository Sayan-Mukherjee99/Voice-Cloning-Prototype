"""
VaaniShield — Tiered Audio Detection Pipeline Service
=====================================================
Executes the tiered detection pipeline across a 1500ms sliding audio window:
  - Silence stripping (Silero VAD, discard if speech ratio < 0.15)
  - Tier 1 (<80ms): 80-bin log-mel filterbank + ResNet-18 vocoder detector + Parselmouth prosody
  - Tier 2 (<350ms): ECAPA-TDNN 192-dim speaker verification (conditional if Tier 1 > 45)
  - Composite risk fusion and asymmetric EMA ThreatState update
"""

from __future__ import annotations

import asyncio
import time
import numpy as np

try:
    from backend.core.config import settings, log
    from backend.core.state import app_state
    from backend.schemas.models import ChunkTelemetry
except ImportError:
    from core.config import settings, log
    from core.state import app_state
    from schemas.models import ChunkTelemetry


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

    # Concatenate frames (most recent first -> reverse for chronological order)
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
    # High jitter (>3%), high shimmer (>15%), low HNR (<10dB) -> synthetic indicators
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
            # Low similarity -> high risk (0.85+ = same speaker, <0.6 = likely different)
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

"""
VaaniShield — Speaker Voiceprint Enrollment Endpoint
====================================================
POST /v1/enroll
Enrolls a speaker baseline voiceprint from a WAV audio sample.
Extracts ECAPA-TDNN 192-dim embedding and stores in PostgreSQL pgvector.
DPDP Act 2023 compliant: Raw audio is NOT persisted.
"""

from __future__ import annotations

import asyncio
import base64
import io
import numpy as np
from fastapi import APIRouter, HTTPException

try:
    from backend.core.config import settings
    from backend.core.state import app_state
    from backend.schemas.models import EnrollRequest
except ImportError:
    from core.config import settings
    from core.state import app_state
    from schemas.models import EnrollRequest

router = APIRouter(tags=["enroll"])


@router.post("/v1/enroll", status_code=201)
async def enroll_speaker(request: EnrollRequest):
    """
    Enroll a speaker baseline voiceprint from a WAV audio sample.
    Extracts ECAPA-TDNN 192-dim embedding and stores in pgvector.
    Raw audio is NOT persisted.
    """
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

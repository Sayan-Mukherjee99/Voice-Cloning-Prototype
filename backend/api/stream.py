"""
VaaniShield — WebSocket Audio Streaming Endpoint
=================================================
WS /v1/stream/call/{session_id}
Receives binary 16kHz 16-bit Mono Linear PCM audio frames (1,024 samples = 2,048 bytes).
Streams back JSON telemetry per chunk with 14 telemetry fields.
Enforces DPDP Act 2023: immediate audio buffer purge upon disconnect.
"""

from __future__ import annotations

import asyncio
import random
import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

try:
    from backend.core.config import settings, log
    from backend.core.state import app_state
    from backend.schemas.models import (
        ThreatLevel,
        PITCH_CHALLENGES,
        WebSocketOutboundMessage,
    )
    from backend.services.pipeline import process_audio_window
except ImportError:
    from core.config import settings, log
    from core.state import app_state
    from schemas.models import (
        ThreatLevel,
        PITCH_CHALLENGES,
        WebSocketOutboundMessage,
    )
    from services.pipeline import process_audio_window

router = APIRouter(tags=["stream"])


@router.websocket("/v1/stream/call/{session_id}")
async def stream_call(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint accepting binary 16kHz 16-bit Mono Linear PCM audio frames.
    Streams back JSON telemetry per chunk.
    """
    await websocket.accept()
    log.info("WebSocket connected", session_id=session_id)

    speaker_id: str | None = websocket.query_params.get("speaker_id")
    expected_frame_bytes = settings.frame_size * 2  # 1024 * 2 = 2048

    # Register session in DB
    try:
        await app_state.db.upsert_session(session_id)
    except Exception as exc:
        log.warning("DB session init failed", session_id=session_id, error=str(exc))

    chunk_index = 0
    hop_accumulator = 0
    active_tasks: set[asyncio.Task] = set()

    # Choose a random PITCH challenge phrase for this session
    pitch_phrase = random.choice(PITCH_CHALLENGES)

    try:
        while True:
            try:
                message = await websocket.receive()
            except WebSocketDisconnect:
                log.info("WebSocket disconnected", session_id=session_id)
                break
            except Exception as exc:
                log.warning("WebSocket receive error", session_id=session_id, error=str(exc))
                break

            msg_type = message.get("type")
            if msg_type == "websocket.disconnect":
                log.info("WebSocket disconnect message received", session_id=session_id)
                break

            if msg_type != "websocket.receive":
                continue

            # Check message format
            raw_bytes = message.get("bytes")
            if raw_bytes is None:
                # Text message received: discard safely without crashing session
                log.debug(
                    "Non-binary message received, discarding safely",
                    session_id=session_id,
                )
                continue

            # Frame validation
            if len(raw_bytes) == 0:
                # Empty frame: discard safely
                continue

            if len(raw_bytes) != expected_frame_bytes or len(raw_bytes) % 2 != 0:
                # Invalid frame length: log and discard safely without terminating session
                log.debug(
                    "Invalid frame size received, discarding",
                    session_id=session_id,
                    expected=expected_frame_bytes,
                    actual=len(raw_bytes),
                )
                continue

            # Push validated raw PCM frame to Redis ring buffer
            if app_state.buffer:
                await app_state.buffer.push_frame(session_id, raw_bytes)

            hop_accumulator += 1

            # Process every `buffer_hop_frames` frames (750ms hop)
            if hop_accumulator < settings.buffer_hop_frames:
                continue
            hop_accumulator = 0

            # Retrieve sliding window from Redis / in-memory buffer
            frames: list[bytes] = []
            if app_state.buffer:
                frames = await app_state.buffer.get_window(session_id)
            else:
                frames = [raw_bytes]

            if not frames:
                continue

            chunk_index = await app_state.sessions.increment_chunk(session_id)

            # Run full pipeline with isolated error handling
            try:
                telemetry = await process_audio_window(
                    session_id=session_id,
                    pcm_frames=frames,
                    chunk_index=chunk_index,
                    speaker_id=speaker_id,
                )
            except Exception as exc:
                log.error(
                    "Error processing audio window, continuing session",
                    session_id=session_id,
                    chunk=chunk_index,
                    error=str(exc),
                )
                continue

            # Update session risk in DB (non-blocking with task tracking)
            task_risk = asyncio.create_task(
                app_state.db.update_session_risk(
                    session_id, telemetry.ema_composite_score, telemetry.ema_threat_level
                )
            )
            active_tasks.add(task_risk)
            task_risk.add_done_callback(active_tasks.discard)

            # Persist telemetry chunk (non-blocking with task tracking)
            task_tel = asyncio.create_task(app_state.db.insert_chunk_telemetry(telemetry))
            active_tasks.add(task_tel)
            task_tel.add_done_callback(active_tasks.discard)

            # Determine PITCH challenge
            pitch_active = telemetry.ema_threat_level in (ThreatLevel.AMBER, ThreatLevel.RED)
            pitch_challenge = pitch_phrase if pitch_active else None

            # Build outbound message matching frozen schema exactly
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

            try:
                await websocket.send_text(out_msg.model_dump_json())
            except Exception as exc:
                log.warning("Failed to send outbound telemetry", session_id=session_id, error=str(exc))
                break

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
        log.error("WebSocket unexpected error", session_id=session_id, error=str(exc))
        try:
            await websocket.close(code=1011)
        except Exception:
            pass
    finally:
        # Guarded multi-step cleanup (DPDP compliance: audio purged immediately)
        if app_state.buffer:
            try:
                await app_state.buffer.delete_session(session_id)
            except Exception as exc:
                log.warning("Buffer cleanup failed", session_id=session_id, error=str(exc))

        try:
            await app_state.sessions.remove(session_id)
        except Exception as exc:
            log.warning("Session state cleanup failed", session_id=session_id, error=str(exc))

        for task in list(active_tasks):
            if not task.done():
                task.cancel()

        log.info("Session cleanup complete", session_id=session_id)

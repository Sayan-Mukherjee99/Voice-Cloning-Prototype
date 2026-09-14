"""
VaaniShield — WebSocket Audio Streaming Stability Tests
========================================================
Tests for /v1/stream/call/{session_id}:
  - Valid 2,048-byte (1,024-sample) 16kHz 16-bit Mono Linear PCM frame ingestion
  - Invalid frame length rejection / safe discarding
  - Empty binary frame safe handling
  - Text message safe handling (no session crash)
  - Full session lifecycle and telemetry generation
  - Session isolation (two sessions do not cross-contaminate state or buffer)
  - Disconnect cleanup (DPDP buffer purge and state removal)
  - In-memory buffer fallback resilience
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import pytest
from fastapi.testclient import TestClient

from main import app, app_state, ThreatLevel, settings


def generate_valid_frame(freq: float = 440.0, sample_rate: int = 16000, num_samples: int = 1024) -> bytes:
    """Generate a single 2,048-byte frame of 16kHz 16-bit PCM sine wave."""
    t = np.linspace(0, num_samples / sample_rate, num_samples, endpoint=False)
    pcm = (np.sin(2 * np.pi * freq * t) * 16000).astype(np.int16)
    return pcm.tobytes()


def test_valid_audio_frame_ingestion():
    """Test sending valid 2,048-byte frames. Verifies server accepts and processes them."""
    client = TestClient(app)
    session_id = "test-valid-stream-01"
    valid_frame = generate_valid_frame()
    assert len(valid_frame) == 2048

    with client.websocket_connect(f"/v1/stream/call/{session_id}") as ws:
        # Send 12 frames to trigger hop analysis
        for _ in range(settings.buffer_hop_frames):
            ws.send_bytes(valid_frame)

        # Receive outbound telemetry
        telemetry = ws.receive_json()
        assert telemetry["type"] == "telemetry"
        assert telemetry["session_id"] == session_id
        assert telemetry["chunk_index"] >= 1
        assert "risk_score" in telemetry
        assert telemetry["threat_level"] in ("GREEN", "AMBER", "RED")
        assert "jitter" in telemetry
        assert "shimmer" in telemetry
        assert "f0_mean" in telemetry
        assert "latency_ms" in telemetry
        assert "timestamp_ms" in telemetry


def test_invalid_frame_length_handled_safely():
    """Test sending malformed frame sizes (e.g. 500 bytes, 1000 bytes).

    Server must safely drop invalid frames without terminating the session.
    """
    client = TestClient(app)
    session_id = "test-invalid-length-02"
    valid_frame = generate_valid_frame()

    with client.websocket_connect(f"/v1/stream/call/{session_id}") as ws:
        # Send invalid frames of wrong sizes
        ws.send_bytes(b"\x00" * 500)   # 500 bytes
        ws.send_bytes(b"\x00" * 1000)  # 1000 bytes
        ws.send_bytes(b"\x00" * 3)     # Odd bytes

        # Now send valid frames to verify session remains healthy and responsive
        for _ in range(settings.buffer_hop_frames):
            ws.send_bytes(valid_frame)

        # Should still generate valid telemetry for the valid frames
        telemetry = ws.receive_json()
        assert telemetry["session_id"] == session_id
        assert telemetry["chunk_index"] >= 1


def test_empty_frame_handled_safely():
    """Test sending empty bytes (0 bytes). Server should safely discard."""
    client = TestClient(app)
    session_id = "test-empty-frame-03"
    valid_frame = generate_valid_frame()

    with client.websocket_connect(f"/v1/stream/call/{session_id}") as ws:
        # Send empty frame
        ws.send_bytes(b"")

        # Send valid frames
        for _ in range(settings.buffer_hop_frames):
            ws.send_bytes(valid_frame)

        telemetry = ws.receive_json()
        assert telemetry["session_id"] == session_id
        assert telemetry["chunk_index"] >= 1


def test_text_message_does_not_crash_session():
    """Test sending text frames over the WebSocket.

    Server must safely ignore non-binary frames without closing the session with error.
    """
    client = TestClient(app)
    session_id = "test-text-msg-04"
    valid_frame = generate_valid_frame()

    with client.websocket_connect(f"/v1/stream/call/{session_id}") as ws:
        # Send non-binary text messages
        ws.send_text('{"action": "ping"}')
        ws.send_text("Hello server!")

        # Followed by valid audio
        for _ in range(settings.buffer_hop_frames):
            ws.send_bytes(valid_frame)

        telemetry = ws.receive_json()
        assert telemetry["session_id"] == session_id
        assert telemetry["chunk_index"] >= 1


def test_session_lifecycle_and_cleanup():
    """Test session lifecycle and verify DPDP audio buffer and state cleanup upon disconnect."""
    client = TestClient(app)
    session_id = "test-lifecycle-cleanup-05"
    valid_frame = generate_valid_frame()

    with client.websocket_connect(f"/v1/stream/call/{session_id}") as ws:
        ws.send_bytes(valid_frame)
        # Verify in-memory buffer holds frames during session
        if app_state.buffer:
            frames = list(app_state.buffer._in_memory.get(session_id, []))
            assert len(frames) >= 1

    # After websocket context exits (disconnect occurred):
    # Verify buffer is purged for this session
    if app_state.buffer:
        assert session_id not in app_state.buffer._in_memory

    # Verify session threat state is removed
    assert session_id not in app_state.sessions._states
    assert session_id not in app_state.sessions._chunk_counters


def test_session_isolation():
    """Test that two separate session IDs maintain independent buffers and threat states."""
    client = TestClient(app)
    session_a = "test-isolation-A"
    session_b = "test-isolation-B"
    frame_a = generate_valid_frame(freq=300.0)
    frame_b = generate_valid_frame(freq=800.0)

    with client.websocket_connect(f"/v1/stream/call/{session_a}") as ws_a:
        with client.websocket_connect(f"/v1/stream/call/{session_b}") as ws_b:
            # Send 12 frames to A
            for _ in range(settings.buffer_hop_frames):
                ws_a.send_bytes(frame_a)

            # Send only 2 frames to B (below hop threshold)
            ws_b.send_bytes(frame_b)
            ws_b.send_bytes(frame_b)

            # A receives telemetry
            msg_a = ws_a.receive_json()
            assert msg_a["session_id"] == session_a
            assert msg_a["chunk_index"] == 1

            # Verify buffer isolation
            if app_state.buffer:
                buf_a = app_state.buffer._in_memory.get(session_a, [])
                buf_b = app_state.buffer._in_memory.get(session_b, [])
                assert len(buf_a) >= 12
                assert len(buf_b) == 2


def test_redis_fallback_resilience():
    """Verify that buffer manager operates safely with None redis client (in-memory fallback)."""
    from backend.audio.buffer import RedisBufferManager

    fallback_buffer = RedisBufferManager(redis_client=None)
    session_id = "test-fallback-06"
    pcm = b"\x01\x02" * 1024

    # Push frames
    import asyncio
    asyncio.run(fallback_buffer.push_frame(session_id, pcm))
    window = asyncio.run(fallback_buffer.get_window(session_id))
    assert len(window) == 1
    assert window[0] == pcm

    # Purge
    asyncio.run(fallback_buffer.delete_session(session_id))
    window_after = asyncio.run(fallback_buffer.get_window(session_id))
    assert len(window_after) == 0

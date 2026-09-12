import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from httpx import AsyncClient, ASGITransport
from main import app, app_state, ThreatLevel, settings

@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "onnx_available" in data

@pytest.mark.asyncio
async def test_transaction_evaluation_approved():
    session_id = "test-session-green"
    state = await app_state.sessions.get_or_create(session_id)
    state.ema_score = 15.0
    state.threat_level = ThreatLevel.GREEN

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/v1/transaction/evaluate-authorization",
            json={
                "session_id": session_id,
                "amount_inr": 15000.0,
                "beneficiary_vpa": "merchant@oksbi",
            },
        )
    assert response.status_code == 200
    data = response.json()
    assert data["decision"] == "APPROVED"
    assert data["threat_level"] == "GREEN"

@pytest.mark.asyncio
async def test_transaction_evaluation_blocked_on_red():
    session_id = "test-session-red"
    state = await app_state.sessions.get_or_create(session_id)
    state.ema_score = 85.0
    state.threat_level = ThreatLevel.RED

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/v1/transaction/evaluate-authorization",
            json={
                "session_id": session_id,
                "amount_inr": 150000.0,
                "beneficiary_vpa": "attacker@okhdfc",
            },
        )
    assert response.status_code == 403
    data = response.json()
    assert data["detail"]["decision"] == "BLOCKED"
    assert "High-confidence voice clone detected" in data["detail"]["reason"]

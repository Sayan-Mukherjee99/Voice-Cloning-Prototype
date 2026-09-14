"""
VaaniShield — Session Status Endpoint
=====================================
GET /v1/session/{session_id}/status
Returns active composite risk score and threat level for an ongoing session.
"""

from __future__ import annotations

from fastapi import APIRouter

try:
    from backend.core.state import app_state
except ImportError:
    from core.state import app_state

router = APIRouter(tags=["session"])


@router.get("/v1/session/{session_id}/status")
async def session_status(session_id: str):
    risk = await app_state.sessions.get_risk_score(session_id)
    level = await app_state.sessions.get_threat_level(session_id)
    return {
        "session_id": session_id,
        "composite_risk_score": round(risk, 2),
        "threat_level": level.value,
    }

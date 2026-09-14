"""
VaaniShield — Transaction Authorization Gate Endpoint
======================================================
POST /v1/transaction/evaluate-authorization
Synchronous, deterministic pre-transaction authorization gate.
Returns HTTP 403 + BLOCKED if session composite risk >= 75.0 (RED).
Returns HTTP 200 + APPROVED (or APPROVED_WITH_WARNING for AMBER).
"""

from __future__ import annotations

import asyncio
from fastapi import APIRouter, HTTPException, status

try:
    from backend.core.config import settings
    from backend.core.state import app_state
    from backend.schemas.models import ThreatLevel, TransactionRequest, TransactionResponse
except ImportError:
    from core.config import settings
    from core.state import app_state
    from schemas.models import ThreatLevel, TransactionRequest, TransactionResponse

router = APIRouter(tags=["transaction"])


@router.post("/v1/transaction/evaluate-authorization", response_model=TransactionResponse)
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

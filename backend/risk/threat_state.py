"""
VaaniShield — Threat State & Asymmetric EMA Smoothing
=====================================================
Maintains temporal risk smoothing using asymmetric alpha:
  - Fast escalation (alpha = 0.65) to quickly flag synthetic voice anomalies.
  - Slow de-escalation (alpha = 0.25) to prevent spoofing evasion via silence/genuine segments.
  - State machine thresholds: RED >= 75.0, AMBER >= 40.0, GREEN < 40.0.
"""

from __future__ import annotations

try:
    from backend.core.config import settings
    from backend.schemas.models import ThreatLevel
except ImportError:
    from core.config import settings
    from schemas.models import ThreatLevel


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

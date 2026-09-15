"""
VaaniShield: AI Models Package
==============================
Exported detector architectures and interfaces.
"""

from backend.ai.models.base import BaseDeepfakeDetector
from backend.ai.models.resnet import (
    ResNetAcousticBaseline,
    SlimResNetBaseline,
    SpectrogramFrontEnd,
    create_mel_filterbank,
)

__all__ = [
    "BaseDeepfakeDetector",
    "ResNetAcousticBaseline",
    "SlimResNetBaseline",
    "SpectrogramFrontEnd",
    "create_mel_filterbank",
]

"""
VaaniShield — AI Inference Engine & Neural Model Handlers
"""

from typing import Any

__all__ = [
    "InferenceEngine",
]


def __getattr__(name: str) -> Any:
    if name == "InferenceEngine":
        from .inference import InferenceEngine
        return InferenceEngine
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

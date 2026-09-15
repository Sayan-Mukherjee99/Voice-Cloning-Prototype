"""
VaaniShield: AI Training & Evaluation Engine
============================================
Package exports for training configuration and evaluation metrics.
"""

from backend.ai.training.config import TrainingConfig
from backend.ai.training.metrics import (
    calculate_far_frr,
    compute_classification_metrics,
    compute_confusion_matrix,
    compute_eer,
    compute_roc_auc,
)

__all__ = [
    "TrainingConfig",
    "calculate_far_frr",
    "compute_classification_metrics",
    "compute_confusion_matrix",
    "compute_eer",
    "compute_roc_auc",
]

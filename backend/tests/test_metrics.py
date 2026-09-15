"""
Unit Tests: Anti-Spoofing Metrics Engine
========================================
Validates EER, ROC-AUC, FAR, FRR, and confusion matrix calculations against known analytical cases.
"""

import os
import sys
import numpy as np
import pytest

_repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

try:
    from backend.ai.training.metrics import (
        calculate_far_frr,
        compute_classification_metrics,
        compute_confusion_matrix,
        compute_eer,
        compute_roc_auc,
    )
except ImportError:
    from ai.training.metrics import (
        calculate_far_frr,
        compute_classification_metrics,
        compute_confusion_matrix,
        compute_eer,
        compute_roc_auc,
    )


def test_perfect_separation_metrics():
    """Verify EER = 0.0 and ROC-AUC = 1.0 on perfectly separated synthetic scores."""
    # 5 bona fide (low risk) and 5 spoof (high risk)
    bonafide_scores = np.array([0.05, 0.10, 0.15, 0.20, 0.25])
    spoof_scores = np.array([0.75, 0.80, 0.85, 0.90, 0.95])

    scores = np.concatenate([bonafide_scores, spoof_scores])
    labels = np.array([0] * 5 + [1] * 5)

    eer, opt_thresh = compute_eer(scores, labels)
    auc = compute_roc_auc(scores, labels)

    assert eer == 0.0, f"Expected EER 0.0, got {eer}"
    assert auc == 1.0, f"Expected AUC 1.0, got {auc}"
    assert 0.25 <= opt_thresh <= 0.75, f"Expected threshold in separation gap, got {opt_thresh}"


def test_far_frr_at_threshold():
    """Verify FAR and FRR calculations at a fixed decision threshold."""
    scores = np.array([0.1, 0.3, 0.6, 0.4, 0.8, 0.9])
    labels = np.array([0, 0, 0, 1, 1, 1])  # 3 bona fide, 3 spoof

    # At threshold 0.5:
    # Bonafide (0): scores 0.1, 0.3 (<0.5 -> correct), score 0.6 (>=0.5 -> False Rejection FR)
    # FRR = 1 / 3 = 0.3333
    # Spoof (1): score 0.4 (<0.5 -> False Acceptance FA), scores 0.8, 0.9 (>=0.5 -> correct)
    # FAR = 1 / 3 = 0.3333
    far, frr = calculate_far_frr(scores, labels, threshold=0.5)
    assert pytest.approx(far, rel=1e-3) == 1.0 / 3.0
    assert pytest.approx(frr, rel=1e-3) == 1.0 / 3.0


def test_confusion_matrix_counts():
    """Verify confusion matrix counts match predictions."""
    scores = np.array([0.1, 0.3, 0.6, 0.4, 0.8, 0.9])
    labels = np.array([0, 0, 0, 1, 1, 1])

    cm = compute_confusion_matrix(scores, labels, threshold=0.5)
    assert cm["tn"] == 2  # scores 0.1, 0.3 with label 0
    assert cm["fp"] == 1  # score 0.6 with label 0
    assert cm["fn"] == 1  # score 0.4 with label 1
    assert cm["tp"] == 2  # scores 0.8, 0.9 with label 1


def test_comprehensive_classification_metrics():
    """Verify compute_classification_metrics returns all required dictionary keys."""
    scores = np.array([0.1, 0.2, 0.7, 0.8])
    labels = np.array([0, 0, 1, 1])

    res = compute_classification_metrics(scores, labels)
    required_keys = [
        "eer",
        "optimal_threshold",
        "evaluated_threshold",
        "roc_auc",
        "far",
        "frr",
        "accuracy",
        "precision",
        "recall",
        "f1_score",
        "confusion_matrix",
        "sample_count",
    ]
    for k in required_keys:
        assert k in res, f"Missing key '{k}' in metrics result"

    assert res["sample_count"] == 4
    assert res["accuracy"] == 1.0
    assert res["f1_score"] == 1.0

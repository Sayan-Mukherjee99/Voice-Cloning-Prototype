"""
VaaniShield: Anti-Spoofing Metrics Engine
=========================================
Vectorized evaluation suite computing Equal Error Rate (EER), ROC-AUC,
False Acceptance Rate (FAR), False Rejection Rate (FRR), and confusion matrices.

Convention:
    Label 0 = Bona Fide (genuine human speech)
    Label 1 = Spoof (synthetic/cloned/converted speech)
    Score   = Continuous synthetic risk probability P(spoof) in [0.0, 1.0]

Biometric Decision Rule:
    Score >= threshold  -->  Classified as SPOOF (Rejected)
    Score <  threshold  -->  Classified as BONA FIDE (Accepted)

Error Rates:
    FAR(theta) = P(spoof accepted) = Count(label == 1 and score < theta) / Total_Spoof
    FRR(theta) = P(genuine rejected) = Count(label == 0 and score >= theta) / Total_BonaFide
    EER        = Operating point theta* where FAR(theta*) == FRR(theta*)
"""

from __future__ import annotations

from typing import Any, Dict, Tuple
import numpy as np


def calculate_far_frr(
    scores: np.ndarray,
    labels: np.ndarray,
    threshold: float,
) -> Tuple[float, float]:
    """
    Calculate False Acceptance Rate (FAR) and False Rejection Rate (FRR) at given threshold.
    """
    scores = np.asarray(scores, dtype=np.float64)
    labels = np.asarray(labels, dtype=np.int64)

    spoof_mask = labels == 1
    bonafide_mask = labels == 0

    n_spoof = np.sum(spoof_mask)
    n_bonafide = np.sum(bonafide_mask)

    if n_spoof == 0:
        far = 0.0
    else:
        # Spoofs incorrectly accepted as genuine because score < threshold
        far = float(np.sum(scores[spoof_mask] < threshold) / n_spoof)

    if n_bonafide == 0:
        frr = 0.0
    else:
        # Genuine speech incorrectly rejected as spoof because score >= threshold
        frr = float(np.sum(scores[bonafide_mask] >= threshold) / n_bonafide)

    return far, frr


def compute_eer(
    scores: np.ndarray,
    labels: np.ndarray,
    num_thresholds: int = 1000,
) -> Tuple[float, float]:
    """
    Compute Equal Error Rate (EER) and the corresponding optimal operating threshold.

    Returns:
        (eer, optimal_threshold)
    """
    scores = np.asarray(scores, dtype=np.float64)
    labels = np.asarray(labels, dtype=np.int64)

    bonafide_scores = scores[labels == 0]
    spoof_scores = scores[labels == 1]

    if len(bonafide_scores) == 0 or len(spoof_scores) == 0:
        return 0.0, 0.5

    # Threshold grid covering empirical score range
    min_score = float(np.min(scores))
    max_score = float(np.max(scores))

    if min_score == max_score:
        return 0.5, min_score

    thresholds = np.linspace(min_score, max_score, num_thresholds)

    # Vectorized search across sorted scores
    sorted_bonafide = np.sort(bonafide_scores)
    sorted_spoof = np.sort(spoof_scores)

    # FRR: fraction of bonafide >= threshold
    # np.searchsorted gives count of bonafide < threshold
    frr_arr = 1.0 - (np.searchsorted(sorted_bonafide, thresholds, side="left") / len(sorted_bonafide))

    # FAR: fraction of spoof < threshold
    far_arr = np.searchsorted(sorted_spoof, thresholds, side="left") / len(sorted_spoof)

    # Find crossing point where |FAR - FRR| is minimal
    diff = far_arr - frr_arr
    idx = np.argmin(np.abs(diff))

    # Linear interpolation between adjacent grid points for high precision
    if idx < len(thresholds) - 1 and diff[idx] * diff[idx + 1] <= 0:
        d0, d1 = diff[idx], diff[idx + 1]
        denom = d0 - d1
        if abs(denom) > 1e-12:
            weight = abs(d0) / abs(denom)
            optimal_threshold = float(thresholds[idx] + weight * (thresholds[idx + 1] - thresholds[idx]))
            eer = float(far_arr[idx] + weight * (far_arr[idx + 1] - far_arr[idx]))
        else:
            optimal_threshold = float(thresholds[idx])
            eer = float((far_arr[idx] + frr_arr[idx]) / 2.0)
    else:
        optimal_threshold = float(thresholds[idx])
        eer = float((far_arr[idx] + frr_arr[idx]) / 2.0)

    return eer, optimal_threshold


def compute_roc_auc(scores: np.ndarray, labels: np.ndarray) -> float:
    """
    Compute Area Under the Receiver Operating Characteristic Curve (ROC-AUC)
    using the exact Wilcoxon-Mann-Whitney rank-sum formulation.
    """
    scores = np.asarray(scores, dtype=np.float64)
    labels = np.asarray(labels, dtype=np.int64)

    n_pos = int(np.sum(labels == 1))
    n_neg = int(np.sum(labels == 0))

    if n_pos == 0 or n_neg == 0:
        return 0.5

    # Rank all scores with average rank for ties
    order = np.argsort(scores)
    ranks = np.empty_like(order, dtype=np.float64)
    ranks[order] = np.arange(1, len(scores) + 1)

    # Handle ties
    sorted_scores = scores[order]
    unique_scores, idx_start, counts = np.unique(sorted_scores, return_index=True, return_counts=True)
    for start, count in zip(idx_start, counts):
        if count > 1:
            tie_rank = start + 1 + (count - 1) / 2.0
            ranks[order[start : start + count]] = tie_rank

    # Mann-Whitney U calculation for positive class (spoof)
    sum_ranks_pos = np.sum(ranks[labels == 1])
    u_stat = sum_ranks_pos - (n_pos * (n_pos + 1)) / 2.0
    auc = float(u_stat / (n_pos * n_neg))
    return max(0.0, min(1.0, auc))


def compute_confusion_matrix(
    scores: np.ndarray,
    labels: np.ndarray,
    threshold: float = 0.5,
) -> Dict[str, int]:
    """
    Compute binary confusion matrix at specified decision threshold.
    """
    scores = np.asarray(scores, dtype=np.float64)
    labels = np.asarray(labels, dtype=np.int64)

    preds = (scores >= threshold).astype(np.int64)

    tn = int(np.sum((labels == 0) & (preds == 0)))  # Bona fide correct
    fp = int(np.sum((labels == 0) & (preds == 1)))  # Bona fide flagged as spoof
    fn = int(np.sum((labels == 1) & (preds == 0)))  # Spoof missed (accepted)
    tp = int(np.sum((labels == 1) & (preds == 1)))  # Spoof detected

    return {"tn": tn, "fp": fp, "fn": fn, "tp": tp}


def compute_classification_metrics(
    scores: np.ndarray,
    labels: np.ndarray,
    threshold: float | None = None,
) -> Dict[str, Any]:
    """
    Comprehensive evaluation returning EER, ROC-AUC, FAR, FRR, and standard classification metrics.
    """
    scores = np.asarray(scores, dtype=np.float64)
    labels = np.asarray(labels, dtype=np.int64)

    eer, optimal_threshold = compute_eer(scores, labels)
    auc = compute_roc_auc(scores, labels)

    eval_threshold = optimal_threshold if threshold is None else threshold
    far, frr = calculate_far_frr(scores, labels, eval_threshold)
    cm = compute_confusion_matrix(scores, labels, eval_threshold)

    total = len(labels)
    accuracy = float((cm["tp"] + cm["tn"]) / max(total, 1))
    precision = float(cm["tp"] / max(cm["tp"] + cm["fp"], 1))
    recall = float(cm["tp"] / max(cm["tp"] + cm["fn"], 1))
    f1 = float(2 * precision * recall / max(precision + recall, 1e-8))

    return {
        "eer": float(eer),
        "optimal_threshold": float(optimal_threshold),
        "evaluated_threshold": float(eval_threshold),
        "roc_auc": float(auc),
        "far": float(far),
        "frr": float(frr),
        "accuracy": float(accuracy),
        "precision": float(precision),
        "recall": float(recall),
        "f1_score": float(f1),
        "confusion_matrix": cm,
        "sample_count": total,
    }

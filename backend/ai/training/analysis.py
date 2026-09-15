"""
VaaniShield: Anti-Spoofing Error & Attack Analysis Engine
=========================================================
Decomposes anti-spoofing detector evaluations by attack system (A07-A19),
technology family, and score distribution percentiles, providing root-cause
diagnostics for false acceptances and false rejections.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
import numpy as np

from backend.ai.training.metrics import calculate_far_frr, compute_eer


AUTHORITATIVE_ATTACK_DESCRIPTIONS: Dict[str, Dict[str, str]] = {
    "A07": {"type": "TTS", "description": "vocoder+GAN"},
    "A08": {"type": "TTS", "description": "neural waveform"},
    "A09": {"type": "TTS", "description": "vocoder"},
    "A10": {"type": "TTS", "description": "neural waveform"},
    "A11": {"type": "TTS", "description": "griffin lim"},
    "A12": {"type": "TTS", "description": "neural waveform"},
    "A13": {"type": "TTS_VC", "description": "waveform concatenation+waveform filtering"},
    "A14": {"type": "TTS_VC", "description": "vocoder"},
    "A15": {"type": "TTS_VC", "description": "neural waveform"},
    "A16": {"type": "TTS", "description": "waveform concatenation"},
    "A17": {"type": "VC", "description": "waveform filtering"},
    "A18": {"type": "VC", "description": "vocoder"},
    "A19": {"type": "VC", "description": "spectral filtering"},
}


def compute_attack_wise_metrics(
    scores: List[float] | np.ndarray,
    labels: List[int] | np.ndarray,
    system_ids: List[str],
    threshold: float,
) -> Dict[str, Any]:
    """
    Compute granular anti-spoofing performance metrics per attack system ID.

    For each spoofing system k, system-specific EER is evaluated against
    the entire pooled bona fide reference population.
    """
    scores_arr = np.asarray(scores, dtype=np.float64)
    labels_arr = np.asarray(labels, dtype=np.int64)
    systems_arr = np.asarray(system_ids, dtype=object)

    bonafide_mask = labels_arr == 0
    bonafide_scores = scores_arr[bonafide_mask]
    n_bonafide = int(len(bonafide_scores))

    unique_systems = sorted(list(set(system_ids)))
    # Exclude bona fide placeholder indicator
    spoof_systems = [s for s in unique_systems if s not in ("-", "bonafide", "none", "")]

    attack_reports: Dict[str, Any] = {}

    for sys_id in spoof_systems:
        sys_mask = systems_arr == sys_id
        sys_scores = scores_arr[sys_mask]
        n_samples = int(len(sys_scores))

        if n_samples == 0:
            continue

        # False acceptance: spoof prediction score is lower than detection threshold
        false_accepts = int(np.sum(sys_scores < threshold))
        far_k = float(false_accepts / n_samples)
        recall_k = float(1.0 - far_k)

        # System EER evaluated against the full bona fide evaluation split
        if n_bonafide > 0:
            pair_scores = np.concatenate([bonafide_scores, sys_scores])
            pair_labels = np.concatenate([np.zeros(n_bonafide, dtype=np.int64), np.ones(n_samples, dtype=np.int64)])
            sys_eer, _ = compute_eer(pair_scores, pair_labels)
        else:
            sys_eer = 0.0

        meta = AUTHORITATIVE_ATTACK_DESCRIPTIONS.get(sys_id, {"type": "UNKNOWN", "description": "unverified"})

        attack_reports[sys_id] = {
            "system_id": sys_id,
            "technology_type": meta["type"],
            "description": meta["description"],
            "sample_count": n_samples,
            "false_acceptances": false_accepts,
            "far": round(far_k, 6),
            "spoof_recall": round(recall_k, 6),
            "system_eer": round(float(sys_eer), 6),
            "score_mean": round(float(np.mean(sys_scores)), 6),
            "score_std": round(float(np.std(sys_scores)), 6),
            "score_median": round(float(np.median(sys_scores)), 6),
            "score_p10": round(float(np.percentile(sys_scores, 10)), 6),
            "score_p90": round(float(np.percentile(sys_scores, 90)), 6),
            "score_min": round(float(np.min(sys_scores)), 6),
            "score_max": round(float(np.max(sys_scores)), 6),
        }

    # Vulnerability ranking: descending FAR (most evasive attacks first)
    ranked_attacks = sorted(
        attack_reports.values(),
        key=lambda x: x["far"],
        reverse=True,
    )
    vulnerability_ranking = [item["system_id"] for item in ranked_attacks]

    return {
        "calibrated_threshold": float(threshold),
        "total_bonafide_samples": n_bonafide,
        "total_spoof_systems": len(spoof_systems),
        "vulnerability_ranking": vulnerability_ranking,
        "attacks": attack_reports,
    }


def compute_detailed_error_analysis(
    records: List[Dict[str, Any]],
    threshold: float,
) -> Dict[str, Any]:
    """
    Perform deep failure-mode analysis on individual false positives and false negatives.

    Expected record keys:
        - score: float in [0.0, 1.0]
        - label: int (0=bonafide, 1=spoof)
        - system_id: str
        - speaker_id: str
        - duration_sec: float
        - utterance_id: str
    """
    scores = np.array([r["score"] for r in records], dtype=np.float64)
    labels = np.array([r["label"] for r in records], dtype=np.int64)

    total_samples = len(records)
    bonafide_count = int(np.sum(labels == 0))
    spoof_count = int(np.sum(labels == 1))

    # Identify false negatives (spoof missed) and false positives (human falsely flagged)
    fn_records = [r for r in records if r["label"] == 1 and r["score"] < threshold]
    fp_records = [r for r in records if r["label"] == 0 and r["score"] >= threshold]

    # Breakdown of false negatives across attack systems
    fn_by_system: Dict[str, int] = {}
    for r in fn_records:
        sys_id = r.get("system_id", "UNKNOWN")
        fn_by_system[sys_id] = fn_by_system.get(sys_id, 0) + 1

    # Breakdown of false positives across speakers
    fp_by_speaker: Dict[str, int] = {}
    for r in fp_records:
        spk_id = r.get("speaker_id", "UNKNOWN")
        fp_by_speaker[spk_id] = fp_by_speaker.get(spk_id, 0) + 1

    # Confident errors
    confident_fn = [
        {"utterance_id": r["utterance_id"], "score": round(r["score"], 6), "system_id": r.get("system_id", "")}
        for r in fn_records if r["score"] < 0.01
    ]
    confident_fp = [
        {"utterance_id": r["utterance_id"], "score": round(r["score"], 6), "speaker_id": r.get("speaker_id", "")}
        for r in fp_records if r["score"] > 0.90
    ]

    # Borderline uncertainty region: predictions in [threshold - 0.10, threshold + 0.10]
    lower_bound = max(0.0, threshold - 0.10)
    upper_bound = min(1.0, threshold + 0.10)
    borderline_mask = (scores >= lower_bound) & (scores <= upper_bound)
    borderline_count = int(np.sum(borderline_mask))
    borderline_ratio = float(borderline_count / max(1, total_samples))

    # Threshold sensitivity sweep across predefined test thresholds
    test_thresholds = [0.001, 0.005, 0.01, 0.02, 0.034, 0.05, 0.10, 0.20, 0.50, 0.80, 0.90, 0.95, 0.99]
    sensitivity_curve: List[Dict[str, float]] = []

    for t in test_thresholds:
        far_t, frr_t = calculate_far_frr(scores, labels, t)
        tp = int(np.sum((labels == 1) & (scores >= t)))
        fp = int(np.sum((labels == 0) & (scores >= t)))
        prec = float(tp / max(1, tp + fp)) if (tp + fp) > 0 else 0.0
        rec = float(1.0 - far_t)
        f1 = float(2 * prec * rec / max(1e-9, prec + rec)) if (prec + rec) > 0 else 0.0

        sensitivity_curve.append({
            "threshold": t,
            "far": round(far_t, 6),
            "frr": round(frr_t, 6),
            "precision": round(prec, 6),
            "recall": round(rec, 6),
            "f1_score": round(f1, 6),
        })

    return {
        "operating_threshold": float(threshold),
        "total_eval_samples": total_samples,
        "false_negatives": {
            "total_count": len(fn_records),
            "rate_against_spoofs": round(len(fn_records) / max(1, spoof_count), 6),
            "breakdown_by_system": dict(sorted(fn_by_system.items(), key=lambda x: x[1], reverse=True)),
            "confident_count_p_lt_001": len(confident_fn),
            "confident_samples_preview": confident_fn[:10],
        },
        "false_positives": {
            "total_count": len(fp_records),
            "rate_against_bonafide": round(len(fp_records) / max(1, bonafide_count), 6),
            "breakdown_by_speaker": dict(sorted(fp_by_speaker.items(), key=lambda x: x[1], reverse=True)),
            "confident_count_p_gt_090": len(confident_fp),
            "confident_samples_preview": confident_fp[:10],
        },
        "borderline_uncertainty": {
            "interval": [round(lower_bound, 4), round(upper_bound, 4)],
            "sample_count": borderline_count,
            "ratio_of_total": round(borderline_ratio, 6),
        },
        "threshold_sensitivity_curve": sensitivity_curve,
    }

"""
Unit Tests: Phase B5 Evaluation & Error Analysis Engine
======================================================
Tests attack-wise metric computation, ranking, error categorization,
and authoritative protocol metadata integrity.
"""

import numpy as np
import pytest

from backend.ai.training.analysis import (
    AUTHORITATIVE_ATTACK_DESCRIPTIONS,
    compute_attack_wise_metrics,
    compute_detailed_error_analysis,
)


def test_authoritative_attack_descriptions_coverage() -> None:
    """Verify all 13 evaluation attacks (A07-A19) are present with verified metadata."""
    expected_attacks = [f"A{i:02d}" for i in range(7, 20)]
    for att in expected_attacks:
        assert att in AUTHORITATIVE_ATTACK_DESCRIPTIONS, f"Missing attack description for {att}"
        meta = AUTHORITATIVE_ATTACK_DESCRIPTIONS[att]
        assert "type" in meta and meta["type"] in ("TTS", "VC", "TTS_VC")
        assert "description" in meta and len(meta["description"]) > 0


def test_attack_wise_metric_aggregation() -> None:
    """Verify attack-wise FAR, recall, and EER calculations."""
    # 10 bona fide (labels=0), 10 A07 (labels=1), 10 A08 (labels=1)
    # At threshold 0.50:
    # A07: scores [0.10, 0.20, 0.30, 0.40, 0.60, 0.70, 0.80, 0.90, 0.95, 0.99] -> 4 false accepts (FAR=0.40)
    # A08: scores [0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95] -> 5 false accepts (FAR=0.50)
    # Bona fide: scores [0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.10]
    bonafide_scores = [0.01 * (i + 1) for i in range(10)]
    bonafide_labels = [0] * 10
    bonafide_systems = ["-"] * 10

    a07_scores = [0.10, 0.20, 0.30, 0.40, 0.60, 0.70, 0.80, 0.90, 0.95, 0.99]
    a07_labels = [1] * 10
    a07_systems = ["A07"] * 10

    a08_scores = [0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95]
    a08_labels = [1] * 10
    a08_systems = ["A08"] * 10

    all_scores = bonafide_scores + a07_scores + a08_scores
    all_labels = bonafide_labels + a07_labels + a08_labels
    all_systems = bonafide_systems + a07_systems + a08_systems

    result = compute_attack_wise_metrics(
        scores=all_scores,
        labels=all_labels,
        system_ids=all_systems,
        threshold=0.50,
    )

    assert result["total_bonafide_samples"] == 10
    assert result["total_spoof_systems"] == 2
    assert "A07" in result["attacks"]
    assert "A08" in result["attacks"]

    a07_rep = result["attacks"]["A07"]
    assert a07_rep["sample_count"] == 10
    assert a07_rep["false_acceptances"] == 4
    assert a07_rep["far"] == 0.40
    assert a07_rep["spoof_recall"] == 0.60

    a08_rep = result["attacks"]["A08"]
    assert a08_rep["sample_count"] == 10
    assert a08_rep["false_acceptances"] == 5
    assert a08_rep["far"] == 0.50

    # Vulnerability ranking: A08 has higher FAR than A07 -> A08 comes first
    assert result["vulnerability_ranking"] == ["A08", "A07"]


def test_detailed_error_analysis_profiling() -> None:
    """Verify false negative/positive categorization and confident error identification."""
    records = [
        # True Positive
        {"utterance_id": "U1", "score": 0.85, "label": 1, "system_id": "A07", "speaker_id": "S1", "duration_sec": 3.0},
        # False Negative (missed spoof)
        {"utterance_id": "U2", "score": 0.005, "label": 1, "system_id": "A08", "speaker_id": "S2", "duration_sec": 2.5},
        # True Negative
        {"utterance_id": "U3", "score": 0.05, "label": 0, "system_id": "-", "speaker_id": "S3", "duration_sec": 4.0},
        # False Positive (falsely rejected human)
        {"utterance_id": "U4", "score": 0.95, "label": 0, "system_id": "-", "speaker_id": "S3", "duration_sec": 1.5},
        # Borderline score
        {"utterance_id": "U5", "score": 0.48, "label": 1, "system_id": "A09", "speaker_id": "S4", "duration_sec": 2.0},
    ]

    analysis = compute_detailed_error_analysis(records, threshold=0.50)

    assert analysis["operating_threshold"] == 0.50
    assert analysis["total_eval_samples"] == 5

    # False negatives check: U2 (score 0.005 < 0.50) and U5 (score 0.48 < 0.50)
    fn_info = analysis["false_negatives"]
    assert fn_info["total_count"] == 2
    assert "A08" in fn_info["breakdown_by_system"]
    assert "A09" in fn_info["breakdown_by_system"]
    # U2 is confident false negative (< 0.01)
    assert fn_info["confident_count_p_lt_001"] == 1
    assert fn_info["confident_samples_preview"][0]["utterance_id"] == "U2"

    # False positives check: U4 (score 0.95 >= 0.50)
    fp_info = analysis["false_positives"]
    assert fp_info["total_count"] == 1
    assert fp_info["breakdown_by_speaker"]["S3"] == 1
    assert fp_info["confident_count_p_gt_090"] == 1
    assert fp_info["confident_samples_preview"][0]["utterance_id"] == "U4"

    # Borderline check: scores in [0.40, 0.60] -> U5 (0.48)
    assert analysis["borderline_uncertainty"]["sample_count"] == 1

    # Sensitivity curve presence
    assert len(analysis["threshold_sensitivity_curve"]) > 5

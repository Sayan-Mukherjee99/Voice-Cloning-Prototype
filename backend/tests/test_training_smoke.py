"""
Smoke Tests: Deepfake Detector Training Pipeline
================================================
Verifies integration between preprocessor, model forward pass,
synthetic gradient updates, and dataset loaders before long training.
"""

import os
import sys
from pathlib import Path
import pytest
import torch

_repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

try:
    from backend.ai.models.resnet import ResNetAcousticBaseline
    from backend.ai.training.config import TrainingConfig
    from backend.ai.training.metrics import compute_classification_metrics, compute_eer
    from backend.dataset.preprocessor import AudioPreprocessor
except ImportError:
    from ai.models.resnet import ResNetAcousticBaseline
    from ai.training.config import TrainingConfig
    from ai.training.metrics import compute_classification_metrics, compute_eer
    from dataset.preprocessor import AudioPreprocessor


def test_preprocessor_resnet_integration():
    """Verify AudioPreprocessor output integrates cleanly with ResNetAcousticBaseline."""
    preprocessor = AudioPreprocessor(target_samples=64000, crop_mode="center")
    raw_audio = torch.randn(48000).numpy()  # 3.0s audio

    # Preprocess with 64,000 target samples
    result = preprocessor.preprocess(raw_audio)
    tensor_in = result.waveform  # [1, 64000]

    model = ResNetAcousticBaseline(include_front_end=True, target_samples=64000)
    model.eval()
    with torch.no_grad():
        logits = model(tensor_in)
        prob = model.predict_proba(tensor_in)

    assert logits.shape == (1, 2)
    assert prob.shape == (1,)
    assert 0.0 <= prob.item() <= 1.0


def test_synthetic_training_smoke():
    """Verify a complete forward-loss-backward-optimizer cycle runs without NaN/Inf."""
    torch.manual_seed(42)
    model = ResNetAcousticBaseline(include_front_end=True, target_samples=64000)
    model.train()

    optimizer = torch.optim.Adam(model.parameters(), lr=1e-4)
    # Strategy A: Weighted cross-entropy
    weights = torch.tensor([4.92, 0.56], dtype=torch.float32)
    criterion = torch.nn.CrossEntropyLoss(weight=weights)

    # 2 synthetic mini-batches
    for _ in range(2):
        x = torch.randn(2, 64000)
        y = torch.tensor([0, 1], dtype=torch.long)

        optimizer.zero_grad()
        logits = model(x)
        loss = criterion(logits, y)

        assert not torch.isnan(loss).any(), "Loss contains NaN"
        assert not torch.isinf(loss).any(), "Loss is infinite"

        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()


def test_validation_pipeline_smoke():
    """Verify validation loop evaluates batches and produces valid EER and threshold."""
    model = ResNetAcousticBaseline(include_front_end=True, target_samples=64000)
    model.eval()

    all_scores = []
    all_labels = []

    # Mock validation pass over 4 mini-batches
    with torch.no_grad():
        for i in range(4):
            x = torch.randn(2, 64000)
            y = torch.tensor([i % 2, (i + 1) % 2], dtype=torch.long)
            probs = model.predict_proba(x)

            all_scores.extend(probs.cpu().numpy().tolist())
            all_labels.extend(y.cpu().numpy().tolist())

    metrics = compute_classification_metrics(all_scores, all_labels)
    assert "eer" in metrics
    assert "optimal_threshold" in metrics
    assert 0.0 <= metrics["eer"] <= 1.0
    assert 0.0 <= metrics["optimal_threshold"] <= 1.0


def test_tiny_real_dataset_smoke():
    """Verify DataLoader reads real data and executes a forward pass if train manifest exists."""
    manifest_path = Path("data/manifests/asvspoof2019_la_train.jsonl")
    if not manifest_path.exists():
        pytest.skip("Train manifest not found at data/manifests/asvspoof2019_la_train.jsonl")

    try:
        from backend.dataset.loader import ASVSpoofDataset
        from backend.dataset.preprocessor import AudioPreprocessor

        preprocessor = AudioPreprocessor(target_samples=64000, crop_mode="center")
        dataset = ASVSpoofDataset(manifest_path=manifest_path, preprocessor=preprocessor)
        if len(dataset) == 0:
            pytest.skip("Train manifest is empty")

        # Load first 2 items
        items = [dataset[0], dataset[1]]
        batch_audio = torch.stack([item["waveform"].squeeze(0) for item in items])  # [2, 64000]
        batch_labels = torch.stack([item["label"] for item in items])

        model = ResNetAcousticBaseline(include_front_end=True, target_samples=64000)
        model.eval()
        with torch.no_grad():
            logits = model(batch_audio)
            probs = model.predict_proba(batch_audio)

        assert logits.shape == (2, 2)
        assert probs.shape == (2,)
        assert len(batch_labels) == 2
    except Exception as exc:
        pytest.fail(f"Real dataset smoke test failed with error: {exc}")

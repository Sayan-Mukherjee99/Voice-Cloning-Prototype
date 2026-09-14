"""
Unit tests for ASVSpoofDataset PyTorch loader and collator.
"""

import json
import os
import sys
import tempfile
from pathlib import Path
import numpy as np
import torch
from torch.utils.data import DataLoader
import pytest

_repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

try:
    from backend.dataset.loader import ASVSpoofDataset, asvspoof_collate_fn
    from backend.dataset.preprocessor import AudioPreprocessor
    from backend.dataset.protocol_reader import PartitionRole
except ImportError:
    from dataset.loader import ASVSpoofDataset, asvspoof_collate_fn
    from dataset.preprocessor import AudioPreprocessor
    from dataset.protocol_reader import PartitionRole


class MockAudioPreprocessor(AudioPreprocessor):
    """Mock preprocessor that generates synthetic waveforms without reading disk."""
    def preprocess(self, audio_source, sr=None, generator=None):
        from backend.dataset.preprocessor import AudioPreprocessResult
        # Generate predictable synthetic sine wave
        t = torch.sin(torch.linspace(0, 10, 8000)).unsqueeze(0)
        return AudioPreprocessResult(waveform=t, sample_rate=16000, num_samples=8000, duration_sec=0.5)


def test_asvspoof_dataset_lazy_fetch():
    records = [
        {
            "utterance_id": f"UTT_{i:04d}",
            "audio_path": f"datasets/LA/LA/train/flac/UTT_{i:04d}.flac",
            "partition": "train",
            "speaker_id": "SPK_01",
            "label": "bonafide" if i % 2 == 0 else "spoof",
            "target": 0 if i % 2 == 0 else 1,
            "system_id": "-" if i % 2 == 0 else "A01",
            "sample_rate": 16000,
            "channels": 1,
            "duration_sec": 0.5,
            "num_samples": 8000,
        }
        for i in range(5)
    ]

    with tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False, encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r) + "\n")
        manifest_path = f.name

    try:
        dataset = ASVSpoofDataset(
            manifest_path=manifest_path,
            split=PartitionRole.TRAIN,
            preprocessor=MockAudioPreprocessor(),
        )

        assert len(dataset) == 5

        # Fetch index 0
        item0 = dataset[0]
        assert item0["waveform"].shape == (1, 8000)
        assert item0["num_samples"] == 8000
        assert item0["label"].item() == 0
        assert item0["metadata"]["utterance_id"] == "UTT_0000"
        assert item0["metadata"]["partition"] == "train"

        # Fetch index 1
        item1 = dataset[1]
        assert item1["label"].item() == 1
        assert item1["metadata"]["utterance_id"] == "UTT_0001"

        # Governance enforcement check
        dataset.enforce_governance("training")
    finally:
        if os.path.exists(manifest_path):
            os.remove(manifest_path)


def test_asvspoof_dataset_partition_guard():
    records = [
        {
            "utterance_id": "UTT_EVAL",
            "audio_path": "eval.flac",
            "partition": "eval",
            "speaker_id": "SPK_01",
            "label": "spoof",
            "target": 1,
            "system_id": "A07",
            "sample_rate": 16000,
            "channels": 1,
            "duration_sec": 0.5,
            "num_samples": 8000,
        }
    ]

    with tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False, encoding="utf-8") as f:
        f.write(json.dumps(records[0]) + "\n")
        manifest_path = f.name

    try:
        # Initializing with split="train" when manifest has "eval" must fail
        with pytest.raises(ValueError, match="Manifest partition mismatch"):
            ASVSpoofDataset(manifest_path=manifest_path, split="train")

        # Initializing with split="eval" succeeds, but governance check for training fails
        eval_dataset = ASVSpoofDataset(manifest_path=manifest_path, split="eval")
        with pytest.raises(PermissionError, match="Data governance violation"):
            eval_dataset.enforce_governance("training")
    finally:
        if os.path.exists(manifest_path):
            os.remove(manifest_path)


def test_collate_fn_uniform_length():
    batch = [
        {
            "waveform": torch.ones((1, 100), dtype=torch.float32),
            "num_samples": 100,
            "label": torch.tensor(0, dtype=torch.long),
            "metadata": {"utterance_id": "U1"},
        },
        {
            "waveform": torch.zeros((1, 100), dtype=torch.float32),
            "num_samples": 100,
            "label": torch.tensor(1, dtype=torch.long),
            "metadata": {"utterance_id": "U2"},
        },
    ]

    collated = asvspoof_collate_fn(batch)
    assert collated["waveform"].shape == (2, 1, 100)
    assert torch.equal(collated["label"], torch.tensor([0, 1]))
    assert collated["padding_mask"].shape == (2, 100)
    assert collated["padding_mask"].all()


def test_collate_fn_variable_length():
    batch = [
        {
            "waveform": torch.ones((1, 50), dtype=torch.float32),
            "num_samples": 50,
            "label": torch.tensor(0, dtype=torch.long),
            "metadata": {"utterance_id": "U1"},
        },
        {
            "waveform": torch.ones((1, 80), dtype=torch.float32) * 2,
            "num_samples": 80,
            "label": torch.tensor(1, dtype=torch.long),
            "metadata": {"utterance_id": "U2"},
        },
    ]

    collated = asvspoof_collate_fn(batch)
    # Should pad to max_len = 80
    assert collated["waveform"].shape == (2, 1, 80)
    # Check padding mask
    assert collated["padding_mask"][0, :50].all()
    assert not collated["padding_mask"][0, 50:].any()
    assert collated["padding_mask"][1, :80].all()
    # Padded tail of first sample must be zero
    assert (collated["waveform"][0, 0, 50:] == 0.0).all()

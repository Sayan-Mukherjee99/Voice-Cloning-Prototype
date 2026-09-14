"""
Unit tests for ASVspoof 2019 LA Manifest Generator and Streaming Reader.
"""

import os
import sys
import tempfile
from pathlib import Path
import pytest

_repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

try:
    from backend.dataset.protocol_reader import PartitionRole, ProtocolEntry
    from backend.dataset.manifest import (
        ManifestRecord,
        ManifestBuilder,
        iter_manifest,
    )
    from backend.core.config import settings
except ImportError:
    from dataset.protocol_reader import PartitionRole, ProtocolEntry
    from dataset.manifest import (
        ManifestRecord,
        ManifestBuilder,
        iter_manifest,
    )
    from core.config import settings


def test_manifest_record_roundtrip():
    record = ManifestRecord(
        utterance_id="LA_T_1138215",
        audio_path="datasets/LA/LA/ASVspoof2019_LA_train/flac/LA_T_1138215.flac",
        partition="train",
        speaker_id="LA_0079",
        label="bonafide",
        target=0,
        system_id="-",
        sample_rate=16000,
        channels=1,
        duration_sec=2.500375,
        num_samples=40006,
    )

    line = record.to_json_line()
    assert line.endswith("\n")

    restored = ManifestRecord.from_json_line(line)
    assert restored == record
    assert restored.label == "bonafide"
    assert restored.target == 0
    assert restored.duration_sec == 2.500375


def test_manifest_builder_generate_record():
    root = settings.resolve_dataset_root()
    if not Path(root).is_dir():
        pytest.skip(f"Dataset root {root} not found")

    builder = ManifestBuilder(dataset_root=root, workspace_root=_repo_root)
    entry = ProtocolEntry(
        speaker_id="LA_0079",
        utterance_id="LA_T_1138215",
        system_id="-",
        key="bonafide",
        label_int=0,
        partition=PartitionRole.TRAIN,
    )

    record = builder.generate_record(entry)
    assert record.utterance_id == "LA_T_1138215"
    assert record.sample_rate == 16000
    assert record.channels == 1
    assert record.num_samples == 55329
    assert record.duration_sec > 2.0
    assert "LA_T_1138215.flac" in record.audio_path
    assert "\\" not in record.audio_path  # POSIX normalized forward slashes


def test_manifest_builder_write_and_iter():
    root = settings.resolve_dataset_root()
    if not Path(root).is_dir():
        pytest.skip(f"Dataset root {root} not found")

    builder = ManifestBuilder(dataset_root=root, workspace_root=_repo_root)

    with tempfile.TemporaryDirectory() as tmpdir:
        out_file = Path(tmpdir) / "test_manifest.jsonl"
        # Write only the first 5 entries
        count = 0
        with open(out_file, "w", encoding="utf-8") as f:
            for entry in builder.reader.iter_entries(PartitionRole.TRAIN):
                record = builder.generate_record(entry)
                f.write(record.to_json_line())
                count += 1
                if count >= 5:
                    break

        assert count == 5
        assert out_file.is_file()

        # Read back with iter_manifest
        records = list(iter_manifest(out_file))
        assert len(records) == 5
        assert all(isinstance(r, ManifestRecord) for r in records)
        assert records[0].utterance_id == "LA_T_1138215"
        assert records[0].partition == "train"

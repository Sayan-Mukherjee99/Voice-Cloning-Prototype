"""
Unit tests for ASVspoof 2019 LA Dataset Verifier.
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
    from backend.dataset.protocol_reader import PartitionRole
    from backend.dataset.verifier import (
        DatasetVerifier,
        inspect_flac_header,
        DatasetVerificationReport,
    )
    from backend.core.config import settings
except ImportError:
    from dataset.protocol_reader import PartitionRole
    from dataset.verifier import (
        DatasetVerifier,
        inspect_flac_header,
        DatasetVerificationReport,
    )
    from core.config import settings


def test_inspect_flac_header_invalid_magic():
    with tempfile.NamedTemporaryFile(suffix=".flac", delete=False) as f:
        f.write(b"RIFF" + b"\x00" * 40)
        temp_path = f.name
    try:
        with pytest.raises(ValueError, match="Invalid FLAC magic header"):
            inspect_flac_header(temp_path)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def test_inspect_flac_header_truncated_file():
    with tempfile.NamedTemporaryFile(suffix=".flac", delete=False) as f:
        f.write(b"fLaC\x00\x00")
        temp_path = f.name
    try:
        with pytest.raises(ValueError, match="Corrupt/truncated FLAC file"):
            inspect_flac_header(temp_path)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def test_inspect_flac_header_on_dataset_audio():
    root = settings.resolve_dataset_root()
    train_flac_dir = Path(root) / "ASVspoof2019_LA_train" / "flac"
    if not train_flac_dir.is_dir():
        pytest.skip(f"Audio dir not found: {train_flac_dir}")

    flac_files = list(train_flac_dir.glob("*.flac"))[:5]
    assert len(flac_files) > 0

    for flac_file in flac_files:
        info = inspect_flac_header(flac_file)
        assert info.sample_rate == 16000
        assert info.channels == 1
        assert info.bits_per_sample == 16
        assert info.total_samples > 0
        assert info.duration_sec > 0.1


def test_verifier_train_partition():
    root = settings.resolve_dataset_root()
    if not Path(root).is_dir():
        pytest.skip(f"Dataset root {root} not found")

    verifier = DatasetVerifier(root)
    audit = verifier.verify_partition(PartitionRole.TRAIN, check_audio_headers=True, max_header_samples=10)

    assert audit.status == "PASS"
    assert audit.total_protocol_rows == 25380
    assert audit.matched_audio_files == 25380
    assert len(audit.missing_audio_files) == 0
    assert audit.unique_speakers == 20
    assert audit.bonafide_count == 2580
    assert audit.spoof_count == 22800
    assert audit.sample_rate_verified is True
    assert audit.mono_verified is True
    assert audit.bit_depth_verified is True


def test_verifier_report_serialization():
    report = DatasetVerificationReport(dataset_root="/mock/path")
    report_dict = report.to_dict()
    assert report_dict["dataset_root"] == "/mock/path"
    assert report_dict["overall_status"] == "PASS"

    report_json = report.to_json()
    assert '"overall_status": "PASS"' in report_json

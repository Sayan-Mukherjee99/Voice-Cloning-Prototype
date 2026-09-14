"""
Unit tests for ASVspoof 2019 LA Protocol Reader and Partition Governance.
"""

import os
import sys
from pathlib import Path
import pytest

# Ensure both repo root and backend/ are in sys.path
_repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

try:
    from backend.dataset.protocol_reader import (
        PartitionRole,
        ProtocolEntry,
        parse_protocol_line,
        enforce_partition_governance,
        ProtocolReader,
    )
    from backend.core.config import settings
except ImportError:
    from dataset.protocol_reader import (
        PartitionRole,
        ProtocolEntry,
        parse_protocol_line,
        enforce_partition_governance,
        ProtocolReader,
    )
    from core.config import settings


def test_parse_protocol_line_bonafide():
    line = "LA_0079 LA_T_1138215 - - bonafide"
    entry = parse_protocol_line(line, PartitionRole.TRAIN)
    assert entry.speaker_id == "LA_0079"
    assert entry.utterance_id == "LA_T_1138215"
    assert entry.system_id == "-"
    assert entry.key == "bonafide"
    assert entry.label_int == 0
    assert entry.is_bonafide is True
    assert entry.is_spoof is False
    assert entry.partition == PartitionRole.TRAIN


def test_parse_protocol_line_spoof():
    line = "LA_0079 LA_T_1004644 - A01 spoof"
    entry = parse_protocol_line(line, PartitionRole.TRAIN)
    assert entry.speaker_id == "LA_0079"
    assert entry.utterance_id == "LA_T_1004644"
    assert entry.system_id == "A01"
    assert entry.key == "spoof"
    assert entry.label_int == 1
    assert entry.is_bonafide is False
    assert entry.is_spoof is True


def test_parse_protocol_line_malformed_token_count():
    with pytest.raises(ValueError, match="Malformed protocol line"):
        parse_protocol_line("LA_0079 LA_T_1004644 - spoof", PartitionRole.TRAIN)

    with pytest.raises(ValueError, match="Malformed protocol line"):
        parse_protocol_line("LA_0079 LA_T_1004644 - A01 spoof extra_field", PartitionRole.TRAIN)


def test_parse_protocol_line_invalid_key():
    with pytest.raises(ValueError, match="Invalid protocol key"):
        parse_protocol_line("LA_0079 LA_T_1004644 - A01 unknown_label", PartitionRole.TRAIN)


def test_partition_role_from_str():
    assert PartitionRole.from_str("train") == PartitionRole.TRAIN
    assert PartitionRole.from_str("TRAINING") == PartitionRole.TRAIN
    assert PartitionRole.from_str("dev") == PartitionRole.DEV
    assert PartitionRole.from_str("val") == PartitionRole.DEV
    assert PartitionRole.from_str("eval") == PartitionRole.EVAL
    assert PartitionRole.from_str("test") == PartitionRole.EVAL

    with pytest.raises(ValueError, match="Unknown partition"):
        PartitionRole.from_str("invalid_split")


def test_partition_governance():
    # TRAIN allowed for training
    enforce_partition_governance(PartitionRole.TRAIN, "training")

    # DEV and EVAL forbidden for training
    with pytest.raises(PermissionError, match="Data governance violation"):
        enforce_partition_governance(PartitionRole.DEV, "training")
    with pytest.raises(PermissionError, match="Data governance violation"):
        enforce_partition_governance(PartitionRole.EVAL, "training")

    # DEV allowed for tuning / validation
    enforce_partition_governance(PartitionRole.DEV, "tuning")
    enforce_partition_governance(PartitionRole.DEV, "validation")

    # EVAL forbidden for tuning / validation
    with pytest.raises(PermissionError, match="Data governance violation"):
        enforce_partition_governance(PartitionRole.EVAL, "tuning")
    with pytest.raises(PermissionError, match="Data governance violation"):
        enforce_partition_governance(PartitionRole.EVAL, "threshold_calibration")


def test_protocol_reader_on_actual_dataset():
    root = settings.resolve_dataset_root()
    if not Path(root).is_dir():
        pytest.skip(f"Dataset root {root} not found")

    reader = ProtocolReader(root)
    train_path = reader.get_protocol_path(PartitionRole.TRAIN)
    assert train_path.is_file()

    entries = []
    for entry in reader.iter_entries(PartitionRole.TRAIN):
        entries.append(entry)
        if len(entries) >= 10:
            break
    assert len(entries) == 10
    assert all(e.partition == PartitionRole.TRAIN for e in entries)

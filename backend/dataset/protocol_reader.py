"""
VaaniShield — ASVspoof 2019 LA Protocol Reader & Governance
============================================================
Parses, validates, and enforces strict dataset partition roles
for ASVspoof 2019 Logical Access (LA) Countermeasure (CM) protocols.

Partition Governance:
  - TRAIN: Model training only.
  - DEV:   Validation, hyperparameter tuning, checkpoint selection, threshold calibration.
  - EVAL:  Held-out evaluation only (never used for training or tuning).
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Iterator


class PartitionRole(str, Enum):
    """Explicit dataset partition role with strict usage governance."""
    TRAIN = "train"
    DEV = "dev"
    EVAL = "eval"

    @classmethod
    def from_str(cls, value: str | PartitionRole) -> PartitionRole:
        if isinstance(value, PartitionRole):
            return value
        norm = str(value).strip().lower()
        if norm in ("train", "training", "partitionrole.train"):
            return cls.TRAIN
        elif norm in ("dev", "development", "val", "validation", "partitionrole.dev"):
            return cls.DEV
        elif norm in ("eval", "evaluation", "test", "partitionrole.eval"):
            return cls.EVAL
        raise ValueError(f"Unknown partition '{value}'. Must be train, dev, or eval.")



@dataclass(frozen=True)
class ProtocolEntry:
    """A single verified record from an ASVspoof 2019 LA protocol."""
    speaker_id: str
    utterance_id: str
    system_id: str
    key: str
    label_int: int  # 0 = bonafide, 1 = spoof
    partition: PartitionRole

    @property
    def is_bonafide(self) -> bool:
        return self.label_int == 0

    @property
    def is_spoof(self) -> bool:
        return self.label_int == 1


# Protocol filenames per official challenge specifications
PROTOCOL_FILENAMES: dict[PartitionRole, str] = {
    PartitionRole.TRAIN: "ASVspoof2019.LA.cm.train.trn.txt",
    PartitionRole.DEV: "ASVspoof2019.LA.cm.dev.trl.txt",
    PartitionRole.EVAL: "ASVspoof2019.LA.cm.eval.trl.txt",
}

# Audio subdirectories per partition
AUDIO_SUBDIRS: dict[PartitionRole, str] = {
    PartitionRole.TRAIN: "ASVspoof2019_LA_train",
    PartitionRole.DEV: "ASVspoof2019_LA_dev",
    PartitionRole.EVAL: "ASVspoof2019_LA_eval",
}


def parse_protocol_line(line: str, partition: PartitionRole) -> ProtocolEntry:
    """
    Parse a single 5-column line from an ASVspoof 2019 LA CM protocol file.

    Format:
        SPEAKER_ID AUDIO_FILE_NAME - SYSTEM_ID KEY
    Example:
        LA_0079 LA_T_1138215 - - bonafide
        LA_0079 LA_T_1004644 - A01 spoof
    """
    tokens = line.strip().split()
    if len(tokens) != 5:
        raise ValueError(
            f"Malformed protocol line (expected 5 tokens, got {len(tokens)}): '{line.strip()}'"
        )

    speaker_id, utt_id, _env, system_id, key = tokens
    key_norm = key.strip().lower()

    if key_norm == "bonafide":
        label_int = 0
    elif key_norm == "spoof":
        label_int = 1
    else:
        raise ValueError(f"Invalid protocol key '{key}' in utterance {utt_id}. Must be 'bonafide' or 'spoof'.")

    return ProtocolEntry(
        speaker_id=speaker_id,
        utterance_id=utt_id,
        system_id=system_id,
        key=key_norm,
        label_int=label_int,
        partition=partition,
    )


class ProtocolReader:
    """
    High-level reader and partition validator for ASVspoof 2019 LA CM protocols.
    """

    def __init__(self, dataset_root: str | Path) -> None:
        self.dataset_root = Path(dataset_root)

    def get_protocol_path(self, partition: PartitionRole) -> Path:
        """Resolve absolute path to protocol file for the given partition."""
        filename = PROTOCOL_FILENAMES[partition]
        cm_dir = self.dataset_root / "ASVspoof2019_LA_cm_protocols"
        protocol_path = cm_dir / filename
        if not protocol_path.is_file():
            raise FileNotFoundError(
                f"Protocol file for {partition.value} not found: {protocol_path}"
            )
        return protocol_path

    def get_audio_dir(self, partition: PartitionRole) -> Path:
        """Resolve path to audio directory for the given partition."""
        subdir = AUDIO_SUBDIRS[partition]
        audio_dir = self.dataset_root / subdir / "flac"
        if not audio_dir.is_dir():
            raise FileNotFoundError(f"Audio directory for {partition.value} not found: {audio_dir}")
        return audio_dir

    def resolve_audio_path(self, utterance_id: str, partition: PartitionRole) -> Path:
        """Resolve path to specific FLAC audio file."""
        return self.get_audio_dir(partition) / f"{utterance_id}.flac"

    def read_entries(self, partition: PartitionRole) -> list[ProtocolEntry]:
        """Read and parse all entries for a specific partition into a list."""
        path = self.get_protocol_path(partition)
        entries: list[ProtocolEntry] = []
        with open(path, "r", encoding="utf-8") as f:
            for line_no, line in enumerate(f, 1):
                clean = line.strip()
                if not clean:
                    continue
                try:
                    entries.append(parse_protocol_line(clean, partition))
                except Exception as exc:
                    raise ValueError(f"Error parsing {path.name} line {line_no}: {exc}") from exc
        return entries

    def iter_entries(self, partition: PartitionRole) -> Iterator[ProtocolEntry]:
        """Stream entries one by one to avoid loading all lines into memory at once."""
        path = self.get_protocol_path(partition)
        with open(path, "r", encoding="utf-8") as f:
            for line_no, line in enumerate(f, 1):
                clean = line.strip()
                if not clean:
                    continue
                try:
                    yield parse_protocol_line(clean, partition)
                except Exception as exc:
                    raise ValueError(f"Error parsing {path.name} line {line_no}: {exc}") from exc


def enforce_partition_governance(partition: PartitionRole, intended_purpose: str) -> None:
    """
    Enforces strict dataset split usage governance.

    Rules:
      - TRAIN: training only
      - DEV: validation / model selection / threshold tuning
      - EVAL: held-out evaluation only
    """
    purpose = intended_purpose.strip().lower()
    if purpose in ("training", "train", "fit"):
        if partition != PartitionRole.TRAIN:
            raise PermissionError(
                f"Data governance violation: Partition '{partition.value}' cannot be used for '{intended_purpose}'. "
                f"Only 'TRAIN' partition may be used for model training."
            )
    elif purpose in ("tuning", "validation", "threshold_calibration", "model_selection"):
        if partition == PartitionRole.EVAL:
            raise PermissionError(
                f"Data governance violation: Held-out partition 'EVAL' cannot be used for '{intended_purpose}'. "
                f"Use 'DEV' partition for validation and threshold calibration."
            )

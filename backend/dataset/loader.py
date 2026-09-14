"""
VaaniShield — Lazy Model-Agnostic PyTorch Dataset Loader
=========================================================
Implements model-agnostic PyTorch Dataset for ASVspoof 2019 LA:
  - Instant O(1) byte-offset indexing of JSONL manifests (~1MB RAM footprint)
  - Strict lazy audio loading (decodes single audio file per __getitem__)
  - Zero corpus in RAM at any time
  - Strict partition role enforcement (TRAIN, DEV, EVAL)
  - Collate functions supporting both fixed-length and variable-length native batches
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable

import torch
from torch.utils.data import Dataset

try:
    from backend.dataset.manifest import ManifestRecord
    from backend.dataset.preprocessor import AudioPreprocessor
    from backend.dataset.protocol_reader import (
        PartitionRole,
        enforce_partition_governance,
    )
except ImportError:
    from dataset.manifest import ManifestRecord
    from dataset.preprocessor import AudioPreprocessor
    from dataset.protocol_reader import (
        PartitionRole,
        enforce_partition_governance,
    )


class ASVSpoofDataset(Dataset):
    """
    Lazy PyTorch Dataset for ASVspoof 2019 LA.
    Uses byte offsets into JSONL manifests for instant O(1) random access
    without loading records or waveforms into memory in bulk.
    """

    def __init__(
        self,
        manifest_path: str | Path,
        split: PartitionRole | str | None = None,
        preprocessor: AudioPreprocessor | None = None,
        workspace_root: str | Path | None = None,
        transform: Callable[[torch.Tensor], torch.Tensor] | None = None,
    ) -> None:
        self.manifest_path = Path(manifest_path)
        if not self.manifest_path.is_file():
            raise FileNotFoundError(f"Manifest file not found: {self.manifest_path}")

        self.split: PartitionRole | None = (
            PartitionRole.from_str(split) if split is not None else None
        )
        self.preprocessor = preprocessor or AudioPreprocessor()
        self.workspace_root = Path(workspace_root) if workspace_root else Path.cwd()
        self.transform = transform

        # Build fast byte-offset index (stores only integer file offsets, ~1 MB for 100k records)
        self._line_offsets: list[int] = []
        with open(self.manifest_path, "rb") as f:
            offset = 0
            for line in f:
                if line.strip():
                    self._line_offsets.append(offset)
                offset += len(line)

        # Verify first entry matches expected partition if split was provided
        if self._line_offsets and self.split is not None:
            first_record = self._read_record_at_index(0)
            if first_record.partition != self.split.value:
                raise ValueError(
                    f"Manifest partition mismatch: Expected '{self.split.value}', but manifest contains '{first_record.partition}'"
                )

    def enforce_governance(self, intended_purpose: str) -> None:
        """Enforce strict dataset split usage governance."""
        if self.split is not None:
            enforce_partition_governance(self.split, intended_purpose)

    def _read_record_at_index(self, idx: int) -> ManifestRecord:
        """Read a single ManifestRecord at given index using file seek."""
        offset = self._line_offsets[idx]
        with open(self.manifest_path, "r", encoding="utf-8") as f:
            f.seek(offset)
            line = f.readline().strip()
            return ManifestRecord.from_json_line(line)

    def __len__(self) -> int:
        return len(self._line_offsets)

    def __getitem__(self, idx: int) -> dict[str, Any]:
        if idx < 0 or idx >= len(self._line_offsets):
            raise IndexError(f"Index {idx} out of range [0, {len(self._line_offsets)})")

        record = self._read_record_at_index(idx)

        # Partition guard
        if self.split is not None and record.partition != self.split.value:
            raise ValueError(
                f"Data contamination detected: Record partition '{record.partition}' does not match dataset split '{self.split.value}'"
            )

        # Resolve relative audio path against workspace root
        audio_path = Path(record.audio_path)
        if not audio_path.is_absolute():
            audio_path = self.workspace_root / audio_path

        # Lazy audio decoding and non-destructive preprocessing
        prep_result = self.preprocessor.preprocess(audio_path)
        waveform = prep_result.waveform

        if self.transform is not None:
            waveform = self.transform(waveform)

        return {
            "waveform": waveform,  # [1, T]
            "num_samples": prep_result.num_samples,
            "label": torch.tensor(record.target, dtype=torch.long),
            "metadata": {
                "utterance_id": record.utterance_id,
                "speaker_id": record.speaker_id,
                "system_id": record.system_id,
                "partition": record.partition,
                "duration_sec": record.duration_sec,
                "sample_rate": record.sample_rate,
            },
        }


def asvspoof_collate_fn(batch: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Model-agnostic batch collator.
    Handles both uniform-length batches and variable-length native batches.
    """
    labels = torch.stack([item["label"] for item in batch])
    metadata = [item["metadata"] for item in batch]
    num_samples_list = [item["num_samples"] for item in batch]

    # Check if all waveforms in batch have identical lengths
    all_same_length = all(item["waveform"].shape[-1] == batch[0]["waveform"].shape[-1] for item in batch)

    if all_same_length:
        waveforms = torch.stack([item["waveform"] for item in batch])
        padding_mask = torch.ones((len(batch), waveforms.shape[-1]), dtype=torch.bool)
    else:
        # Variable length: Pad with zero to max length in this mini-batch
        max_len = max(item["waveform"].shape[-1] for item in batch)
        batch_size = len(batch)
        channels = batch[0]["waveform"].shape[0]

        waveforms = torch.zeros((batch_size, channels, max_len), dtype=torch.float32)
        padding_mask = torch.zeros((batch_size, max_len), dtype=torch.bool)

        for i, item in enumerate(batch):
            w = item["waveform"]
            l = w.shape[-1]
            waveforms[i, :, :l] = w
            padding_mask[i, :l] = True

    return {
        "waveform": waveforms,          # [B, 1, T_max]
        "label": labels,                # [B]
        "padding_mask": padding_mask,   # [B, T_max] boolean mask (True for real audio, False for pad)
        "num_samples": torch.tensor(num_samples_list, dtype=torch.long),
        "metadata": metadata,
    }

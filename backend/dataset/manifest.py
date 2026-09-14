"""
VaaniShield — ASVspoof 2019 LA Manifest Generator
==================================================
Compiles verified protocol records and relative audio file paths into
streamable, line-by-line JSONL index files:
  - data/manifests/asvspoof2019_la_train.jsonl
  - data/manifests/asvspoof2019_la_dev.jsonl
  - data/manifests/asvspoof2019_la_eval.jsonl

Footprint:
  - Lightweight: ~15 MB total for all 121,461 records.
  - Zero duplicated audio data.
  - POSIX normalized relative paths for cross-platform portability.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterator

try:
    from backend.dataset.protocol_reader import (
        PartitionRole,
        ProtocolEntry,
        ProtocolReader,
    )
    from backend.dataset.verifier import inspect_flac_header
except ImportError:
    from dataset.protocol_reader import (
        PartitionRole,
        ProtocolEntry,
        ProtocolReader,
    )
    from dataset.verifier import inspect_flac_header


@dataclass(frozen=True)
class ManifestRecord:
    """A verified, standardized record in the JSONL dataset manifest."""
    utterance_id: str
    audio_path: str
    partition: str
    speaker_id: str
    label: str
    target: int
    system_id: str
    sample_rate: int
    channels: int
    duration_sec: float
    num_samples: int

    def to_dict(self) -> dict:
        return asdict(self)

    def to_json_line(self) -> str:
        return json.dumps(self.to_dict()) + "\n"

    @classmethod
    def from_dict(cls, data: dict) -> ManifestRecord:
        return cls(**data)

    @classmethod
    def from_json_line(cls, line: str) -> ManifestRecord:
        return cls.from_dict(json.loads(line.strip()))


class ManifestBuilder:
    """
    Builds and parses JSONL manifests for ASVspoof 2019 LA.
    """

    def __init__(self, dataset_root: str | Path, workspace_root: str | Path | None = None) -> None:
        self.dataset_root = Path(dataset_root)
        self.workspace_root = Path(workspace_root) if workspace_root else Path.cwd()
        self.reader = ProtocolReader(self.dataset_root)

    def generate_record(self, entry: ProtocolEntry) -> ManifestRecord:
        """
        Create a ManifestRecord from a ProtocolEntry, inspecting the FLAC header
        for exact duration and sample count without loading full audio frames into RAM.
        """
        audio_file = self.reader.resolve_audio_path(entry.utterance_id, entry.partition)
        if not audio_file.is_file():
            raise FileNotFoundError(f"Audio file missing for utterance {entry.utterance_id}: {audio_file}")

        header = inspect_flac_header(audio_file)

        # Compute relative POSIX path from workspace root
        try:
            rel_path = audio_file.relative_to(self.workspace_root).as_posix()
        except ValueError:
            rel_path = audio_file.as_posix()

        return ManifestRecord(
            utterance_id=entry.utterance_id,
            audio_path=rel_path,
            partition=entry.partition.value,
            speaker_id=entry.speaker_id,
            label=entry.key,
            target=entry.label_int,
            system_id=entry.system_id,
            sample_rate=header.sample_rate,
            channels=header.channels,
            duration_sec=round(header.duration_sec, 6),
            num_samples=header.total_samples,
        )

    def build_partition_manifest(
        self,
        partition: PartitionRole,
        output_path: str | Path,
        progress_callback: Any | None = None,
    ) -> int:
        """
        Build a JSONL manifest file for a single partition.
        Streams line-by-line to minimize RAM usage.
        """
        out = Path(output_path)
        out.parent.mkdir(parents=True, exist_ok=True)

        count = 0
        with open(out, "w", encoding="utf-8") as f:
            for entry in self.reader.iter_entries(partition):
                record = self.generate_record(entry)
                f.write(record.to_json_line())
                count += 1
                if progress_callback and count % 5000 == 0:
                    progress_callback(partition.value, count)

        return count

    def build_all_manifests(
        self,
        output_dir: str | Path,
        progress_callback: Any | None = None,
    ) -> dict[str, int]:
        """
        Build manifests for all three partitions: train, dev, and eval.
        """
        out_dir = Path(output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)

        manifest_counts: dict[str, int] = {}
        for partition in (PartitionRole.TRAIN, PartitionRole.DEV, PartitionRole.EVAL):
            manifest_file = out_dir / f"asvspoof2019_la_{partition.value}.jsonl"
            count = self.build_partition_manifest(
                partition=partition,
                output_path=manifest_file,
                progress_callback=progress_callback,
            )
            manifest_counts[partition.value] = count

        return manifest_counts


def iter_manifest(manifest_path: str | Path) -> Iterator[ManifestRecord]:
    """
    Stream ManifestRecords from a JSONL manifest file line-by-line.
    Guarantees constant memory consumption.
    """
    path = Path(manifest_path)
    if not path.is_file():
        raise FileNotFoundError(f"Manifest file not found: {path}")

    with open(path, "r", encoding="utf-8") as f:
        for line_no, line in enumerate(f, 1):
            clean = line.strip()
            if not clean:
                continue
            try:
                yield ManifestRecord.from_json_line(clean)
            except Exception as exc:
                raise ValueError(f"Error parsing manifest {path.name} line {line_no}: {exc}") from exc

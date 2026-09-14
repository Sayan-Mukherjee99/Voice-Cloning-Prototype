"""
VaaniShield — Dataset Package
==============================
ASVspoof 2019 LA Dataset Ingestion, Verification, Manifest Indexing,
and Preprocessing Foundation.
"""

from __future__ import annotations

try:
    from backend.dataset.protocol_reader import (
        PartitionRole,
        ProtocolEntry,
        ProtocolReader,
        enforce_partition_governance,
        parse_protocol_line,
    )
    from backend.dataset.verifier import (
        DatasetVerifier,
        DatasetVerificationReport,
        PartitionAudit,
        AudioHeaderInfo,
        inspect_flac_header,
    )
    from backend.dataset.manifest import (
        ManifestRecord,
        ManifestBuilder,
        iter_manifest,
    )
    from backend.dataset.preprocessor import (
        AudioPreprocessor,
        AudioPreprocessResult,
    )
    from backend.dataset.loader import (
        ASVSpoofDataset,
        asvspoof_collate_fn,
    )
except ImportError:
    from dataset.protocol_reader import (
        PartitionRole,
        ProtocolEntry,
        ProtocolReader,
        enforce_partition_governance,
        parse_protocol_line,
    )
    from dataset.verifier import (
        DatasetVerifier,
        DatasetVerificationReport,
        PartitionAudit,
        AudioHeaderInfo,
        inspect_flac_header,
    )
    from dataset.manifest import (
        ManifestRecord,
        ManifestBuilder,
        iter_manifest,
    )
    from dataset.preprocessor import (
        AudioPreprocessor,
        AudioPreprocessResult,
    )
    from dataset.loader import (
        ASVSpoofDataset,
        asvspoof_collate_fn,
    )

__all__ = [
    # Protocol & Governance
    "PartitionRole",
    "ProtocolEntry",
    "ProtocolReader",
    "enforce_partition_governance",
    "parse_protocol_line",
    # Verification & Audit
    "DatasetVerifier",
    "DatasetVerificationReport",
    "PartitionAudit",
    "AudioHeaderInfo",
    "inspect_flac_header",
    # Manifest
    "ManifestRecord",
    "ManifestBuilder",
    "iter_manifest",
    # Preprocessor
    "AudioPreprocessor",
    "AudioPreprocessResult",
    # Loader
    "ASVSpoofDataset",
    "asvspoof_collate_fn",
]

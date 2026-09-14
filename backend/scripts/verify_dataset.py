"""
VaaniShield — ASVspoof 2019 LA Dataset Verification Script
===========================================================
CLI tool to verify the integrity and structure of the ASVspoof 2019 LA corpus.

Usage:
    python backend/scripts/verify_dataset.py [--root <path>] [--save-report]
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

# Add project root to sys.path
_repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

try:
    from backend.core.config import settings
    from backend.dataset.verifier import DatasetVerifier
except ImportError:
    from core.config import settings
    from dataset.verifier import DatasetVerifier


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify ASVspoof 2019 LA Dataset Integrity")
    parser.add_argument(
        "--root",
        type=str,
        default=None,
        help="Path to ASVspoof 2019 LA dataset root (defaults to settings.resolve_dataset_root())",
    )
    parser.add_argument(
        "--samples-check",
        type=int,
        default=50,
        help="Number of audio headers to sample-check per split (default: 50, 0 for all)",
    )
    parser.add_argument(
        "--save-report",
        action="store_true",
        default=True,
        help="Save structured JSON report to data/reports/asvspoof2019_la_validation.json",
    )
    args = parser.parse_args()

    dataset_root = args.root or settings.resolve_dataset_root()
    print("=" * 70)
    print(" VaaniShield — ASVspoof 2019 LA Dataset Verification Audit")
    print("=" * 70)
    print(f" Dataset Target Path: {dataset_root}")

    if not Path(dataset_root).is_dir():
        print(f" [FAIL] Dataset root does not exist: {dataset_root}")
        return 1

    verifier = DatasetVerifier(dataset_root)
    max_samples = None if args.samples_check == 0 else args.samples_check
    print(f" Checking audio headers ({'all' if max_samples is None else f'{max_samples} per split'})...\n")

    report = verifier.run_full_verification(
        check_audio_headers=True,
        max_header_samples_per_split=max_samples,
    )

    print("-" * 70)
    print(f" OVERALL VERIFICATION STATUS: [{report.overall_status}]")
    print("-" * 70)

    for part_name, audit in report.partitions.items():
        print(f"\n Partition: {part_name.upper()} [{audit.status}]")
        print(f"   Protocol Rows:          {audit.total_protocol_rows:,}")
        print(f"   Audio Files in Folder:  {audit.total_audio_files:,}")
        print(f"   Matched Audio Files:    {audit.matched_audio_files:,}")
        print(f"   Missing Audio Files:    {len(audit.missing_audio_files)}")
        print(f"   ASV Enrollment Audio:   {audit.asv_enrollment_audio_files} (Dev/Eval ASV baseline)")
        print(f"   Orphaned Audio (Other): {len(audit.orphaned_audio_files)}")
        print(f"   Unique Speakers:        {audit.unique_speakers}")
        print(f"   Bonafide Utterances:    {audit.bonafide_count:,} ({audit.bonafide_ratio * 100:.1f}%)")
        print(f"   Spoof Utterances:       {audit.spoof_count:,} ({(1 - audit.bonafide_ratio) * 100:.1f}%)")
        print(f"   Audio Specs:            16kHz={audit.sample_rate_verified}, Mono={audit.mono_verified}, 16-bit={audit.bit_depth_verified}")
        systems_summary = ", ".join(f"{k}:{v}" for k, v in sorted(audit.attack_systems.items())[:8])
        print(f"   Attack Systems:         {systems_summary}...")

        if audit.errors:
            print("   ERRORS / WARNINGS:")
            for err in audit.errors:
                print(f"     ! {err}")

    print("\n" + "-" * 70)
    print(" PARTITION MUTUAL EXCLUSIVITY:")
    print(f"   Utterance overlap (Train/Dev):  {report.utterance_cross_overlap['train_dev']}")
    print(f"   Utterance overlap (Train/Eval): {report.utterance_cross_overlap['train_eval']}")
    print(f"   Utterance overlap (Dev/Eval):   {report.utterance_cross_overlap['dev_eval']}")
    print(f"   Speaker overlap (Train/Dev):    {report.speaker_cross_overlap['train_dev']}")
    print(f"   Speaker overlap (Train/Eval):   {report.speaker_cross_overlap['train_eval']}")
    print(f"   Speaker overlap (Dev/Eval):     {report.speaker_cross_overlap['dev_eval']}")
    print("-" * 70)

    for msg in report.summary_messages:
        print(f" * {msg}")

    if args.save_report:
        report_dir = Path("data/reports")
        report_dir.mkdir(parents=True, exist_ok=True)
        report_file = report_dir / "asvspoof2019_la_validation.json"
        with open(report_file, "w", encoding="utf-8") as f:
            f.write(report.to_json(indent=2))
        print(f"\n Structured report saved to: {report_file}")

    return 0 if report.overall_status == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())

"""
VaaniShield — ASVspoof 2019 LA Manifest Builder CLI
===================================================
Generates lightweight JSONL manifest index files for train, dev, and eval splits.

Usage:
    python backend/scripts/build_manifests.py [--root <path>] [--out-dir <path>]
"""

from __future__ import annotations

import argparse
import os
import sys
import time
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
    from backend.dataset.manifest import ManifestBuilder
except ImportError:
    from core.config import settings
    from dataset.manifest import ManifestBuilder


def main() -> int:
    parser = argparse.ArgumentParser(description="Build ASVspoof 2019 LA JSONL Manifests")
    parser.add_argument(
        "--root",
        type=str,
        default=None,
        help="Path to ASVspoof 2019 LA dataset root (defaults to settings.resolve_dataset_root())",
    )
    parser.add_argument(
        "--out-dir",
        type=str,
        default=None,
        help="Output directory for manifests (defaults to settings.manifest_dir)",
    )
    args = parser.parse_args()

    dataset_root = args.root or settings.resolve_dataset_root()
    out_dir = args.out_dir or settings.manifest_dir

    print("=" * 70)
    print(" VaaniShield — Building ASVspoof 2019 LA Manifests")
    print("=" * 70)
    print(f" Dataset Root: {dataset_root}")
    print(f" Output Dir:   {out_dir}\n")

    if not Path(dataset_root).is_dir():
        print(f" [FAIL] Dataset root does not exist: {dataset_root}")
        return 1

    builder = ManifestBuilder(dataset_root=dataset_root, workspace_root=_repo_root)

    def on_progress(split: str, count: int) -> None:
        print(f"   [{split.upper()}] Indexed {count:,} records...")

    start_time = time.perf_counter()
    counts = builder.build_all_manifests(output_dir=out_dir, progress_callback=on_progress)
    elapsed = time.perf_counter() - start_time

    print("-" * 70)
    print(f" Manifest Generation Complete in {elapsed:.2f}s:")
    total = 0
    for split, count in counts.items():
        manifest_file = Path(out_dir) / f"asvspoof2019_la_{split}.jsonl"
        size_kb = manifest_file.stat().st_size / 1024
        print(f"   - {split.upper():5s}: {count:>7,} records ({size_kb:>8.1f} KB) -> {manifest_file}")
        total += count
    print(f" Total Manifest Records: {total:,}")
    print("-" * 70)

    return 0


if __name__ == "__main__":
    sys.exit(main())

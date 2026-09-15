"""
VaaniShield: Baseline Detector Training CLI
===========================================
Executes candidate baseline training for ResNet-18 Acoustic Vocoder Detector
on ASVspoof 2019 LA training partition with DEV validation and early stopping.
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path
from typing import Optional

import psutil
import torch
from torch.utils.data import DataLoader, Subset, WeightedRandomSampler

_repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from backend.ai.models.resnet import ResNetAcousticBaseline, SlimResNetBaseline
from backend.ai.training.config import TrainingConfig
from backend.ai.training.trainer import DeepfakeTrainer
from backend.dataset.loader import ASVSpoofDataset
from backend.dataset.preprocessor import AudioPreprocessor
from backend.dataset.protocol_reader import PartitionRole


def main() -> None:
    parser = argparse.ArgumentParser(description="Train ResNet-18 Acoustic Deepfake Detector Baseline")
    parser.add_argument("--epochs", type=int, default=5, help="Maximum training epochs")
    parser.add_argument("--batch-size", type=int, default=8, help="Physical batch size per step")
    parser.add_argument("--accum-steps", type=int, default=4, help="Gradient accumulation steps")
    parser.add_argument("--lr", type=float, default=1e-4, help="Adam learning rate")
    parser.add_argument(
        "--imbalance-strategy",
        type=str,
        default="weighted_loss",
        choices=["weighted_loss", "weighted_sampler", "unweighted"],
        help="Class imbalance mitigation strategy",
    )
    parser.add_argument("--max-train-samples", type=int, default=None, help="Cap training samples for bounded run")
    parser.add_argument("--max-dev-samples", type=int, default=None, help="Cap dev samples for fast evaluation")
    parser.add_argument("--smoke-test", action="store_true", help="Run 1-epoch smoke test on 32 samples")
    parser.add_argument("--model", type=str, default="ResNetAcousticBaseline", choices=["ResNetAcousticBaseline", "SlimResNetBaseline"])
    parser.add_argument("--checkpoint-prefix", type=str, default="resnet18_baseline", help="Prefix for checkpoint filenames")
    parser.add_argument("--threads", type=int, default=6, help="Max CPU threads for PyTorch")
    args = parser.parse_args()

    # CPU threading control
    avail_cores = psutil.cpu_count(logical=False) or 4
    n_threads = min(args.threads, avail_cores)
    torch.set_num_threads(n_threads)

    # Initialize configuration
    config = TrainingConfig(
        model_architecture=args.model,
        physical_batch_size=args.batch_size,
        grad_accum_steps=args.accum_steps,
        learning_rate=args.lr,
        max_epochs=args.epochs if not args.smoke_test else 1,
        imbalance_strategy=args.imbalance_strategy,
        checkpoint_prefix=args.checkpoint_prefix,
    )
    config.validate()
    config.ensure_directories()

    print("=" * 80)
    print("VAANISHIELD: DETECTOR BASELINE TRAINING (Phase B4.6)")
    print("=" * 80)
    print(f"Run ID: {config.run_id}")
    print(f"Model: {args.model}")
    print(f"Imbalance Strategy: {args.imbalance_strategy}")
    print(f"Physical Batch: {config.physical_batch_size} | Accum Steps: {config.grad_accum_steps} | Effective: {config.effective_batch_size}")
    print(f"Max Epochs: {config.max_epochs} | Early Stopping Patience: {config.patience}")
    print(f"Active CPU Threads: {torch.get_num_threads()}")
    print("-" * 80)

    # Initialize datasets
    preprocessor = AudioPreprocessor(
        target_samples=config.target_samples,
        crop_mode="center",
        normalize=None,  # Keep native Float32 baseline
    )

    train_manifest = Path(config.manifest_dir) / "asvspoof2019_la_train.jsonl"
    dev_manifest = Path(config.manifest_dir) / "asvspoof2019_la_dev.jsonl"

    if not train_manifest.is_file():
        sys.exit(f"Error: Train manifest not found: {train_manifest}")
    if not dev_manifest.is_file():
        sys.exit(f"Error: Dev manifest not found: {dev_manifest}")

    print(f"Loading Train Dataset: {train_manifest}")
    train_dataset = ASVSpoofDataset(
        manifest_path=train_manifest,
        split=PartitionRole.TRAIN,
        preprocessor=preprocessor,
    )
    train_dataset.enforce_governance(intended_purpose="training")

    print(f"Loading Dev Dataset: {dev_manifest}")
    dev_dataset = ASVSpoofDataset(
        manifest_path=dev_manifest,
        split=PartitionRole.DEV,
        preprocessor=preprocessor,
    )
    dev_dataset.enforce_governance(intended_purpose="validation")

    total_train = len(train_dataset)
    total_dev = len(dev_dataset)
    print(f"Manifest Utterances: Train = {total_train:,}, Dev = {total_dev:,}")

    # Subsample if requested or smoke testing
    if args.smoke_test:
        train_indices = list(range(min(32, total_train)))
        dev_indices = list(range(min(16, total_dev)))
        train_subset = Subset(train_dataset, train_indices)
        dev_subset = Subset(dev_dataset, dev_indices)
        print(f"[*] Smoke Test Mode: Train = {len(train_subset)}, Dev = {len(dev_subset)}")
    elif args.max_train_samples is not None and args.max_train_samples < total_train:
        # Balanced train subset selection: 50% bona fide, 50% spoof
        bonafide_indices = []
        spoof_indices = []
        half = args.max_train_samples // 2

        for i in range(total_train):
            rec = train_dataset._read_record_at_index(i)
            if rec.target == 0 and len(bonafide_indices) < half:
                bonafide_indices.append(i)
            elif rec.target == 1 and len(spoof_indices) < half:
                spoof_indices.append(i)
            if len(bonafide_indices) == half and len(spoof_indices) == half:
                break

        selected_indices = bonafide_indices + spoof_indices
        train_subset = Subset(train_dataset, selected_indices)
        print(f"[*] Balanced Train Subset: {len(bonafide_indices)} bona fide + {len(spoof_indices)} spoof = {len(train_subset)} samples")

        dev_cap = args.max_dev_samples or 1000
        dev_indices = list(range(min(dev_cap, total_dev)))
        dev_subset = Subset(dev_dataset, dev_indices)
        print(f"[*] Dev Subset: {len(dev_subset)} samples")
    else:
        train_subset = train_dataset
        if args.max_dev_samples is not None:
            dev_subset = Subset(dev_dataset, list(range(min(args.max_dev_samples, total_dev))))
            print(f"[*] Dev Subset: {len(dev_subset)} samples")
        else:
            dev_subset = dev_dataset

    # DataLoaders
    sampler = None
    shuffle = True

    if args.imbalance_strategy == "weighted_sampler" and not args.smoke_test:
        print("[*] Building WeightedRandomSampler (Strategy B)...")
        # Precompute weights for balanced drawing
        weights = []
        for i in range(len(train_subset)):
            idx = train_subset.indices[i] if isinstance(train_subset, Subset) else i
            rec = train_dataset._read_record_at_index(idx)
            w = config.bonafide_weight if rec.target == 0 else config.spoof_weight
            weights.append(w)
        sampler = WeightedRandomSampler(weights=weights, num_samples=len(train_subset), replacement=True)
        shuffle = False

    train_loader = DataLoader(
        train_subset,
        batch_size=config.physical_batch_size,
        shuffle=shuffle if sampler is None else False,
        sampler=sampler,
        num_workers=config.num_workers,
        pin_memory=False,
    )

    dev_loader = DataLoader(
        dev_subset,
        batch_size=config.physical_batch_size * 2,
        shuffle=False,
        num_workers=config.num_workers,
        pin_memory=False,
    )

    # Instantiate model
    if args.model == "SlimResNetBaseline":
        model = SlimResNetBaseline(include_front_end=True, target_samples=config.target_samples)
    else:
        model = ResNetAcousticBaseline(include_front_end=True, target_samples=config.target_samples)

    trainer = DeepfakeTrainer(model=model, config=config)

    # Train model
    manifest = trainer.fit(train_loader=train_loader, dev_loader=dev_loader)

    print("\nTraining completed successfully.")
    print(f"Best Checkpoint: {manifest['best_model']['checkpoint_path']}")
    print(f"Best DEV EER: {manifest['best_model']['best_dev_eer']*100:.2f}%")
    print(f"Optimal Threshold: {manifest['best_model']['optimal_threshold']:.4f}")


if __name__ == "__main__":
    main()

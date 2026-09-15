"""
VaaniShield: Deepfake Detector Trainer
======================================
Orchestrates training, gradient accumulation, validation on DEV,
checkpoint management based on Equal Error Rate (EER), and early stopping.
"""

from __future__ import annotations

import gc
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

_repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from backend.ai.models.base import BaseDeepfakeDetector
from backend.ai.training.config import TrainingConfig
from backend.ai.training.metrics import (
    calculate_far_frr,
    compute_classification_metrics,
    compute_eer,
    compute_roc_auc,
)


class DeepfakeTrainer:
    """
    Manages end-to-end training and evaluation of speech deepfake detectors.
    Enforces strict partition isolation: EVAL split is strictly forbidden during training.
    """

    def __init__(
        self,
        model: BaseDeepfakeDetector,
        config: TrainingConfig,
    ) -> None:
        self.model = model
        self.config = config
        self.device = torch.device(config.device)
        self.model.to(self.device)

        config.validate()
        config.ensure_directories()

        # Class imbalance handling
        if config.imbalance_strategy == "weighted_loss":
            # Strategy A: Loss weights inverse to class frequency
            loss_weights = torch.tensor(
                [config.bonafide_weight, config.spoof_weight],
                dtype=torch.float32,
                device=self.device,
            )
            self.criterion = nn.CrossEntropyLoss(weight=loss_weights)
        else:
            # Strategy B (sampler) or Strategy C (unweighted baseline)
            self.criterion = nn.CrossEntropyLoss()

        self.optimizer = torch.optim.Adam(
            self.model.parameters(),
            lr=config.learning_rate,
            weight_decay=config.weight_decay,
        )

        self.scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
            self.optimizer,
            mode="min",
            factor=0.5,
            patience=1,
        )

        # Checkpoint tracking
        self.best_dev_eer: float = float("inf")
        self.best_dev_loss: float = float("inf")
        self.best_threshold: float = 0.5
        self.best_epoch: int = 0
        self.history: List[Dict[str, Any]] = []

    def train_epoch(self, train_loader: DataLoader, epoch: int) -> Dict[str, float]:
        """Execute one training epoch with gradient accumulation."""
        self.model.train()
        total_loss = 0.0
        num_batches = len(train_loader)
        batch_count = 0

        self.optimizer.zero_grad()
        t0 = time.perf_counter()

        for batch_idx, batch in enumerate(train_loader):
            # Shape: [B, T] where T=64000
            waveform = batch["waveform"]
            if waveform.dim() == 3 and waveform.shape[1] == 1:
                waveform = waveform.squeeze(1)
            waveform = waveform.to(self.device)

            labels = batch["label"].to(self.device)

            # Forward pass
            logits = self.model(waveform)
            raw_loss = self.criterion(logits, labels)

            # Normalize loss for gradient accumulation
            loss = raw_loss / self.config.grad_accum_steps
            loss.backward()

            total_loss += raw_loss.item()
            batch_count += 1

            # Step optimizer at accumulation boundary or last batch
            if (batch_idx + 1) % self.config.grad_accum_steps == 0 or (batch_idx + 1) == num_batches:
                torch.nn.utils.clip_grad_norm_(
                    self.model.parameters(),
                    max_norm=self.config.max_grad_norm,
                )
                self.optimizer.step()
                self.optimizer.zero_grad()

            if (batch_idx + 1) % 500 == 0:
                elapsed_batch = max(time.perf_counter() - t0, 1e-5)
                samples_done = (batch_idx + 1) * self.config.physical_batch_size
                rate_curr = samples_done / elapsed_batch
                avg_loss = total_loss / max(batch_count, 1)
                print(f"  [Epoch {epoch}] Batch {batch_idx+1}/{num_batches} ({rate_curr:.1f} samples/sec, loss: {avg_loss:.4f})")

        t1 = time.perf_counter()
        avg_loss = total_loss / max(batch_count, 1)

        return {
            "train_loss": round(avg_loss, 4),
            "epoch_duration_sec": round(t1 - t0, 2),
        }

    def evaluate(
        self,
        data_loader: DataLoader,
        split_name: str = "DEV",
    ) -> Dict[str, float]:
        """Run validation evaluation over dataset split."""
        self.model.eval()
        all_scores = []
        all_labels = []
        total_loss = 0.0
        batch_count = 0

        t0 = time.perf_counter()

        with torch.no_grad():
            for batch in data_loader:
                waveform = batch["waveform"]
                if waveform.dim() == 3 and waveform.shape[1] == 1:
                    waveform = waveform.squeeze(1)
                waveform = waveform.to(self.device)

                labels = batch["label"].to(self.device)

                logits = self.model(waveform)
                loss = self.criterion(logits, labels)
                total_loss += loss.item()
                batch_count += 1

                # Probability of class 1 (spoof)
                probs = torch.softmax(logits, dim=-1)[:, 1]

                all_scores.extend(probs.cpu().numpy().tolist())
                all_labels.extend(labels.cpu().numpy().tolist())

        t1 = time.perf_counter()

        scores_arr = np.array(all_scores, dtype=np.float64)
        labels_arr = np.array(all_labels, dtype=np.int64)

        eer, opt_threshold = compute_eer(scores_arr, labels_arr)
        roc_auc = compute_roc_auc(scores_arr, labels_arr)
        far, frr = calculate_far_frr(scores_arr, labels_arr, threshold=opt_threshold)

        avg_loss = total_loss / max(batch_count, 1)

        return {
            "loss": round(avg_loss, 4),
            "eer": round(float(eer), 4),
            "roc_auc": round(float(roc_auc), 4),
            "far": round(float(far), 4),
            "frr": round(float(frr), 4),
            "optimal_threshold": round(float(opt_threshold), 4),
            "eval_duration_sec": round(t1 - t0, 2),
        }

    def fit(
        self,
        train_loader: DataLoader,
        dev_loader: DataLoader,
        max_epochs: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Full training loop with DEV checkpoint selection and early stopping.
        """
        epochs = max_epochs or self.config.max_epochs
        patience_counter = 0

        print("=" * 80)
        print(f"STARTING TRAINING: {self.config.model_architecture} on {self.config.device.upper()}")
        print(f"Strategy: {self.config.imbalance_strategy} | Batch Size: {self.config.physical_batch_size} "
              f"x {self.config.grad_accum_steps} = {self.config.effective_batch_size} (effective)")
        print(f"Max Epochs: {epochs} | Early Stopping Patience: {self.config.patience}")
        print("=" * 80)

        for epoch in range(1, epochs + 1):
            t_epoch_start = time.perf_counter()

            # Train phase
            train_metrics = self.train_epoch(train_loader, epoch)

            # Validation phase on DEV
            dev_metrics = self.evaluate(dev_loader, split_name="DEV")

            # LR scheduler step based on DEV EER
            self.scheduler.step(dev_metrics["eer"])
            current_lr = self.optimizer.param_groups[0]["lr"]

            epoch_time = round(time.perf_counter() - t_epoch_start, 2)
            dev_eer = dev_metrics["eer"]
            dev_loss = dev_metrics["loss"]
            opt_thresh = dev_metrics["optimal_threshold"]

            epoch_log = {
                "epoch": epoch,
                "train_loss": train_metrics["train_loss"],
                "dev_loss": dev_loss,
                "dev_eer": round(dev_eer, 4),
                "dev_roc_auc": round(dev_metrics["roc_auc"], 4),
                "optimal_threshold": round(opt_thresh, 4),
                "learning_rate": current_lr,
                "epoch_time_sec": epoch_time,
            }
            self.history.append(epoch_log)

            # Checkpoint selection: Primary = lowest DEV EER, Secondary = lowest DEV loss
            is_best = False
            if dev_eer < self.best_dev_eer or (dev_eer == self.best_dev_eer and dev_loss < self.best_dev_loss):
                is_best = True
                self.best_dev_eer = dev_eer
                self.best_dev_loss = dev_loss
                self.best_threshold = opt_thresh
                self.best_epoch = epoch
                patience_counter = 0

                # Save best checkpoint with configured prefix
                best_path = Path(self.config.checkpoint_dir) / f"{self.config.checkpoint_prefix}_best.pt"
                self.save_checkpoint(best_path, epoch, dev_metrics)
                best_marker = "(*) BEST MODEL SAVED"
            else:
                patience_counter += 1
                best_marker = f"(patience: {patience_counter}/{self.config.patience})"

            # Save latest checkpoint every epoch
            latest_path = Path(self.config.checkpoint_dir) / f"{self.config.checkpoint_prefix}_latest.pt"
            self.save_checkpoint(latest_path, epoch, dev_metrics)

            print(
                f"Epoch {epoch:02d}/{epochs:02d} | "
                f"Train Loss: {train_metrics['train_loss']:.4f} | "
                f"DEV Loss: {dev_loss:.4f} | "
                f"DEV EER: {dev_eer*100:.2f}% | "
                f"DEV AUC: {dev_metrics['roc_auc']:.4f} | "
                f"Thresh: {opt_thresh:.4f} | "
                f"Time: {epoch_time:.1f}s | {best_marker}"
            )

            # RAM cleanup
            gc.collect()

            # Early stopping check
            if patience_counter >= self.config.patience:
                print(f"\n[EARLY STOPPING] DEV EER failed to improve for {self.config.patience} consecutive epochs.")
                break

        print("=" * 80)
        print(f"TRAINING COMPLETE. Best Epoch: {self.best_epoch} | Best DEV EER: {self.best_dev_eer*100:.2f}% | Threshold: {self.best_threshold:.4f}")
        print("=" * 80)

        manifest = self.build_run_manifest()
        return manifest

    def save_checkpoint(
        self,
        path: Path,
        epoch: int,
        metrics: Dict[str, Any],
    ) -> None:
        """Serialize model weights and training state."""
        checkpoint_data = {
            "epoch": epoch,
            "architecture": self.config.model_architecture,
            "model_state_dict": self.model.state_dict(),
            "optimizer_state_dict": self.optimizer.state_dict(),
            "scheduler_state_dict": self.scheduler.state_dict(),
            "best_dev_eer": self.best_dev_eer,
            "calibrated_threshold": self.best_threshold,
            "metrics": metrics,
            "config": self.config.__dict__,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
        torch.save(checkpoint_data, path)

    def load_checkpoint(self, path: Path | str) -> Dict[str, Any]:
        """Load model weights and metrics from checkpoint."""
        checkpoint = torch.load(path, map_location=self.device)
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.best_dev_eer = checkpoint.get("best_dev_eer", float("inf"))
        self.best_threshold = checkpoint.get("calibrated_threshold", 0.5)
        self.best_epoch = checkpoint.get("epoch", 0)
        return checkpoint

    def build_run_manifest(self) -> Dict[str, Any]:
        """Generate structured run manifest document."""
        manifest = {
            "run_id": self.config.run_id,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "model_architecture": self.config.model_architecture,
            "imbalance_strategy": self.config.imbalance_strategy,
            "hardware": {
                "device": self.config.device,
                "num_workers": self.config.num_workers,
            },
            "training_config": {
                "physical_batch_size": self.config.physical_batch_size,
                "grad_accum_steps": self.config.grad_accum_steps,
                "effective_batch_size": self.config.effective_batch_size,
                "learning_rate": self.config.learning_rate,
                "weight_decay": self.config.weight_decay,
                "max_epochs": self.config.max_epochs,
                "patience": self.config.patience,
            },
            "best_model": {
                "best_epoch": self.best_epoch,
                "best_dev_eer": self.best_dev_eer,
                "optimal_threshold": self.best_threshold,
                "checkpoint_path": str(Path(self.config.checkpoint_dir) / f"{self.config.checkpoint_prefix}_best.pt"),
            },
            "history": self.history,
        }

        # Save manifest
        report_file = Path(self.config.reports_dir) / f"{self.config.run_id}_manifest.json"
        with open(report_file, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)

        return manifest

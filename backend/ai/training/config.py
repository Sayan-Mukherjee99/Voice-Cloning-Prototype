"""
VaaniShield: Training Configuration
===================================
Typed configuration dataclass for deepfake detector training, validation,
and hardware execution constraints.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
import time
from typing import Literal


@dataclass
class TrainingConfig:
    """Configuration parameters for deepfake detector baseline training."""

    # Experiment identity
    run_id: str = field(default_factory=lambda: f"run_{time.strftime('%Y%m%d_%H%M%S')}")
    seed: int = 42

    # Architecture
    model_architecture: Literal["ResNetAcousticBaseline", "SlimResNetBaseline"] = "ResNetAcousticBaseline"
    target_samples: int = 64000  # 4.0 seconds at 16kHz -> 400 spectrogram frames
    sample_rate: int = 16000
    dropout_p: float = 0.3

    # Optimization
    learning_rate: float = 1e-4
    weight_decay: float = 1e-4
    max_grad_norm: float = 1.0

    # Hardware & batching
    physical_batch_size: int = 8
    grad_accum_steps: int = 4
    num_workers: int = 0  # 0 required on Windows CPU to prevent process RAM duplication
    device: str = "cpu"

    # Class imbalance strategy (mutually exclusive)
    imbalance_strategy: Literal["weighted_loss", "weighted_sampler", "unweighted"] = "weighted_loss"
    bonafide_weight: float = 4.92  # 1 / (2 * 0.1017)
    spoof_weight: float = 0.56     # 1 / (2 * 0.8983)

    # Schedule & early stopping
    max_epochs: int = 10
    patience: int = 3  # Early stopping patience on DEV EER

    # Storage paths
    checkpoint_dir: str = "models/checkpoints"
    checkpoint_prefix: str = "resnet18_baseline"
    manifest_dir: str = "data/manifests"
    reports_dir: str = "data/reports"

    @property
    def effective_batch_size(self) -> int:
        """Effective batch size after gradient accumulation."""
        return self.physical_batch_size * self.grad_accum_steps

    def validate(self) -> None:
        """Validate parameter consistency."""
        if self.physical_batch_size < 1:
            raise ValueError(f"physical_batch_size must be >= 1, got {self.physical_batch_size}")
        if self.grad_accum_steps < 1:
            raise ValueError(f"grad_accum_steps must be >= 1, got {self.grad_accum_steps}")
        if self.learning_rate <= 0:
            raise ValueError(f"learning_rate must be > 0, got {self.learning_rate}")
        if self.target_samples % 160 != 0:
            raise ValueError(f"target_samples ({self.target_samples}) must be divisible by hop_length 160")
        if self.imbalance_strategy not in ("weighted_loss", "weighted_sampler", "unweighted"):
            raise ValueError(f"Unknown imbalance_strategy: {self.imbalance_strategy}")

    def ensure_directories(self) -> None:
        """Ensure output directories exist."""
        Path(self.checkpoint_dir).mkdir(parents=True, exist_ok=True)
        Path(self.manifest_dir).mkdir(parents=True, exist_ok=True)
        Path(self.reports_dir).mkdir(parents=True, exist_ok=True)

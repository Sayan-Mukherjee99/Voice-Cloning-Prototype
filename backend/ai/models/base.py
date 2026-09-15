"""
VaaniShield: Base Deepfake Detector Interface
=============================================
Abstract base class defining the standard interface for all
speaker-independent speech deepfake detectors in VaaniShield.
"""

from __future__ import annotations

import abc
import torch
import torch.nn as nn


class BaseDeepfakeDetector(nn.Module, abc.ABC):
    """
    Abstract base interface for speech deepfake detection models.
    All detector implementations (ResNet, RawNet2, AASIST) must conform to this contract.
    """

    @abc.abstractmethod
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass returning binary classification logits.

        Args:
            x: Raw audio waveform tensor [B, T] or feature tensor.

        Returns:
            Logits tensor of shape [B, 2] where:
                Index 0 = Bona Fide (genuine human speech)
                Index 1 = Spoof (synthetic/cloned/converted speech)
        """
        raise NotImplementedError

    def predict_proba(self, x: torch.Tensor) -> torch.Tensor:
        """
        Compute continuous probability of spoofing.

        Args:
            x: Input tensor [B, T].

        Returns:
            Tensor of shape [B] containing P(spoof) in [0.0, 1.0].
        """
        logits = self.forward(x)
        # Class 1 corresponds to spoof in the standard ASVspoof protocol convention
        probabilities = torch.softmax(logits, dim=-1)
        return probabilities[:, 1]

    @abc.abstractmethod
    def extract_embedding(self, x: torch.Tensor) -> torch.Tensor:
        """
        Extract penultimate latent representation for downstream fusion or analysis.

        Args:
            x: Input tensor [B, T].

        Returns:
            Latent embedding tensor [B, embedding_dim].
        """
        raise NotImplementedError

"""
VaaniShield: ResNet-18 Acoustic Vocoder Artifact Detector
==========================================================
Differentiable log-mel filterbank front-end and 2D Residual Convolutional
Network for speaker-independent voice deepfake and anti-spoof detection.
"""

from __future__ import annotations

import math
from typing import Optional

import torch
import torch.nn as nn

try:
    from backend.ai.models.base import BaseDeepfakeDetector
except ImportError:
    from ai.models.base import BaseDeepfakeDetector


def create_mel_filterbank(
    n_mels: int = 80,
    n_fft: int = 512,
    sample_rate: int = 16000,
    f_min: float = 20.0,
    f_max: float = 8000.0,
) -> torch.Tensor:
    """Generate triangular mel filterbank matrix in pure PyTorch."""
    def hz_to_mel(hz: torch.Tensor) -> torch.Tensor:
        return 2595.0 * torch.log10(1.0 + hz / 700.0)

    def mel_to_hz(mel: torch.Tensor) -> torch.Tensor:
        return 700.0 * (10.0 ** (mel / 2595.0) - 1.0)

    mel_min = hz_to_mel(torch.tensor(f_min, dtype=torch.float32))
    mel_max = hz_to_mel(torch.tensor(f_max, dtype=torch.float32))
    mel_points = torch.linspace(mel_min, mel_max, n_mels + 2)
    hz_points = mel_to_hz(mel_points)

    bin_points = torch.floor((n_fft + 1) * hz_points / sample_rate).long()
    num_bins = n_fft // 2 + 1
    filters = torch.zeros(n_mels, num_bins, dtype=torch.float32)

    for m in range(1, n_mels + 1):
        f_left = bin_points[m - 1].item()
        f_center = bin_points[m].item()
        f_right = bin_points[m + 1].item()

        if f_center > f_left:
            for k in range(f_left, f_center):
                if k < num_bins:
                    filters[m - 1, k] = (k - f_left) / (f_center - f_left)
        if f_right > f_center:
            for k in range(f_center, f_right):
                if k < num_bins:
                    filters[m - 1, k] = (f_right - k) / (f_right - f_center)

    return filters


class SpectrogramFrontEnd(nn.Module):
    """
    Differentiable front-end converting raw audio waveforms to 80-bin log-mel spectrograms.
    Runs entirely in PyTorch for seamless ONNX export and backpropagation.
    """

    def __init__(
        self,
        sample_rate: int = 16000,
        n_fft: int = 512,
        win_length: int = 400,  # 25ms at 16kHz
        hop_length: int = 160,  # 10ms at 16kHz
        n_mels: int = 80,
        f_min: float = 20.0,
        f_max: float = 8000.0,
        target_frames: Optional[int] = 400,
    ) -> None:
        super().__init__()
        self.sample_rate = sample_rate
        self.n_fft = n_fft
        self.win_length = win_length
        self.hop_length = hop_length
        self.n_mels = n_mels
        self.target_frames = target_frames

        # Buffers are automatically moved to device with model and serialized
        mel_fb = create_mel_filterbank(n_mels, n_fft, sample_rate, f_min, f_max)
        self.register_buffer("mel_basis", mel_fb)
        self.register_buffer("window", torch.hann_window(win_length))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Convert raw waveform [B, T] to log-mel spectrogram [B, 1, n_mels, T_frames].
        """
        if x.dim() == 1:
            x = x.unsqueeze(0)
        elif x.dim() == 3:
            # Handle [B, 1, T]
            x = x.squeeze(1)

        # STFT computation
        stft = torch.stft(
            x,
            n_fft=self.n_fft,
            hop_length=self.hop_length,
            win_length=self.win_length,
            window=self.window,
            return_complex=True,
            center=True,
        )

        magnitude = torch.abs(stft)  # [B, n_fft // 2 + 1, T_frames]

        # Project to Mel scale
        mel = torch.matmul(self.mel_basis, magnitude)  # [B, n_mels, T_frames]

        # Log-dynamic range compression (clamped to prevent log(0) singularity)
        log_mel = torch.log(torch.clamp(mel, min=1e-5))

        # Add channel dimension: [B, 1, n_mels, T_frames]
        out = log_mel.unsqueeze(1)

        # Enforce fixed target_frames if specified
        if self.target_frames is not None:
            t_len = out.shape[-1]
            if t_len > self.target_frames:
                out = out[:, :, :, :self.target_frames]
            elif t_len < self.target_frames:
                pad_amt = self.target_frames - t_len
                out = nn.functional.pad(out, (0, pad_amt))

        return out


class BasicBlock(nn.Module):
    """Standard ResNet BasicBlock with two 3x3 convolutions and skip connection."""

    def __init__(self, in_planes: int, planes: int, stride: int = 1) -> None:
        super().__init__()
        self.conv1 = nn.Conv2d(in_planes, planes, kernel_size=3, stride=stride, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(planes)
        self.relu = nn.ReLU(inplace=True)
        self.conv2 = nn.Conv2d(planes, planes, kernel_size=3, stride=1, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(planes)

        self.shortcut = nn.Sequential()
        if stride != 1 or in_planes != planes:
            self.shortcut = nn.Sequential(
                nn.Conv2d(in_planes, planes, kernel_size=1, stride=stride, bias=False),
                nn.BatchNorm2d(planes),
            )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out = self.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        out += self.shortcut(x)
        return self.relu(out)


class ResNetAcousticBaseline(BaseDeepfakeDetector):
    """
    Candidate Baseline A: ResNet-18 Acoustic Vocoder Artifact Detector.
    Processes raw waveform or log-mel spectrograms and outputs [B, 2] logits.
    """

    def __init__(
        self,
        num_classes: int = 2,
        dropout_p: float = 0.3,
        include_front_end: bool = True,
        target_samples: int = 64000,
    ) -> None:
        super().__init__()
        self.include_front_end = include_front_end
        if include_front_end:
            self.front_end = SpectrogramFrontEnd(target_frames=target_samples // 160)
        else:
            self.front_end = None

        self.in_planes = 64

        # Initial stem: 7x7 conv with stride 2, max pool
        self.stem = nn.Sequential(
            nn.Conv2d(1, 64, kernel_size=7, stride=2, padding=3, bias=False),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=3, stride=2, padding=1),
        )

        # 4 Residual stages (2 blocks each = ResNet-18 depth)
        self.layer1 = self._make_layer(64, num_blocks=2, stride=1)
        self.layer2 = self._make_layer(128, num_blocks=2, stride=2)
        self.layer3 = self._make_layer(256, num_blocks=2, stride=2)
        self.layer4 = self._make_layer(512, num_blocks=2, stride=2)

        # Global temporal-spatial pooling
        self.avgpool = nn.AdaptiveAvgPool2d((1, 1))

        # Classifier head
        self.classifier = nn.Sequential(
            nn.Linear(512, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(p=dropout_p),
            nn.Linear(128, num_classes),
        )

        self._initialize_weights()

    def _make_layer(self, planes: int, num_blocks: int, stride: int) -> nn.Sequential:
        strides = [stride] + [1] * (num_blocks - 1)
        layers = []
        for s in strides:
            layers.append(BasicBlock(self.in_planes, planes, s))
            self.in_planes = planes
        return nn.Sequential(*layers)

    def _initialize_weights(self) -> None:
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, mode="fan_out", nonlinearity="relu")
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.constant_(m.weight, 1.0)
                nn.init.constant_(m.bias, 0.0)
            elif isinstance(m, nn.Linear):
                nn.init.normal_(m.weight, 0.0, 0.01)
                nn.init.constant_(m.bias, 0.0)

    def extract_features(self, x: torch.Tensor) -> torch.Tensor:
        """Helper to pass input through front-end if necessary."""
        if x.dim() in (1, 2) and self.front_end is not None:
            # Raw audio [B, T] -> [B, 1, 80, 400]
            x = self.front_end(x)
        elif x.dim() == 3:
            # [B, 80, T] -> [B, 1, 80, T]
            x = x.unsqueeze(1)
        return x

    def extract_embedding(self, x: torch.Tensor) -> torch.Tensor:
        """Extract 512-dim latent embedding from penultimate layer."""
        features = self.extract_features(x)
        out = self.stem(features)
        out = self.layer1(out)
        out = self.layer2(out)
        out = self.layer3(out)
        out = self.layer4(out)
        pooled = self.avgpool(out)
        return torch.flatten(pooled, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass returning [B, 2] logits."""
        embedding = self.extract_embedding(x)
        logits = self.classifier(embedding)
        return logits


class SlimResNetBaseline(BaseDeepfakeDetector):
    """
    Architectural Fallback: Slim-ResNet with 32 initial channels (~2.8M parameters).
    Available if host CPU throughput or memory pressure makes standard 11M ResNet unviable.
    """

    def __init__(
        self,
        num_classes: int = 2,
        dropout_p: float = 0.3,
        include_front_end: bool = True,
        target_samples: int = 64000,
    ) -> None:
        super().__init__()
        self.include_front_end = include_front_end
        if include_front_end:
            self.front_end = SpectrogramFrontEnd(target_frames=target_samples // 160)
        else:
            self.front_end = None

        self.in_planes = 32

        self.stem = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=5, stride=2, padding=2, bias=False),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=3, stride=2, padding=1),
        )

        self.layer1 = self._make_layer(32, num_blocks=2, stride=1)
        self.layer2 = self._make_layer(64, num_blocks=2, stride=2)
        self.layer3 = self._make_layer(128, num_blocks=2, stride=2)
        self.layer4 = self._make_layer(256, num_blocks=2, stride=2)

        self.avgpool = nn.AdaptiveAvgPool2d((1, 1))

        self.classifier = nn.Sequential(
            nn.Linear(256, 64),
            nn.ReLU(inplace=True),
            nn.Dropout(p=dropout_p),
            nn.Linear(64, num_classes),
        )

    def _make_layer(self, planes: int, num_blocks: int, stride: int) -> nn.Sequential:
        strides = [stride] + [1] * (num_blocks - 1)
        layers = []
        for s in strides:
            layers.append(BasicBlock(self.in_planes, planes, s))
            self.in_planes = planes
        return nn.Sequential(*layers)

    def extract_features(self, x: torch.Tensor) -> torch.Tensor:
        if x.dim() in (1, 2) and self.front_end is not None:
            x = self.front_end(x)
        elif x.dim() == 3:
            x = x.unsqueeze(1)
        return x

    def extract_embedding(self, x: torch.Tensor) -> torch.Tensor:
        features = self.extract_features(x)
        out = self.stem(features)
        out = self.layer1(out)
        out = self.layer2(out)
        out = self.layer3(out)
        out = self.layer4(out)
        pooled = self.avgpool(out)
        return torch.flatten(pooled, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        embedding = self.extract_embedding(x)
        logits = self.classifier(embedding)
        return logits

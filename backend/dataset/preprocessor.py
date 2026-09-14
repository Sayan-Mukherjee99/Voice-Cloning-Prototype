"""
VaaniShield — Non-Destructive Model-Agnostic Audio Preprocessor
===============================================================
Baseline preprocessing foundation for speech anti-spoofing and deepfake research.

Non-Destructive Baseline Principles:
  - Decodes audio to native Float32 in [-1.0, 1.0].
  - Preserves full native duration by default (zero silent cropping or padding).
  - Normalization is DISABLED by default (preserves natural amplitude dynamics and vocoder artifacts).
  - Fixed windowing is DISABLED by default (model-agnostic; configured by downstream experiments).
  - Silence/VAD trimming is DISABLED by default (preserves glottal closures, pause anomalies, and unvoiced cues).
  - All transforms are modular and explicitly opt-in.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Literal
import numpy as np
import torch

try:
    import soundfile as sf
    SOUNDFILE_AVAILABLE = True
except ImportError:
    sf = None  # type: ignore
    SOUNDFILE_AVAILABLE = False

try:
    import torchaudio
    TORCHAUDIO_AVAILABLE = True
except ImportError:
    torchaudio = None  # type: ignore
    TORCHAUDIO_AVAILABLE = False


@dataclass
class AudioPreprocessResult:
    """Preprocessed audio waveform and metadata."""
    waveform: torch.Tensor  # Float32 tensor of shape [1, T]
    sample_rate: int
    num_samples: int
    duration_sec: float


class AudioPreprocessor:
    """
    Model-agnostic audio preprocessor.
    Defaults to clean, non-destructive float32 decoding at 16kHz mono.
    """

    def __init__(
        self,
        target_sr: int = 16_000,
        normalize: Literal["peak", "rms"] | None = None,
        target_samples: int | None = None,
        crop_mode: Literal["random", "center", "tile", "pad"] = "center",
        remove_dc_offset: bool = False,
        strip_silence: bool = False,
        silence_threshold_db: float = -40.0,
    ) -> None:
        self.target_sr = target_sr
        self.normalize = normalize
        self.target_samples = target_samples
        self.crop_mode = crop_mode
        self.remove_dc_offset = remove_dc_offset
        self.strip_silence = strip_silence
        self.silence_threshold_db = silence_threshold_db

    def load_waveform(self, audio_source: str | Path | np.ndarray | torch.Tensor, sr: int | None = None) -> tuple[torch.Tensor, int]:
        """
        Load or convert audio input into a 2D Float32 Tensor [1, T] and sample rate.
        """
        if isinstance(audio_source, (str, Path)):
            path = Path(audio_source)
            if not path.is_file():
                raise FileNotFoundError(f"Audio file not found: {path}")

            if SOUNDFILE_AVAILABLE and sf is not None:
                data, in_sr = sf.read(str(path), dtype="float32", always_2d=True)
                # soundfile returns [T, channels], transpose to [channels, T]
                tensor = torch.from_numpy(data.T)
            elif TORCHAUDIO_AVAILABLE and torchaudio is not None:
                tensor, in_sr = torchaudio.load(str(path))
            else:
                raise RuntimeError("Neither soundfile nor torchaudio is available to decode audio.")

            return tensor, in_sr

        elif isinstance(audio_source, np.ndarray):
            in_sr = sr or self.target_sr
            if audio_source.dtype == np.int16:
                tensor = torch.from_numpy(audio_source.astype(np.float32) / 32768.0)
            else:
                tensor = torch.from_numpy(audio_source.astype(np.float32))

            if tensor.ndim == 1:
                tensor = tensor.unsqueeze(0)
            elif tensor.ndim == 2 and tensor.shape[0] > tensor.shape[1]:
                tensor = tensor.T
            return tensor, in_sr

        elif isinstance(audio_source, torch.Tensor):
            in_sr = sr or self.target_sr
            tensor = audio_source.to(torch.float32)
            if tensor.ndim == 1:
                tensor = tensor.unsqueeze(0)
            elif tensor.ndim == 2 and tensor.shape[0] > tensor.shape[1]:
                tensor = tensor.T
            return tensor, in_sr

        else:
            raise TypeError(f"Unsupported audio source type: {type(audio_source)}")

    def preprocess(
        self,
        audio_source: str | Path | np.ndarray | torch.Tensor,
        sr: int | None = None,
        generator: torch.Generator | None = None,
    ) -> AudioPreprocessResult:
        """
        Execute audio preprocessing pipeline with non-destructive baseline defaults.
        """
        waveform, in_sr = self.load_waveform(audio_source, sr=sr)

        # 1. Channel Downmixing: Mono [1, T]
        if waveform.shape[0] > 1:
            waveform = waveform.mean(dim=0, keepdim=True)

        # 2. Resampling (if needed)
        if in_sr != self.target_sr:
            if TORCHAUDIO_AVAILABLE and torchaudio is not None:
                resampler = torchaudio.transforms.Resample(orig_freq=in_sr, new_freq=self.target_sr)
                waveform = resampler(waveform)
            else:
                # Scipy fallback resampling
                from scipy.signal import resample_poly
                gcd = np.gcd(in_sr, self.target_sr)
                up = self.target_sr // gcd
                down = in_sr // gcd
                arr = waveform.squeeze(0).numpy()
                resampled = resample_poly(arr, up, down).astype(np.float32)
                waveform = torch.from_numpy(resampled).unsqueeze(0)

        # 3. Optional DC Offset Subtraction (Disabled by default)
        if self.remove_dc_offset:
            waveform = waveform - waveform.mean(dim=-1, keepdim=True)

        # 4. Optional Silence / VAD Trimming (Disabled by default)
        if self.strip_silence:
            waveform = self._trim_silence(waveform, self.silence_threshold_db)

        # 5. Optional Amplitude Normalization (Disabled by default)
        if self.normalize == "peak":
            max_val = torch.max(torch.abs(waveform))
            if max_val > 1e-8:
                waveform = waveform / max_val
        elif self.normalize == "rms":
            rms = torch.sqrt(torch.mean(waveform ** 2))
            if rms > 1e-8:
                target_rms = 0.1
                waveform = waveform * (target_rms / rms)

        # 6. Optional Duration / Window Regulation (Disabled by default: returns full native audio)
        if self.target_samples is not None and self.target_samples > 0:
            waveform = self._regulate_length(waveform, self.target_samples, self.crop_mode, generator)

        num_samples = waveform.shape[-1]
        duration_sec = num_samples / self.target_sr

        return AudioPreprocessResult(
            waveform=waveform,
            sample_rate=self.target_sr,
            num_samples=num_samples,
            duration_sec=duration_sec,
        )

    def __call__(
        self,
        audio_source: str | Path | np.ndarray | torch.Tensor,
        sr: int | None = None,
    ) -> AudioPreprocessResult:
        return self.preprocess(audio_source, sr=sr)

    def _trim_silence(self, waveform: torch.Tensor, threshold_db: float) -> torch.Tensor:
        """Energy-based silence trimming."""
        energy = waveform.squeeze(0) ** 2
        threshold = 10.0 ** (threshold_db / 10.0)
        voiced = (energy > threshold).nonzero(as_tuple=True)[0]
        if len(voiced) == 0:
            return waveform  # All silence: return as-is
        start = voiced[0].item()
        end = voiced[-1].item() + 1
        return waveform[:, start:end]

    def _regulate_length(
        self,
        waveform: torch.Tensor,
        target_len: int,
        crop_mode: str,
        generator: torch.Generator | None = None,
    ) -> torch.Tensor:
        """Regulate length via tiling, zero-padding, random crop, or center crop."""
        cur_len = waveform.shape[-1]
        if cur_len == target_len:
            return waveform

        if cur_len < target_len:
            if crop_mode == "pad":
                pad_size = target_len - cur_len
                return torch.nn.functional.pad(waveform, (0, pad_size))
            else:
                # Default: repeat periodically (tiles audio)
                repeats = (target_len // cur_len) + 1
                tiled = waveform.repeat(1, repeats)
                return tiled[:, :target_len]
        else:
            if crop_mode == "random":
                max_start = cur_len - target_len
                if generator is not None:
                    start = torch.randint(0, max_start + 1, (1,), generator=generator).item()
                else:
                    start = torch.randint(0, max_start + 1, (1,)).item()
                return waveform[:, start:start + target_len]
            else:
                # Default center crop
                start = (cur_len - target_len) // 2
                return waveform[:, start:start + target_len]

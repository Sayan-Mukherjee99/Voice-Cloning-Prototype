"""
VaaniShield — ONNX Inference Engine & Heuristic Fallbacks
=========================================================
Wraps ONNX sessions for:
  - Silero VAD (voice activity detection / silence stripping)
  - ResNet-18 Acoustic Vocoder Artifact Detector (Tier 1 <80ms)
  - ECAPA-TDNN 192-dim Speaker Embedding (Tier 2 <350ms)
Preserves graceful deterministic and realistic mock fallbacks
when models are absent or dependencies are missing.
"""

from __future__ import annotations

import hashlib
import os
from typing import Any

import numpy as np

try:
    from backend.core.config import (
        ONNX_AVAILABLE,
        LIBROSA_AVAILABLE,
        settings,
        log,
    )
except ImportError:
    from core.config import (
        ONNX_AVAILABLE,
        LIBROSA_AVAILABLE,
        settings,
        log,
    )

if ONNX_AVAILABLE:
    import onnxruntime as ort

if LIBROSA_AVAILABLE:
    import librosa


class InferenceEngine:
    """
    Wraps ONNX sessions for Silero VAD, ResNet-18 acoustic, and ECAPA-TDNN.
    Falls back to realistic mock inference when model files are absent.
    """

    def __init__(self) -> None:
        self.vad_session: Any | None = None
        self.resnet_session: Any | None = None
        self.ecapa_session: Any | None = None
        self._rng = np.random.default_rng(42)

    def load_models(self) -> None:
        if not ONNX_AVAILABLE:
            log.warning("onnxruntime unavailable – all inference will use mock outputs")
            return

        so = ort.SessionOptions()
        so.inter_op_num_threads = 2
        so.intra_op_num_threads = 4
        so.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        so.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

        providers = ["CPUExecutionProvider"]

        for attr, path, name in [
            ("vad_session", settings.silero_vad_model, "Silero VAD"),
            ("resnet_session", settings.resnet18_model, "ResNet-18 Acoustic"),
            ("ecapa_session", settings.ecapa_tdnn_model, "ECAPA-TDNN"),
        ]:
            if os.path.exists(path):
                try:
                    setattr(self, attr, ort.InferenceSession(path, sess_options=so, providers=providers))
                    log.info(f"{name} model loaded", path=path)
                except Exception as exc:
                    log.error(f"Failed to load {name}", error=str(exc))
            else:
                log.warning(f"{name} model not found – using mock", path=path)

    def vad_speech_ratio(self, pcm: np.ndarray, sample_rate: int = 16_000) -> float:
        """
        Run Silero VAD to compute fraction of audio with active speech.
        Falls back to energy-based VAD mock.
        """
        if self.vad_session is not None:
            try:
                # Silero VAD ONNX input: float32 [1, samples]
                audio_f32 = pcm.astype(np.float32) / 32768.0
                inp = audio_f32[np.newaxis, :]  # [1, N]
                h = np.zeros((2, 1, 64), dtype=np.float32)
                c = np.zeros((2, 1, 64), dtype=np.float32)
                sr_arr = np.array(sample_rate, dtype=np.int64)
                # Process in 512-sample chunks (32ms at 16kHz)
                chunk_sz = 512
                speech_chunks = 0
                total_chunks = 0
                for i in range(0, len(audio_f32) - chunk_sz, chunk_sz):
                    chunk = audio_f32[i:i + chunk_sz][np.newaxis, :]
                    outs = self.vad_session.run(
                        None,
                        {"input": chunk, "sr": sr_arr, "h": h, "c": c},
                    )
                    prob, h, c = outs[0], outs[1], outs[2]
                    if prob[0][0] > 0.5:
                        speech_chunks += 1
                    total_chunks += 1
                return speech_chunks / max(total_chunks, 1)
            except Exception as exc:
                log.debug("VAD ONNX inference failed, using energy mock", error=str(exc))

        # Energy-based fallback VAD
        rms = np.sqrt(np.mean(pcm.astype(np.float32) ** 2))
        threshold = 500.0  # empirical for 16-bit PCM
        return float(np.clip(rms / threshold, 0.0, 1.0))

    def compute_log_mel_spectrogram(self, pcm: np.ndarray) -> np.ndarray:
        """Compute 80-bin log-mel filterbank spectrogram (25ms window, 10ms hop)."""
        audio_f32 = pcm.astype(np.float32) / 32768.0

        if LIBROSA_AVAILABLE:
            mel = librosa.feature.melspectrogram(
                y=audio_f32,
                sr=settings.sample_rate,
                n_fft=settings.n_fft,
                hop_length=settings.hop_length,
                win_length=settings.win_length,
                n_mels=settings.n_mels,
                fmin=20,
                fmax=8000,
            )
            log_mel = librosa.power_to_db(mel, ref=np.max)
        else:
            # scipy fallback
            from scipy.signal import spectrogram as sp_spectrogram
            from scipy.signal.windows import hann

            freqs, times, Sxx = sp_spectrogram(
                audio_f32,
                fs=settings.sample_rate,
                window=hann(settings.win_length),
                nperseg=settings.win_length,
                noverlap=settings.win_length - settings.hop_length,
            )
            # Rough mel approximation
            log_mel = np.log1p(np.abs(Sxx[:settings.n_mels, :]))

        return log_mel  # shape: (n_mels, T)

    def acoustic_risk_score(self, log_mel: np.ndarray) -> float:
        """
        ResNet-18 ONNX acoustic vocoder artifact detector.
        Output: float [0, 100] where 100 = definite synthetic voice.
        """
        if self.resnet_session is not None:
            try:
                # Resize log_mel to 80×80 (what ResNet-18 expects)
                T = log_mel.shape[1]
                if T < 80:
                    log_mel = np.pad(log_mel, ((0, 0), (0, 80 - T)), mode="constant")
                else:
                    log_mel = log_mel[:, :80]
                # [1, 1, 80, 80] input tensor
                inp = log_mel[np.newaxis, np.newaxis, :, :].astype(np.float32)
                logits = self.resnet_session.run(None, {"input": inp})[0]
                # Assume binary classifier: [genuine_score, spoof_score]
                spoof_prob = float(np.exp(logits[0][1]) / (np.exp(logits[0][0]) + np.exp(logits[0][1])))
                return spoof_prob * 100.0
            except Exception as exc:
                log.debug("ResNet ONNX inference failed, using mock", error=str(exc))

        # Realistic mock: base noise + feature-correlated signal
        mel_mean = np.mean(log_mel)
        mel_std = np.std(log_mel)
        # Synthetic voices tend to have lower variance in log-mel
        synthetic_indicator = max(0.0, 20.0 - mel_std) * 2.0
        noise = self._rng.normal(0, 8)
        return float(np.clip(synthetic_indicator + noise + 5.0, 0.0, 100.0))

    def extract_ecapa_embedding(self, pcm: np.ndarray) -> np.ndarray:
        """
        ECAPA-TDNN 192-dim speaker embedding extraction.
        Returns L2-normalised 192-dim float32 vector.
        """
        if self.ecapa_session is not None:
            try:
                audio_f32 = pcm.astype(np.float32) / 32768.0
                inp = audio_f32[np.newaxis, :]  # [1, N]
                embedding = self.ecapa_session.run(None, {"input": inp})[0]
                embedding = embedding.squeeze()[:192]
                # L2 normalise
                norm = np.linalg.norm(embedding)
                return (embedding / (norm + 1e-8)).astype(np.float32)
            except Exception as exc:
                log.debug("ECAPA ONNX inference failed, using mock", error=str(exc))

        # Deterministic mock: hash PCM to stable random unit vector
        pcm_hash = hashlib.sha256(pcm.tobytes()).digest()
        rng = np.random.default_rng(int.from_bytes(pcm_hash[:4], "big"))
        vec = rng.standard_normal(192).astype(np.float32)
        return (vec / (np.linalg.norm(vec) + 1e-8)).astype(np.float32)

    def cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        return float(np.dot(a, b))  # both L2-normalised → dot product = cosine sim

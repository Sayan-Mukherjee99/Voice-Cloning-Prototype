"""
VaaniShield — Biomechanical Prosody Analyser (Parselmouth & Scipy Fallback)
===========================================================================
Extracts biomechanical micro-prosody features:
  - F0 pitch mean, std, variance
  - Point-process jitter (local, rap)
  - Shimmer (local, apq5)
  - Harmonics-to-Noise Ratio (HNR in dB)
  - Respiration pause detection
Falls back to energy-based autocorrelation/spectral estimation if Parselmouth is unavailable.
"""

from __future__ import annotations

import numpy as np

try:
    from backend.core.config import PARSELMOUTH_AVAILABLE, log
except ImportError:
    from core.config import PARSELMOUTH_AVAILABLE, log

if PARSELMOUTH_AVAILABLE:
    import parselmouth


class ProsodyAnalyser:
    """
    Uses praat-parselmouth to extract biomechanical micro-prosody features.
    Falls back to scipy-based estimation when parselmouth is unavailable.
    """

    def analyse(self, pcm: np.ndarray, sample_rate: int = 16_000) -> dict[str, float]:
        if PARSELMOUTH_AVAILABLE:
            return self._analyse_parselmouth(pcm, sample_rate)
        return self._analyse_scipy_mock(pcm, sample_rate)

    def _analyse_parselmouth(self, pcm: np.ndarray, sample_rate: int) -> dict[str, float]:
        try:
            audio_f32 = pcm.astype(np.float64) / 32768.0
            snd = parselmouth.Sound(audio_f32, sampling_frequency=sample_rate)

            # Pitch (F0)
            pitch = snd.to_pitch(pitch_floor=60.0, pitch_ceiling=400.0)
            pitch_values = pitch.selected_array["frequency"]
            pitch_values = pitch_values[pitch_values > 0]  # remove unvoiced

            if len(pitch_values) < 5:
                return self._analyse_scipy_mock(pcm, sample_rate)

            f0_mean = float(np.mean(pitch_values))
            f0_std = float(np.std(pitch_values))
            f0_variance = float(np.var(pitch_values))

            # Point process for jitter/shimmer
            pp = parselmouth.praat.call(snd, "To PointProcess (periodic, cc)", 60, 400)

            # Jitter metrics
            jitter_local = parselmouth.praat.call(pp, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3)
            jitter_rap = parselmouth.praat.call(pp, "Get jitter (rap)", 0, 0, 0.0001, 0.02, 1.3)

            # Shimmer metrics
            shimmer_local = parselmouth.praat.call(
                [snd, pp], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6
            )
            shimmer_apq5 = parselmouth.praat.call(
                [snd, pp], "Get shimmer (apq5)", 0, 0, 0.0001, 0.02, 1.3, 1.6
            )

            # Harmonics-to-Noise Ratio
            harmonicity = snd.to_harmonicity()
            hnr_values = harmonicity.values[harmonicity.values != -200]
            hnr_db = float(np.mean(hnr_values)) if len(hnr_values) > 0 else 0.0

            # Respiration gaps: detect pauses > 150ms in voiced segments
            intensity = snd.to_intensity()
            int_vals = intensity.values.squeeze()
            silent_mask = int_vals < 40.0  # < 40 dB = pause
            # Count longest consecutive silence in ms
            gaps: list[int] = []
            count = 0
            for v in silent_mask:
                if v:
                    count += 1
                else:
                    if count > 0:
                        gaps.append(count)
                    count = 0
            respiration_gap_ms = float(max(gaps) * intensity.time_step * 1000) if gaps else 0.0

            return {
                "f0_mean_hz": f0_mean,
                "f0_std_hz": f0_std,
                "f0_variance": f0_variance,
                "jitter_local": float(jitter_local),
                "jitter_rap": float(jitter_rap),
                "shimmer_local": float(shimmer_local),
                "shimmer_apq5": float(shimmer_apq5),
                "hnr_db": hnr_db,
                "respiration_gap_ms": respiration_gap_ms,
            }
        except Exception as exc:
            log.warning("Parselmouth analysis failed", error=str(exc))
            return self._analyse_scipy_mock(pcm, sample_rate)

    def _analyse_scipy_mock(self, pcm: np.ndarray, sample_rate: int) -> dict[str, float]:
        """Energy-based prosody estimation using scipy."""
        from scipy.signal import find_peaks
        audio_f32 = pcm.astype(np.float32) / 32768.0

        # Simple autocorrelation-based F0 estimate
        corr = np.correlate(audio_f32, audio_f32, mode="full")
        corr = corr[len(corr) // 2:]
        # Search in F0 range 60–400 Hz
        min_lag = sample_rate // 400
        max_lag = sample_rate // 60
        peaks, _ = find_peaks(corr[min_lag:max_lag])

        f0_mean = float(sample_rate / (peaks[0] + min_lag)) if len(peaks) > 0 else 120.0
        f0_variance = float(np.var(corr[min_lag:max_lag]))
        f0_std = float(np.sqrt(f0_variance))

        # Energy-based jitter/shimmer mock
        frames = np.array_split(audio_f32, max(1, len(audio_f32) // 160))
        energies = np.array([np.sqrt(np.mean(f ** 2)) for f in frames])
        energies = energies[energies > 1e-6]

        jitter_local = float(np.std(energies) / (np.mean(energies) + 1e-8)) * 0.02
        shimmer_local = float(np.std(energies) / (np.mean(energies) + 1e-8)) * 0.15
        hnr_db = float(np.clip(20 * np.log10(np.mean(energies) + 1e-8) + 30, 0, 40))

        return {
            "f0_mean_hz": f0_mean,
            "f0_std_hz": f0_std,
            "f0_variance": f0_variance,
            "jitter_local": jitter_local,
            "jitter_rap": jitter_local * 0.7,
            "shimmer_local": shimmer_local,
            "shimmer_apq5": shimmer_local * 0.9,
            "hnr_db": hnr_db,
            "respiration_gap_ms": 0.0,
        }

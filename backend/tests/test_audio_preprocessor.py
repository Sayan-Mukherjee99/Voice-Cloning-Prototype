"""
Unit tests for AudioPreprocessor.
Verifies non-destructive baseline defaults and configurable transforms.
"""

import os
import sys
import numpy as np
import torch
import pytest

_repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

try:
    from backend.dataset.preprocessor import AudioPreprocessor, AudioPreprocessResult
except ImportError:
    from dataset.preprocessor import AudioPreprocessor, AudioPreprocessResult


def test_baseline_non_destructive_defaults():
    preprocessor = AudioPreprocessor()
    assert preprocessor.target_sr == 16000
    assert preprocessor.normalize is None
    assert preprocessor.target_samples is None
    assert preprocessor.strip_silence is False
    assert preprocessor.remove_dc_offset is False

    # Synthetic waveform with known amplitude and duration
    orig_waveform = np.array([0.1, -0.2, 0.35, -0.15, 0.05], dtype=np.float32)
    res = preprocessor(orig_waveform, sr=16000)

    assert isinstance(res, AudioPreprocessResult)
    assert res.sample_rate == 16000
    assert res.num_samples == len(orig_waveform)
    assert res.duration_sec == len(orig_waveform) / 16000
    assert res.waveform.shape == (1, len(orig_waveform))
    assert res.waveform.dtype == torch.float32
    # Verify amplitude values are preserved without modification
    torch.testing.assert_close(res.waveform.squeeze(0), torch.from_numpy(orig_waveform))


def test_channel_downmixing():
    preprocessor = AudioPreprocessor()
    # Stereo signal: Channel 0 is 0.2, Channel 1 is 0.4
    stereo = np.array([[0.2, 0.2, 0.2], [0.4, 0.4, 0.4]], dtype=np.float32)
    res = preprocessor(stereo, sr=16000)

    assert res.waveform.shape == (1, 3)
    # Downmix average: (0.2 + 0.4) / 2 = 0.3
    expected = torch.tensor([[0.3, 0.3, 0.3]], dtype=torch.float32)
    torch.testing.assert_close(res.waveform, expected)


def test_configurable_normalization():
    # Peak normalization
    peak_preprocessor = AudioPreprocessor(normalize="peak")
    waveform = np.array([0.1, -0.5, 0.2], dtype=np.float32)
    res_peak = peak_preprocessor(waveform, sr=16000)
    assert pytest.approx(torch.max(torch.abs(res_peak.waveform)).item(), rel=1e-4) == 1.0

    # None normalization (default)
    none_preprocessor = AudioPreprocessor(normalize=None)
    res_none = none_preprocessor(waveform, sr=16000)
    assert pytest.approx(torch.max(torch.abs(res_none.waveform)).item(), rel=1e-4) == 0.5


def test_configurable_duration_windowing():
    # Slicing longer audio (center crop)
    crop_preprocessor = AudioPreprocessor(target_samples=4, crop_mode="center")
    long_waveform = np.array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0], dtype=np.float32)
    res_crop = crop_preprocessor(long_waveform, sr=16000)
    assert res_crop.num_samples == 4
    # Center crop of [1, 2, 3, 4, 5, 6] length 4 -> start index (6-4)//2 = 1 -> [2, 3, 4, 5]
    expected = torch.tensor([[2.0, 3.0, 4.0, 5.0]], dtype=torch.float32)
    torch.testing.assert_close(res_crop.waveform, expected)

    # Tiling shorter audio
    tile_preprocessor = AudioPreprocessor(target_samples=6, crop_mode="tile")
    short_waveform = np.array([1.0, 2.0], dtype=np.float32)
    res_tile = tile_preprocessor(short_waveform, sr=16000)
    assert res_tile.num_samples == 6
    expected_tile = torch.tensor([[1.0, 2.0, 1.0, 2.0, 1.0, 2.0]], dtype=torch.float32)
    torch.testing.assert_close(res_tile.waveform, expected_tile)


def test_silence_trimming_disabled_by_default():
    preprocessor = AudioPreprocessor()
    # Signal with silence at start and end
    audio_with_silence = np.array([0.0, 0.0, 0.5, -0.5, 0.0, 0.0], dtype=np.float32)
    res = preprocessor(audio_with_silence, sr=16000)
    # When strip_silence is False, all 6 samples must remain
    assert res.num_samples == 6


def test_silence_trimming_when_enabled():
    preprocessor = AudioPreprocessor(strip_silence=True, silence_threshold_db=-20.0)
    audio_with_silence = np.array([0.0001, 0.0001, 0.5, -0.5, 0.0001], dtype=np.float32)
    res = preprocessor(audio_with_silence, sr=16000)
    # The middle active samples are preserved, outer quiet samples trimmed
    assert res.num_samples < len(audio_with_silence)
    assert res.waveform.shape[-1] == 2

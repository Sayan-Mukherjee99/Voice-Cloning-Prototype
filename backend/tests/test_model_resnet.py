"""
Unit Tests: ResNet-18 Acoustic Baseline Model
=============================================
Verifies tensor shapes, probability bounds, gradient propagation, and embedding extraction.
"""

import os
import sys
import pytest
import torch

_repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

try:
    from backend.ai.models.resnet import (
        ResNetAcousticBaseline,
        SlimResNetBaseline,
        SpectrogramFrontEnd,
    )
except ImportError:
    from ai.models.resnet import (
        ResNetAcousticBaseline,
        SlimResNetBaseline,
        SpectrogramFrontEnd,
    )


def test_spectrogram_frontend_shape():
    """Verify differentiable front-end outputs [B, 1, 80, 400] from [B, 64000]."""
    frontend = SpectrogramFrontEnd(
        sample_rate=16000,
        n_fft=512,
        win_length=400,
        hop_length=160,
        n_mels=80,
        target_frames=400,
    )
    x = torch.randn(2, 64000)
    spec = frontend(x)
    assert spec.shape == (2, 1, 80, 400), f"Expected (2, 1, 80, 400), got {spec.shape}"
    assert not torch.isnan(spec).any(), "NaN detected in spectrogram output"
    assert not torch.isinf(spec).any(), "Inf detected in spectrogram output"


def test_resnet_forward_shape():
    """Verify ResNet-18 forward pass outputs [B, 2] logits from raw audio [B, 64000]."""
    model = ResNetAcousticBaseline(include_front_end=True, target_samples=64000)
    model.eval()
    x = torch.randn(2, 64000)
    with torch.no_grad():
        logits = model(x)
    assert logits.shape == (2, 2), f"Expected (2, 2) logits, got {logits.shape}"


def test_resnet_predict_proba():
    """Verify predict_proba outputs continuous probabilities bounded in [0.0, 1.0]."""
    model = ResNetAcousticBaseline(include_front_end=True, target_samples=64000)
    model.eval()
    x = torch.randn(4, 64000)
    with torch.no_grad():
        probs = model.predict_proba(x)
    assert probs.shape == (4,), f"Expected shape (4,), got {probs.shape}"
    assert (probs >= 0.0).all() and (probs <= 1.0).all(), f"Probabilities out of bounds: {probs}"


def test_resnet_embedding_extraction():
    """Verify extract_embedding outputs [B, 512] representation."""
    model = ResNetAcousticBaseline(include_front_end=True, target_samples=64000)
    model.eval()
    x = torch.randn(2, 64000)
    with torch.no_grad():
        emb = model.extract_embedding(x)
    assert emb.shape == (2, 512), f"Expected (2, 512), got {emb.shape}"


def test_resnet_gradient_backprop():
    """Verify backward pass computes finite, non-zero gradients for parameters."""
    model = ResNetAcousticBaseline(include_front_end=True, target_samples=64000)
    model.train()
    x = torch.randn(2, 64000)
    target = torch.tensor([0, 1], dtype=torch.long)

    logits = model(x)
    criterion = torch.nn.CrossEntropyLoss()
    loss = criterion(logits, target)
    loss.backward()

    # Check gradients in initial stem and final classifier
    stem_conv = model.stem[0]
    assert stem_conv.weight.grad is not None, "Stem conv weight gradient is None"
    assert not torch.isnan(stem_conv.weight.grad).any(), "NaN in stem conv gradient"

    clf_linear = model.classifier[-1]
    assert clf_linear.weight.grad is not None, "Classifier linear weight gradient is None"
    assert torch.abs(clf_linear.weight.grad).sum() > 0, "Zero gradient in classifier layer"


def test_slim_resnet_baseline():
    """Verify architectural fallback SlimResNetBaseline operates properly."""
    model = SlimResNetBaseline(include_front_end=True, target_samples=64000)
    model.eval()
    x = torch.randn(2, 64000)
    with torch.no_grad():
        logits = model(x)
        emb = model.extract_embedding(x)
        probs = model.predict_proba(x)

    assert logits.shape == (2, 2)
    assert emb.shape == (2, 256)
    assert probs.shape == (2,)
    assert (probs >= 0.0).all() and (probs <= 1.0).all()

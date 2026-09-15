"""
VaaniShield: ONNX Export & Parity Verification CLI
=================================================
Exports trained PyTorch deepfake detector checkpoints to ONNX format.
Performs verification:
  1. Validates ONNX model graph structure
  2. Runs ONNX Runtime inference on identical input tensors
  3. Validates numerical parity (max absolute diff, MSE) against PyTorch
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict

import numpy as np
import torch

_repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from backend.ai.models.resnet import ResNetAcousticBaseline, SlimResNetBaseline


def export_and_verify_onnx(
    checkpoint_path: Path,
    output_path: Path,
    opset_version: int = 17,
    batch_size: int = 1,
    tolerance: float = 1e-4,
) -> Dict[str, Any]:
    """
    Exports a trained PyTorch detector checkpoint to ONNX format
    and validates numerical parity with ONNX Runtime.
    """
    results: Dict[str, Any] = {
        "checkpoint": str(checkpoint_path),
        "onnx_output": str(output_path),
        "opset_version": opset_version,
        "export_success": False,
        "onnxruntime_verified": False,
        "numerical_parity": False,
        "max_abs_diff": None,
        "mean_squared_error": None,
        "error": None,
    }

    if not checkpoint_path.is_file():
        results["error"] = f"Checkpoint file not found: {checkpoint_path}"
        return results

    # Load PyTorch model
    print(f"Loading checkpoint: {checkpoint_path}")
    checkpoint = torch.load(checkpoint_path, map_location="cpu")
    arch = checkpoint.get("architecture", "ResNetAcousticBaseline")

    if arch == "SlimResNetBaseline":
        model = SlimResNetBaseline(include_front_end=True, target_samples=64000)
    else:
        model = ResNetAcousticBaseline(include_front_end=True, target_samples=64000)

    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    # Dummy input: [B, 64000] raw audio at 16kHz
    dummy_input = torch.randn(batch_size, 64000, dtype=torch.float32)

    # Compute PyTorch reference output
    with torch.no_grad():
        pytorch_logits = model(dummy_input).numpy()

    output_path.parent.mkdir(parents=True, exist_ok=True)

    # 1. Attempt PyTorch ONNX export
    print(f"Exporting to ONNX (opset {opset_version})...")
    try:
        torch.onnx.export(
            model,
            dummy_input,
            str(output_path),
            opset_version=opset_version,
            dynamo=False,
            input_names=["audio_waveform"],
            output_names=["logits"],
            dynamic_axes={
                "audio_waveform": {0: "batch_size"},
                "logits": {0: "batch_size"},
            },
        )
        results["export_success"] = True
        print(f"Exported ONNX model to: {output_path} ({output_path.stat().st_size / 1024 / 1024:.2f} MB)")
    except Exception as e:
        err_msg = str(e)
        if "STFT does not currently support complex types" in err_msg or "aten::stft" in err_msg:
            limitation = "PyTorch ONNX TorchScript operator limitation: 'aten::stft' does not support complex types for end-to-end waveform input."
        elif "Module onnx is not installed" in err_msg or "No module named 'onnx'" in err_msg:
            limitation = "Environment limitation: Python package 'onnx' is not installed in the environment (onnxruntime is installed)."
        else:
            limitation = f"Export exception: {type(e).__name__}: {err_msg[:200]}"
            
        results["error"] = limitation
        results["raw_exception"] = f"{type(e).__name__}: {str(e)[:400]}"
        print(f"[!] {results['error']}")
        return results

    # 2. Check ONNX Model Structure
    try:
        import onnx
        onnx_model = onnx.load(str(output_path))
        onnx.checker.check_model(onnx_model)
        print("[+] ONNX model checker passed.")
    except ImportError:
        print("[!] Package 'onnx' not installed; skipping onnx.checker.check_model.")
    except Exception as e:
        print(f"[!] ONNX model checker warning: {e}")

    # 3. Verify ONNX Runtime Loading & Inference Parity
    try:
        import onnxruntime as ort
        session = ort.InferenceSession(str(output_path), providers=["CPUExecutionProvider"])
        results["onnxruntime_verified"] = True

        ort_inputs = {session.get_inputs()[0].name: dummy_input.numpy()}
        ort_outputs = session.run(None, ort_inputs)
        onnx_logits = ort_outputs[0]

        max_diff = float(np.max(np.abs(pytorch_logits - onnx_logits)))
        mse = float(np.mean((pytorch_logits - onnx_logits) ** 2))

        results["max_abs_diff"] = max_diff
        results["mean_squared_error"] = mse
        results["numerical_parity"] = bool(max_diff < tolerance)

        print(f"[+] ONNX Runtime validation passed.")
        print(f"    PyTorch logits:   {pytorch_logits[0]}")
        print(f"    ONNX Runtime:     {onnx_logits[0]}")
        print(f"    Max Absolute Diff: {max_diff:.6e}")
        print(f"    Mean Squared Error:{mse:.6e}")
        print(f"    Parity (< {tolerance}): {'PASS' if results['numerical_parity'] else 'FAIL'}")

    except ImportError:
        print("[!] 'onnxruntime' is not installed; ONNX Runtime loading skipped.")
        results["error"] = "onnxruntime package not installed"
    except Exception as e:
        results["error"] = f"ONNX Runtime inference failed: {type(e).__name__}: {str(e)}"
        print(f"[!] {results['error']}")

    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Export Trained Checkpoint to ONNX")
    parser.add_argument("--checkpoint", type=str, required=True, help="Path to .pt checkpoint")
    parser.add_argument("--output", type=str, default=None, help="Output .onnx path")
    parser.add_argument("--opset", type=int, default=17, help="ONNX opset version (default 17)")
    parser.add_argument("--tolerance", type=float, default=1e-4, help="Parity absolute tolerance")
    args = parser.parse_args()

    checkpoint_path = Path(args.checkpoint)
    if args.output:
        output_path = Path(args.output)
    else:
        output_path = checkpoint_path.with_suffix(".onnx")

    results = export_and_verify_onnx(
        checkpoint_path=checkpoint_path,
        output_path=output_path,
        opset_version=args.opset,
        tolerance=args.tolerance,
    )

    report_path = Path("data/reports/onnx_export_report.json")
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print(f"\nReport written to: {report_path}")
    if not results["export_success"]:
        sys.exit(1)


if __name__ == "__main__":
    main()

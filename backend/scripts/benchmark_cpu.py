"""
VaaniShield: CPU Feasibility Benchmark CLI
==========================================
Empirically measures throughput (samples/sec), forward/backward latencies,
and memory pressure across physical batch sizes (8, 4, 2, 1) on CPU.
Calculates realistic time-per-epoch and total training time projections
before committing to full model training.
"""

from __future__ import annotations

import argparse
import gc
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import psutil
import torch

_repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from backend.ai.models.resnet import ResNetAcousticBaseline, SlimResNetBaseline


def get_process_memory_mb() -> float:
    """Get current resident set size (RSS) of Python process in MB."""
    process = psutil.Process(os.getpid())
    return float(process.memory_info().rss / (1024 * 1024))


def run_benchmark_for_batch_size(
    model: torch.nn.Module,
    batch_size: int,
    num_iterations: int = 5,
    target_samples: int = 64000,
    device: str = "cpu",
) -> Dict[str, Any]:
    """Run forward and backward pass benchmark for a single batch size."""
    criterion = torch.nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-4)

    # Warm-up pass
    model.train()
    dummy_x = torch.randn(batch_size, target_samples, device=device)
    dummy_y = torch.randint(0, 2, (batch_size,), device=device)
    optimizer.zero_grad()
    loss = criterion(model(dummy_x), dummy_y)
    loss.backward()
    optimizer.zero_grad()

    gc.collect()
    mem_before = get_process_memory_mb()

    forward_times: List[float] = []
    backward_times: List[float] = []

    for _ in range(num_iterations):
        x = torch.randn(batch_size, target_samples, device=device)
        y = torch.randint(0, 2, (batch_size,), device=device)

        # Measure forward
        optimizer.zero_grad()
        t0 = time.perf_counter()
        logits = model(x)
        loss = criterion(logits, y)
        t1 = time.perf_counter()
        forward_times.append(t1 - t0)

        # Measure backward
        t2 = time.perf_counter()
        loss.backward()
        t3 = time.perf_counter()
        backward_times.append(t3 - t2)

        optimizer.zero_grad()

    mem_after = get_process_memory_mb()

    mean_fwd = float(np.mean(forward_times))
    mean_bwd = float(np.mean(backward_times))
    total_batch_time = mean_fwd + mean_bwd
    samples_per_sec = float(batch_size / max(total_batch_time, 1e-6))

    # Projections for ASVspoof 2019 LA
    # Full train: 25,380 utterances
    # Balanced epoch (e.g. 2,580 bona fide * 2): 5,160 utterances
    full_epoch_hours = (25380 / max(samples_per_sec, 1e-6)) / 3600.0
    balanced_epoch_min = (5160 / max(samples_per_sec, 1e-6)) / 60.0

    return {
        "batch_size": batch_size,
        "mean_forward_ms": round(mean_fwd * 1000.0, 2),
        "mean_backward_ms": round(mean_bwd * 1000.0, 2),
        "total_batch_ms": round(total_batch_time * 1000.0, 2),
        "samples_per_sec": round(samples_per_sec, 2),
        "rss_memory_mb": round(mem_after, 2),
        "memory_delta_mb": round(mem_after - mem_before, 2),
        "estimated_full_train_epoch_hours": round(full_epoch_hours, 2),
        "estimated_balanced_epoch_minutes": round(balanced_epoch_min, 2),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="CPU Feasibility Benchmark for ResNet-18 Anti-Spoof Baseline")
    parser.add_argument("--batch-sizes", nargs="+", type=int, default=[8, 4, 2, 1], help="Physical batch sizes to test")
    parser.add_argument("--iterations", type=int, default=5, help="Number of benchmark iterations per batch size")
    parser.add_argument("--model", type=str, default="ResNetAcousticBaseline", choices=["ResNetAcousticBaseline", "SlimResNetBaseline"])
    parser.add_argument("--threads", type=int, default=6, help="Max CPU threads for PyTorch")
    args = parser.parse_args()

    # Limit threads to prevent CPU starvation
    avail_cores = psutil.cpu_count(logical=False) or 4
    n_threads = min(args.threads, avail_cores)
    torch.set_num_threads(n_threads)

    print("=" * 80)
    print("VAANISHIELD: CPU FEASIBILITY BENCHMARK (Phase B4.4)")
    print("=" * 80)
    print(f"Host CPU Cores: {avail_cores} physical, {psutil.cpu_count(logical=True)} logical")
    print(f"Active PyTorch Threads: {torch.get_num_threads()}")
    print(f"System RAM: {round(psutil.virtual_memory().total / (1024**3), 2)} GB total, "
          f"{round(psutil.virtual_memory().available / (1024**3), 2)} GB available")
    print(f"Testing Architecture: {args.model}")
    print("-" * 80)

    if args.model == "SlimResNetBaseline":
        model = SlimResNetBaseline(include_front_end=True, target_samples=64000)
    else:
        model = ResNetAcousticBaseline(include_front_end=True, target_samples=64000)

    num_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"Model Parameters: {num_params:,} ({round(num_params * 4 / (1024**2), 2)} MB weights in float32)")
    print("-" * 80)

    results: List[Dict[str, Any]] = []

    print(f"{'Batch':<8}{'Fwd (ms)':<12}{'Bwd (ms)':<12}{'Total (ms)':<12}{'Throughput':<16}{'RAM (MB)':<12}{'Epoch Est.':<16}")
    print("-" * 80)

    for b_sz in args.batch_sizes:
        try:
            res = run_benchmark_for_batch_size(
                model=model,
                batch_size=b_sz,
                num_iterations=args.iterations,
            )
            results.append(res)
            print(
                f"{res['batch_size']:<8}"
                f"{res['mean_forward_ms']:<12.1f}"
                f"{res['mean_backward_ms']:<12.1f}"
                f"{res['total_batch_ms']:<12.1f}"
                f"{res['samples_per_sec']:<5.2f} s/sec     "
                f"{res['rss_memory_mb']:<12.1f}"
                f"{res['estimated_balanced_epoch_minutes']} min (bal)"
            )
        except Exception as exc:
            print(f"{b_sz:<8} FAILED: {exc}")

    print("=" * 80)

    # Save structured audit report
    out_dir = Path("data/reports")
    out_dir.mkdir(parents=True, exist_ok=True)
    report_path = out_dir / "cpu_feasibility_benchmark.json"

    report_payload = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "hardware": {
            "physical_cores": avail_cores,
            "logical_cores": psutil.cpu_count(logical=True),
            "pytorch_threads": torch.get_num_threads(),
            "ram_total_gb": round(psutil.virtual_memory().total / (1024**3), 2),
            "ram_available_gb": round(psutil.virtual_memory().available / (1024**3), 2),
        },
        "model": {
            "architecture": args.model,
            "trainable_parameters": num_params,
        },
        "benchmarks": results,
    }

    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report_payload, f, indent=2)

    print(f"Benchmark report saved to: {report_path}")


if __name__ == "__main__":
    main()

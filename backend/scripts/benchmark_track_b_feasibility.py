"""
VaaniShield: Track B Full-Training Feasibility Benchmark
=======================================================
Measures physical training throughput, forward/backward latencies, and RAM
consumption on the complete 25,380 TRAIN partition using real audio loading
to evaluate the feasibility gate (GREEN vs AMBER/RED) before committing to full training.
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict

import psutil
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

_repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from backend.ai.models.resnet import ResNetAcousticBaseline
from backend.dataset.loader import ASVSpoofDataset
from backend.dataset.preprocessor import AudioPreprocessor
from backend.dataset.protocol_reader import PartitionRole


def get_rss_memory_mb() -> float:
    """Return process RSS memory in MB."""
    return float(psutil.Process(os.getpid()).memory_info().rss / (1024 * 1024))


def run_feasibility_benchmark(
    num_steps: int = 100,
    batch_size: int = 8,
    grad_accum_steps: int = 4,
    threads: int = 6,
) -> Dict[str, Any]:
    avail_cores = psutil.cpu_count(logical=False) or 4
    torch.set_num_threads(min(threads, avail_cores))

    manifest_path = Path("data/manifests/asvspoof2019_la_train.jsonl")
    if not manifest_path.is_file():
        raise FileNotFoundError(f"TRAIN manifest not found: {manifest_path}")

    preprocessor = AudioPreprocessor(target_samples=64000, crop_mode="center")
    dataset = ASVSpoofDataset(manifest_path=manifest_path, split=PartitionRole.TRAIN, preprocessor=preprocessor)
    dataset.enforce_governance(intended_purpose="training")

    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True, num_workers=0)

    model = ResNetAcousticBaseline(include_front_end=True, target_samples=64000)
    model.train()

    # ASVspoof 2019 LA native class weights
    weights = torch.tensor([4.9186, 0.5566], dtype=torch.float32)
    criterion = nn.CrossEntropyLoss(weight=weights)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-4, weight_decay=1e-4)

    start_rss = get_rss_memory_mb()
    peak_rss = start_rss

    forward_times: list[float] = []
    backward_times: list[float] = []

    print(f"[*] Starting Track B Feasibility Benchmark ({num_steps} steps, batch_size={batch_size}, accum={grad_accum_steps})...")

    step_count = 0
    total_samples = 0
    t_bench_start = time.perf_counter()

    optimizer.zero_grad()
    for batch_idx, batch in enumerate(loader):
        if step_count >= num_steps:
            break

        waveform = batch["waveform"]
        if waveform.dim() == 3 and waveform.shape[1] == 1:
            waveform = waveform.squeeze(1)
        labels = batch["label"]
        bsz = waveform.shape[0]

        # Forward pass timing
        t_fwd_0 = time.perf_counter()
        logits = model(waveform)
        loss = criterion(logits, labels) / grad_accum_steps
        t_fwd_1 = time.perf_counter()
        forward_times.append(t_fwd_1 - t_fwd_0)

        # Backward pass timing
        t_bwd_0 = time.perf_counter()
        loss.backward()
        t_bwd_1 = time.perf_counter()
        backward_times.append(t_bwd_1 - t_bwd_0)

        if (batch_idx + 1) % grad_accum_steps == 0:
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            optimizer.zero_grad()

        curr_rss = get_rss_memory_mb()
        if curr_rss > peak_rss:
            peak_rss = curr_rss

        step_count += 1
        total_samples += bsz

        if step_count % 25 == 0:
            elapsed_so_far = max(time.perf_counter() - t_bench_start, 1e-6)
            rate_so_far = total_samples / elapsed_so_far
            print(f"  Step {step_count}/{num_steps} | Rate: {rate_so_far:.2f} samples/sec | RSS: {curr_rss:.1f} MB")

    total_bench_time = time.perf_counter() - t_bench_start
    samples_per_sec = total_samples / max(total_bench_time, 1e-6)

    mean_fwd_ms = (sum(forward_times) / max(1, len(forward_times))) * 1000.0
    mean_bwd_ms = (sum(backward_times) / max(1, len(backward_times))) * 1000.0

    # Total TRAIN population is 25,380
    train_record_count = len(dataset)
    projected_epoch_sec = train_record_count / max(samples_per_sec, 1e-6)
    projected_epoch_hours = projected_epoch_sec / 3600.0
    projected_3_epoch_hours = projected_epoch_hours * 3.0

    # Feasibility Gating Rule:
    # GREEN if projected 3-epoch runtime <= 2.5 hours AND peak RSS < 650 MB
    is_time_feasible = projected_3_epoch_hours <= 2.5
    is_ram_feasible = peak_rss < 650.0
    gating_verdict = "GREEN" if (is_time_feasible and is_ram_feasible) else "AMBER_RED"

    result = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "hardware": {
            "physical_cores": avail_cores,
            "logical_cores": psutil.cpu_count(logical=True),
            "pytorch_threads": torch.get_num_threads(),
            "ram_total_gb": round(psutil.virtual_memory().total / (1024**3), 2),
            "ram_available_gb": round(psutil.virtual_memory().available / (1024**3), 2),
        },
        "benchmark_config": {
            "num_steps": num_steps,
            "physical_batch_size": batch_size,
            "grad_accum_steps": grad_accum_steps,
            "effective_batch_size": batch_size * grad_accum_steps,
            "total_samples_profiled": total_samples,
            "dataset_train_records": train_record_count,
        },
        "measurements": {
            "samples_per_sec": round(samples_per_sec, 2),
            "mean_forward_ms": round(mean_fwd_ms, 2),
            "mean_backward_ms": round(mean_bwd_ms, 2),
            "initial_rss_mb": round(start_rss, 2),
            "peak_rss_mb": round(peak_rss, 2),
            "memory_delta_mb": round(peak_rss - start_rss, 2),
        },
        "projections": {
            "projected_epoch_minutes": round(projected_epoch_sec / 60.0, 2),
            "projected_epoch_hours": round(projected_epoch_hours, 2),
            "projected_3_epoch_hours": round(projected_3_epoch_hours, 2),
        },
        "gating_evaluation": {
            "time_threshold_hours": 2.5,
            "ram_threshold_mb": 650.0,
            "is_time_feasible": is_time_feasible,
            "is_ram_feasible": is_ram_feasible,
            "verdict": gating_verdict,
            "recommendation": (
                "Proceed to Track B full training"
                if gating_verdict == "GREEN"
                else "Abort Track B retraining to prevent CPU/memory exhaustion; retain Track A as verified empirical baseline."
            ),
        },
    }

    out_dir = Path("data/reports")
    out_dir.mkdir(parents=True, exist_ok=True)
    report_file = out_dir / "b5_cpu_feasibility_gate.json"

    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print("=" * 80)
    print("TRACK B CPU FEASIBILITY GATE RESULTS")
    print("=" * 80)
    print(f"Profiled Steps:          {num_steps} batches ({total_samples} samples)")
    print(f"Training Throughput:     {result['measurements']['samples_per_sec']} samples/sec")
    print(f"Mean Latencies:          Forward={mean_fwd_ms:.1f} ms | Backward={mean_bwd_ms:.1f} ms")
    print(f"Peak Working Set RSS:    {result['measurements']['peak_rss_mb']} MB (Delta: {result['measurements']['memory_delta_mb']} MB)")
    print(f"Projected Epoch Time:    {result['projections']['projected_epoch_minutes']} minutes ({result['projections']['projected_epoch_hours']} hours)")
    print(f"Projected 3-Epoch Time:  {result['projections']['projected_3_epoch_hours']} hours")
    print(f"Gating Rule:             Time <= 2.5h ({is_time_feasible}) | RAM < 650 MB ({is_ram_feasible})")
    print(f"VERDICT:                 {gating_verdict}")
    print(f"Action:                  {result['gating_evaluation']['recommendation']}")
    print(f"Artifact Saved:          {report_file}")
    print("=" * 80)

    return result


if __name__ == "__main__":
    run_feasibility_benchmark()

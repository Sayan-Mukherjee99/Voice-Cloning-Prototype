"""
VaaniShield: Model Evaluation & Benchmark CLI
=============================================
Evaluates trained deepfake detector checkpoints on DEV or held-out EVAL partitions.
Enforces strict split policy:
  - DEV: Used for validation, model selection, and threshold calibration.
  - EVAL: Held-out benchmark evaluated strictly with frozen checkpoint and threshold.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Optional

import psutil
import torch
from torch.utils.data import DataLoader, Subset

_repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from backend.ai.models.resnet import ResNetAcousticBaseline, SlimResNetBaseline
from backend.ai.training.analysis import compute_attack_wise_metrics, compute_detailed_error_analysis
from backend.ai.training.metrics import compute_classification_metrics
from backend.dataset.loader import ASVSpoofDataset
from backend.dataset.preprocessor import AudioPreprocessor
from backend.dataset.protocol_reader import PartitionRole


def evaluate_split(
    model: torch.nn.Module,
    manifest_path: Path,
    split_role: PartitionRole,
    batch_size: int = 16,
    calibrated_threshold: Optional[float] = None,
    max_samples: Optional[int] = None,
    target_samples: int = 64000,
    device: str = "cpu",
    collect_analysis: bool = False,
) -> tuple[dict, Optional[dict], Optional[dict]]:
    """
    Run single-pass streaming evaluation over dataset split.
    Optionally extracts per-sample metadata to compute attack-wise
    and error-breakdown analytics without secondary passes.
    """
    preprocessor = AudioPreprocessor(target_samples=target_samples, crop_mode="center")
    dataset = ASVSpoofDataset(
        manifest_path=manifest_path,
        split=split_role,
        preprocessor=preprocessor,
    )

    # Enforce governance check
    purpose = "validation" if split_role == PartitionRole.DEV else "evaluation"
    dataset.enforce_governance(intended_purpose=purpose)

    total_samples = len(dataset)
    if max_samples is not None and max_samples < total_samples:
        bonafide_indices = []
        spoof_indices = []
        for i in range(total_samples):
            rec = dataset._read_record_at_index(i)
            if rec.target == 0:
                bonafide_indices.append(i)
            else:
                spoof_indices.append(i)
        
        ratio_bona = len(bonafide_indices) / total_samples
        n_bona = max(1, int(max_samples * ratio_bona))
        n_spoof = max(1, max_samples - n_bona)
        selected_indices = bonafide_indices[:n_bona] + spoof_indices[:n_spoof]
        dataset = Subset(dataset, selected_indices)
        print(f"[*] Stratified subsample: {n_bona} bona fide, {n_spoof} spoof (total {len(dataset)})")

    loader = DataLoader(dataset, batch_size=batch_size, shuffle=False, num_workers=0)

    model.eval()
    all_scores: list[float] = []
    all_labels: list[int] = []
    analysis_records: list[dict] = []

    t0 = time.perf_counter()
    processed_count = 0
    last_log_time = t0

    with torch.no_grad():
        for batch in loader:
            waveform = batch["waveform"]
            if waveform.dim() == 3 and waveform.shape[1] == 1:
                waveform = waveform.squeeze(1)
            waveform = waveform.to(device)
            labels = batch["label"]

            logits = model(waveform)
            probs = torch.softmax(logits, dim=-1)[:, 1]

            score_list = probs.cpu().numpy().tolist()
            label_list = labels.numpy().tolist()

            all_scores.extend(score_list)
            all_labels.extend(label_list)

            if collect_analysis and "metadata" in batch:
                meta = batch["metadata"]
                batch_sys = meta.get("system_id", [])
                batch_spk = meta.get("speaker_id", [])
                batch_utt = meta.get("utterance_id", [])
                batch_dur = meta.get("duration_sec", [])
                
                # Tensor duration handling if collated as tensor
                if isinstance(batch_dur, torch.Tensor):
                    batch_dur = batch_dur.tolist()

                for b_idx in range(len(score_list)):
                    sys_id = batch_sys[b_idx] if b_idx < len(batch_sys) else "-"
                    spk_id = batch_spk[b_idx] if b_idx < len(batch_spk) else ""
                    utt_id = batch_utt[b_idx] if b_idx < len(batch_utt) else f"sample_{processed_count + b_idx}"
                    dur_val = float(batch_dur[b_idx]) if b_idx < len(batch_dur) else 0.0

                    analysis_records.append({
                        "utterance_id": utt_id,
                        "speaker_id": spk_id,
                        "system_id": sys_id,
                        "duration_sec": round(dur_val, 4),
                        "label": int(label_list[b_idx]),
                        "score": round(float(score_list[b_idx]), 6),
                    })

            processed_count += len(score_list)

            # Periodic progress logging every 5,000 samples or 30s
            curr_time = time.perf_counter()
            if processed_count % 5000 < len(score_list) or (curr_time - last_log_time) >= 30.0:
                elapsed_curr = max(curr_time - t0, 1e-5)
                rate = processed_count / elapsed_curr
                pct = (processed_count / len(dataset)) * 100.0
                print(f"[*] Processed {processed_count:,} / {len(dataset):,} utterances ({pct:.1f}%) | {rate:.1f} samples/sec")
                last_log_time = curr_time

    elapsed = time.perf_counter() - t0
    metrics = compute_classification_metrics(all_scores, all_labels, threshold=calibrated_threshold)
    metrics["evaluation_time_sec"] = round(elapsed, 2)
    metrics["samples_per_sec"] = round(len(all_labels) / max(elapsed, 1e-6), 2)

    attack_wise_data = None
    error_analysis_data = None

    if collect_analysis and analysis_records:
        active_thresh = metrics.get("evaluated_threshold") or metrics["optimal_threshold"]
        attack_wise_data = compute_attack_wise_metrics(
            scores=all_scores,
            labels=all_labels,
            system_ids=[r["system_id"] for r in analysis_records],
            threshold=active_thresh,
        )
        error_analysis_data = compute_detailed_error_analysis(
            records=analysis_records,
            threshold=active_thresh,
        )

    return metrics, attack_wise_data, error_analysis_data


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate Anti-Spoof Detector on DEV or EVAL split")
    parser.add_argument("--checkpoint", type=str, required=True, help="Path to .pt checkpoint file")
    parser.add_argument("--split", type=str, required=True, choices=["dev", "eval"], help="Partition to evaluate")
    parser.add_argument("--manifest", type=str, default=None, help="Path to .jsonl manifest file")
    parser.add_argument("--threshold", type=float, default=None, help="Calibrated threshold (required for EVAL)")
    parser.add_argument("--batch-size", type=int, default=32, help="Evaluation batch size")
    parser.add_argument("--max-samples", type=int, default=None, help="Optional max sample limit")
    parser.add_argument("--save-report", action="store_true", help="Save metrics report to data/reports/")
    parser.add_argument("--output-prefix", type=str, default=None, help="Report prefix (e.g. b5_track_a)")
    parser.add_argument("--collect-analysis", action="store_true", help="Collect attack-wise and error analysis")
    parser.add_argument("--threads", type=int, default=6, help="CPU threads")
    args = parser.parse_args()

    # CPU threading control
    avail_cores = psutil.cpu_count(logical=False) or 4
    torch.set_num_threads(min(args.threads, avail_cores))

    checkpoint_path = Path(args.checkpoint)
    if not checkpoint_path.is_file():
        sys.exit(f"Error: Checkpoint file not found: {checkpoint_path}")

    # Load checkpoint
    print(f"Loading checkpoint: {checkpoint_path}")
    checkpoint = torch.load(checkpoint_path, map_location="cpu")
    arch = checkpoint.get("architecture", "ResNetAcousticBaseline")

    if arch == "SlimResNetBaseline":
        model = SlimResNetBaseline(include_front_end=True, target_samples=64000)
    else:
        model = ResNetAcousticBaseline(include_front_end=True, target_samples=64000)

    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    ckpt_thresh = checkpoint.get("calibrated_threshold", 0.5)
    print(f"Checkpoint Epoch: {checkpoint.get('epoch', 'N/A')} | Architecture: {arch}")
    print(f"Stored Calibrated Threshold: {ckpt_thresh:.4f}")

    # Split determination
    split_role = PartitionRole.DEV if args.split.lower() == "dev" else PartitionRole.EVAL
    manifest_default = f"data/manifests/asvspoof2019_la_{args.split.lower()}.jsonl"
    manifest_path = Path(args.manifest or manifest_default)

    if not manifest_path.is_file():
        sys.exit(f"Error: Manifest file not found: {manifest_path}")

    # For EVAL, threshold must come from calibration (checkpoint or flag)
    threshold_to_use = args.threshold if args.threshold is not None else ckpt_thresh
    if split_role == PartitionRole.EVAL:
        print(f"\n[EVAL BENCHMARK POLICY] Using FROZEN calibration threshold: {threshold_to_use:.4f}")
        print("EVAL split is evaluated strictly without threshold or parameter tuning.")

    # Always collect attack-wise analytics on EVAL, or when explicitly requested
    collect_analytics = args.collect_analysis or (split_role == PartitionRole.EVAL)

    print(f"\nEvaluating {split_role.value.upper()} Partition: {manifest_path}")
    metrics, attack_wise, error_analysis = evaluate_split(
        model=model,
        manifest_path=manifest_path,
        split_role=split_role,
        batch_size=args.batch_size,
        calibrated_threshold=threshold_to_use if split_role == PartitionRole.EVAL else None,
        max_samples=args.max_samples,
        collect_analysis=collect_analytics,
    )

    print("=" * 80)
    print(f"EVALUATION RESULTS: {split_role.value.upper()} PARTITION")
    print("=" * 80)
    print(f"Total Evaluated Samples: {metrics['sample_count']:,}")
    print(f"Equal Error Rate (EER):  {metrics['eer']*100:.2f}%")
    print(f"Optimal Threshold:       {metrics['optimal_threshold']:.4f}")
    if split_role == PartitionRole.EVAL:
        print(f"Applied Frozen Thresh:   {metrics['evaluated_threshold']:.4f}")
    print(f"ROC-AUC:                 {metrics['roc_auc']:.4f}")
    print(f"False Acceptance (FAR):  {metrics['far']*100:.2f}%")
    print(f"False Rejection (FRR):   {metrics['frr']*100:.2f}%")
    print(f"Accuracy:                {metrics['accuracy']*100:.2f}%")
    print(f"Precision:               {metrics['precision']*100:.2f}%")
    print(f"Recall:                  {metrics['recall']*100:.2f}%")
    print(f"F1-Score:                {metrics['f1_score']:.4f}")
    cm = metrics["confusion_matrix"]
    print(f"Confusion Matrix:        TN={cm['tn']}, FP={cm['fp']}, FN={cm['fn']}, TP={cm['tp']}")
    print(f"Evaluation Time:         {metrics['evaluation_time_sec']}s ({metrics['samples_per_sec']} samples/sec)")
    print("=" * 80)

    if attack_wise:
        print("\n" + "=" * 80)
        print("ATTACK-WISE EVALUATION BREAKDOWN (A07 - A19)")
        print("=" * 80)
        print(f"{'Attack':<8} {'Type':<8} {'Description':<26} {'Count':<7} {'FAR (%)':<10} {'Recall (%)':<12} {'System EER (%)':<14}")
        print("-" * 88)
        for att_id, att_rep in attack_wise["attacks"].items():
            print(
                f"{att_id:<8} "
                f"{att_rep['technology_type']:<8} "
                f"{att_rep['description']:<26} "
                f"{att_rep['sample_count']:<7} "
                f"{att_rep['far']*100:>7.2f}%   "
                f"{att_rep['spoof_recall']*100:>8.2f}%     "
                f"{att_rep['system_eer']*100:>10.2f}%"
            )
        print("=" * 88)
        print(f"Vulnerability Ranking (Most Evasive First): {', '.join(attack_wise['vulnerability_ranking'])}")

    if args.save_report:
        report_dir = Path("data/reports")
        report_dir.mkdir(parents=True, exist_ok=True)

        prefix = args.output_prefix or f"evaluation_{args.split.lower()}_{int(time.time())}"
        main_report_file = report_dir / f"{prefix}_{args.split.lower()}_full.json" if args.output_prefix else report_dir / f"{prefix}.json"

        with open(main_report_file, "w", encoding="utf-8") as f:
            json.dump({
                "checkpoint": str(checkpoint_path),
                "split": args.split.lower(),
                "manifest": str(manifest_path),
                "metrics": metrics,
            }, f, indent=2)
        print(f"\n[Artifact] Main report saved: {main_report_file}")

        if attack_wise and args.output_prefix:
            att_file = report_dir / f"{args.output_prefix}_attack_wise.json"
            with open(att_file, "w", encoding="utf-8") as f:
                json.dump(attack_wise, f, indent=2)
            print(f"[Artifact] Attack-wise breakdown saved: {att_file}")

        if error_analysis and args.output_prefix:
            err_file = report_dir / f"{args.output_prefix}_error_analysis.json"
            with open(err_file, "w", encoding="utf-8") as f:
                json.dump(error_analysis, f, indent=2)
            print(f"[Artifact] Error analysis saved: {err_file}")


if __name__ == "__main__":
    main()

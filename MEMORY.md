# VaaniShield: Project State Ledger (`MEMORY.md`)

| Ledger Attribute | Current Project State |
| :--- | :--- |
| **Project Name** | VaaniShield (वाणिShield) — Real-Time Voice Integrity & Anti-Spoofing Platform |
| **Repository** | `Sayan-Mukherjee99/Voice-Cloning-Prototype` |
| **Current Project Phase** | **Phase B4 Completed** (Base Offline Speech Deepfake Detector — ResNet Baseline) \| **AI Instructions v3.0.0 Active** |
| **Next Recommended Phase**| **Phase B5 — Raw Audio Candidate Baseline (RawNet2 / SincNet)** (Backend Track / Shub) |
| **Documentation Lock Status**| **SYNCHRONIZED (v3.0.0 AI Instructions & v2.4.0 Phase B4 Execution)** |
| **Project Ownership** | Person A: **Shub** (Backend / AI Lead) \| Person B: **Sion** (Frontend Lead) |
| **Ledger Last Updated** | September 2026 |

---

## 1. Primary Product Objective & Direction

### 1.1 Primary Objective
VaaniShield's primary objective is:
> **Speaker-independent AI-generated / synthetic speech deepfake detection.**

The system is designed to analyze an unknown or random speaker/caller without requiring a previously enrolled voice. The fundamental question the engine answers is:
> **"Does this audio contain evidence of synthetic, cloned, converted, or spoofed speech?"**

Speaker verification is **NOT** the primary detector.

### 1.2 Product Progression Roadmap
The product follows a rigorous research and engineering progression:

```text
PHASE 1: Offline Speech Deepfake Detection (Current Primary MVP)
        ↓
PHASE 2: Real-Time Streaming Deepfake Detection
        ↓
PHASE 3: Multi-Signal Risk Fusion
        ↓
PHASE 4: Optional Speaker Identity Verification
        ↓
PHASE 5: Active Challenge / PITCH + Security Action
        ↓
PHASE 6: Validated Self-Learning / Research Evaluation
```

---

## 2. Documentation Status Matrix

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   DOCUMENTATION STATUS MATRIX                                    │
├────────────────────┬──────────┬─────────────────────────────────┬────────────────────────────────┤
│ Document           │ Status   │ Major Findings & Scope Summary  │ Required Engineering Follow-up │
├────────────────────┼──────────┼─────────────────────────────────┼────────────────────────────────┤
│ PRD.md             │ ACTIVE   │ v2.3.0: Offline deepfake MVP,   │ Primary specification for      │
│                    │ (v2.3.0) │ speaker-independent thesis,     │ offline audio upload analysis, │
│                    │          │ 6-phase progression, zero-cost. │ multi-signal & streaming paths.│
├────────────────────┼──────────┼─────────────────────────────────┼────────────────────────────────┤
│ TRD.md             │ ACTIVE   │ v2.3.0: Candidate models,       │ Technical guide for detection  │
│                    │ (v2.3.0) │ ASVspoof dataset strategy,      │ pipeline, metrics (EER, AUC),  │
│                    │          │ offline & streaming dataflows.  │ and pipeline isolation.        │
├────────────────────┼──────────┼─────────────────────────────────┼────────────────────────────────┤
│ SECURITY.md        │ ACTIVE   │ v2.3.0: Probabilistic risk,     │ Security posture for zero raw  │
│                    │ (v2.3.0) │ false pos/neg, fail-secure,     │ audio at rest, clone defense,  │
│                    │          │ poisoning & promotion gates.    │ and decision gating.           │
├────────────────────┼──────────┼─────────────────────────────────┼────────────────────────────────┤
│ AI_ARCHITECTURE.md │ ACTIVE   │ v2.3.0: Candidate models        │ Architectural reference for    │
│                    │ (v2.3.0) │ (ResNet, RawNet2, AASIST),      │ offline preprocessing, model   │
│                    │          │ optional ECAPA, score fusion.   │ candidates, and evaluation.    │
├────────────────────┼──────────┼─────────────────────────────────┼────────────────────────────────┤
│ PHASES.md          │ ACTIVE   │ v2.3.0: Re-aligned backend      │ Roadmap: Shub executes Phase   │
│                    │ (v2.3.0) │ roadmap B3–B11 matching the     │ B3 next; Sion aligns frontend  │
│                    │          │ 6-phase product progression.    │ tracks C1–C17 in parallel.     │
├────────────────────┼──────────┼─────────────────────────────────┼────────────────────────────────┤
│ AI_INSTRUCTIONS.md │ ACTIVE   │ v3.0.0: Strict coding agent     │ Mandatory operating directive  │
│                    │ (v3.0.0) │ rules, implementation discipline│ and binding engineering        │
│                    │          │ 7-dim audit, testing, Rules A-J.│ contract for all AI workflows. │
├────────────────────┼──────────┼─────────────────────────────────┼────────────────────────────────┤
│ README.md          │ ACTIVE   │ v2.3.0: Offline MVP first,      │ Public repository landing page │
│                    │ (v2.3.0) │ research datasets, status of    │ with truthful maturity state   │
│                    │          │ models and pending downloads.   │ and no exaggerated claims.     │
├────────────────────┼──────────┼─────────────────────────────────┼────────────────────────────────┤
│ MEMORY.md          │ ACTIVE   │ Persistent state ledger,        │ State of record for completed  │
│                    │ (v2.3.0) │ ADR-09 direction realignment.   │ milestones and active roadmap. │
└────────────────────┴──────────┴─────────────────────────────────┴────────────────────────────────┘
```

---

## 3. Dataset Strategy & Current Status

The system does **not** rely on a single dataset for final claims. It follows a principled evaluation progression:

```text
Train / Develop (ASVspoof 2019 LA)
        ↓
Baseline Model Experiments
        ↓
Cross-Dataset Evaluation (ASVspoof 2021 DF)
        ↓
Communication Robustness Evaluation (ASVspoof 2021 LA)
        ↓
Independent Future Datasets (e.g., WaveFake)
        ↓
Analyze Cross-Dataset Generalization & Avoid Data Leakage
```

| Dataset | Designated Role | Current Status | Notes |
| :--- | :--- | :--- | :--- |
| **ASVspoof 2019 LA** | **Initial Baseline Training & Development** | **VERIFIED & INTEGRATED** | Logical Access track. 121,461 CM utterances verified across train (25,380), dev (24,844), and eval (71,237). 7.12 GB corpus at `datasets/LA/LA/`. Streaming JSONL manifests built and partition governance strictly enforced. |
| **ASVspoof 2021 DF** | **Cross-Dataset Generalization Evaluation** | **Download Pending** | Held out strictly for cross-dataset evaluation of unseen vocoders/compression. **NOT** the current training dataset. |
| **ASVspoof 2021 LA** | **Communication Robustness Evaluation** | **Download Pending** | Evaluates robustness under telephony/channel conditions relevant to eventual live-call scenarios. **NOT** the current training dataset. |
| **Future Datasets** (e.g., WaveFake) | **Independent Generalization Evaluation** | **Future Scope** | Future out-of-domain evaluation; not to be added merely for the sake of adding datasets. |

---

## 4. Model Candidates & Weight Status

### 4.1 Candidate Model Exploration
Potential model candidates under consideration:
* **ResNet Acoustic Baseline**: 2D CNN acoustic model operating over log-mel representations to capture vocoder frequency-domain artifacts.
* **RawNet2**: Time-distributed convolutional and gated recurrent architecture operating directly on raw 16kHz audio waveforms.
* **AASIST / AASIST-L**: Integrated Spectro-Temporal Graph Attention Network operating on raw waveforms.

> [!IMPORTANT]
> **No Final Model Pre-Selection**: No candidate model is claimed as already selected as the final production model.
> **No Benchmark Claims**: VaaniShield makes **NO claim** of having achieved any published academic benchmark result. External benchmarks are external reference literature only.

### 4.2 Current Model Weight Status
* **ResNet Acoustic Baseline**: Trained checkpoint saved at `models/checkpoints/resnet18_baseline_best.pt` (11.24M parameters, 42.86 MB). Evaluated on ASVspoof 2019 LA DEV (0.00% EER, 1.0000 AUC) and held-out EVAL (20.65% EER, 0.8499 AUC, 0.97% FRR, 52.40% FAR).
* **Raw Audio Models (RawNet2, AASIST)**: Weight files remain unpopulated pending Phase B5.
* **Inference Pipeline Integration**: Offline evaluation CLI uses trained checkpoint; runtime service integration is staged for real-time streaming pipeline (Phase B8).

---

## 5. Optional Speaker Verification Role (ECAPA-TDNN)

ECAPA-TDNN is documented strictly as an **optional supporting identity branch**:

```text
Claimed Speaker ID
        +
   Incoming Audio
        ↓
   ECAPA-TDNN (192-dim vector)
        ↓
   Cosine Similarity vs. Enrolled Baseline
        ↓
   "Does this voice resemble the claimed speaker?"
```

* **Core Security Rule**: Speaker similarity is **NOT** proof of authenticity.
* An AI-cloned voice intentionally mimics the target speaker's biometric voiceprint.
* **Critical Example**:
  ```text
  Deepfake detector → HIGH synthetic risk
  ECAPA similarity  → HIGH speaker match
  Interpretation   → Potential targeted cloned/impersonated voice attack (RED).
  ```

---

## 6. Self-Learning Architecture & Risk Controls

VaaniShield strictly avoids automated retraining on live calls.

```text
Inference
   ↓
Prediction + Metadata Logging (SQLite)
   ↓
Trusted / Validated Feedback (Supervisor review / authenticated ground truth)
   ↓
Curated Training Data (Quarantine & Outlier filtering)
   ↓
Periodic Training Batch (Minimum balanced sample quorum)
   ↓
Holdout Benchmark Evaluation (Immutable testset)
   ↓
Compare Against Current Model EER
   ↓
Promote ONLY if Validated (Otherwise discard & rollback)
```

**Documented Risks & Mitigations**:
* **Incorrect Labels**: Untrusted user reports are quarantined; only verified ground truth is included.
* **Data Poisoning**: Adversarial clustering, duplicate detection, and balanced quorum checks prevent malicious corruption.
* **Model Drift & Regression**: Immutable holdout evaluation gates verify candidate EER strictly outperforms active weights.
* **Evaluation Leakage**: Training, development, held-out evaluation, and cross-dataset corpora remain strictly isolated.

---

## 7. Current Phase & Progress Ledger

### Completed Historical Phases
* **Phase A0: Repository Baselining & Shared Foundation** — **[COMPLETE]**
* **Phase B1: FastAPI Modularization** — **[COMPLETE]** (Single-responsibility packages in `backend/`).
* **Phase B2: WebSocket Audio Streaming Stability** — **[COMPLETE]** (Frame validation, bounded tasks, disconnect purge).
* **Phase B3: Offline Dataset Verification & Audio Preprocessing Foundation** — **[COMPLETE]**
  - **Git Safety**: Ensured `datasets/` and `data/` are strictly ignored by `.gitignore`. Zero raw audio or manifest files tracked by Git.
  - **Dataset Verification**: Verified 122,299 audio files (7,288.5 MB, 100% 16 kHz Mono FLAC). Validated 121,461 CM utterances across train (25,380), dev (24,844), and eval (71,237) with 0 missing audio files. Confirmed strict speaker and utterance mutual exclusivity across splits. Extra dev (142) and eval (696) files verified as ASV speaker enrollment audio (`.trn.txt`). Saved structured report to `data/reports/asvspoof2019_la_validation.json`.
  - **Protocol Reader & Governance**: Implemented `ProtocolReader` (`protocol_reader.py`) enforcing partition governance: TRAIN=training only, DEV=validation/tuning only, EVAL=held-out evaluation only (never used in training or tuning).
  - **Manifest Generation**: Generated streaming JSONL manifest indexes (`manifest.py`, `build_manifests.py`):
    - `asvspoof2019_la_train.jsonl`: 25,380 records (7,279.6 KB)
    - `asvspoof2019_la_dev.jsonl`: 24,844 records (7,028.9 KB)
    - `asvspoof2019_la_eval.jsonl`: 71,237 records (20,292.6 KB)
    - Total: 121,461 records
  - **Audio Preprocessing**: Implemented `AudioPreprocessor` (`preprocessor.py`) with non-destructive Float32 [-1.0, 1.0] baseline, preserving native duration by default. Normalization, fixed windowing, and silence trimming are explicitly configurable and disabled by default.
  - **Dataset Loader**: Implemented PyTorch `ASVSpoofDataset` (`loader.py`) with instant $O(1)$ byte-offset streaming indexing and flexible batch collation (`asvspoof_collate_fn`).
  - **Automated Tests**: 35/35 passing tests in `backend/tests/` (7 stream, 3 api, 6 preprocessor, 4 loader, 3 manifest, 7 protocol, 5 verifier).
  - **Next Step**: Phase B4: Base Offline Speech Deepfake Detector (Candidate Baselines).

* **Phase B4: Base Offline Speech Deepfake Detector (ResNet Acoustic Baseline)** — **[COMPLETE]**
  - **Model Architecture**: Implemented `BaseDeepfakeDetector` ABC (`backend/ai/models/base.py`) and `ResNetAcousticBaseline` (`backend/ai/models/resnet.py`) with differentiable 80-bin log-mel filterbank front-end ($25\text{ ms}$ window, $10\text{ ms}$ hop, 512 FFT) processing raw audio `[B, 64000]` to `[B, 1, 80, 400]` to `[B, 2]` binary logits (11,236,162 parameters, 42.86 MB). Also implemented fallback `SlimResNetBaseline` (2,815,682 parameters).
  - **Metrics & Training Infrastructure**: Implemented vectorized `compute_eer`, `compute_roc_auc` (Mann-Whitney rank-sum), `calculate_far_frr`, and `compute_confusion_matrix` (`backend/ai/training/metrics.py`). Implemented `TrainingConfig` (`backend/ai/training/config.py`) and `DeepfakeTrainer` (`backend/ai/training/trainer.py`).
  - **Pre-Training Verification**: Executed 14 unit and smoke tests before long training (`test_model_resnet.py`, `test_metrics.py`, `test_training_smoke.py`). 14/14 passed.
  - **CPU Feasibility Benchmark**: Systematically evaluated physical batch sizes on Windows CPU (6 threads):
    - Batch Size 8: **9.79 samples/sec**, 420.28 MB RSS RAM, mean forward 300.01 ms, mean backward 517.55 ms, est. balanced epoch = 8.79 min.
    - Batch Size 4: **9.34 samples/sec**, 439.26 MB RSS RAM, mean forward 167.34 ms, mean backward 261.09 ms, est. balanced epoch = 9.21 min.
    - Batch Size 2: **8.38 samples/sec**, 485.36 MB RSS RAM, mean forward 92.52 ms, mean backward 146.03 ms, est. balanced epoch = 10.26 min.
    - Batch Size 1: **6.65 samples/sec**, 481.49 MB RSS RAM, mean forward 54.95 ms, mean backward 95.46 ms, est. balanced epoch = 12.94 min.
    - Report persisted: `data/reports/cpu_feasibility_benchmark.json`.
  - **Baseline Training (B4.5 / B4.6)**:
    - Trained on ASVspoof 2019 LA TRAIN partition (balanced subset: 2,000 utterances: 1,000 bona fide + 1,000 spoof).
    - Physical batch size 8, gradient accumulation 4 steps ($\implies$ effective batch size 32).
    - Adam optimizer ($\text{lr}=10^{-4}$), gradient clipping (max norm 1.0).
    - Class Imbalance Strategy A: Weighted Cross-Entropy ($w_0 = 4.9186, w_1 = 0.5566$).
    - 3 epochs completed (loss: 0.2825 -> 0.0778 -> 0.0107; DEV loss: 0.0438 -> 0.0011 -> 0.0005; DEV EER: 0.00%).
    - Validation on DEV partition with early stopping. Lowest DEV EER checkpoint selected.
    - Checkpoint saved: `models/checkpoints/resnet18_baseline_best.pt` (11,236,162 parameters, 42.86 MB).
  - **DEV Threshold Calibration (B4.7)**:
    - Evaluated on 1,000 stratified samples (102 bona fide, 898 spoof) from ASVspoof 2019 LA DEV partition.
    - DEV EER: **0.00%**, DEV ROC-AUC: **1.0000**, Accuracy: **100.00%**, FAR: 0.00%, FRR: 0.00%.
    - Calibrated optimal operating threshold: $\theta^* = 0.0340$ (precisely 0.033981). Report saved to `data/reports/evaluation_dev_1789443527.json`.
  - **Held-Out EVAL Benchmark (B4.8)**:
    - Single held-out benchmark pass on ASVspoof 2019 LA EVAL partition with strictly frozen model and threshold $\theta^* = 0.0340$.
    - Evaluated 1,000 stratified samples (103 bona fide, 897 spoof).
    - EVAL EER: **20.65%**, EVAL ROC-AUC: **0.8499**, Accuracy: **52.90%**, FAR: **52.40%**, FRR: **0.97%**.
    - Precision: **99.77%**, Recall: **47.60%**, F1-Score: **0.6445**. Confusion Matrix: TN=102, FP=1, FN=470, TP=427.
    - Throughput: 5.81 samples/sec on CPU. Report saved to `data/reports/evaluation_eval_1789443780.json`.
    - Key Empirical Finding: Unseen spoofing attacks (A07–A19) in the EVAL partition exhibit the expected spectral domain shift on the baseline detector, yielding low False Rejection on human audio (0.97%) and high precision (99.77%), while synthetic vocoder variations motivate raw-audio architectures (RawNet2, Phase B5) and multi-signal fusion (Phase B7).
  - **ONNX Export (B4.9)**:
    - Attempted ONNX export via `backend/scripts/export_onnx.py`.
    - Captured and recorded honest diagnostics in `data/reports/onnx_export_report.json`:
      1. PyTorch ONNX TorchScript operator limitation: `aten::stft` does not support complex types in end-to-end waveform input graph.
      2. Environment limitation: `onnxscript` / `onnx` package dependency in Python 3.13.
      3. Validated TorchScript tracing alternative (`torch.jit.trace`) saved to `models/checkpoints/resnet18_baseline.torchscript.pt`.
  - **Regression Suite**: 49/49 backend regression tests passing in 36.41s.
  - **Git Safety**: Zero commits, zero pushes, zero remote modifications.

---

### [2026-09-14] Architecture Decision Record (ADR-09): Offline Deepfake Detection MVP Realignment
* **Track**: ARCHITECTURE & GOVERNANCE (Joint: Person A — Shub & Person B — Sion)
* **Status**: **ACTIVE & LOCKED**
* **Decisions Recorded**:
  1. **Primary Objective Clarified**: Speaker-independent AI-generated/synthetic speech deepfake detection. Zero caller enrollment required for core capability.
  2. **Product Progression Established**:
     - Phase 1: Offline Speech Deepfake Detection (Primary MVP).
     - Phase 2: Real-Time Streaming Deepfake Detection.
     - Phase 3: Multi-Signal Risk Fusion.
     - Phase 4: Optional Speaker Identity Verification.
     - Phase 5: Active Challenge / PITCH + Security Action.
     - Phase 6: Validated Self-Learning / Research Evaluation.
  3. **Offline MVP Experience Defined**: Upload audio (WAV/MP3) $\rightarrow$ Preprocessing $\rightarrow$ VAD $\rightarrow$ Deepfake Detection $\rightarrow$ REAL / SUSPICIOUS / AI-GENERATED verdict with synthetic risk score and acoustic/spectral evidence.
  4. **Dataset Strategy Grounded**:
     - ASVspoof 2019 LA: Baseline training/development/eval dataset (Download pending).
     - ASVspoof 2021 DF: Reserved strictly for cross-dataset generalization evaluation (Download pending).
     - ASVspoof 2021 LA: Reserved strictly for communication/channel robustness evaluation (Download pending).
     - Strict partitioning to prevent data leakage.
  5. **Model Candidates Defined Without Pre-Selection**: ResNet acoustic baseline, RawNet2, AASIST/AASIST-L. None claimed as final. No external benchmark claimed as VaaniShield achievement.
  6. **ECAPA-TDNN Confirmed as Supporting Branch**: Answers identity resemblance; does not prove human authenticity.
  7. **Backend Roadmap Realignment (B3–B11)**:
     - B3: Offline dataset verification + audio preprocessing foundation.
     - B4: Base offline speech deepfake detector.
     - B5: Model evaluation and metrics (EER, ROC-AUC, FAR, FRR, confusion matrix).
     - B6: Cross-dataset generalization (ASVspoof 2021 DF).
     - B7: Multi-signal fusion.
     - B8: Real-time streaming inference (reusing B2 WebSocket infrastructure).
     - B9: Optional speaker verification (ECAPA).
     - B10: PITCH challenge + security/transaction action.
     - B11: Validated self-learning / model improvement pipeline.

---

### [2026-09-15] Engineering Directive Update: Strict AI Agent Discipline (v3.0.0)
* **Track**: ENGINEERING GOVERNANCE & AI INSTRUCTIONS
* **Status**: **ACTIVE & LOCKED**
* **Changes Recorded**:
  1. Upgraded `AI_INSTRUCTIONS.md` to `3.0.0-STRICT-ENGINEERING-CONTRACT`.
  2. Mandated 7-document pre-flight reading before every implementation task.
  3. Codified capability-oriented naming conventions, minimal comments policy ("WHY over WHAT"), and minimal implementation principle.
  4. Established mandatory incremental testing, 7-dimension post-implementation audit, and absolute Git safety rules.

---

## 8. Immediate Next Implementation Milestone

* **Phase B5 — Raw Audio Candidate Baseline (RawNet2 / SincNet)** (Backend Track / Shub).
  - Implement raw waveform end-to-end detector (SincNet convolution front-end + residual blocks + GRU) operating directly on time-domain samples `[B, 64000]`.
  - Benchmark CPU throughput against the ResNet acoustic baseline.
  - Evaluate complementary detection capability on unseen spoofing attacks (A07–A19).

# VaaniShield (वाणिShield)

### Speaker-Independent AI Speech Deepfake Detection & Voice Integrity Platform

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.115-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js_16-black.svg?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?logo=python&logoColor=white)](https://www.python.org)
[![Supabase](https://img.shields.io/badge/Database-Supabase_Free_Tier-3ECF8E.svg?logo=supabase&logoColor=white)](https://supabase.com)
[![SQLite](https://img.shields.io/badge/Learning_Registry-SQLite_3-003B57.svg?logo=sqlite&logoColor=white)](https://sqlite.org)
[![Redis](https://img.shields.io/badge/In--Memory-Redis_7.2-DC382D.svg?logo=redis&logoColor=white)](https://redis.io)
[![ONNX Runtime](https://img.shields.io/badge/Inference-ONNX_Runtime_1.20-005CED.svg)](https://onnxruntime.ai)
[![Docker Compose](https://img.shields.io/badge/Deploy-Docker_Compose-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com)

> **VaaniShield** is an AI-powered voice integrity platform focused on **speaker-independent AI-generated and synthetic speech deepfake detection**. It analyzes unknown, un-enrolled speech to determine whether an audio recording or voice stream exhibits acoustic, spectral, or temporal evidence of synthetic, cloned, converted, or spoofed generation.

---

## Table of Contents

1. [Primary Product Objective](#primary-product-objective)
2. [Current Primary MVP: Offline Deepfake Detection](#current-primary-mvp-offline-deepfake-detection)
3. [Next Adaptation: Real-Time Streaming Detection](#next-adaptation-real-time-streaming-detection)
4. [Optional Supporting Branch: Speaker Identity Verification](#optional-supporting-branch-speaker-identity-verification)
5. [Core Architecture & Detection Pipeline](#core-architecture--detection-pipeline)
6. [Research Dataset Strategy & Status](#research-dataset-strategy--status)
7. [Model Candidates & Weight Status](#model-candidates--weight-status)
8. [Research & Implementation Progression](#research--implementation-progression)
9. [Controlled Continual / Self-Learning Pipeline](#controlled-continual--self-learning-pipeline)
10. [Dual-Database & Zero-Cost Architecture](#dual-database--zero-cost-architecture)
11. [Privacy Architecture (DPDP Act 2023)](#privacy-architecture-dpdp-act-2023)
12. [Current Implementation Maturity Matrix](#current-implementation-maturity-matrix)
13. [Getting Started (Local Docker Stack)](#getting-started-local-docker-stack)
14. [Scientifically Responsible Product Disclaimers](#scientifically-responsible-product-disclaimers)

---

## Primary Product Objective

VaaniShield's primary mission is:
> **Speaker-independent AI-generated / synthetic speech deepfake detection.**

The system is built to evaluate unknown, first-time, or random speakers without requiring a previously enrolled voice sample. The primary question the engine asks is:

> **"Does this audio contain evidence of synthetic, cloned, converted, or spoofed speech?"**

Speaker verification is **NOT** the primary detector.

```text
Speaker Verification  = "Who does this voice sound like?" (Requires prior enrollment)
Deepfake Detection    = "Does this speech show evidence of synthesis/spoofing?" (Zero enrollment required)
Voice Integrity       = Evidence from deepfake detection + acoustic/prosodic analysis + 
                        optional identity verification + contextual transaction risk.
```

---

## Current Primary MVP: Offline Deepfake Detection

The initial user-facing milestone is **Offline Speech Deepfake Detection**:

```text
Upload Audio File (WAV / MP3)
             ↓
    Audio Preprocessing
             ↓
  Voice Activity Detection
             ↓
   Short Sliding Windows
             ↓
Speaker-Independent Detector
             ↓
Acoustic / Spectral / Temporal Evidence
             ↓
    Synthetic Risk Score
             ↓
       Temporal Smoothing
             ↓
        Risk Engine
             ↓
REAL / SUSPICIOUS / AI-GENERATED
```

Users or analysts upload an audio sample and receive:
1. **Categorical Classification**: `REAL`, `SUSPICIOUS`, or `AI-GENERATED`.
2. **Synthetic Risk Score**: Continuous evidence score ($0.0–100.0$) estimating the likelihood of synthetic generation.
3. **Confidence Level**: Statistical confidence bounded by speech duration and signal quality.
4. **Forensic Evidence Summary**: Explicit acoustic, vocoder, and prosodic anomaly breakdowns.

Live calling infrastructure is **not** a prerequisite for this core offline detection capability.

---

## Next Adaptation: Real-Time Streaming Detection

Following the offline foundation, Phase 2 adapts the core detector into a low-latency streaming pipeline:

```text
Microphone Input
       ↓
Browser (Web Audio API)
       ↓
WebSocket Stream (/v1/stream/call/{session_id})
       ↓
Ephemeral Redis Ring Buffer
       ↓
Streaming Deepfake Detector (768ms hop)
       ↓
Continuous Risk Score & Operational Interventions
```

* Reuses the validated WebSocket streaming and buffer infrastructure developed in Phase B2.
* Targets a local browser microphone demonstration: **No complex telephony providers, WhatsApp integrations, or VoIP systems are required**.

---

## Optional Supporting Branch: Speaker Identity Verification

Speaker verification (using ECAPA-TDNN 192-dimensional embeddings) is documented strictly as an **optional supporting identity branch**:

```text
Claimed Speaker ID + Audio
             ↓
         ECAPA-TDNN
             ↓
    Speaker Similarity Score
             ↓
"Does this voice resemble the claimed speaker?"
```

### Critical Security Distinction:
* **High speaker similarity does NOT prove that speech is genuine.**
* Modern voice cloning tools are explicitly designed to replicate the target speaker's acoustic profile.
* **Interpretation Example**:
  ```text
  Deepfake Detector → HIGH Synthetic Risk (e.g., 86.0)
  ECAPA-TDNN        → HIGH Speaker Similarity (e.g., 0.92)

  Security Verdict  → Targeted Voice Cloning / Impersonation Attack (RED Alert).
  ```

---

## Core Architecture & Detection Pipeline

### Initial Primary Detection Pipeline

```text
Uploaded / Live Audio
        ↓
Audio Preprocessing
        ↓
Voice Activity Detection
        ↓
Short Sliding Windows
        ↓
Speaker-Independent Deepfake Detector
        ↓
Acoustic / Spectral / Temporal Evidence
        ↓
Synthetic Risk Score
        ↓
Temporal Smoothing
        ↓
Risk Engine
        ↓
REAL / SUSPICIOUS / AI-GENERATED
```

### Future Multi-Signal Fusion Architecture

As the research matures, the detection pipeline evolves into multi-signal fusion:

```text
                         AUDIO
                           ↓
                    PREPROCESSING
                           ↓
             ┌─────────────┼─────────────┐
             ↓             ↓             ↓
        Acoustic CNN    Raw Waveform   Prosody /
        / ResNet        Model          Temporal
             ↓             ↓             ↓
             └─────────────┼─────────────┘
                           ↓
                  Deepfake Score Fusion
                           ↓
                    Final Risk Score
                           ↓
                  GREEN / AMBER / RED
```

---

## Research Dataset Strategy & Status

VaaniShield adheres to rigorous research principles: **The system does not rely on a single dataset for final claims.** The evaluation progression is structured to prevent data leakage and ensure cross-dataset generalizability:

```text
Train / Develop (ASVspoof 2019 LA)
        ↓
Baseline Model Experiments
        ↓
Evaluate Cross-Dataset Generalization (ASVspoof 2021 DF)
        ↓
Evaluate Communication Robustness (ASVspoof 2021 LA)
        ↓
Evaluate Independent Datasets (e.g., WaveFake)
```

| Dataset | Research Role | Status | Notes |
| :--- | :--- | :--- | :--- |
| **ASVspoof 2019 LA** | **Initial Baseline Training & Development** | **Ingested & Verified** | 121,461 total CM utterances across TRAIN (25,380), DEV (24,844), and EVAL (71,237). 100% 16 kHz Mono FLAC verified with JSONL streaming manifests. |
| **ASVspoof 2021 DF** | **Cross-Dataset Generalization Evaluation** | **Download Pending** | Out-of-domain evaluation on unseen compression and vocoders. **NOT** the current training dataset. |
| **ASVspoof 2021 LA** | **Communication Robustness Evaluation** | **Download Pending** | Evaluates robustness under telephony/channel conditions relevant to eventual live calls. **NOT** the current training dataset. |
| **Future Datasets** (e.g., WaveFake) | **Independent Generalization** | **Future Scope** | Independent benchmarks reserved for subsequent validation phases. |

---

## Model Candidates & Weight Status

### Candidate Baseline Models Under Investigation:
1. **ResNet Acoustic Baseline**: 2D CNN acoustic model extracting frequency-domain vocoder signatures from log-mel spectrograms. (Implemented in Phase B4; trained checkpoint saved at `models/checkpoints/resnet18_baseline_best.pt`).
2. **RawNet2**: End-to-end raw waveform convolutional and recurrent neural architecture. (Phase B5 candidate).
3. **AASIST / AASIST-L**: Integrated Spectro-Temporal Graph Attention Network operating directly on raw speech waveforms.

### Grounding & Intellectual Honesty Rules:
* **No Pre-Selection**: The ResNet baseline is an initial acoustic comparator, not the final production detector.
* **No Claimed External Benchmarks**: VaaniShield reports only empirical, locally measured benchmark figures. No external academic benchmark is claimed as a VaaniShield achievement.
* **Baseline Empirical Measurements (Phase B4)**:
  - Architecture: `ResNetAcousticBaseline` (11,236,162 parameters, 42.86 MB)
  - DEV Partition (Calibrated $\theta^* = 0.0340$): EER = **0.00%**, ROC-AUC = **1.0000**, Accuracy = **100.00%**, FAR = 0.00%, FRR = 0.00%
  - Held-Out EVAL Partition (Frozen $\theta^* = 0.0340$): EER = **20.65%**, ROC-AUC = **0.8499**, FAR = **52.40%**, FRR = **0.97%**, Accuracy = **52.90%**, Precision = **99.77%**, Recall = **47.60%**, F1 = **0.6445**
  - Empirical Gap: Highlights acoustic domain shift on unseen synthesis algorithms (A07–A19) in the EVAL split, validating the need for raw-audio architectures (RawNet2) and multi-signal fusion.

---

## Research & Implementation Progression

The development roadmap is structured across six primary product phases:

```text
PHASE 1: Offline Speech Deepfake Detection
         ├── B3: Offline dataset verification + audio preprocessing foundation
         ├── B4: Base offline speech deepfake detector (candidate baselines)
         ├── B5: Model evaluation and metrics (EER, ROC-AUC, FAR, FRR, confusion matrix)
         └── B6: Cross-dataset generalization (ASVspoof 2021 DF)
        ↓
PHASE 2: Real-Time Streaming Deepfake Detection
         └── B8: Real-time streaming inference (reusing B2 WebSocket infrastructure)
        ↓
PHASE 3: Multi-Signal Risk Fusion
         └── B7: Multi-signal fusion (acoustic, waveform, prosody/temporal)
        ↓
PHASE 4: Optional Speaker Identity Verification
         └── B9: Optional speaker verification (ECAPA-TDNN supporting branch)
        ↓
PHASE 5: Active Challenge / PITCH + Security Action
         └── B10: PITCH challenge + security / transaction action
        ↓
PHASE 6: Validated Self-Learning / Research Evaluation
         └── B11: Validated self-learning & model improvement pipeline
```

---

## Controlled Continual / Self-Learning Pipeline

VaaniShield strictly avoids unsafe automatic retraining on live calls:

```text
Inference
   ↓
Prediction + Metadata Logging (SQLite)
   ↓
Trusted / Validated Feedback (Supervisor audit / authenticated ground truth)
   ↓
Curated Training Data (Quarantine & outlier rejection)
   ↓
Periodic Training Batch (Minimum balanced sample quorum)
   ↓
Holdout Benchmark Evaluation (Immutable testset)
   ↓
Compare Against Current Model EER
   ↓
Promote ONLY if Validated (Otherwise discard candidate & rollback)
```

### Documented Learning Risks:
* **Incorrect Labels**: Malicious or mistaken reports corrupting decision boundaries.
* **Data Poisoning**: Adversaries submitting adversarial samples to force blind spots.
* **Model Drift & Regression**: New training batches degrading performance on baseline speech.
* **Evaluation Leakage**: Contaminating test and holdout corpora with training data.

---

## Dual-Database & Zero-Cost Architecture

The platform enforces a strict **Zero-Cost / Free-First** technical constraint:
1. **Supabase Free Tier (Managed PostgreSQL 16 + pgvector)**:
   - Houses persistent application state: call sessions, transaction evaluations, and Mode B voiceprints ($0/month).
2. **SQLite (`vaani_learning.db`)**:
   - Local embedded database for high-throughput ML telemetry, feedback records, and candidate retraining batches.
3. **Zero Mandatory Paid APIs**:
   - All core detection runs locally via open-source runtimes (Python, FastAPI, ONNX Runtime, SciPy, Librosa, Redis). No commercial LLMs, speech APIs, or cloud GPU subscriptions are required.

---

## Privacy Architecture (DPDP Act 2023)

* **Zero Raw Audio at Rest**: Raw audio is non-persistent by default. Audio frames reside only in volatile RAM within Redis circular ring buffers bounded by a **15-second TTL** (`EXPIRE 15`), purged on disconnect.
* **Mathematical Telemetry Only**: Audit logs store non-invertible feature scalars ($F_0$, jitter, mel energies, risk scores), never raw voice recordings.
* **No Silent Harvesting**: Retraining data originates strictly from controlled test generation, public research datasets, or explicit opt-in agreements.

---

## Current Implementation Maturity Matrix

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                CURRENT IMPLEMENTATION MATURITY MATRIX                            │
├──────────────────────┬─────────────────────────┬─────────────────────────────────────────────────┤
│ Implementation State │ Subsystem / Component   │ Empirical Repository Status (`Voice-Cloning`)   │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ IMPLEMENTED          │ WebSocket Transport     │ Full-duplex WS at /v1/stream/call/{session_id}   │
│                      │ Redis Ring Buffer       │ LPUSH + LTRIM with 15s EXPIRE; deque fallback   │
│                      │ Threat State Machine    │ ThreatState class with asymmetric EMA smoothing │
│                      │ Transaction Gate API    │ POST /v1/transaction/evaluate-authorization     │
│                      │ Speaker Enrollment API  │ POST /v1/enroll extracting & persisting vectors │
│                      │ Frontend Dashboard      │ Next.js 16, Zustand store, ThreatDial, Gate UI │
│                      │ Biomechanical Prosody   │ Praat Parselmouth extracts F0, Jitter, Shimmer  │
│                      │ Dataset & Preprocessing │ ASVspoof 2019 LA verified (121,461 utterances)   │
│                      │                         │ JSONL manifests, non-destructive preprocessing   │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ MOCK / FALLBACK      │ Neural Anti-Spoofing    │ Heuristic fallback when model ONNX is absent    │
│                      │ Silero VAD              │ RMS energy thresholding when ONNX is absent     │
│                      │ ECAPA-TDNN Embedding    │ Hash-seeded random unit vectors when absent     │
│                      │ PITCH Challenge Logic   │ Static UI drawer; lacks backend acoustic check  │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ RESEARCH / PLANNED   │ Offline Deepfake MVP    │ Offline WAV/MP3 ingestion & baseline detector   │
│                      │ Candidate Baselines     │ ResNet, RawNet2, AASIST model experiments       │
│                      │ Model Metrics Suite     │ EER, ROC-AUC, FAR, FRR, confusion matrix        │
│                      │ Cross-Dataset Eval      │ ASVspoof 2021 DF generalization testing         │
│                      │ Multi-Signal Fusion     │ Weighted fusion of waveform, spectral, prosody  │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ PROPOSED             │ Self-Learning Registry  │ SQLite metadata logging with validation gates   │
│                      │ Anti-Poisoning Controls │ Quarantine pool and holdout evaluation runner   │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ UNVERIFIED           │ Telephony Codec EER     │ Anti-spoof EER under real 8kHz AMR-NB cell calls│
│                      │ Multi-Accent Resiliency │ False positive rates on regional Indian accents │
└──────────────────────┴─────────────────────────┴─────────────────────────────────────────────────┘
```

---

## Getting Started (Local Docker Stack)

```bash
# 1. Clone repository
git clone https://github.com/Sayan-Mukherjee99/Voice-Cloning-Prototype.git
cd Voice-Cloning-Prototype

# 2. Launch local development stack (FastAPI, Redis, PostgreSQL/pgvector, Next.js)
docker compose up -d

# 3. Access local services
# Next.js SecOps Dashboard:  http://localhost:3000
# FastAPI Interactive Docs:   http://localhost:8000/docs
# System Health Diagnostic:   http://localhost:8000/health
```

*Note: ASVspoof 2019 LA dataset is verified and indexed (121,461 utterances; 7.12 GB). Pretrained model weights in models/ remain unpopulated pending Phase B4 baseline training/integration. The system boots with mock and heuristic fallbacks for end-to-end interface validation when weights are absent.*

---

## Scientifically Responsible Product Disclaimers

1. **Probabilistic Assessment**: The system estimates the likelihood that speech exhibits characteristics associated with synthetic or spoofed speech. The risk score is an evidence-based probabilistic signal, **not an absolute proof of authenticity**.
2. **No Guaranteed 100% Detection**: The platform does **NOT** claim that it can always detect AI voices, nor does it guarantee zero false positives or false negatives.
3. **Speaker Similarity Disclaimer**: High speaker similarity confirms acoustic resemblance to an enrolled voiceprint; it does **not** prove the voice is genuine, authorized, or human.
4. **Independent Research Attribution**: External benchmark results reported in scientific literature belong to their respective researchers and are not claimed as VaaniShield results.

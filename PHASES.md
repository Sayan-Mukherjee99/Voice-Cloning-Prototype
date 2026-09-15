# VaaniShield: Parallel Engineering Roadmap & Two-Developer Execution Plan

| Document Attribute | Specification Detail |
| :--- | :--- |
| **Document Version** | 2.3.0-OFFLINE-DEEPFAKE-ROADMAP |
| **Status** | Approved Engineering Execution Baseline |
| **Project** | VaaniShield (वाणिShield) — Speech Deepfake Detection & Voice Integrity Platform |
| **Repository Reference** | `Sayan-Mukherjee99/Voice-Cloning-Prototype` |
| **Associated Documents** | `PRD.md`, `TRD.md`, `SECURITY.md`, `AI_ARCHITECTURE.md`, `AI_INSTRUCTIONS.md`, `MEMORY.md`, `README.md` |
| **Development Model** | Two-Developer Contract-First Parallel Execution (Backend/AI Track || Frontend Track) |
| **Person A (Backend / AI Lead)** | **Shub** |
| **Person B (Frontend Lead)** | **Sion** |

---

## Table of Contents

1. [Project Development Ownership & Team Roles](#1-project-development-ownership--team-roles)
2. [Product Progression & Engineering Roadmap Overview](#2-product-progression--engineering-roadmap-overview)
3. [Contract-First Development & Frozen Interfaces](#3-contract-first-development--frozen-interfaces)
4. [Section A: Shared Foundation (A0–A4) [Joint Ownership]](#4-section-a-shared-foundation-a0a4-joint-ownership)
5. [Section B: Backend / AI Track (B1–B11) [Owner: Person A — Shub]](#5-section-b-backend--ai-track-b1b11-owner-person-a--shub)
6. [Section C: Frontend Track (C1–C17) [Owner: Person B — Sion]](#6-section-c-frontend-track-c1c17-owner-person-b--sion)
7. [Section D: Integration Track (D1–D10) [Joint Ownership]](#7-section-d-integration-track-d1d10-joint-ownership)
8. [Section E: Final Validation & Demo Track (E1–E10) [Joint Ownership]](#8-section-e-final-validation--demo-track-e1e10-joint-ownership)
9. [Detailed Dependency Matrix](#9-detailed-dependency-matrix)
10. [Critical Paths & Execution Architecture](#10-critical-paths--execution-architecture)
11. [Git Safety Rules & Memory Governance](#11-git-safety-rules--memory-governance)

---

## 1. Project Development Ownership & Team Roles

Development proceeds concurrently across two decoupled tracks, bounded strictly by frozen contracts:

```
                    SHARED FOUNDATION (A0 - A4)
                       [Joint: Shub & Sion]
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
        PERSON A — SHUB                 PERSON B — SION
       BACKEND / AI TRACK                FRONTEND TRACK
        (Phases B1 - B11)               (Phases C1 - C17)
                │                               │
                │ [Offline First -> Streaming]  │ [Upload UI -> Live HUD]
                │                               │
                └───────────────┬───────────────┘
                                ▼
                     INTEGRATION TRACK (D1 - D10)
                       [Joint: Shub & Sion]
                                │
                                ▼
                  FINAL VALIDATION TRACK (E1 - E10)
                       [Joint: Shub & Sion]
                                │
                                ▼
                     5-MINUTE LIVE DEMO FREEZE
```

### 1.1 Person A — Shub (Role: Backend / AI Lead)
Shub has end-to-end technical ownership of backend architecture, offline deepfake detection, dataset ingestion pipelines, model candidate evaluation, signal processing, score fusion, and security gating:
* **Core Runtime**: FastAPI app lifecycle, middleware, settings, and health diagnostics.
* **Offline Deepfake Pipeline**: Audio decoding, preprocessing, VAD, feature extraction, and candidate model inference.
* **Dataset Strategy & Verification**: ASVspoof 2019 LA (baseline), ASVspoof 2021 DF (generalization), and ASVspoof 2021 LA (robustness).
* **Model Candidates**: ResNet acoustic baseline, RawNet2, and AASIST/AASIST-L experiments.
* **Evaluation Metrics Suite**: EER, ROC-AUC, FAR, FRR, confusion matrices, precision/recall/F1.
* **Multi-Signal Score Fusion**: Waveform model, acoustic mel-spectrogram cues, and biomechanical prosody (Parselmouth).
* **Streaming Transport**: WebSocket `/v1/stream/call/{session_id}` and Redis ephemeral ring buffer.
* **Optional Speaker Verification**: ECAPA-TDNN 192-dim vector extraction and Supabase `pgvector` queries.
* **Active Security Actions**: PITCH dynamic challenge verification and pre-transaction gate (`POST /v1/transaction/evaluate-authorization` HTTP 403).
* **Validated Self-Learning Pipeline**: SQLite learning registry, quarantine pool, holdout evaluation gate, and rollback runner.

### 1.2 Person B — Sion (Role: Frontend Lead)
Sion has end-to-end technical ownership of client-side user experience, data visualization, and SecOps interfaces:
* **Next.js & React Architecture**: App Router, TypeScript contracts, Zustand state management.
* **Offline Audio Upload Experience**: Drag-and-drop WAV/MP3 analyzer, risk gauge, verdict pill, and evidence cards.
* **Streaming Interface**: Real-time microphone capture via Web Audio API, WebSocket client, and pause/mute controls.
* **Visualizations**: 60 FPS HTML5 Canvas spectrogram waterfall, dynamic prosody pitch/jitter charts, radial ThreatDial.
* **Active Defense UI**: Animated PITCH challenge drawer and interactive mock UPI banking circuit breaker gate.

---

## 2. Product Progression & Engineering Roadmap Overview

The backend and product development aligns to this sequence:

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

## 3. Contract-First Development & Frozen Interfaces

All development between Shub and Sion is decoupled via frozen contracts:
* **Offline Detection Contract**: `POST /v1/detect/audio` accepting `multipart/form-data` (WAV/MP3) and returning `verdict`, `synthetic_risk_score`, `confidence`, and `detected_signals`.
* **WebSocket Ingestion Contract**: Binary 16 kHz 16-bit Mono Linear PCM, 1,024 samples ($64\text{ ms}$) per message.
* **WebSocket Telemetry Contract**: `TELEMETRY_UPDATE` JSON emitted every 12 frames ($768\text{ ms}$).
* **Pre-Transaction Gate Contract**: `POST /v1/transaction/evaluate-authorization` returning HTTP 200 / 403 / 428.
* **Enrollment Contract**: `POST /v1/enroll` accepting base64 audio and returning 192-dim vector persistence status.

---

## 4. Section A: Shared Foundation (A0–A4) [Joint Ownership]

* **Phase A0: Repository Baselining & Environment Verification** — **[COMPLETED]**
* **Phase A1: Container Orchestration & Docker Compose Baseline** — **[COMPLETED]**
* **Phase A2: API Contract & WebSocket Contract Lock** — **[COMPLETED]**
* **Phase A3: Shared Data Models & Threat State Schema** — **[COMPLETED]**
* **Phase A4: Development Environment & Configuration Contract** — **[COMPLETED]**

---

## 5. Section B: Backend / AI Track (B1–B11) [Owner: Person A — Shub]

*Historical completed phases B1 and B2 are preserved intact.*

### Phase B1: Backend Baseline & FastAPI Modularization — **[COMPLETED]**
* Clean ASGI FastAPI app with structured logging, CORS, and modular architecture (`core/`, `schemas/`, `risk/`, `audio/`, `ai/`, `db/`, `services/`, `api/`). 10/10 tests passing.

### Phase B2: Audio Ingestion & WebSocket Streaming Stability — **[COMPLETED]**
* Hardened binary PCM frame receiver at `/v1/stream/call/{session_id}` handling 1,024-sample frames reliably without leaks, with 15s Redis TTL purge on disconnect. 7/7 tests passing.

---

### Phase B3: Offline Dataset Verification + Audio Preprocessing Foundation — **[COMPLETED]**
* **Objective**: Ingest, verify, index, and prepare reproducible, non-destructive audio preprocessing foundation for ASVspoof 2019 LA.
* **Dataset Target**: ASVspoof 2019 LA (Logical Access) — status: **VERIFIED & INTEGRATED** (121,461 CM utterances; 7.12 GB).
* **Dependencies**: Phase B1.
* **Implementation Tasks**:
  1. `[SAFETY]` Added `datasets/` and `data/` to `.gitignore` to prevent any accidental Git commits of corpus.
  2. `[PROTOCOLS]` Implemented `ProtocolReader` parsing official CM label files across `train` (25,380), `dev` (24,844), and `eval` (71,237), strictly enforcing partition governance (eval never used in training or tuning).
  3. `[VERIFICATION]` Implemented `DatasetVerifier` inspecting FLAC STREAMINFO headers, verifying 100% protocol-to-audio matching with zero missing files and strict speaker/utterance mutual exclusivity.
  4. `[MANIFESTS]` Implemented `ManifestBuilder` generating lightweight streaming JSONL manifest indexes.
  5. `[PREPROCESSING]` Standardized `AudioPreprocessor` with non-destructive Float32 [-1.0, 1.0] baseline, preserving native duration by default with modular, configurable transforms.
  6. `[LOADER]` Implemented PyTorch `ASVSpoofDataset` with instant $O(1)$ byte-offset streaming indexing and flexible batch collation.
  7. `[CLI & AUDIT]` Added `verify_dataset.py` and `build_manifests.py` CLI utilities; generated structured audit report at `data/reports/asvspoof2019_la_validation.json`.
  8. `[TESTS]` Verified with 35/35 passing tests in `backend/tests/`.
* **Validation Criteria**: All 121,461 utterances verified, manifests generated, and test suite green.

### Phase B4: Base Offline Speech Deepfake Detector — **[COMPLETE]**
* **Objective**: Implement base offline deepfake detection pipeline with acoustic ResNet baseline on ASVspoof 2019 LA.
* **Accomplished**:
  1. `[ARCHITECTURE]` Implemented `BaseDeepfakeDetector` ABC (`backend/ai/models/base.py`) and `ResNetAcousticBaseline` (`backend/ai/models/resnet.py`) with differentiable 80-bin log-mel front-end ($25\text{ ms}$ win, $10\text{ ms}$ hop, 512 FFT) processing raw audio `[B, 64000]` $\rightarrow$ `[B, 1, 80, 400]` $\rightarrow$ `[B, 2]` logits (11.24M parameters, 42.86 MB). Also implemented fallback `SlimResNetBaseline` (2.82M parameters).
  2. `[METRICS]` Implemented vectorized metrics suite: EER, ROC-AUC, FAR, FRR, and confusion matrix (`backend/ai/training/metrics.py`).
  3. `[BENCHMARK]` Evaluated physical batch sizes on Windows CPU (6 threads): batch size 8 achieved peak throughput of $9.79\text{ samples/sec}$ (420.28 MB RSS RAM; 8.79 min/balanced epoch).
  4. `[TRAINING]` Trained baseline on ASVspoof 2019 LA TRAIN (balanced 2,000 utterances) with Strategy A (Weighted Cross-Entropy) and gradient accumulation (effective batch 32). Selected checkpoint with lowest DEV EER: `models/checkpoints/resnet18_baseline_best.pt`.
  5. `[DEV CALIBRATION]` Calibrated threshold on 1,000 stratified DEV samples: DEV EER = **0.00%**, ROC-AUC = **1.0000**, calibrated operating threshold $\theta^* = 0.0340$.
  6. `[EVAL BENCHMARK]` Single held-out evaluation pass on ASVspoof 2019 LA EVAL partition with frozen $\theta^* = 0.0340$: EVAL EER = **20.65%**, ROC-AUC = **0.8499**, FAR = 52.40%, FRR = 0.97%, Accuracy = 52.90%, Precision = 99.77%, Recall = 47.60%, F1 = 0.6445. Domain shift on unseen spoofing attacks (A07–A19) empirically confirmed with low False Rejection (0.97%) and high precision (99.77%).
  7. `[ONNX AUDIT]` Documented PyTorch ONNX TorchScript operator limitation (`aten::stft` complex support) and environment limitation (`onnxscript`/`onnx` package dependency) in `data/reports/onnx_export_report.json`; verified TorchScript alternative.
  8. `[TESTS]` 49/49 regression tests passing in 36.41s. Zero commits or pushes.
* **Validation Criteria**: Baseline trained and evaluated with empirical metrics recorded; test suite 100% green.

### Phase B5: Raw Audio Candidate Baseline (RawNet2 / SincNet) — **[NEXT RECOMMENDED PHASE]**
* **Objective**: Build a comprehensive, automated evaluation and metrics suite for benchmarking candidate deepfake models.
* **Dependencies**: Phase B3, Phase B4.
* **Evaluation Metrics Suite**:
  * **Equal Error Rate (EER)**
  * **ROC-AUC (Area Under the Receiver Operating Characteristic Curve)**
  * **False Acceptance Rate (FAR)**
  * **False Rejection Rate (FRR)**
  * **Confusion Matrix** (Bona fide vs. Spoofed speech)
  * **Precision, Recall, F1-Score**
* **Implementation Tasks**:
  1. `[BUILD]` Implement `backend/scripts/evaluate_anti_spoof.py` computing complete metrics suite against ground-truth keys.
  2. `[BENCHMARK]` Benchmark candidate models on ASVspoof 2019 LA development/validation split.
  3. `[REPORT]` Generate empirical evaluation report detailing measured EER, latency, and parameter counts.
  4. `[RULE]` Prohibit reporting external paper figures as VaaniShield achievements.
* **Validation Criteria**: Evaluation script outputs verified EER, ROC-AUC, and confusion matrix on local test partition.
* **Priority**: **P0** | **Effort**: MEDIUM | **Blockers**: Model training/weights.

### Phase B6: Cross-Dataset Generalization
* **Objective**: Evaluate model generalization on an out-of-domain evaluation corpus without data leakage.
* **Primary Candidate Dataset**: ASVspoof 2021 DF (Deepfake) — status: download pending.
* **Dependencies**: Phase B5.
* **Implementation Tasks**:
  1. `[EVAL]` Ingest ASVspoof 2021 DF evaluation subset containing unseen neural vocoders and lossy compression.
  2. `[BENCHMARK]` Evaluate baseline candidate models on ASVspoof 2021 DF without retraining.
  3. `[ANALYSIS]` Quantify performance degradation and cross-dataset error patterns (vocoder generalization gap).
  4. `[RULE]` Keep ASVspoof 2021 DF strictly as an evaluation dataset; never merge into training sets.
* **Validation Criteria**: Cross-dataset evaluation report detailing generalization gap across unseen generative vocoders.
* **Priority**: **P0** | **Effort**: HIGH | **Blockers**: Dataset download pending.

### Phase B7: Multi-Signal Fusion
* **Objective**: Combine independently useful evidence across acoustic, waveform, and prosodic domains.
* **Dependencies**: Phase B4, Phase B5.
* **Signals Combined**:
  * *Acoustic / Spectral Evidence*: Mel-spectrogram transposed convolution vocoder artifacts (ResNet/CNN).
  * *Waveform-Model Evidence*: Time-domain phase and sample-level cues (AASIST/RawNet2).
  * *Prosody / Temporal Evidence*: Praat Parselmouth biomechanical dynamics ($F_0$ variance, jitter RAP, shimmer APQ5, HNR).
* **Implementation Tasks**:
  1. `[BUILD]` Implement weighted linear and calibrated score fusion.
  2. `[BUILD]` Biomechanical reality checks: penalize scores if unnatural pitch flatness or abnormal jitter ($>3.5\%$) is detected.
  3. `[EVAL]` Verify multi-signal fusion improves EER and robustness over any single candidate model.
* **Validation Criteria**: Fused pipeline demonstrates lower error rate on noisy/degraded audio than individual models.
* **Priority**: **P0** | **Effort**: MEDIUM | **Blockers**: None.

### Phase B8: Real-Time Streaming Inference
* **Objective**: Adapt the validated deepfake detector into a low-latency real-time streaming pipeline.
* **Architecture**:
  ```text
  Microphone Input
         ↓
  Browser (Web Audio API)
         ↓
  WebSocket Stream (/v1/stream/call/{session_id})
         ↓
  Streaming Detector (768ms hop)
         ↓
  Continuous Risk Score
  ```
* **Dependencies**: Phase B2, Phase B4, Phase B7.
* **Implementation Tasks**:
  1. `[INTEGRATE]` Connect sliding window accumulator from Redis buffer directly to deepfake inference engine.
  2. `[OPTIMIZE]` Ensure total hop processing latency remains $<100\text{ ms}$ on standard edge CPU.
  3. `[SMOOTHING]` Apply Asymmetric Exponential Moving Average ($\alpha_{\text{up}}=0.65, \alpha_{\text{down}}=0.25$) on streaming scores.
  4. `[SCOPE]` Reuse existing Phase B2 WebSocket infrastructure. Do **not** build telephony providers, WhatsApp integrations, or VoIP systems.
* **Validation Criteria**: Live microphone stream produces responsive, smoothed risk scores updating every $768\text{ ms}$.
* **Priority**: **P0** | **Effort**: MEDIUM | **Blockers**: None.

### Phase B9: Optional Speaker Verification
* **Objective**: Implement ECAPA-TDNN supporting identity branch for enrolled speakers (Mode B).
* **Dependencies**: Phase B8.
* **Implementation Tasks**:
  1. `[BUILD]` Extract 192-dimensional ECAPA-TDNN embeddings from audio chunks when `speaker_id` is provided.
  2. `[QUERY]` Query Supabase `pgvector` for cosine similarity against enrolled reference voiceprints.
  3. `[SECURITY]` Enforce the fundamental distinction: High similarity does **NOT** prove human authenticity.
  4. `[ALERT]` Trigger targeted clone attack alert when: High Speaker Similarity ($>0.85$) + High Synthetic Risk ($>75.0$).
* **Validation Criteria**: System correctly identifies targeted cloning attacks and differentiates impostor vs. genuine vs. clone scenarios.
* **Priority**: **P1** | **Effort**: MEDIUM | **Blockers**: Supabase pgvector setup.

### Phase B10: PITCH Challenge + Security / Transaction Action
* **Objective**: Implement active challenge-response verification and pre-transaction circuit breakers.
* **Dependencies**: Phase B7, Phase B8.
* **Implementation Tasks**:
  1. `[PITCH]` Dynamic phrase generator selecting randomized Hindi/English phonetic stress phrases on AMBER states.
  2. `[LATENCY]` Measure conversational latency: detect real-time voice conversion lag ($>1.5\text{ s}$).
  3. `[GATE]` Synchronous pre-transaction authorization gate (`POST /v1/transaction/evaluate-authorization`) returning HTTP 200 on GREEN and HTTP 403 on RED.
* **Validation Criteria**: Pre-transaction gate responds in $<35\text{ ms}$ with deterministic HTTP 403 blocks during active attacks.
* **Priority**: **P0** | **Effort**: MEDIUM | **Blockers**: None.

### Phase B11: Validated Self-Learning / Model Improvement Pipeline
* **Objective**: Implement a safe, controlled continual-learning pipeline with strict anti-poisoning safeguards.
* **Dependencies**: Phase B5, Phase B7.
* **Workflow**:
  ```text
  Inference → SQLite Logging → Validated Labels → Curated Training Batch (500/500 quorum) → 
  Periodic Retraining → Benchmark Holdout Evaluation Gate → Version Promotion / Rollback.
  ```
* **Implementation Tasks**:
  1. `[LOGGING]` Record per-hop feature summaries and predictions into local `vaani_learning.db` (SQLite).
  2. `[QUARANTINE]` Filter untrusted labels and reject adversarial cosine outliers.
  3. `[GATE]` Require candidate weights to achieve lower EER on immutable holdout testset before promotion.
  4. `[ROLLBACK]` Implement instant version rollback via `ACTIVE_MODEL_VERSION` environment configuration.
* **Validation Criteria**: Automated test validates candidate promotion on improved EER and rejection/rollback on degraded EER.
* **Priority**: **P1** | **Effort**: MEDIUM | **Blockers**: None.

---

## 6. Section C: Frontend Track (C1–C17) [Owner: Person B — Sion]

*Sion executes parallel client-side development bounded by frozen API contracts.*

* **Phase C1: Frontend Foundation & Type System Setup** — TypeScript contracts and environment configuration.
* **Phase C2: Product Shell, Navigation & Limelight Navbar** — Dark cybernetic application shell and layout.
* **Phase C3: Offline Audio Upload & Analysis Interface** — Drag-and-drop WAV/MP3 upload, file analyzer, and verdict display.
* **Phase C4: Voice Session Controls & Mic Streamer** — Web Audio API 16kHz capture, Start/Stop/Mute, mode switcher.
* **Phase C5: Real-Time Telemetry Stat Cards** — 4-card metric grid (speech ratio, hop latency, HNR, analysis hops).
* **Phase C6: Acoustic Waterfall Spectrogram Canvas (60 FPS)** — HTML5 Canvas rendering log-mel spectrogram.
* **Phase C7: Biomechanical Prosody Time-Series Visualizer** — Dynamic synchronized charts for $F_0$, jitter, and shimmer.
* **Phase C8: ThreatDial Radial Risk Gauge** — Animated radial meter with dynamic glow (GREEN/AMBER/RED).
* **Phase C9: Threat State Alerts & Perimeter Warnings** — Screen perimeter glow and state transition banners.
* **Phase C10: PITCH Challenge Interactive Drawer** — Sliding drawer with bold Devanagari phonetic tongue-twister prompts.
* **Phase C11: Interactive Mock Banking Gate (UPI Simulator)** — Simulated transfer modal with PIN pad and RED lock.
* **Phase C12: Forensic Evidence Drawer** — Expanding security event log explaining detected acoustic anomalies.
* **Phase C13: Session History Ledger & Audit View** — Tabular history matching database transaction evaluation records.
* **Phase C14: Typed REST Client & Health Hook** — Client networking for `/health`, `/v1/detect/audio`, and transaction gate.
* **Phase C15: WebSocket Client & Audio Streaming Hook** — Robust client networking handling binary audio and telemetry.
* **Phase C16: Error Boundaries & Offline Fallbacks** — Graceful disconnect banners and simulator toggles.
* **Phase C17: Frontend Demo Readiness & Certification** — Complete client rehearsal on `localhost:3000`.

---

## 7. Section D: Integration Track (D1–D10) [Joint Ownership]

| Phase | Title | Shub (Backend Owner) | Sion (Frontend Owner) | DoD | Priority |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **D1** | REST API Client Wiring | Host `/health` & Gate API | Wire `lib/api/client.ts` | Frontend health pill turns green | **P0** |
| **D2** | Offline Upload Integration | Host `POST /v1/detect/audio` | Connect File Upload UI | Uploaded WAV returns verdict | **P0** |
| **D3** | WebSocket Telemetry Wiring | Emit `TELEMETRY_UPDATE` | Ingest into `useTelemetryStore`| Real telemetry updates UI live | **P0** |
| **D4** | Real Audio Ingestion Wiring | Buffer PCM in Redis | Stream mic via `useAudioStreamer`| Buffer length reaches 24 frames | **P0** |
| **D5** | Real AI Visualizer Sync | Send real mel & prosody | Render Canvas & Charts | Live voice drives spectrogram | **P0** |
| **D6** | Live Attack Simulation Sync | Run deepfake detector & EMA | Toggle synthetic attack | Score surges to RED in $<2\text{ s}$| **P0** |
| **D7** | PITCH Closed-Loop Wiring | Emit challenge & check lag | Render Devanagari phrase drawer | Challenge completion clears alert| **P1** |
| **D8** | Pre-Transaction Gate Wiring | Return HTTP 200/403 on session | Connect UPI PIN submit button | RED state freezes wire transfer | **P0** |
| **D9** | Audit Ledger Integration | Save evaluations to Supabase | Display in Session History View | Decisions visible in UI ledger | **P1** |
| **D10**| Full Stack Rehearsal & Triage | Run complete Docker stack | Verify 10-step demo script | 3 consecutive runs pass 100% | **P0** |

---

## 8. Section E: Final Validation & Demo Track (E1–E10) [Joint Ownership]

* **E1 (Security Validation)**: Audit CORS, API key enforcement, SQL parameterization, and non-root Docker execution.
* **E2 (Privacy & DPDP Compliance Audit)**: Mathematical inspection verifying zero raw audio persistence at rest.
* **E3 (AI Model Credibility Check)**: Confirm candidate model weights and verify mock fallbacks are explicitly labeled.
* **E4 (Offline MVP Verification)**: Validate WAV and MP3 upload detection accuracy and evidence explanations.
* **E5 (Streaming Latency Benchmarking)**: Document empirical p95 latencies (Hop $<100\text{ ms}$, Gate $<35\text{ ms}$).
* **E6 (Schema Conformance Check)**: Verify 100% conformance between Pydantic models and TypeScript interfaces.
* **E7 (End-to-End Test Suite)**: Execute `pytest backend/tests/` and Next.js compiler check (`npm run build`).
* **E8 (5-Minute Live Demo Rehearsal)**: Presenters execute 5 back-to-back rehearsals within a strict 4.5-minute window.
* **E9 (Documentation Lock)**: Finalize `README.md` and `MEMORY.md` with verified setup instructions and benchmark numbers.
* **E10 (Release Freeze Tag)**: Apply git release tag `v2.3.0-demo-freeze`; lock codebase against further modifications.

---

## 9. Detailed Dependency Matrix

| Phase | Owner | Depends On | Can Run in Parallel? | Blocks |
| :--- | :--- | :--- | :---: | :--- |
| **A0–A4** | Joint | None | **NO** | B1, C1 |
| **B1** | Shub | A4 | **YES** | B2, B3 |
| **B2** | Shub | B1 | **YES** | B3, B8 |
| **B3** | Shub | B1 | **YES** | B4, B5, D2 |
| **B4** | Shub | B3 | **YES** | B5, B7 |
| **B5** | Shub | B3, B4 | **YES** | B6, B7, B11 |
| **B6** | Shub | B5 | **YES** | B7 |
| **B7** | Shub | B4, B5, B6 | **YES** | B8, B10 |
| **B8** | Shub | B2, B7 | **YES** | B9, B10, D4 |
| **B9** | Shub | B8 | **YES** | B10 |
| **B10**| Shub | B7, B8, B9 | **YES** | D7, D8 |
| **B11**| Shub | B5, B7 | **YES** | E3 |
| **C1–C17**| Sion | A2, C1–C16 | **YES** | D1–D10 |
| **D1–D10**| Joint | B10 + C17 | **NO** | E1–E10 |
| **E1–E10**| Joint | D10 | **NO** | Release Freeze |

---

## 10. Critical Paths & Execution Architecture

```text
                                  SHARED FOUNDATION (A0-A4)
                                             │
               ┌─────────────────────────────┴─────────────────────────────┐
               ▼                                                           ▼
    BACKEND CRITICAL PATH (Shub)                                FRONTEND CRITICAL PATH (Sion)
 FastModularization (B1) [COMPLETE]                          Types & Next.js Setup (C1)
               │                                                           │
 WS Stream Stability (B2) [COMPLETE]                         App Shell & Navigation (C2)
               │                                                           │
 Offline Preprocessing (B3) [NEXT]                           Offline Upload UI (C3)
               │                                                           │
 Base Deepfake Detector (B4)                                 Session Controls & Mic (C4)
               │                                                           │
 Evaluation & Metrics (B5)                                   Spectrogram Canvas 60 FPS (C6)
               │                                                           │
 Cross-Dataset Generalization (B6)                           ThreatDial & Alert Banners (C8, C9)
               │                                                           │
 Multi-Signal Score Fusion (B7)                              PITCH Drawer & Banking Gate (C10, C11)
               │                                                           │
 Real-Time Streaming Detection (B8)                          Client Networking (C14, C15)
               │                                                           │
 PITCH + Pre-Transaction Gate (B10)                          Frontend Demo Readiness (C17)
               │                                                           │
               └─────────────────────────────┬─────────────────────────────┘
                                             ▼
                                  INTEGRATION (D1 - D10)
                                             ▼
                                FINAL VALIDATION (E1 - E10)
                                             ▼
                                    DEMO RELEASE FREEZE
```

---

## 11. Git Safety Rules & Memory Governance

1. **Strict Git Safety Protocol**: Automated coding assistants are strictly prohibited from executing `git push`, merging to remote branches, creating tags, or pushing commits without human authorization.
2. **Persistent State Protocol**: Updates to architectural state, phase completions, and next steps must be recorded in `MEMORY.md`.

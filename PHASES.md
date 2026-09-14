# VaaniShield: Parallel Engineering Roadmap & Two-Developer Execution Plan

| Document Attribute | Specification Detail |
| :--- | :--- |
| **Document Version** | 2.2.0-DEEPFAKE-FIRST-ROADMAP |
| **Status** | Approved Engineering Execution Baseline |
| **Project** | VaaniShield (वाणिShield) — Real-Time Voice Integrity & Anti-Spoofing Platform |
| **Repository Reference** | `Sayan-Mukherjee99/Voice-Cloning-Prototype` |
| **Associated Documents** | `PRD.md`, `TRD.md`, `SECURITY.md`, `AI_ARCHITECTURE.md`, `AI_INSTRUCTIONS.md`, `MEMORY.md`, `README.md` |
| **Development Model** | Two-Developer Contract-First Parallel Execution (Backend/AI Track || Frontend Track) |
| **Person A (Backend / AI Lead)** | **Shub** |
| **Person B (Frontend Lead)** | **Sion** |

---

## Table of Contents

1. [Project Development Ownership & Team Roles](#1-project-development-ownership--team-roles)
2. [Frontend Design Customization & Handoff Workflow](#2-frontend-design-customization--handoff-workflow)
3. [Contract-First Development & Frozen Interfaces](#3-contract-first-development--frozen-interfaces)
4. [Section A: Shared Foundation (A0–A4) [Joint Ownership]](#4-section-a-shared-foundation-a0a4-joint-ownership)
5. [Section B: Backend / AI Track (B1–B20) [Owner: Person A — Shub]](#5-section-b-backend--ai-track-b1b20-owner-person-a--shub)
6. [Section C: Frontend Track (C1–C17) [Owner: Person B — Sion]](#6-section-c-frontend-track-c1c17-owner-person-b--sion)
7. [Section D: Integration Track (D1–D10) [Joint Ownership]](#7-section-d-integration-track-d1d10-joint-ownership)
8. [Section E: Final Validation & Demo Track (E1–E10) [Joint Ownership]](#8-section-e-final-validation--demo-track-e1e10-joint-ownership)
9. [Detailed Dependency Matrix](#9-detailed-dependency-matrix)
10. [Two Critical Paths & Execution Architecture](#10-two-critical-paths--execution-architecture)
11. [MVP Cut Line & Scope Boundaries](#11-mvp-cut-line--scope-boundaries)
12. [Anti-Over-Engineering Charter](#12-anti-over-engineering-charter)
13. [Git Safety Rules & Memory Governance](#13-git-safety-rules--memory-governance)
14. [Checklists & 5-Minute Live Demo Runbook](#14-checklists--5-minute-live-demo-runbook)
15. [Two-Developer Operational Governance FAQ](#15-two-developer-operational-governance-faq)

---

## 1. Project Development Ownership & Team Roles

The VaaniShield platform is developed under an explicit two-person parallel ownership model. Development proceeds concurrently across two decoupled tracks, bounded strictly by frozen API and WebSocket contracts established in Section A.

```
                    SHARED FOUNDATION (A0 - A4)
                      [Joint: Shub & Sion]
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
        PERSON A — SHUB               PERSON B — SION
      BACKEND / AI TRACK              FRONTEND TRACK
        (Phases B1 - B20)             (Phases C1 - C17)
                │                             │
                │ [Contract-First / Mocks]    │ [Design Handoff Layer]
                │                             │
                └──────────────┬──────────────┘
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

### 1.1 Person A — Shub (Role: Backend / AI Developer)
Shub has end-to-end technical ownership of the backend, signal processing, AI model serving, and data layers:
* **FastAPI Architecture**: Core app lifecycle, routing, middleware, CORS, error handling, and settings.
* **Audio Streaming & Transport**: WebSocket `/v1/stream/call/{session_id}` handling 16kHz 16-bit Mono Linear PCM.
* **Buffering & Preprocessing**: Redis 7.2 circular ring buffer (`LPUSH` + `LTRIM`, 24 frames, 15s TTL).
* **Voice Activity Detection (VAD)**: Silero VAD ONNX model execution and silence stripping.
* **Primary Anti-Spoof Engine**: Speaker-independent deepfake detection (AASIST / RawNet2 ONNX models).
* **Auxiliary Acoustic & Spectral**: 80-bin log-mel filterbank extraction ($25\text{ ms}$ window, $10\text{ ms}$ hop) + ResNet-18 vocoder cues.
* **Biomechanical Prosody**: Praat Parselmouth C-bindings extraction ($F_0$, jitter RAP, shimmer APQ5, HNR dB).
* **Optional Speaker Verification**: Mode B ECAPA-TDNN 192-dim vector extraction and Supabase `pgvector` cosine similarity.
* **Multi-Signal Fusion & Risk**: Linear weighted score fusion and Asymmetric EMA temporal smoothing.
* **Threat State Machine**: GREEN ($<40$), AMBER ($40–74.9$), RED ($\ge 75$) states with hysteresis.
* **PITCH Backend**: Conversational challenge phrase selection, response latency, and intonation checks.
* **Pre-Transaction Security Gate**: `POST /v1/transaction/evaluate-authorization` returning HTTP 200/403/428.
* **Persistence & Caching**: Supabase (PostgreSQL 16 + pgvector) integration and Redis TTL enforcement.
* **Self-Learning Registry**: Local SQLite (`vaani_learning.db`) continual learning logging and validation gates.
* **Security & Compliance**: Zero-storage raw audio audit (DPDP Act 2023), API key auth, and non-root containers.
* **Backend Validation**: Pytest async test suite, latency profiling, and standalone backend demo readiness.

### 1.2 Person B — Sion (Role: Frontend Developer)
Sion has end-to-end technical ownership of the client-side user interface, visualizations, and user experience:
* **Next.js & React Architecture**: App Router, TypeScript type safety, layout components, and Zustand state store.
* **Product Shell & Navigation**: Top header (`LimelightNavbar.tsx`), system health badges, and view routing.
* **Voice Session Interface**: Call controls (Start/Stop, Mute, Mode Switcher between Live Mic and Simulated Attack).
* **Telemetry Visualizations**: 4-card metric grid (VAD speech ratio, hop latency, HNR, analysis hops).
* **Acoustic Waterfall**: 60 FPS HTML5 Canvas rendering 80-bin log-mel spectrogram with cybernetic palette.
* **Prosody Time-Series**: Real-time charts rendering dynamic $F_0$ pitch curves, jitter, and shimmer.
* **ThreatDial Gauge**: Radial gauge (`ThreatDial.tsx`) with animated spring physics and dynamic color glow.
* **Threat State Alerts**: Screen perimeter glow and state banners switching between GREEN, AMBER, and RED.
* **PITCH Challenge UI**: Animated sliding drawer (`PitchChallengeDrawer.tsx`) with bold Devanagari prompts.
* **Interactive Mock Banking Gate**: Mobile UPI payment simulation (`MockBankingGate.tsx`) with PIN pad and RED lock.
* **Forensic Evidence Drawer**: Expanding security event log detailing acoustic anomaly explanations.
* **Session History & Audit View**: Tabular historical ledger matching database evaluation records.
* **Client Networking**: Typed REST client (`lib/api/client.ts`) and WebSocket client (`useVaaniShieldWs.ts`).
* **Resilience & Offline States**: Error boundaries, disconnect warning toasts, and automatic simulator fallbacks.

---

## 2. Frontend Design Customization & Handoff Workflow

The technical architecture of the frontend is defined in Section C, but Sion's implementation supports an explicit, authoritative **Design Specification Layer** directed by Shub.

### 2.1 The Design Specification Layer
Shub may define authoritative design direction for the frontend without altering technical contracts:
* **Typography & Fonts**: Font families (e.g., Outfit, Inter, JetBrains Mono), scale, weights, letter spacing.
* **Color Palettes**: Hex/HSL color tokens, primary/secondary/accent tones, background `#0a0b0e`, border glows.
* **Component Styling**: Glassmorphic card styling, button hover states, border-radius principles, elevation.
* **Layout References**: Section hierarchy, landing page messaging, dashboard spacing.
* **Data Visualization Style**: Spectrogram color palettes, ThreatDial needle styling, chart stroke widths.
* **Motion & Animations**: Framer Motion spring physics, pulsing alerts, drawer transition curves.

---

## 3. Contract-First Development & Frozen Interfaces

All development between Shub and Sion is decoupled via frozen schemas:
* **WebSocket Ingestion Contract**: Binary 16 kHz 16-bit Mono Linear PCM, 1,024 samples ($64\text{ ms}$) per message.
* **WebSocket Telemetry Contract**: `TELEMETRY_UPDATE` JSON emitted every 12 frames ($768\text{ ms}$).
* **REST Gate Contract**: `POST /v1/transaction/evaluate-authorization` returning HTTP 200 / 403 / 428.
* **Enrollment Contract**: `POST /v1/enroll` accepting base64 audio and returning 192-dim embedding status.

---

## 4. Section A: Shared Foundation (A0–A4) [Joint Ownership]

* **Phase A0: Repository Baselining & Environment Verification** — **[COMPLETED]**
* **Phase A1: Container Orchestration & Docker Compose Baseline** — **[COMPLETED]**
* **Phase A2: API Contract & WebSocket Contract Lock** — **[COMPLETED]**
* **Phase A3: Shared Data Models & Threat State Schema** — **[COMPLETED]**
* **Phase A4: Development Environment & Configuration Contract** — **[COMPLETED]**

---

## 5. Section B: Backend / AI Track (B1–B20) [Owner: Person A — Shub]

*Primary immediate development track owned entirely by Shub. Re-aligned around the speaker-independent deepfake detection engine.*

### Phase B1: Backend Baseline & FastAPI Modularization — **[COMPLETED]**
* Clean ASGI FastAPI app with structured logging, CORS, and settings management.

### Phase B2: Audio Ingestion & WebSocket Streaming Stability — **[COMPLETED]**
* Binary PCM frame receiver at `/v1/stream/call/{session_id}` handling 1,024-sample frames reliably without leaks.

### Phase B3: Audio Buffering & Preprocessing (Redis Ring Buffer) — **[NEXT RECOMMENDED PHASE]**
* **Objective**: Maintain a 24-frame sliding window ($\approx 1,536\text{ ms}$) with a 12-frame hop cadence ($768\text{ ms}$) in Redis 7.2.
* **Dependencies**: Phase B2, Redis container.
* **Inputs**: 64ms PCM chunks from WebSocket.
* **Outputs**: Assembled 24,576-sample float32 NumPy arrays ready for DSP and model inference.
* **Implementation Tasks**:
  1. `[BUILD]` Implement Redis sliding ring buffer using `LPUSH` + `LTRIM` (24 items max) with 15s TTL.
  2. `[BUILD]` In-memory thread-safe fallback accumulator (`collections.deque(maxlen=24)`) if Redis is disabled.
  3. `[BUILD]` Hop cadence trigger: execute analysis pipeline exactly every 12 frames ($768\text{ ms}$).
  4. `[SECURITY]` Enforce explicit key cleanup in WebSocket disconnect hook (`DEL vaani:audio:{session_id}`).
* **Validation Criteria**: Sliding window delivers exactly 24 frames of continuous audio every 12 frames.
* **Priority**: **P0** | **Effort**: MEDIUM | **Blockers**: None.

### Phase B4: Audio Quality, Normalization & VAD (Silero ONNX)
* **Objective**: Strip silence and unvoiced noise, discarding windows with $<15\%$ speech activity using Silero VAD ONNX.
* **Dependencies**: Phase B3.
* **Inputs**: 24-frame audio array ($1.536\text{ s}$).
* **Outputs**: Speech probability ($[0.0, 1.0]$) and boolean gate flag (`is_speech`).
* **Implementation Tasks**:
  1. `[BUILD]` Load `silero_vad.onnx` into ONNX Runtime CPU session.
  2. `[BUILD]` Process audio in 512-sample sub-frames; compute speech ratio.
  3. `[BUILD]` RMS energy fallback if ONNX model is absent (`rms > 0.01`).
  4. `[INTEGRATE]` Early-exit pipeline if speech ratio $<0.15$; emit resting telemetry.
* **Priority**: **P0** | **Effort**: MEDIUM | **Blockers**: None.

### Phase B5: Speaker-Independent Anti-Spoof Dataset & Evaluation Setup
* **Objective**: Assemble a standardized, reproducible local evaluation test harness using ASVspoof 2021 DF / In-the-Wild subsets.
* **Dependencies**: Phase B4.
* **Inputs**: Curated local test corpus (bona fide human speech, neural TTS, voice conversion, replay).
* **Outputs**: Automated evaluation script measuring EER, accuracy, and latency distributions.
* **Implementation Tasks**:
  1. `[BUILD]` Script `backend/scripts/evaluate_anti_spoof.py` computing Equal Error Rate (EER) and ROC curves.
  2. `[BUILD]` Verify ground-truth label ingestion (`GENUINE` vs. `SPOOF`).
  3. `[RULE]` Prohibit claiming external benchmark numbers as VaaniShield results.
* **Priority**: **P0** | **Effort**: MEDIUM | **Blockers**: Dataset download.

### Phase B6: Baseline Deepfake Detector Integration (Auxiliary ResNet-18 Log-Mel)
* **Objective**: Extract 80-bin log-mel filterbank spectrograms and integrate ResNet-18 vocoder artifact classifier as auxiliary acoustic signal.
* **Dependencies**: Phase B5.
* **Inputs**: Active speech window float32 array.
* **Outputs**: Log-mel spectrogram matrix and auxiliary vocoder risk score ($0.0–100.0$).
* **Implementation Tasks**:
  1. `[BUILD]` Implement Librosa/SciPy 80-bin mel filterbank extraction (25ms window, 10ms hop).
  2. `[BUILD]` Wrap ResNet-18 ONNX session detecting transposed convolution upsampling artifacts.
  3. `[REFACTOR]` Designate ResNet-18 strictly as an auxiliary acoustic cue, not the primary detector.
* **Priority**: **P0** | **Effort**: MEDIUM | **Blockers**: None.

### Phase B7: AASIST / AASIST-L / RawNet2 Candidate Model Evaluation
* **Objective**: Benchmark open-source raw waveform anti-spoof models (AASIST, AASIST-L, RawNet2) on CPU latency and EER.
* **Dependencies**: Phase B5, Phase B6.
* **Inputs**: Curated evaluation corpus; pretrained model weights from `clovaai/aasist` and ASVspoof baselines.
* **Outputs**: Empirical model evaluation report detailing CPU latency (ms), parameter count, memory footprint, and EER.
* **Implementation Tasks**:
  1. `[BENCHMARK]` Evaluate AASIST (~850K params) vs AASIST-L (~290K params) vs RawNet2 (~14.4M params).
  2. `[BENCHMARK]` Measure single-thread CPU inference latency per 1.5s waveform chunk.
  3. `[RULE]` Treat published external numbers strictly as reference baselines.
* **Priority**: **P0** | **Effort**: HIGH | **Blockers**: PyTorch/ONNX export.

### Phase B8: Primary Deepfake Engine Selection + Real Model Integration
* **Objective**: Package the winning primary anti-spoof model (AASIST-L) into ONNX format and wire into `InferenceEngine`.
* **Dependencies**: Phase B7.
* **Inputs**: Pretrained AASIST-L weights exported to `models/aasist_l.onnx`.
* **Outputs**: Operational primary anti-spoof detector running raw waveform inference in $<25\text{ ms}$.
* **Implementation Tasks**:
  1. `[BUILD]` Export PyTorch AASIST-L model to optimized ONNX graph with dynamic axis.
  2. `[INTEGRATE]` Wire ONNX session in `backend/ai/inference.py` directly to incoming 16kHz PCM chunks.
  3. `[VALIDATE]` Confirm model operates without caller enrollment (Mode A).
* **Priority**: **P0** | **Effort**: HIGH | **Blockers**: Model file packaging.

### Phase B9: Temporal / Multi-Window Risk Aggregation (Asymmetric EMA)
* **Objective**: Aggregate instantaneous anti-spoof scores over time using Asymmetric Exponential Moving Average.
* **Dependencies**: Phase B8.
* **Inputs**: Instantaneous anti-spoof score sequence.
* **Outputs**: Smoothed session threat score $R_{\text{EMA}}$.
* **Implementation Tasks**:
  1. `[BUILD]` Implement Asymmetric EMA in `ThreatState`: $\alpha_{\text{escalate}}=0.65, \alpha_{\text{deescalate}}=0.25$.
  2. `[BUILD]` Fast escalation: reach RED within 2 analysis hops ($\approx 1.5\text{ s}$) of synthetic injection.
  3. `[EXPERIMENT]` Evaluate optional sequence model (lightweight GRU); retain EMA if performance gap $<5\%$.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.

### Phase B10: Acoustic + Prosody + Deepfake Score Fusion
* **Objective**: Fuse primary anti-spoof score with auxiliary ResNet vocoder cues and Praat Parselmouth biomechanical prosody.
* **Dependencies**: Phase B6, Phase B8, Phase B9.
* **Inputs**: $S_{\text{antispoof}}$, $S_{\text{acoustic}}$, $S_{\text{prosody}}$ ($F_0$, jitter RAP, shimmer APQ5, HNR).
* **Outputs**: Multi-signal composite risk score $R_{\text{raw}} \in [0.0, 100.0]$.
* **Implementation Tasks**:
  1. `[BUILD]` Implement weighted linear fusion: $(0.50 \times S_{\text{antispoof}}) + (0.25 \times S_{\text{acoustic}}) + (0.25 \times S_{\text{prosody}})$.
  2. `[BUILD]` Biomechanical reality check: clamp risk if abnormal jitter ($>3.5\%$) or flat pitch is confirmed.
* **Priority**: **P0** | **Effort**: MEDIUM | **Blockers**: None.

### Phase B11: Optional Speaker Verification (Mode B: ECAPA-TDNN & pgvector)
* **Objective**: Implement optional identity consistency checking for enrolled callers via ECAPA-TDNN 192-dim vectors.
* **Dependencies**: Phase B10.
* **Inputs**: Audio window; `speaker_id` parameter.
* **Outputs**: Cosine similarity score; targeted clone alert flag.
* **Implementation Tasks**:
  1. `[BUILD]` Load ECAPA-TDNN ONNX session for 192-dim embedding extraction.
  2. `[BUILD]` Cosine distance query against Supabase `enrolled_voiceprints`.
  3. `[SECURITY]` Enforce critical rule: High similarity + High synthetic risk = Target Clone Attack (RED).
* **Priority**: **P1** | **Effort**: MEDIUM | **Blockers**: Supabase pgvector setup.

### Phase B12: PITCH / Active Challenge Integration
* **Objective**: Implement closed-loop phonetic stress challenge: prompt generation, latency check, and pitch modulation.
* **Dependencies**: Phase B10, Phase B11.
* **Inputs**: AMBER/RED threat state trigger; challenge response audio stream.
* **Outputs**: Challenge evaluation result (`PASS`, `FAIL`, `TIMEOUT`).
* **Implementation Tasks**:
  1. `[BUILD]` Dynamic phrase generator selecting randomized Hindi/English phonetic stress phrases.
  2. `[BUILD]` Measure response latency: flag conversion lag if response begins $>1.5\text{ s}$ post-prompt.
  3. `[BUILD]` Verify dynamic pitch excursion ($\Delta F_0 > 45\text{ Hz}$).
* **Priority**: **P1** | **Effort**: MEDIUM | **Blockers**: None.

### Phase B13: Risk Engine & Threat-State Refinement (Pre-Transaction Gate HTTP 403)
* **Objective**: Harden the synchronous authorization gate (`POST /v1/transaction/evaluate-authorization`) halting wire fraud.
* **Dependencies**: Phase B10, Phase B12.
* **Outputs**: Deterministic HTTP 200 (APPROVED) or HTTP 403 (BLOCKED) with audit ledger persistence.
* **Implementation Tasks**:
  1. `[BUILD]` Enforce fail-secure circuit breaker on RED state ($R_{\text{EMA}} \ge 75.0$).
  2. `[BUILD]` Step-up logic: return HTTP 428 on AMBER state for transfers $\ge \text{₹}10,000$.
  3. `[SECURITY]` Sub-35ms response SLA lookup in memory.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.

### Phase B14: Supabase Data Layer (Managed PostgreSQL 16 + pgvector)
* **Objective**: Connect persistent application data layer to Supabase Free Tier quotas ($0/mo, 500 MB DB, 1 GB storage).
* **Dependencies**: Phase B1, Phase B13.
* **Outputs**: Initialized schema: `call_sessions`, `enrolled_voiceprints`, `chunk_telemetry`, `transaction_evaluations`.
* **Implementation Tasks**:
  1. `[DATABASE]` Verify `CREATE EXTENSION IF NOT EXISTS vector;` executes cleanly on Supabase.
  2. `[BUILD]` Implement async connection pooling via `asyncpg`.
  3. `[SECURITY]` Zero raw audio storage audit: ensure zero audio bytes touch database tables.
* **Priority**: **P0** | **Effort**: MEDIUM | **Blockers**: None.

### Phase B15: SQLite Learning Registry (`vaani_learning.db`)
* **Objective**: Implement local, file-based embedded registry for tracking model telemetry, feature hashes, and feedback.
* **Dependencies**: Phase B10.
* **Outputs**: Functional SQLite database (`vaani_learning.db`) with tables for events, feedback, and candidates.
* **Implementation Tasks**:
  1. `[BUILD]` Initialize SQLite tables (`learning_events`, `feedback_records`, `training_candidates`, `model_versions`).
  2. `[BUILD]` Async non-blocking write worker for per-hop feature summaries.
* **Priority**: **P1** | **Effort**: LOW | **Blockers**: None.

### Phase B16: Controlled Continual-Learning Pipeline
* **Objective**: Build the offline retraining workflow consuming validated feedback records with poisoning defense.
* **Dependencies**: Phase B15.
* **Outputs**: Retraining pipeline aggregating curated genuine and spoofed samples into balanced training batches.
* **Implementation Tasks**:
  1. `[BUILD]` Candidate quarantine filter: reject unverified feedback and cosine outliers.
  2. `[BUILD]` Minimum sample quorum trigger (500 genuine, 500 spoofed).
  3. `[RULE]` Prohibit automated online retraining after single calls.
* **Priority**: **P1** | **Effort**: MEDIUM | **Blockers**: None.

### Phase B17: Model Validation, Promotion & Rollback Gates
* **Objective**: Implement automated model comparison against immutable benchmark holdouts and version tagging.
* **Dependencies**: Phase B16.
* **Outputs**: Safe promotion runner tagging approved models (`model-vX.Y.Z`) and supporting instant rollback.
* **Implementation Tasks**:
  1. `[BUILD]` Holdout benchmark test runner computing candidate EER.
  2. `[BUILD]` Promotion gate: promote candidate only if candidate EER < active model EER.
  3. `[BUILD]` Rollback hook reverting `ACTIVE_MODEL_VERSION` on performance degradation.
* **Priority**: **P1** | **Effort**: MEDIUM | **Blockers**: None.

### Phase B18: Telephony & Codec Robustness (AMR-NB/WB Adaptation)
* **Objective**: Evaluate and calibrate anti-spoof models on simulated 8kHz AMR-NB and 16kHz AMR-WB transcoded audio.
* **Dependencies**: Phase B8, Phase B10.
* **Outputs**: Transcoding filter simulation and telephony-calibrated score thresholds.
* **Implementation Tasks**:
  1. `[BUILD]` Preprocessing filter simulating AMR-NB ($300–3,400\text{ Hz}$) bandpass.
  2. `[VALIDATE]` Benchmark EER degradation on bandlimited audio; rely on prosodic cues to maintain defense.
* **Priority**: **P1** | **Effort**: MEDIUM | **Blockers**: None.

### Phase B19: Security, Privacy Hardening & Zero-Storage Audit
* **Objective**: Audit the complete backend stack to guarantee zero raw audio persistence and verify fail-secure gates.
* **Dependencies**: Phase B14, Phase B15.
* **Outputs**: Clean security audit report confirming zero disk artifacts and validated container permissions.
* **Implementation Tasks**:
  1. `[SECURITY]` Filesystem scan during live streaming: verify zero `.wav` or `.raw` temp files.
  2. `[SECURITY]` Verify non-root container execution (`USER appuser`).
  3. `[SECURITY]` Audit Python dependencies for known CVEs.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.

### Phase B20: Backend Demo Readiness & Standalone Validation
* **Objective**: Validate the complete standalone backend against live and synthetic attack scenarios.
* **Dependencies**: Phase B1 through B19.
* **Outputs**: End-to-end certified backend ready for Section D integration.
* **Implementation Tasks**:
  1. `[VALIDATE]` Stream genuine speech: verify ThreatState stays GREEN; Gate approves.
  2. `[VALIDATE]` Stream synthetic attack: verify ThreatState surges to RED; Gate blocks with HTTP 403.
  3. `[DOCUMENT]` Record backend completion milestone in `MEMORY.md`.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.

---

## 6. Section C: Frontend Track (C1–C17) [Owner: Person B — Sion]

*Secondary parallel UI track owned entirely by Sion. Enhanced with design specification workflow and mock-first independence.*

### Phase C1: Frontend Foundation & Type System Setup
* **Owner**: Sion.
* **Objective**: Configure frontend environment, strict TypeScript settings, and contract type definitions.
* **Dependencies**: Section A (A0–A4).

### Phase C2: Product Shell, Navigation & Limelight Navbar
* **Owner**: Sion.
* **Objective**: Implement dark-mode container shell, header navbar, and view routing.

### Phase C3: Voice Session Controls & Ingestion Mode Switcher
* **Owner**: Sion.
* **Objective**: Build session control strip (Start/Stop, Mute, Mode Switcher between Live Mic and Simulated Attack).

### Phase C4: Real-Time Telemetry Stat Cards & Hop Monitor
* **Owner**: Sion.
* **Objective**: Implement 4-card metric grid (VAD speech ratio, hop latency, HNR, analysis hops).

### Phase C5: Acoustic Waterfall Spectrogram Canvas (60 FPS HTML5)
* **Owner**: Sion.
* **Objective**: Implement HTML5 Canvas rendering 80-bin mel spectrogram columns with cybernetic palette.

### Phase C6: Biomechanical Prosody Time-Series Visualizer
* **Owner**: Sion.
* **Objective**: Render synchronized line charts tracking dynamic $F_0$ pitch curves, jitter, and shimmer.

### Phase C7: ThreatDial Radial Risk Gauge & State Indicator
* **Owner**: Sion.
* **Objective**: Build radial gauge with animated spring physics and dynamic color glow (GREEN/AMBER/RED).

### Phase C8: Threat State Machine Visualizer & Perimeter Alerts
* **Owner**: Sion.
* **Objective**: Build screen perimeter glow and state banners switching between threat levels.

### Phase C9: PITCH Challenge-Response Interactive Drawer
* **Owner**: Sion.
* **Objective**: Build animated sliding drawer displaying bold Devanagari tongue-twister prompts.

### Phase C10: Interactive Mock Banking Gate & UPI Payment Simulator
* **Owner**: Sion.
* **Objective**: Build mobile UPI payment simulation with PIN pad and deterministic RED circuit breaker lock.

### Phase C11: Forensic Evidence Drawer & Anomaly Explanation View
* **Owner**: Sion.
* **Objective**: Build expanding security event log detailing acoustic anomaly explanations.

### Phase C12: Session History Ledger & Pre-Transaction Audit View
* **Owner**: Sion.
* **Objective**: Build tabular historical ledger matching database evaluation records.

### Phase C13: Typed REST API Client & Health Monitoring Hook
* **Owner**: Sion.
* **Objective**: Implement typed REST client for `/health` and `/v1/transaction/evaluate-authorization`.

### Phase C14: WebSocket Client Integration & Audio Capture Hook
* **Owner**: Sion.
* **Objective**: Implement `useAudioStreamer.ts` (16kHz PCM capture) and `useVaaniShieldWs.ts`.

### Phase C15: Error Boundaries, Offline Modes & Reconnection States
* **Owner**: Sion.
* **Objective**: Implement graceful error boundaries, disconnect banners, and fallback toggles.

### Phase C16: Responsive Styling, Accessibility & Cybernetic Polish
* **Owner**: Sion (Applying Shub Design Directives).
* **Objective**: Fine-tune card borders, typography, spring animations, and color tokens.

### Phase C17: Frontend Demo Readiness & Standalone Rehearsal
* **Owner**: Sion.
* **Objective**: Certify 100% functional standalone frontend running on `localhost:3000`.

---

## 7. Section D: Integration Track (D1–D10) [Joint Ownership]

| Phase | Title | Shub (Backend Owner) | Sion (Frontend Owner) | DoD | Priority |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **D1** | REST API Client Wiring | Host `/health` & Gate API | Wire `lib/api/client.ts` | Frontend health pill turns green | **P0** |
| **D2** | WebSocket Telemetry Wiring | Emit `TELEMETRY_UPDATE` | Ingest into `useTelemetryStore` | Real packet indices update live | **P0** |
| **D3** | Real Audio Ingestion Wiring | Buffer PCM in Redis | Stream mic via `useAudioStreamer` | Redis buffer length hits 24 | **P0** |
| **D4** | Real AI Visualizer Sync | Send real mel & prosody | Render Canvas & Charts | Voice drives live formants/pitch | **P0** |
| **D5** | Live Clone Attack Sync | Run AASIST & Asymmetric EMA | Toggle attack mode in UI | Score surges to RED in $<2\text{ s}$ | **P0** |
| **D6** | PITCH Closed-Loop Wiring | Emit challenge & check lag | Render Devanagari phrase drawer | Challenge completion clears threat | **P1** |
| **D7** | Pre-Transaction Gate Wiring | Return HTTP 200/403 on session | Connect UPI PIN submit button | RED voice freezes wire transfer | **P0** |
| **D8** | Audit Ledger Integration | Save evaluations to Supabase | Display in Session History View | Decisions visible in UI table | **P1** |
| **D9** | Full Demo Rehearsal Wiring | Run complete Docker stack | Execute 10-step demo script | 3 consecutive runs pass 100% | **P0** |
| **D10**| Bug Triage & Hardening | Fix backend edge cases | Fix UI alignment/console errors | Zero unhandled errors | **P0** |

---

## 8. Section E: Final Validation & Demo Track (E1–E10) [Joint Ownership]

* **E1 (Security Validation)**: Audit CORS, API key enforcement, SQL parameterization, and non-root Docker execution.
* **E2 (Privacy & DPDP Compliance Audit)**: Mathematical inspection proving zero raw audio files exist on disk.
* **E3 (AI Model Credibility Check)**: Verify real ONNX models are active (`silero_vad.onnx`, `aasist_l.onnx`).
* **E4 (Telephony Robustness Check)**: Verify detector resilience on $300–3,400\text{ Hz}$ bandpass-filtered audio.
* **E5 (Schema Conformance Check)**: Verify 100% request/response conformance across Pydantic and TypeScript interfaces.
* **E6 (End-to-End Test Suite)**: Execute `pytest backend/tests/` and Next.js compiler check (`npm run build`).
* **E7 (Latency Benchmarking)**: Document empirical p95 latencies (Hop $<100\text{ ms}$, Pre-Transaction Gate $<35\text{ ms}$).
* **E8 (5-Minute Live Demo Rehearsal)**: Presenters execute 5 back-to-back rehearsals within a strict 4.5-minute window.
* **E9 (Documentation Lock)**: Finalize `README.md` and `MEMORY.md` with verified setup instructions and benchmark numbers.
* **E10 (Release Freeze Tag)**: Apply git release tag `v2.0.0-demo-freeze`; lock codebase against further modifications.

---

## 9. Detailed Dependency Matrix

| Phase | Owner | Depends On | Can Run in Parallel? | Blocks |
| :--- | :--- | :--- | :---: | :--- |
| **A0–A4** | Joint | None | **NO** | Backend (B1) + Frontend (C1) |
| **B1** | Shub | A4 | **YES** | B2, B14, B15 |
| **C1** | Sion | A2 | **YES** | C2, C13, C14 |
| **B2** | Shub | B1 | **YES** | B3 |
| **C2** | Sion | C1 | **YES** | C3, C4, C5, C6, C7, C12, C15 |
| **B3** | Shub | B2 | **YES** | B4 |
| **C3** | Sion | C2 | **YES** | C17, D5 |
| **B4** | Shub | B3 | **YES** | B5, B6 |
| **C4** | Sion | C2 | **YES** | C11, D2 |
| **B5** | Shub | B4 | **YES** | B7 |
| **C5** | Sion | C2 | **YES** | C16, D4 |
| **B6** | Shub | B4 | **YES** | B10 |
| **C6** | Sion | C2 | **YES** | C16, D4 |
| **B7** | Shub | B5 | **YES** | B8 |
| **C7** | Sion | C2 | **YES** | C8, D4 |
| **B8** | Shub | B7 | **YES** | B9, B10 |
| **C8** | Sion | C7 | **YES** | C9, C10, D5 |
| **B9** | Shub | B8 | **YES** | B10, B13 |
| **C9** | Sion | C8 | **YES** | C16, D6 |
| **B10**| Shub | B6, B8, B9 | **YES** | B11, B12, B13, B15 |
| **C10**| Sion | C8 | **YES** | C16, D7 |
| **B11**| Shub | B10 | **YES** | B13, B14 |
| **C11**| Sion | C4 | **YES** | C16, D8 |
| **B12**| Shub | B10 | **YES** | D6 |
| **C12**| Sion | C2 | **YES** | D8 |
| **B13**| Shub | B9, B10 | **YES** | D7 |
| **C13**| Sion | C1 | **YES** | D1 |
| **B14**| Shub | B1, B11, B13 | **YES** | D8 |
| **C14**| Sion | C1 | **YES** | C15, D2, D3 |
| **B15**| Shub | B10 | **YES** | B16 |
| **C15**| Sion | C14 | **YES** | C17 |
| **B16**| Shub | B15 | **YES** | B17 |
| **C16**| Sion | C2–C12, Shub Design Specs | **YES** | C17 |
| **B17**| Shub | B16 | **YES** | B20 |
| **C17**| Sion | C1–C16 | **YES** | D1–D10 (Integration) |
| **B18**| Shub | B8, B10 | **YES** | E4 |
| **B19**| Shub | B14, B15 | **YES** | E1, E2 |
| **B20**| Shub | B1–B19 | **YES** | D1–D10 (Integration) |
| **D1–D10**| Joint | B20 + C17 | **NO** | E1–E10 (Final Validation) |
| **E1–E10**| Joint | D10 | **NO** | Demo Release Freeze |

---

## 10. Two Critical Paths & Execution Architecture

```text
                                      SHARED FOUNDATION
                                           (A0-A4)
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    ▼                                                   ▼
       BACKEND CRITICAL PATH (Shub)                        FRONTEND CRITICAL PATH (Sion)
    FastAPI & Logging (B1)                              Types & Next.js Foundation (C1)
            │                                                   │
    WebSocket Audio Ingestion (B2)                      App Shell & Navigation (C2)
            │                                                   │
    Redis Ring Buffer 24-frame (B3)                     Session Controls & Mic Toggle (C3)
            │                                                   │
    Silero VAD Silence Strip (B4)                       Live Telemetry Stat Cards (C4)
            │                                                   │
    Anti-Spoof Dataset Setup (B5)                       Spectrogram Canvas 60 FPS (C5)
            │                                                   │
    AASIST Model Evaluation (B7)                        Prosody Real-Time Chart (C6)
            │                                                   │
    Primary Deepfake Engine (B8)                        ThreatDial Radial Gauge (C7)
            │                                                   │
    Asymmetric EMA Smoothing (B9)                       Threat State Banner GREEN/RED (C8)
            │                                                   │
    Multi-Signal Fusion (B10)                           PITCH Challenge Drawer (C9)
            │                                                   │
    Pre-Transaction Gate (B13)                          Mock UPI Banking Gate (C10)
            │                                                   │
    Supabase Data Layer (B14)                           Client Networking (C13, C14)
            │                                                   │
    Backend Demo Readiness (B20)                        Visual Polish & Design Specs (C16)
            │                                                   │
            │                                           Frontend Demo Readiness (C17)
            │                                                   │
            └─────────────────────────┬─────────────────────────┘
                                      ▼
                             INTEGRATION (D1 - D10)
                                      ▼
                           FINAL VALIDATION (E1 - E10)
                                      ▼
                            DEMO RELEASE FREEZE
```

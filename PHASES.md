# VaaniShield: Parallel Engineering Roadmap & Two-Developer Execution Plan

| Document Attribute | Specification Detail |
| :--- | :--- |
| **Document Version** | 2.1.0-OWNERSHIP-PARALLEL-ROADMAP |
| **Status** | Approved Engineering Execution Baseline |
| **Project** | VaaniShield (वाणिShield) — Real-Time Voice Integrity & Anti-Spoofing Platform |
| **Repository Reference** | `Sayan-Mukherjee99/Voice-Cloning-Prototype` |
| **Associated Documents** | `PRD.md`, `TRD.md`, `SECURITY.md`, `AI_ARCHITECTURE.md`, `AI_INSTRUCTIONS.md`, `MEMORY.md` |
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
* **Spectral Analysis**: 80-bin log-mel filterbank extraction ($25\text{ ms}$ window, $10\text{ ms}$ hop).
* **Biomechanical Prosody**: Praat Parselmouth C-bindings extraction ($F_0$, jitter RAP, shimmer APQ5, HNR dB).
* **Anti-Spoofing Inference**: Quantized ResNet-18 ONNX model inference detecting vocoder upsampling artifacts.
* **Speaker Verification**: ECAPA-TDNN 192-dim vector extraction and PostgreSQL `pgvector` cosine similarity.
* **Multi-Signal Fusion & Risk**: Linear weighted score fusion and Asymmetric EMA temporal smoothing.
* **Threat State Machine**: GREEN ($<40$), AMBER ($40–74.9$), RED ($\ge 75$) states with hysteresis.
* **PITCH Backend**: Conversational challenge phrase selection, response latency, and intonation checks.
* **Pre-Transaction Security Gate**: `POST /v1/transaction/evaluate-authorization` returning HTTP 200/403/428.
* **Persistence & Caching**: PostgreSQL 16 schema migrations, asyncpg pooling, and Redis TTL enforcement.
* **Security & Compliance**: Zero-storage raw audio audit (DPDP Act 2023), API key auth, and non-root containers.
* **Backend Validation**: Pytest async test suite, latency profiling, and standalone backend demo readiness.
* **Contract Compliance**: Strictly maintaining the frozen API and WebSocket interface schemas.

> **CRITICAL RULE FOR PERSON A**: The verified Backend / AI roadmap (`B1` through `B20`) is preserved completely intact. Its sequence, dependencies, technical scope, and MVP priorities must not be altered merely because development is divided between two people.

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
* **Frontend Demo Readiness**: Standalone demo rehearsal with zero dependence on backend completion.

---

## 2. Frontend Design Customization & Handoff Workflow

The technical architecture of the frontend is defined in Section C, but Sion's implementation supports an explicit, authoritative **Design Specification Layer** directed by Shub.

### 2.1 The Design Specification Layer
Shub may define authoritative design direction for the frontend without altering technical contracts:
* **Typography & Fonts**: Font families (e.g., Outfit, Inter, JetBrains Mono), scale, weights, letter spacing.
* **Color Palettes**: Hex/HSL color tokens, primary/secondary/accent tones, background `#0a0b0e`, border glows.
* **Component Styling**: Glassmorphic card styling, button hover states, border-radius principles, elevation.
* **Layout References & References**: Section hierarchy, landing page messaging, dashboard spacing.
* **Data Visualization Style**: Spectrogram color palettes, ThreatDial needle styling, chart stroke widths.
* **Motion & Animations**: Framer Motion spring physics, pulsing alerts, drawer transition curves.
* **Visual Inspiration**: External reference URLs, UI component screenshots, and layout mockups.

### 2.2 Frontend Implementation Priority Order
When implementing Section C, Sion and Anti-Gravity must follow this strict priority hierarchy:
1. **Existing Verified Product Requirements** (PRD capabilities, threat detection workflows).
2. **Frozen API & WebSocket Contracts** (REST payloads, WebSocket telemetry schema).
3. **Existing Frontend Architecture Decisions** (Next.js App Router, Zustand store, HTML5 Canvas).
4. **Explicit Design Specifications Provided by Shub** (Visual styling, fonts, colors, layouts).
5. **Usability & Accessibility** (Keyboard navigation, high-contrast readability, clear semantics).
6. **Visual Polish & Micro-Animations** (Hover effects, spring physics, transition smoothing).
7. **Minor Developer Implementation Preferences**.

> **Design Constraint**: Functional correctness must never be sacrificed for visual aesthetics. Do not introduce an entirely new CSS framework (e.g., Tailwind v3 vs v4 conflicts) or heavy UI component libraries solely for styling.

### 2.3 Step-by-Step 7-Stage Design Handoff Workflow
```
[Step 1: Shub Defines Specs] ──► [Step 2: Sion Inputs to Anti-Gravity] ──► [Step 3: Anti-Gravity Analyzes Repo]
                                                                                        │
[Step 6: Sion Iterates] ◄────── [Step 5: Visual Review] ◄────── [Step 4: Anti-Gravity Applies Styles]
         │
         ▼
[Step 7: Final Contract & Functional Validation]
```

* **Step 1 (Design Direction)**: Shub provides design requirements (e.g., font choices, hex codes, layout reference URLs, or dashboard screenshots).
* **Step 2 (Prompt Guidance)**: Sion provides these specifications to Anti-Gravity as styling and layout guidance.
* **Step 3 (Structure Evaluation)**: Anti-Gravity evaluates the existing frontend components and style tokens (`globals.css`, Tailwind configuration).
* **Step 4 (Surgical Styling)**: Anti-Gravity applies the design specifications to components without breaking data hooks or contract schemas.
* **Step 5 (Visual Review)**: Sion inspects the rendered UI on `http://localhost:3000`.
* **Step 6 (Iteration)**: Sion refines margins, responsive breakpoints, or color contrasts where necessary.
* **Step 7 (Contract Verification)**: Sion confirms that all UI components continue to bind cleanly to the frozen data contracts.

### 2.4 Mock-First Frontend Independence Rule
Sion does not need to wait for Shub to finish backend phases. The frontend uses `useSimulator.ts` to generate calibrated mock data (sine-wave $F_0$ for human speech, flatline $F_0$ for clones, score escalation on attack toggle).
* **Rule**: Mock data must follow the exact frozen contract schemas.
* **Transition**: When backend phases finish, switching from mock to live data requires only changing the connection hook, with zero UI component rewrites.

---

## 3. Contract-First Development & Frozen Interfaces

Both developers build against these immutable contracts. Neither track may modify these interfaces without invoking the formal Contract Amendment Protocol.

### 3.1 REST Endpoints Contract
| Endpoint | Method | Request Payload | Success Response | Error Response | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/health` | `GET` | None | `200 OK` JSON (`status`, `redis`, `postgres`, `models`) | `503 Service Unavailable` | Subsystem liveness & readiness |
| `/v1/transaction/evaluate-authorization` | `POST` | `{"session_id": str, "account_id": str, "amount_inr": float, "beneficiary_vpa": str}` | `200 OK` `{"decision": "APPROVED", "risk_score": float, "threat_state": "GREEN"}` | `403 Forbidden` (`BLOCKED`), `428 Precondition Required` (`STEP_UP_REQUIRED`) | Pre-transaction authorization circuit breaker |
| `/v1/enroll` | `POST` | `{"speaker_id": str, "display_name": str, "audio_wav_base64": str}` | `201 Created` `{"speaker_id": str, "embedding_dim": 192, "enrolled_at": str}` | `400 Bad Request`, `422 Unprocessable` | Speaker voiceprint baseline enrollment |
| `/v1/session/{session_id}/status` | `GET` | Path param `session_id` | `200 OK` `{"session_id": str, "threat_state": str, "risk_score": float, "frames_processed": int}` | `404 Not Found` | Active session state poll |

### 3.2 WebSocket Streaming Contract
* **URL**: `ws://localhost:8000/v1/stream/call/{session_id}?speaker_id={optional_speaker_id}`
* **Inbound Audio Stream (Client $\rightarrow$ Server)**:
  * Binary Frames: Raw 16,000 Hz, 16-bit Mono, Little-Endian Signed Linear PCM (`Int16Array`).
  * Chunk Size: 1,024 samples ($2,048\text{ bytes} \approx 64\text{ ms}$).
* **Outbound Telemetry Stream (Server $\rightarrow$ Client)**:
  Emitted on every analysis hop ($12\text{ frames} \approx 768\text{ ms}$):
  ```json
  {
    "type": "TELEMETRY_UPDATE",
    "timestamp": 1741900800.123,
    "session_id": "call-prod-9872",
    "frame_index": 48,
    "threat_level": "AMBER",
    "risk_score": 58.4,
    "vad": {
      "speech_detected": true,
      "speech_ratio": 0.82
    },
    "tier1_acoustic": {
      "vocoder_risk": 64.2,
      "mel_spectrogram_column": [0.12, 0.45, "... 80 normalized bins ..."]
    },
    "tier1_prosody": {
      "f0_mean_hz": 182.4,
      "f0_variance": 12.1,
      "jitter_rap": 0.038,
      "shimmer_apq5": 0.082,
      "hnr_db": 14.2,
      "prosody_risk": 52.6
    },
    "tier2_speaker": {
      "executed": true,
      "cosine_similarity": 0.61,
      "speaker_risk": 60.0
    },
    "processing_latency_ms": 68.4
  }
  ```

### 3.3 Contract Amendment Protocol
If an unforeseen implementation reality mandates an interface modification:
1. Update `TRD.md` with explicit schema version bump.
2. Record architectural justification and schema diff in `MEMORY.md`.
3. Notify the parallel developer with exact payload modifications before code changes merge.

---

## 4. Section A: Shared Foundation (A0–A4) [Joint Ownership]

*Prerequisite foundation owned jointly by Shub and Sion. Must be satisfied before tracks diverge.*

### Phase A0: Repository Baseline & Ground-Truth Verification
* **Owner**: Joint (Shub & Sion).
* **Objective**: Establish the factual baseline of running code, containers, and environment variables.
* **Dependencies**: None.
* **Inputs**: Clean clone of `Voice-Cloning-Prototype`.
* **Outputs**: Verified container startup, verified test pass baseline, audit of missing files (`models/`).
* **Implementation Tasks**:
  1. `[VALIDATE]` Audit Docker Compose execution (`docker compose up --build`).
  2. `[VALIDATE]` Run existing backend pytest suite (`pytest backend/tests/`).
  3. `[VALIDATE]` Verify frontend compilation (`npm run build`).
* **Definition of Done (DoD)**: Baseline status recorded in `MEMORY.md`; repo verified operational.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.

### Phase A1: Architecture & Specification Lock
* **Owner**: Joint (Shub & Sion).
* **Objective**: Lock technical, security, AI, and product requirements across all documentation.
* **Dependencies**: Phase A0.
* **Outputs**: Approved `PRD.md`, `TRD.md`, `SECURITY.md`, `AI_ARCHITECTURE.md`, `PHASES.md`, `MEMORY.md`.
* **Definition of Done (DoD)**: Documentation locked and approved as technical baselines.
* **Priority**: **P0** | **Effort**: MEDIUM | **Blockers**: None.

### Phase A2: API Contract & WebSocket Contract Lock
* **Owner**: Joint (Shub: Pydantic schemas; Sion: TypeScript types).
* **Objective**: Formally define and lock all REST schemas, WebSocket frame formats, and telemetry payloads.
* **Dependencies**: Phase A1.
* **Outputs**: Pydantic models in `backend/main.py`, TypeScript interfaces in `frontend/lib/types/`.
* **Definition of Done (DoD)**: Contract types published and imported in both frontend and backend trees.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.

### Phase A3: Shared Data Models & Threat State Schema
* **Owner**: Joint (Shub & Sion).
* **Objective**: Standardize threat levels (GREEN, AMBER, RED), hysteresis limits, and decision enums.
* **Dependencies**: Phase A2.
* **Outputs**: Threat State enum, score ranges ($[0, 100]$), hysteresis thresholds ($<35$, $<70$).
* **Definition of Done (DoD)**: Threat state logic synchronized between backend and client store.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.

### Phase A4: Development Environment & Configuration Contract
* **Owner**: Joint (Shub & Sion).
* **Objective**: Standardize environment variables, port bindings, and development defaults.
* **Dependencies**: Phase A0.
* **Outputs**: Functional `.env.example` reflecting backend and frontend defaults (ports 8000, 3000, 6379, 5432).
* **Definition of Done (DoD)**: Both developers can launch independent local stacks with zero config conflict.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.

---

## 5. Section B: Backend / AI Track (B1–B20) [Owner: Person A — Shub]

*Primary immediate development track owned entirely by Shub. Unchanged from verified implementation plan.*

### Phase B1: Backend Baseline & FastAPI Modularization
* **Objective**: Establish a clean backend structure, verifying settings, logging, and error handlers.
* **Dependencies**: Section A (A0–A4).
* **Inputs**: `backend/main.py`, `backend/requirements.txt`.
* **Outputs**: Clean ASGI app with configured CORS, structlog, and settings management.
* **Implementation Tasks**:
  1. `[REFACTOR]` Verify Pydantic `Settings` class loads environment variables with graceful defaults.
  2. `[BUILD]` Configure structured JSON logging via `structlog` with correlation session IDs.
  3. `[BUILD]` Verify `/health` reports status of Redis, PostgreSQL, and ONNX execution providers.
* **Security Tasks**: Restrict CORS origins to trusted development domains (`localhost:3000`).
* **Validation Criteria**: `GET /health` returns HTTP 200 with structured component status.
* **Definition of Done (DoD)**: FastAPI server runs stably with structured logging and validated config.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.
* **What Must NOT Be Done**: Do not break existing API route signatures.

### Phase B2: Audio Ingestion & WebSocket Streaming Stability
* **Objective**: Ensure rock-solid, zero-leak streaming ingestion of 16kHz 16-bit PCM via WebSockets.
* **Dependencies**: Phase B1.
* **Inputs**: WebSocket connection at `/v1/stream/call/{session_id}`.
* **Outputs**: Binary frame receiver unpacking 1,024-sample chunks ($64\text{ ms}$) into memory.
* **Files Likely to Change**: `backend/main.py`.
* **Files Likely to be Created**: `backend/tests/test_streaming.py`.
* **Implementation Tasks**:
  1. `[BUILD]` Harden WebSocket loop in `backend/main.py` against abrupt disconnections and malformed bytes.
  2. `[BUILD]` Unpack binary PCM frames via `numpy.frombuffer(data, dtype=np.int16).astype(np.float32) / 32768.0`.
  3. `[SECURITY]` Add frame size validation ($2,048\text{ bytes} \pm 0$); reject unexpected payloads.
  4. `[VALIDATE]` Create async pytest streaming test sending 200 consecutive frames.
* **Validation Criteria**: Zero dropped frames and zero memory leaks over a 5-minute continuous stream.
* **Definition of Done (DoD)**: WebSocket endpoint ingests continuous binary PCM reliably.
* **Priority**: **P0** | **Effort**: MEDIUM | **Blockers**: None.
* **What Must NOT Be Done**: Do not save incoming audio to disk.

### Phase B3: Audio Buffering & Preprocessing (Redis Ring Buffer)
* **Objective**: Maintain a 24-frame sliding window ($\approx 1,536\text{ ms}$) with a 12-frame hop cadence ($768\text{ ms}$).
* **Dependencies**: Phase B2, Redis.
* **Inputs**: 64ms PCM chunks from WebSocket.
* **Outputs**: Assembled 24,576-sample float32 NumPy arrays ready for DSP extraction.
* **Files Likely to Change**: `backend/main.py`.
* **Implementation Tasks**:
  1. `[BUILD]` Implement Redis sliding ring buffer using `LPUSH` + `LTRIM` (24 items max) with 15s TTL.
  2. `[BUILD]` In-memory fallback accumulator (`collections.deque(maxlen=24)`) if Redis is disabled.
  3. `[BUILD]` Hop cadence trigger: execute analysis pipeline exactly every 12 frames.
  4. `[SECURITY]` Guarantee Redis buffer keys are deleted in WebSocket `finally` disconnect block.
* **Validation Criteria**: Sliding window delivers exactly 24 frames of continuous audio every 12 frames.
* **Definition of Done (DoD)**: Buffered audio windows generated on schedule without buffer underruns.
* **Priority**: **P0** | **Effort**: MEDIUM | **Blockers**: Redis connectivity.
* **What Must NOT Be Done**: Do not increase sliding window beyond 32 frames (preserves $<100\text{ ms}$ latency).

### Phase B4: Voice Activity Detection (Silero VAD)
* **Objective**: Strip silence and unvoiced noise, discarding windows with $<15\%$ speech activity.
* **Dependencies**: Phase B3.
* **Inputs**: 24-frame audio array ($1.536\text{ s}$).
* **Outputs**: Speech probability ($[0.0, 1.0]$) and boolean gate flag (`is_speech`).
* **Files Likely to Change**: `backend/main.py`.
* **Files Likely to be Created**: `backend/models/silero_vad.onnx`.
* **Implementation Tasks**:
  1. `[BUILD]` Load `silero_vad.onnx` into ONNX Runtime CPU session.
  2. `[BUILD]` Process audio in 512-sample sub-frames; compute ratio of frames with speech probability $>0.5$.
  3. `[BUILD]` Energy-based RMS fallback if ONNX model is absent (`rms > 0.01`).
  4. `[INTEGRATE]` Early-exit analysis pipeline if speech ratio $<0.15$; emit resting telemetry.
* **Validation Criteria**: Silent audio bypasses Tier 1 analysis; active speech triggers full pipeline.
* **Definition of Done (DoD)**: Silero VAD gates downstream inference accurately in $<10\text{ ms}$.
* **Priority**: **P0** | **Effort**: MEDIUM | **Blockers**: Model file availability.
* **What Must NOT Be Done**: Do not execute heavy vocoder inference on silent audio.

### Phase B5: Acoustic / Spectral Analysis (80-bin Log-Mel Spectrogram)
* **Objective**: Extract high-resolution 80-bin log-mel filterbank spectrograms on active audio windows.
* **Dependencies**: Phase B4.
* **Inputs**: Active speech audio window ($24,576$ samples).
* **Outputs**: 80-bin log-mel array $[80 \times T]$ and normalized 80-float slice for UI telemetry.
* **Files Likely to Change**: `backend/main.py`.
* **Implementation Tasks**:
  1. `[BUILD]` Implement Librosa/Scipy 80-bin mel filterbank extraction (25ms window, 10ms hop, $f_{\max}=8000\text{ Hz}$).
  2. `[BUILD]` Normalize spectrogram values to $[0.0, 1.0]$ for frontend visualization compatibility.
  3. `[VALIDATE]` Benchmark spectral extraction latency; must execute in $<25\text{ ms}$ on CPU.
* **Validation Criteria**: Spectrogram matrix generated matching shape $[80 \times 151]$ with non-trivial values.
* **Definition of Done (DoD)**: Log-mel spectrogram extracted and included in outbound telemetry JSON.
* **Priority**: **P0** | **Effort**: MEDIUM | **Blockers**: None.
* **What Must NOT Be Done**: Do not send raw FFT complex numbers over WebSocket (bandwidth waste).

### Phase B6: Prosody & Biomechanical Voice Analysis (Praat Parselmouth)
* **Objective**: Extract vocal cord physical parameters: fundamental frequency ($F_0$), jitter, shimmer, and HNR.
* **Dependencies**: Phase B4.
* **Inputs**: Audio window float32 array.
* **Outputs**: $F_0$ mean, $F_0$ variance, jitter (RAP), shimmer (APQ5), HNR (dB), and prosody risk score.
* **Files Likely to Change**: `backend/main.py`.
* **Files Likely to be Created**: `backend/tests/test_prosody.py`.
* **Implementation Tasks**:
  1. `[BUILD]` Implement Praat Parselmouth point-process extraction in `asyncio.to_thread` to avoid GIL lock.
  2. `[BUILD]` Extract local jitter (RAP), local shimmer (APQ5), and Harmonics-to-Noise Ratio (HNR).
  3. `[BUILD]` Implement 50ms timeout with Scipy autocorrelation fallback if Parselmouth hangs.
  4. `[BUILD]` Compute biomechanical prosody risk: penalize abnormally low jitter ($<0.2\%$), flat pitch ($\Delta F_0 < 15\text{ Hz}$), or poor HNR ($<8\text{ dB}$).
* **Security Tasks**: Sanitize audio inputs: replace `NaN` and `Inf` with zeros before passing to native C bindings.
* **Validation Criteria**: Pitch changes in speaker voice register dynamic $F_0$ shifts; monotonous audio elevates risk.
* **Definition of Done (DoD)**: Prosody pipeline extracts verified biomechanical metrics in $<45\text{ ms}$.
* **Priority**: **P0** | **Effort**: MEDIUM | **Blockers**: `praat-parselmouth` compilation.
* **What Must NOT Be Done**: Do not block the main async event loop with native Praat computations.

### Phase B7: Anti-Spoofing Neural Model Inference (ResNet-18 Quantized)
* **Objective**: Run quantized ResNet-18 ONNX model over log-mel spectrogram to detect vocoder artifacts.
* **Dependencies**: Phase B5.
* **Inputs**: 80-bin log-mel spectrogram tensor.
* **Outputs**: Acoustic anti-spoof risk score ($0.0–100.0$).
* **Files Likely to Change**: `backend/main.py`.
* **Files Likely to be Created**: `backend/models/resnet18_acoustic_quantized.onnx`.
* **Implementation Tasks**:
  1. `[BUILD]` Load quantized ResNet-18 ONNX session using CPUExecutionProvider with 2 threads.
  2. `[BUILD]` Preprocess log-mel input tensor into shape `[1, 1, 80, 151]`.
  3. `[BUILD]` Execute inference; apply softmax over binary logits (bonafide vs. spoof).
  4. `[REFACTOR]` Wire model output into `acoustic_risk_score`; log explicit indicator when ONNX is active.
* **Validation Criteria**: Genuine voice scores $<25$; synthetic neural audio scores $>75$. Latency $<30\text{ ms}$.
* **Definition of Done (DoD)**: Real neural inference executed on every active speech window.
* **Priority**: **P0** | **Effort**: HIGH | **Blockers**: ONNX model weight packaging.
* **What Must NOT Be Done**: Do not run unquantized FP32 models on CPU (causes latency spikes $>200\text{ ms}$).

### Phase B8: Speaker Representation & Voiceprint Analysis (ECAPA-TDNN)
* **Objective**: Extract 192-dimensional speaker embeddings and compare against PostgreSQL `pgvector` baseline.
* **Dependencies**: Phase B4, Phase B15.
* **Inputs**: Audio window; pre-enrolled speaker ID.
* **Outputs**: 192-dim unit vector; cosine similarity score ($[-1.0, 1.0]$); speaker anomaly risk.
* **Files Likely to Change**: `backend/main.py`, `backend/database.sql`.
* **Files Likely to be Created**: `backend/models/ecapa_tdnn_192.onnx`.
* **Implementation Tasks**:
  1. `[BUILD]` Load ECAPA-TDNN ONNX session.
  2. `[BUILD]` Extract 192-dimensional embedding and L2-normalize to unit hypersphere.
  3. `[BUILD]` Query PostgreSQL `enrolled_voiceprints` using `<=>` cosine distance operator.
  4. `[BUILD]` Conditional execution: trigger Tier 2 only if Tier 1 risk $>45.0$ and `speaker_id` exists.
* **Validation Criteria**: Enrolled speaker returns similarity $>0.75$; imposter voice returns similarity $<0.50$.
* **Definition of Done (DoD)**: Tier 2 speaker verification operational and gated conditionally.
* **Priority**: **P1** | **Effort**: MEDIUM | **Blockers**: `pgvector` extension setup.
* **What Must NOT Be Done**: Do not run Tier 2 unconditionally on every frame (wastes CPU budget).

### Phase B9: Multi-Signal Feature Fusion
* **Objective**: Fuse acoustic, prosodic, speaker, and conversational signals into a raw composite risk score.
* **Dependencies**: Phase B5, Phase B6, Phase B7, Phase B8.
* **Inputs**: $S_{\text{acoustic}}$, $S_{\text{prosody}}$, $S_{\text{speaker}}$, $S_{\text{challenge}}$.
* **Outputs**: Raw instantaneous risk score $R_{\text{raw}} \in [0.0, 100.0]$.
* **Files Likely to Change**: `backend/main.py`.
* **Implementation Tasks**:
  1. `[BUILD]` Implement explainable weighted linear fusion:
     $$R_{\text{raw}} = w_a S_{\text{acoustic}} + w_p S_{\text{prosody}} + w_s S_{\text{speaker}} + w_c S_{\text{challenge}}$$
  2. `[BUILD]` Dynamic weight re-normalization when speaker ID is absent (scale $w_a$ and $w_p$).
  3. `[BUILD]` Hard override trigger: if vocoder risk $>85$ AND prosody risk $>75$, clamp $R_{\text{raw}} \ge 85$.
* **Validation Criteria**: Balanced fusion output responding proportionally to multi-layered threats.
* **Definition of Done (DoD)**: Feature fusion produces consistent, explainable raw risk scores.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.
* **What Must NOT Be Done**: Do not use opaque non-linear black-box meta-classifiers for the MVP.

### Phase B10: Risk Scoring Engine & Calibration
* **Objective**: Calibrate raw risk scores against known bonafide and spoof distributions.
* **Dependencies**: Phase B9.
* **Inputs**: Raw fused scores from test audio.
* **Outputs**: Calibrated score with confidence intervals.
* **Implementation Tasks**:
  1. `[BUILD]` Implement sigmoid score calibration mapping raw distance metrics to probabilistic risk.
  2. `[BUILD]` Add signal quality penalty: elevate uncertainty if SNR $<12\text{ dB}$.
* **Validation Criteria**: Bonafide clean speech stays securely in $[5.0, 25.0]$ range.
* **Definition of Done (DoD)**: Score calibration verified across diverse audio clips.
* **Priority**: **P1** | **Effort**: LOW | **Blockers**: None.
* **What Must NOT Be Done**: Do not hardcode arbitrary static offsets without empirical justification.

### Phase B11: Temporal Smoothing & Threat State Machine
* **Objective**: Apply asymmetric EMA smoothing and enforce threat state transitions with hysteresis.
* **Dependencies**: Phase B10.
* **Inputs**: Instantaneous risk scores $R_{\text{raw}}$.
* **Outputs**: Smoothed risk $R_{\text{EMA}}$ and `ThreatLevel` (`GREEN`, `AMBER`, `RED`).
* **Implementation Tasks**:
  1. `[BUILD]` Implement Asymmetric EMA in `ThreatState`:
     $$\alpha = 0.65 \text{ if } R_{\text{raw}} > R_{\text{prev}} \text{ else } 0.25$$
  2. `[BUILD]` Enforce hysteresis state transitions:
     * GREEN $\rightarrow$ AMBER ($\ge 40.0$), AMBER $\rightarrow$ GREEN ($< 35.0$).
     * AMBER $\rightarrow$ RED ($\ge 75.0$), RED $\rightarrow$ AMBER ($< 70.0$).
  3. `[BUILD]` Maintain active session state in memory and push state snapshots to Redis.
* **Validation Criteria**: Attack surges to RED within 2 hops; recovery takes 4–5 hops; zero rapid state oscillation.
* **Definition of Done (DoD)**: Threat state machine verified with deterministic hysteresis behavior.
* **Priority**: **P0** | **Effort**: MEDIUM | **Blockers**: None.
* **What Must NOT Be Done**: Do not use symmetric smoothing (symmetric smoothing delays attack detection).

### Phase B12: PITCH Challenge-Response Engine
* **Objective**: Implement active conversational verification: prompt generation, latency check, and pitch modulation.
* **Dependencies**: Phase B6, Phase B11.
* **Inputs**: AMBER threat state trigger; challenge response audio stream.
* **Outputs**: Challenge evaluation result (`PASS`, `FAIL`, `TIMEOUT`).
* **Implementation Tasks**:
  1. `[BUILD]` Dynamic phrase generator selecting randomized Hindi/English phonetic stress phrases.
  2. `[BUILD]` Measure response latency: flag conversion lag if response begins $>2.5\text{ s}$ post-prompt.
  3. `[BUILD]` Evaluate $\Delta F_0$: verify caller achieves intonation variance $>30\text{ Hz}$ during challenge.
* **Validation Criteria**: Automated conversion pipelines fail latency/pitch tests; human caller passes.
* **Definition of Done (DoD)**: PITCH verification logic operational and integrated with threat engine.
* **Priority**: **P1** | **Effort**: MEDIUM | **Blockers**: None.
* **What Must NOT Be Done**: Do not build a full ASR speech-to-text pipeline; verify physical acoustic stress.

### Phase B13: Pre-Transaction Authorization Gate & Circuit Breaker
* **Objective**: Implement the synchronous REST endpoint halting fraudulent money transfers before funds release.
* **Dependencies**: Phase B11.
* **Inputs**: `POST /v1/transaction/evaluate-authorization` request payload.
* **Outputs**: Deterministic HTTP 200 (APPROVED) or HTTP 403 (BLOCKED) with audit persistence.
* **Files Likely to Create**: `backend/tests/test_transaction_gate.py`.
* **Implementation Tasks**:
  1. `[BUILD]` Implement `POST /v1/transaction/evaluate-authorization` with strict Pydantic validation.
  2. `[BUILD]` Lookup active session threat level:
     * If `RED`: Return HTTP 403 Forbidden (`decision: BLOCKED`).
     * If `AMBER` and `amount >= 10000`: Return HTTP 428 (`decision: STEP_UP_REQUIRED`).
     * If `GREEN`: Return HTTP 200 OK (`decision: APPROVED`).
  3. `[DATABASE]` Persist evaluation record into PostgreSQL table `transaction_evaluations`.
  4. `[SECURITY]` Enforce fail-secure posture: unknown session ID defaults to HTTP 403.
* **Validation Criteria**: RED session blocks payment in $<20\text{ ms}$; record saved to DB with decision reason.
* **Definition of Done (DoD)**: Pre-transaction security gate operational and covered by automated tests.
* **Priority**: **P0** | **Effort**: MEDIUM | **Blockers**: None.
* **What Must NOT Be Done**: Do not integrate real commercial payment gateways; use mock transaction models.

### Phase B14: Redis In-Memory Ring Buffer & TTL Hardening
* **Objective**: Harden Redis operations for ultra-low latency audio buffering and strict DPDP ephemeral retention.
* **Dependencies**: Phase B2, Phase B3.
* **Inputs**: Redis 7.2 container.
* **Outputs**: Hardened async Redis client pool with connection recycling and error handling.
* **Implementation Tasks**:
  1. `[BUILD]` Implement connection pooling via `redis.asyncio.ConnectionPool`.
  2. `[SECURITY]` Audit all Redis keys: enforce explicit 15-second TTL on all audio buffers.
  3. `[BUILD]` Implement graceful reconnect backoff if Redis container temporarily drops.
* **Validation Criteria**: Keys expire automatically after 15 seconds; disconnect purges active keys.
* **Definition of Done (DoD)**: Redis operations fully non-blocking and verified leak-free.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.
* **What Must NOT Be Done**: Never persist Redis snapshots to disk (`save ""` in Redis config).

### Phase B15: PostgreSQL & pgvector Integration
* **Objective**: Store relational session audit logs and 192-dimensional vector embeddings with IVFFlat indexing.
* **Dependencies**: Phase B1, Phase B8.
* **Inputs**: `backend/database.sql`, PostgreSQL 16 container.
* **Outputs**: Initialized schema with `sessions`, `enrolled_voiceprints`, and `transaction_evaluations` tables.
* **Implementation Tasks**:
  1. `[DATABASE]` Verify `CREATE EXTENSION IF NOT EXISTS vector;` executes cleanly on startup.
  2. `[DATABASE]` Create tables with foreign key constraints, indexes, and vector cosine distance index.
  3. `[BUILD]` Implement async connection pooling via `asyncpg`.
  4. `[SECURITY]` Sanitize database queries using parameterized SQL; zero string interpolation.
* **Validation Criteria**: Voiceprint vector inserted and retrieved via `<=>` cosine operator in $<5\text{ ms}$.
* **Definition of Done (DoD)**: PostgreSQL tables initialized; async repository queries operational.
* **Priority**: **P0** | **Effort**: MEDIUM | **Blockers**: Docker `pgvector` container.
* **What Must NOT Be Done**: Never store raw audio binary blobs or base64 audio strings in the database.

### Phase B16: API Hardening, Authentication & Rate Limiting
* **Objective**: Secure REST and WebSocket endpoints against unauthorized access, replay, and abuse.
* **Dependencies**: Phase B1, Phase B13.
* **Inputs**: Incoming HTTP/WS requests.
* **Outputs**: Authenticated requests with rate limiting and payload validation.
* **Implementation Tasks**:
  1. `[SECURITY]` Add API key header validation (`X-API-Key`) on transaction evaluation endpoint.
  2. `[SECURITY]` Enforce rate limiting on WebSocket connections (max 5 connections per client IP).
  3. `[SECURITY]` Add payload size limits: reject JSON bodies $>100\text{ KB}$ and audio frames $\ne 2048\text{ bytes}$.
* **Validation Criteria**: Requests lacking valid API key receive HTTP 401/403.
* **Definition of Done (DoD)**: API endpoints secured with authentication headers and size guards.
* **Priority**: **P1** | **Effort**: LOW | **Blockers**: None.
* **What Must NOT Be Done**: Do not expose sensitive stack traces in HTTP error responses.

### Phase B17: Observability, Structured Logging & Latency Tracing
* **Objective**: Instrument pipeline stages with sub-millisecond latency timing and structured audit logging.
* **Dependencies**: Phase B1 through B13.
* **Inputs**: Execution checkpoints across audio ingestion, DSP, ONNX, and gating.
* **Outputs**: Structured log events with latency breakdowns emitted on every hop.
* **Implementation Tasks**:
  1. `[BUILD]` Instrument pipeline stages using `time.perf_counter()`.
  2. `[BUILD]` Log JSON events containing: `vad_ms`, `spectral_ms`, `prosody_ms`, `resnet_ms`, `total_ms`.
  3. `[INTEGRATE]` Include `processing_latency_ms` in outbound WebSocket telemetry payload.
* **Validation Criteria**: Latency logs clearly visible in container stdout; average total latency $<80\text{ ms}$.
* **Definition of Done (DoD)**: Granular timing instrumentation active on all pipeline stages.
* **Priority**: **P1** | **Effort**: LOW | **Blockers**: None.
* **What Must NOT Be Done**: Do not write log files to disk; stream logs to stdout/stderr.

### Phase B18: Backend Security Hardening & Zero-Storage Audit
* **Objective**: Audit the entire backend stack to guarantee zero raw audio persistence on host storage.
* **Dependencies**: Phase B14, Phase B15.
* **Inputs**: Running backend stack under active streaming.
* **Outputs**: Clean security audit report confirming zero disk artifacts.
* **Implementation Tasks**:
  1. `[SECURITY]` Scan backend container filesystem during streaming; confirm no `.wav` or `.raw` temp files.
  2. `[SECURITY]` Verify non-root container execution (`USER appuser` in Dockerfile).
  3. `[SECURITY]` Audit Python dependencies for known CVEs using `pip audit` or safety checks.
* **Validation Criteria**: Disk scan shows zero audio bytes; containers run as non-root user.
* **Definition of Done (DoD)**: Security and privacy audit passed with zero compliance violations.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.
* **What Must NOT Be Done**: Never bypass privacy controls for debugging convenience.

### Phase B19: Backend Performance Validation & Benchmarking
* **Objective**: Execute load tests on WebSocket streaming and measure p95/p99 latency distributions.
* **Dependencies**: Phase B17.
* **Inputs**: Automated streaming load generator script.
* **Outputs**: Performance benchmark report with empirical latency numbers.
* **Files Likely to Create**: `backend/scripts/benchmark_streaming.py`.
* **Implementation Tasks**:
  1. `[BUILD]` Create benchmark script streaming 1,000 frames at real-time speed (64ms intervals).
  2. `[VALIDATE]` Measure p50, p95, and p99 processing latency for Tier 1 and Pre-Transaction Gate.
  3. `[VALIDATE]` Verify memory footprint remains stable over 1,000 processed frames (zero leaks).
* **Validation Criteria**: p95 Tier 1 latency $<80\text{ ms}$; Pre-Transaction Gate latency $<25\text{ ms}$.
* **Definition of Done (DoD)**: Benchmark script executed; empirical latency documented.
* **Priority**: **P1** | **Effort**: MEDIUM | **Blockers**: None.
* **What Must NOT Be Done**: Do not test on virtualized cloud instances with shared throttled vCPUs.

### Phase B20: Backend Demo Readiness & Standalone Validation
* **Objective**: Validate the complete standalone backend against synthetic attack scenarios.
* **Dependencies**: Phase B1 through B19.
* **Inputs**: Test WAV audio files (bonafide human speech and synthetic voice conversion attack).
* **Outputs**: End-to-end verified backend ready for Section D integration.
* **Files Likely to Create**: `backend/scripts/verify_backend_demo.py`.
* **Implementation Tasks**:
  1. `[VALIDATE]` Stream bonafide speech: verify ThreatState stays GREEN; verify Gate approves.
  2. `[VALIDATE]` Stream synthetic clone attack: verify ThreatState surges to RED; verify Gate blocks.
  3. `[DOCUMENT]` Record backend completion milestone in `MEMORY.md`.
* **Validation Criteria**: 100% pass rate across 5 consecutive automated attack simulation runs.
* **Definition of Done (DoD)**: Backend verified demo-ready and locked for integration.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.
* **What Must NOT Be Done**: Do not alter contract schemas during final readiness lock.

---

## 6. Section C: Frontend Track (C1–C17) [Owner: Person B — Sion]

*Secondary parallel UI track owned entirely by Sion. Enhanced with design specification workflow and mock-first independence.*

### Phase C1: Frontend Foundation & Type System Setup
* **Objective**: Configure frontend environment, strict TypeScript settings, and contract type definitions.
* **Dependencies**: Section A (A0–A4).
* **Outputs**: Verified build environment; imported telemetry and API contract types in `frontend/lib/types/`.
* **UI Deliverables**: None (foundation).
* **Data Contract**: TypeScript interfaces matching WebSocket telemetry and REST payloads.
* **Mock Data Requirements**: Initial mock telemetry objects for component testing.
* **Backend Dependency**: None (contract-driven).
* **Validation Criteria**: `npm run build` and `npm run lint` execute with zero errors.
* **Definition of Done (DoD)**: Contract types in place; clean Next.js build.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.

### Phase C2: Application Shell, Theme & Navigation
* **Objective**: Build the cybernetic dark-theme layout, header status indicators, and view switcher.
* **Dependencies**: Phase C1.
* **Outputs**: Responsive application frame with top navigation bar (`LimelightNavbar.tsx`).
* **Design Inputs**: Base dark background `#0a0b0e`, neon cybernetic accents (emerald/cyan/crimson).
* **UI Deliverables**: Top navbar with live time, system status pulse, and view navigation tabs.
* **Mock Data Requirements**: Static mock session ID and system health flag.
* **Backend Dependency**: None.
* **Validation Criteria**: Shell renders cleanly at 1920x1080 and 1366x768 viewports without layout shifts.
* **Definition of Done (DoD)**: Application layout styled with cybernetic aesthetic.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.

### Phase C3: Voice Session Control & Mode Switcher
* **Objective**: Implement interactive session controls: Start/Stop Call, Mute, and Mode Toggle (Live Mic vs. Simulated Attack).
* **Dependencies**: Phase C2.
* **Outputs**: Session control toolbar with active call timer and status badge.
* **Components**: `frontend/components/views/OverviewView.tsx`.
* **UI Deliverables**: Start/Stop button, Live Mic toggle, Simulated Attack radio group.
* **Backend Dependency**: None.
* **Validation Criteria**: Clicking Start initiates session state; Mode Toggle switches data stream cleanly.
* **Definition of Done (DoD)**: Session controls responsive and managing client-side session state.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.

### Phase C4: Live Audio Telemetry UI & Metric Cards
* **Objective**: Build real-time metric cards displaying VAD speech ratio, latency, frame rate, and analysis hop count.
* **Dependencies**: Phase C2.
* **Outputs**: Grid of glowing telemetry stat cards with micro-animations.
* **Components**: `frontend/components/TelemetryStatCards.tsx`.
* **UI Deliverables**: 4 metric cards: Speech Ratio (%), Hop Latency (ms), HNR (dB), Analysis Hops.
* **Data Contract**: Bound to `useTelemetryStore` telemetry slice.
* **Mock Data Requirements**: Calibrated telemetry feed from `useSimulator.ts`.
* **Backend Dependency**: None.
* **Validation Criteria**: Cards update reactively without layout thrashing at 10 Hz telemetry frequency.
* **Definition of Done (DoD)**: Metric cards render real-time values smoothly from store.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.

### Phase C5: Spectrogram & Acoustic Waterfall Canvas
* **Objective**: Implement 60 FPS HTML5 Canvas rendering 80-bin log-mel spectrogram waterfall with high-contrast palette.
* **Dependencies**: Phase C2.
* **Outputs**: Smooth horizontal waterfall scrolling from right to left as audio frames arrive.
* **Components**: `frontend/components/SpectrogramCanvas.tsx`.
* **Design Inputs**: High-contrast spectral color gradient (deep violet $\rightarrow$ electric cyan $\rightarrow$ solar yellow).
* **Data Contract**: `pushSpectrogramColumn(column: number[])` in store.
* **Mock Data Requirements**: Simulated 80-bin frequency column generator in `useSimulator.ts`.
* **Backend Dependency**: None.
* **Validation Criteria**: Canvas renders at consistent 60 FPS without memory accumulation or browser lag.
* **Definition of Done (DoD)**: Spectrogram canvas scrolls smoothly and displays frequency variations.
* **Priority**: **P0** | **Effort**: MEDIUM | **Blockers**: None.

### Phase C6: Prosody & Biomechanical Telemetry Visualizer
* **Objective**: Render real-time time-series charts for Fundamental Frequency ($F_0$), Jitter, and Shimmer.
* **Dependencies**: Phase C2.
* **Outputs**: Multi-line chart updating smoothly with historical prosody metrics over the last 30 seconds.
* **Components**: `frontend/components/ProsodyChart.tsx`.
* **UI Deliverables**: Recharts/Canvas component displaying $F_0$ curve, jitter threshold bar, and shimmer index.
* **Data Contract**: Array of `ProsodyDataPoint` from `useTelemetryStore`.
* **Mock Data Requirements**: Sine-wave modulated $F_0$ for human mode; flat line for synthetic mode.
* **Backend Dependency**: None.
* **Validation Criteria**: Chart transitions smoothly between dynamic human curves and synthetic flatlines.
* **Definition of Done (DoD)**: Prosody visualization reflects micro-perturbations clearly.
* **Priority**: **P1** | **Effort**: MEDIUM | **Blockers**: None.

### Phase C7: Composite Risk Score & Threat Dial Gauge
* **Objective**: Build animated radial gauge (`ThreatDial.tsx`) displaying composite risk ($0.0–100.0$) with color glow.
* **Dependencies**: Phase C2.
* **Outputs**: Animated dial with color gradient (Green $\rightarrow$ Amber $\rightarrow$ Red) and numeric risk readout.
* **Components**: `frontend/components/ThreatDial.tsx`.
* **UI Deliverables**: Circular gauge with animated needle/arc, risk score text, and confidence rating.
* **Data Contract**: `risk_score` float from store.
* **Mock Data Requirements**: Score escalation sequences generated by `useSimulator.ts`.
* **Backend Dependency**: None.
* **Validation Criteria**: Dial animates smoothly with spring physics (`framer-motion`) across all risk ranges.
* **Definition of Done (DoD)**: ThreatDial accurately reflects risk score with responsive color transitions.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.

### Phase C8: Threat State Machine UI (GREEN / AMBER / RED)
* **Objective**: Render prominent visual threat state badges, pulsing glow borders, and audio warning alerts.
* **Dependencies**: Phase C7.
* **Outputs**: Screen-edge glow and state banner switching between GREEN (Secured), AMBER (Caution), RED (Breach).
* **Components**: `frontend/components/ThreatStateBanner.tsx`.
* **UI Deliverables**: Header badge, alert banners, and screen perimeter glow reactive to threat level.
* **Data Contract**: `threat_level` string enum from store.
* **Backend Dependency**: None.
* **Validation Criteria**: State transitions reflect hysteresis rules; RED state triggers high-visibility warning.
* **Definition of Done (DoD)**: Threat states visually dominate UI when risk escalates.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.

### Phase C9: PITCH Challenge-Response Interactive Drawer
* **Objective**: Build sliding challenge drawer displaying dynamic Hindi tongue-twisters and audio feedback meter.
* **Dependencies**: Phase C8.
* **Outputs**: Expandable drawer showing Hindi/English challenge phrases with countdown timer.
* **Components**: `frontend/components/PitchChallengeDrawer.tsx`.
* **Design Inputs**: Bold Devanagari typography, glowing countdown ring, high-contrast vocal stability bar.
* **Data Contract**: `challenge_active`, `challenge_phrase`, `challenge_status` in store.
* **Mock Data Requirements**: Mock challenge trigger event in simulator.
* **Backend Dependency**: None.
* **Validation Criteria**: Drawer slides open automatically when AMBER state triggers; displays phrase clearly.
* **Definition of Done (DoD)**: PITCH drawer fully interactive and styled for presentation readability.
* **Priority**: **P0** | **Effort**: MEDIUM | **Blockers**: None.

### Phase C10: Interactive Mock Banking Gate UI
* **Objective**: Build simulated mobile UPI wire transfer interface with interactive PIN pad and automatic circuit lock.
* **Dependencies**: Phase C8.
* **Outputs**: Realistic smartphone frame rendering UPI payment flow (₹25,000 vs. ₹2,50,000) with PIN modal.
* **Components**: `frontend/components/MockBankingGate.tsx`.
* **UI Deliverables**: Bank transfer form, numerical PIN keypad, Success screen, and "TRANSACTION FROZEN" lock screen.
* **Data Contract**: Submits to transaction gate endpoint; evaluates threat level from store.
* **Mock Data Requirements**: Client-side mock authorization gate hook.
* **Backend Dependency**: None (uses mock gate until Phase D6).
* **Validation Criteria**: Normal transfer approves; transfer under RED state displays locked screen with error code.
* **Definition of Done (DoD)**: Mock banking gate fully operational and demonstrably responsive to risk states.
* **Priority**: **P0** | **Effort**: MEDIUM | **Blockers**: None.

### Phase C11: Security Alerts & Forensic Evidence Drawer
* **Objective**: Build expandable event feed showing forensic explanations ("Transposed convolution artifact detected").
* **Dependencies**: Phase C4.
* **Outputs**: Chronological security event log with severity badges and expandable anomaly details.
* **Components**: `frontend/components/SecurityEventLog.tsx`.
* **UI Deliverables**: Scrolling event ledger with timestamps, risk tags, and acoustic anomaly descriptions.
* **Data Contract**: Array of `SecurityEvent` from store.
* **Backend Dependency**: None.
* **Validation Criteria**: New security anomalies append to log with smooth slide-down animation.
* **Definition of Done (DoD)**: Forensic evidence log operational with realistic explanations.
* **Priority**: **P1** | **Effort**: LOW | **Blockers**: None.

### Phase C12: Session History & Audit Visualization View
* **Objective**: Build secondary view tab showing previous session evaluation records and transaction outcomes.
* **Dependencies**: Phase C2.
* **Outputs**: Tabular audit ledger view with search, filter, and session detail modal.
* **Components**: `frontend/components/views/SessionHistoryView.tsx`.
* **UI Deliverables**: Data table with status pills, timestamps, risk scores, and transaction amounts.
* **Data Contract**: Schema matching `transaction_evaluations` database table.
* **Backend Dependency**: None.
* **Validation Criteria**: Switching to History view displays populated audit table.
* **Definition of Done (DoD)**: Historical audit view styled and functional.
* **Priority**: **P2** | **Effort**: LOW | **Blockers**: None.

### Phase C13: API Client Integration Layer
* **Objective**: Build typed API service client for `/health`, `/v1/transaction/evaluate-authorization`, and `/v1/enroll`.
* **Dependencies**: Phase C1.
* **Outputs**: TypeScript API client module (`frontend/lib/api/client.ts`) with typed request/response methods.
* **Data Contract**: Locked REST contract from Section 3.
* **Mock Data Requirements**: Mock interceptor mode when backend is unreachable.
* **Backend Dependency**: None (can run against mock server).
* **Validation Criteria**: Unit tests verifying request payload serialization and error code parsing.
* **Definition of Done (DoD)**: API client ready to connect to real backend endpoints.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.

### Phase C14: WebSocket Client Integration & Audio Capture Hook
* **Objective**: Implement `useAudioStreamer.ts` (Web Audio mic capture at 16kHz PCM) and `useVaaniShieldWs.ts`.
* **Dependencies**: Phase C1.
* **Outputs**: Fully functional audio capture and WebSocket streaming hook.
* **Components**: `frontend/hooks/useAudioStreamer.ts`, `frontend/hooks/useVaaniShieldWs.ts`.
* **Data Contract**: 1,024-sample `Int16Array` binary chunks; handles inbound `TELEMETRY_UPDATE` JSON.
* **Backend Dependency**: None.
* **Validation Criteria**: Browser microphone captures 16kHz audio; chunks dispatches over WebSocket client.
* **Definition of Done (DoD)**: Audio streamer and WebSocket hook tested and handling reconnection.
* **Priority**: **P0** | **Effort**: MEDIUM | **Blockers**: Browser audio permissions.

### Phase C15: Error Boundaries, Offline Modes & Reconnection States
* **Objective**: Implement graceful error boundaries, WebSocket disconnect banners, and fallback toggles.
* **Dependencies**: Phase C2, Phase C14.
* **Outputs**: Toast alerts, reconnecting spinner, and automatic fallback to simulator mode.
* **Components**: `frontend/components/ConnectionBanner.tsx`.
* **UI Deliverables**: Non-intrusive warning bar: *"Backend disconnected — running in simulated demo mode"*.
* **Validation Criteria**: Killing backend triggers reconnecting banner without breaking UI rendering.
* **Definition of Done (DoD)**: Frontend resilient to backend disconnects and rendering exceptions.
* **Priority**: **P1** | **Effort**: LOW | **Blockers**: None.

### Phase C16: Responsive Styling, Accessibility & Cybernetic Polish [Shub Design Directives]
* **Objective**: Apply Shub's authoritative design specifications (typography, color codes, glassmorphism, spacing).
* **Dependencies**: Phase C2 through C12.
* **Inputs**: Design specifications, reference URLs, and component styling notes provided by Shub.
* **Outputs**: Polished CSS tokens, subtle glowing accents, crisp typography, and mobile-ready viewport rules.
* **Design Scope**:
  * Fine-tuning card borders (`border-white/10` with subtle emerald/crimson backlight).
  * Aligning typography hierarchies (Outfit headers, JetBrains Mono telemetry numbers).
  * Polishing Framer Motion spring physics for ThreatDial needle and modal transitions.
  * Ensuring zero visual regressions across Chrome, Firefox, and Edge.
* **Validation Criteria**: Visual review passes all design constraints provided by Shub.
* **Definition of Done (DoD)**: UI aesthetics polished to hackathon-winning presentation standards.
* **Priority**: **P1** | **Effort**: LOW | **Blockers**: None.

### Phase C17: Frontend Demo Readiness & Standalone Rehearsal
* **Objective**: Verify that the complete frontend functions flawlessly in standalone mode with simulated data.
* **Dependencies**: Phase C1 through C16.
* **Outputs**: 100% functional standalone frontend running on `localhost:3000`.
* **Validation Criteria**: Presenter can execute the entire 5-minute demo script using simulated attack triggers.
* **Definition of Done (DoD)**: Standalone frontend certified demo-ready and locked for Section D integration.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.

---

## 7. Section D: Integration Track (D1–D10) [Joint Ownership]

*Joint convergence track executed collaboratively once Shub certifies `B20` and Sion certifies `C17`.*

| Phase | Title | Shub (Backend Owner) | Sion (Frontend Owner) | DoD | Priority |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **D1** | REST API Client Wiring | Host `/health` & Gate API | Wire `lib/api/client.ts` | Frontend health pill turns green | **P0** |
| **D2** | WebSocket Telemetry Wiring | Emit `TELEMETRY_UPDATE` | Ingest into `useTelemetryStore` | Real packet indices update live | **P0** |
| **D3** | Real Audio Ingestion Wiring | Buffer PCM in Redis | Stream mic via `useAudioStreamer` | Redis buffer length hits 24 | **P0** |
| **D4** | Real AI Visualizer Sync | Send real mel & prosody | Render Canvas & Charts | Voice drives live formants/pitch | **P0** |
| **D5** | Live Clone Attack Sync | Run ResNet & Asymmetric EMA | Toggle attack mode in UI | Score surges to RED in $<2\text{ s}$ | **P0** |
| **D6** | PITCH Closed-Loop Wiring | Emit challenge & check lag | Render Devanagari phrase drawer | Challenge completion clears threat | **P1** |
| **D7** | Pre-Transaction Gate Wiring | Return HTTP 200/403 on session | Connect UPI PIN submit button | RED voice freezes wire transfer | **P0** |
| **D8** | Audit Ledger Integration | Save evaluations to DB | Display in Session History View | Decisions visible in UI table | **P1** |
| **D9** | Full Demo Rehearsal Wiring | Run complete Docker stack | Execute 10-step demo script | 3 consecutive runs pass 100% | **P0** |
| **D10**| Bug Triage & Hardening | Fix backend edge cases | Fix UI alignment/console errors | Zero unhandled errors | **P0** |

---

## 8. Section E: Final Validation & Demo Track (E1–E10) [Joint Ownership]

*Joint final stabilization, security verification, and release freeze.*

* **E1 (Security Validation)**: Audit CORS, API key enforcement, SQL parameterization, and non-root Docker execution.
* **E2 (Privacy & DPDP Compliance Audit)**: Mathematical inspection proving zero raw audio files (`.wav`/`.pcm`) exist on disk.
* **E3 (AI Model Credibility Check)**: Verify real ONNX models are active (`silero_vad.onnx`, `resnet18_acoustic_quantized.onnx`).
* **E4 (Telephony Robustness Check)**: Verify detector resilience on $300–3,400\text{ Hz}$ bandpass-filtered audio.
* **E5 (Schema Conformance Check)**: Verify 100% request/response conformance across Pydantic and TypeScript interfaces.
* **E6 (End-to-End Test Suite)**: Execute `pytest backend/tests/` and Next.js compiler check (`npm run build`).
* **E7 (Latency Benchmarking)**: Document empirical p95 latencies (Tier 1 $<80\text{ ms}$, Pre-Transaction Gate $<35\text{ ms}$).
* **E8 (5-Minute Live Demo Rehearsal)**: Presenters execute 5 back-to-back rehearsals within a strict 4.5-minute window.
* **E9 (Documentation Lock)**: Finalize `README.md` and `MEMORY.md` with verified setup instructions and benchmark numbers.
* **E10 (Release Freeze Tag)**: Apply git release tag `v1.0.0-demo-freeze`; lock codebase against further modifications.

---

## 9. Detailed Dependency Matrix

| Phase | Owner | Depends On | Can Run in Parallel? | Blocks |
| :--- | :--- | :--- | :---: | :--- |
| **A0–A4** | Joint | None | **NO** | Backend (B1) + Frontend (C1) |
| **B1** | Shub | A4 | **YES** | B2, B15, B16 |
| **C1** | Sion | A2 | **YES** | C2, C13, C14 |
| **B2** | Shub | B1 | **YES** | B3, B14 |
| **C2** | Sion | C1 | **YES** | C3, C4, C5, C6, C7, C12, C15 |
| **B3** | Shub | B2 | **YES** | B4, B14 |
| **C3** | Sion | C2 | **YES** | C17, D5 |
| **B4** | Shub | B3 | **YES** | B5, B6, B8 |
| **C4** | Sion | C2 | **YES** | C11, D2 |
| **B5** | Shub | B4 | **YES** | B7, B9 |
| **C5** | Sion | C2 | **YES** | C16, D4 |
| **B6** | Shub | B4 | **YES** | B9, B12 |
| **C6** | Sion | C2 | **YES** | C16, D4 |
| **B7** | Shub | B5 | **YES** | B9 |
| **C7** | Sion | C2 | **YES** | C8, D4 |
| **B8** | Shub | B4, B15 | **YES** | B9 |
| **C8** | Sion | C7 | **YES** | C9, C10, D5 |
| **B9** | Shub | B5, B6, B7 | **YES** | B10 |
| **C9** | Sion | C8 | **YES** | C16, D6 |
| **B10**| Shub | B9 | **YES** | B11 |
| **C10**| Sion | C8 | **YES** | C16, D7 |
| **B11**| Shub | B10 | **YES** | B12, B13 |
| **C11**| Sion | C4 | **YES** | C16, D8 |
| **B12**| Shub | B6, B11 | **YES** | D6 |
| **C12**| Sion | C2 | **YES** | D8 |
| **B13**| Shub | B11 | **YES** | B16, D7 |
| **C13**| Sion | C1 | **YES** | D1 |
| **B14**| Shub | B3 | **YES** | B18 |
| **C14**| Sion | C1 | **YES** | C15, D2, D3 |
| **B15**| Shub | B1 | **YES** | B8, B18, D8 |
| **C15**| Sion | C14 | **YES** | C17 |
| **B16**| Shub | B1, B13 | **YES** | D1 |
| **C16**| Sion | C2–C12, Shub Design Specs | **YES** | C17 |
| **B17**| Shub | B1–B13 | **YES** | B19, D2 |
| **C17**| Sion | C1–C16 | **YES** | D1–D10 (Integration) |
| **B18**| Shub | B14, B15 | **YES** | E2 |
| **B19**| Shub | B17 | **YES** | E7 |
| **B20**| Shub | B1–B19 | **YES** | D1–D10 (Integration) |
| **D1–D10**| Joint | B20 + C17 | **NO** | E1–E10 (Final Validation) |
| **E1–E10**| Joint | D10 | **NO** | Demo Release Freeze |

---

## 10. Two Critical Paths & Execution Architecture

```
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
    80-bin Mel Spectrogram (B5)                         Spectrogram Canvas 60 FPS (C5)
            │                                                   │
    Praat Parselmouth Prosody (B6)                      Prosody Real-Time Chart (C6)
            │                                                   │
    ResNet-18 Quantized ONNX (B7)                       ThreatDial Radial Gauge (C7)
            │                                                   │
    Multi-Signal Feature Fusion (B9)                    Threat State Banner GREEN/RED (C8)
            │                                                   │
    Risk Scoring Engine (B10)                           PITCH Challenge Drawer (C9)
            │                                                   │
    Asymmetric EMA State Machine (B11)                  Mock UPI Banking Gate (C10)
            │                                                   │
    Pre-Transaction Gate (B13)                          Client Networking (C13, C14)
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

---

## 11. MVP Cut Line & Scope Boundaries

### 11.1 The 11 Mandatory MVP Deliverables (P0 Cut Line)
The live demo is certified complete if and only if these 11 capabilities function end-to-end:
1. **Voice Session Creation**: Client initiates call session via WebSocket handshake (`A2`, `B2`, `C3`).
2. **Audio Ingestion**: Browser captures 16kHz 16-bit PCM in 64ms discrete chunks (`B2`, `C14`).
3. **Audio Buffering**: Redis in-memory 24-frame circular buffer with 15s TTL (`B3`, `B14`).
4. **Voice Activity Detection**: Silero VAD discards unvoiced windows ($<15\%$ speech) (`B4`).
5. **Authentic AI/DSP Signals**: Quantized ResNet-18 ONNX vocoder cues + Parselmouth prosody (`B5`, `B6`, `B7`).
6. **Continuous Risk Scoring**: Multi-signal weighted fusion producing instantaneous score $[0, 100]$ (`B9`, `B10`).
7. **Temporal Threat State**: Asymmetric EMA ($\alpha_{\text{up}}=0.65, \alpha_{\text{down}}=0.25$) with hysteresis (`B11`, `C8`).
8. **PITCH Challenge-Response**: Dynamic Hindi tongue-twister prompt displayed in UI drawer (`B12`, `C9`).
9. **Transaction Security Gate**: Synchronous REST gate halting payment on RED threat state (`B13`, `C10`).
10. **SecOps War Room Console**: High-contrast UI (ThreatDial, Canvas waterfall, UPI gate) (`C2`–`C10`).
11. **End-to-End System Convergence**: Injected clone attack visibly triggers RED state and UPI payment freeze (`D1`–`D10`).

### 11.2 Priority Taxonomy
* **P0 (Mandatory)**: The 11 MVP capabilities above. Non-negotiable for hackathon evaluation.
* **P1 (Important Credibility)**: ECAPA-TDNN speaker verification (`B8`), AMR telephony simulation (`E4`), granular latency tracing (`B17`), forensic evidence drawer (`C11`).
* **P2 (Optional Polish)**: Session audit history tab (`C12`), secondary export utilities, theme customization.
* **P3 (Deferred Future Work)**: Carrier SIPREC media forking, multi-tenant enterprise RBAC, distributed Kafka bus, 1GB+ foundation models (Wav2Vec2/XLS-R), native iOS/Android telephony hooks.

---

## 12. Anti-Over-Engineering Charter

Both developers are bound by this anti-distraction charter:
1. **NO Microservices Sprawl**: Run a clean, unified FastAPI service. Do not split into separate microservices.
2. **NO Cloud Message Queues**: Do not introduce Kafka, RabbitMQ, or AWS SQS. Redis 7.2 lists handle buffering.
3. **NO Premature Kubernetes**: Docker Compose orchestrates the four containers (`api`, `redis`, `postgres`, `frontend`).
4. **NO Heavy Foundation Models**: Strictly ban 1GB+ models (Wav2Vec2, Whisper). Use quantized ONNX models ($<50\text{ MB}$).
5. **NO Redundant Vector Databases**: PostgreSQL 16 with `pgvector` handles relational audit logs and vector embeddings.
6. **NO Live Payment Gateways**: Do not integrate real Razorpay/Stripe APIs. The interactive `MockBankingGate` PIN pad tells the security story cleanly.
7. **NO Unnecessary Framework Swaps**: Stick to Next.js 16 + React 19 + Tailwind. Do not rewrite UI systems for styling convenience.

---

## 13. Git Safety Rules & Memory Governance

### 13.1 Absolute Git Safety Rules
* **ANTI-GRAVITY MUST NEVER PUSH TO GITHUB AUTOMATICALLY**:
  Under no circumstances may Anti-Gravity or automated scripts execute `git push`, force push, merge to `main`, delete branches, or trigger remote GitHub releases.
* **LOCAL EXECUTION ONLY**:
  All code changes remain strictly local on the developer's machine until explicit human authorization is granted.
* **HUMAN-AUTHORIZED COMMITS**:
  Git commits may only be prepared locally upon explicit instruction from Shub or Sion.

### 13.2 Standardized `MEMORY.md` Protocol
At the conclusion of every completed phase, update [`MEMORY.md`](file:///d:/Voice-Cloning-Prototype/MEMORY.md) maintaining separate tracks to prevent overwriting concurrent progress:

```markdown
### [YYYY-MM-DD HH:MM] Phase [ID] Completion: [Phase Name]
- **Track**: SHARED | BACKEND | FRONTEND | INTEGRATION | FINAL
- **Status**: COMPLETE | IN PROGRESS | BLOCKED
- **Owner**: Person A (Shub) / Person B (Sion) / Joint
- **What Changed**: Concise summary of delivered capabilities.
- **Files Created**:
  - `path/to/created_file`
- **Files Modified**:
  - `path/to/modified_file`
- **Contract Changes**: None (or explicit versioned diff).
- **Design Changes**: Summary of UI styling/layout updates (Frontend track).
- **Dependencies Added**: Package names and pinned versions.
- **Validation Performed**: Test command and numerical result.
- **Known Issues / Tech Debt**: Non-blocking observations.
- **Blockers**: Any blocking item for subsequent phases.
- **Mock vs Real Status**: Explicit statement of mock vs live implementation.
- **Next Phase**: Recommended next milestone.
```

### 13.3 Phase Completion Report Schema
At the conclusion of each phase, output this standardized report:
```text
PHASE:         [Phase ID, e.g., B7 or C9]
OWNER:         [Person A — Shub / Person B — Sion / Joint]
STATUS:        [COMPLETE / PARTIAL / BLOCKED]
OBJECTIVE:     [1 sentence on goal]
COMPLETED:     [Summary of delivered code]
FILES CHANGED: [List of affected files]
CONTRACT CHANGES: [None or documented diff]
DESIGN CHANGES:   [Summary of UI/design inputs applied (Frontend track)]
VALIDATION:    [Test command and concrete result]
KNOWN ISSUES:  [None or brief issue summary]
BLOCKERS:      [None or blocking item]
MOCK / REAL STATUS: [Explicitly state if live or simulated]
NEXT PHASE:    [Next Phase ID]
```

---

## 14. Checklists & 5-Minute Live Demo Runbook

### 14.1 The 5-Minute Live Demo Script
```
┌───────┬───────────────────────────┬──────────────────────────────────────────────────────────────┐
│ Step  │ Action / Event            │ Observable System Behavior & Telemetry                       │
├───────┼───────────────────────────┼──────────────────────────────────────────────────────────────┤
│ 1     │ System Start              │ Docker Compose brings up API, Redis, Postgres, Frontend.     │
│       │                           │ GET /health confirms all runtimes & ONNX sessions are green. │
├───────┼───────────────────────────┼──────────────────────────────────────────────────────────────┤
│ 2     │ Establish Session         │ Frontend connects to WebSocket /v1/stream/call/{session_id}. │
│       │                           │ Redis ring buffer initialized; session marked ACTIVE in DB.  │
├───────┼───────────────────────────┼──────────────────────────────────────────────────────────────┤
│ 3     │ Live Human Voice Input    │ Presenter speaks naturally into browser microphone.          │
│       │                           │ Client streams 16kHz 16-bit Mono Linear PCM in 64ms frames.  │
├───────┼───────────────────────────┼──────────────────────────────────────────────────────────────┤
│ 4     │ Stream Analysis (GREEN)   │ Silero VAD detects active speech (>15%).                     │
│       │                           │ ResNet vocoder risk is low (<15%); Parselmouth extracts      │
│       │                           │ natural F0 variance & organic jitter (0.8%).                 │
├───────┼───────────────────────────┼──────────────────────────────────────────────────────────────┤
│ 5     │ Telemetry Display         │ Waterfall canvas renders clean spectrogram.                  │
│       │                           │ Threat dial stays solid GREEN (Composite Risk: 12-18/100).   │
├───────┼───────────────────────────┼──────────────────────────────────────────────────────────────┤
│ 6     │ Baseline Transaction Check│ Presenter initiates mock UPI transfer of ₹25,000.            │
│       │                           │ POST /v1/transaction/evaluate-authorization returns          │
│       │                           │ HTTP 200 APPROVED; PIN pad unlocks and succeeds.             │
├───────┼───────────────────────────┼──────────────────────────────────────────────────────────────┤
│ 7     │ Neural Clone Attack       │ Audio source switches to neural clone audio stream.          │
│       │                           │ ResNet detects transposed convolution checkerboard cues;     │
│       │                           │ Parselmouth detects abnormal jitter (>3.5%) & flat pitch.    │
├───────┼───────────────────────────┼──────────────────────────────────────────────────────────────┤
│ 8     │ Rapid Escalation (RED)    │ Asymmetric EMA (α=0.65) surges score from 18 to 84 in 2 hops.│
│       │                           │ Threat dial flashes RED; audible/visual alerts fire.         │
├───────┼───────────────────────────┼──────────────────────────────────────────────────────────────┤
│ 9     │ Hard Transaction Circuit  │ Presenter attempts high-value wire transfer of ₹2,50,000.    │
│       │ Breaker Triggered         │ Gate immediately rejects with HTTP 403 BLOCKED.              │
│       │                           │ UI displays: "TRANSACTION FROZEN: VOICE CLONE DETECTED".     │
├───────┼───────────────────────────┼──────────────────────────────────────────────────────────────┤
│ 10    │ Audit & PITCH Defense     │ DB records decision in transaction_evaluations;              │
│       │                           │ Show PITCH challenge drawer with Hindi phonetic phrase.      │
│       │                           │ Confirm zero raw audio was stored to disk (DPDP compliance). │
└───────┴───────────────────────────┴──────────────────────────────────────────────────────────────┘
```

### 14.2 Demo-Day Pre-Flight Checklist
- [ ] Docker containers running cleanly (`docker compose ps` shows 4 healthy services).
- [ ] Browser microphone permissions granted on demo workstation.
- [ ] Audio input levels verified: RMS volume meter reacts cleanly to speech.
- [ ] Live microphone test: Presenter talks naturally; ThreatDial stays GREEN ($12–18/100$).
- [ ] Mock banking gate test 1: Transfer of ₹25,000 approves instantly with PIN entry.
- [ ] Attack injection test: Synthetic clone stream injected; ThreatDial surges to RED ($>80/100$).
- [ ] Mock banking gate test 2: High-value transfer of ₹2,50,000 immediately blocked with HTTP 403.
- [ ] PITCH challenge test: AMBER state triggers drawer with Hindi tongue-twister prompt.
- [ ] Audit verification: PostgreSQL `transaction_evaluations` records show blocked attempt.
- [ ] DPDP proof: Host filesystem inspected; zero raw `.wav` or `.pcm` files exist on disk.

### 14.3 Final Freeze Checklist
- [ ] All code changes reviewed and merged into working branch.
- [ ] No uncommitted or untracked temporary files in repository.
- [ ] Quantized model files verified in `models/` directory.
- [ ] Automated test suite executes cleanly (`pytest backend/tests/`).
- [ ] Client builds cleanly without TypeScript or ESLint errors (`npm run build`).
- [ ] `README.md` updated with accurate clone, build, and run instructions.
- [ ] `MEMORY.md` updated with final completion ledger entry.
- [ ] Git release tagged: `v1.0.0-demo-freeze`.

---

## 15. Two-Developer Operational Governance FAQ

### Q1: Who is responsible for each phase?
* **Shared Foundation (`A0`–`A4`)**: Joint (Shub & Sion).
* **Backend / AI Track (`B1`–`B20`)**: Person A — Shub.
* **Frontend Track (`C1`–`C17`)**: Person B — Sion.
* **Integration Track (`D1`–`D10`)**: Joint (Shub & Sion).
* **Final Validation & Demo Track (`E1`–`E10`)**: Joint (Shub & Sion).

### Q2: What exactly does Shub implement?
FastAPI backend, WebSocket binary PCM ingestion, Redis ring buffer, Silero VAD, 80-bin mel spectrograms, Praat Parselmouth prosody, quantized ResNet-18 ONNX inference, ECAPA-TDNN vector extraction, PostgreSQL `pgvector`, Asymmetric EMA, Threat State Machine, PITCH challenge evaluator, Pre-Transaction Authorization Gate (`POST /v1/transaction/evaluate-authorization`), DPDP zero-storage controls, latency instrumentation, and backend test suites.

### Q3: What exactly does Sion implement?
Next.js App Router UI, TypeScript contract types, cybernetic dark theme shell, voice session controls, telemetry metric cards, 60 FPS Canvas spectrogram waterfall, prosody time-series charts, ThreatDial gauge, threat state banners, PITCH challenge drawer, Mock UPI banking gate with PIN pad, forensic evidence log, session history view, REST API client, WebSocket streaming client, error boundaries, and visual styling based on Shub's design specifications.

### Q4: Which work can happen in parallel?
All phases in Section B (`B1`–`B20`) and Section C (`C1`–`C17`) execute concurrently once Section A (`A0`–`A4`) contracts are locked. For example, Shub implements ResNet ONNX inference (`B7`) while Sion builds the ThreatDial gauge (`C7`).

### Q5: Which work requires coordination?
Contract definitions (`A2`, `A3`), design handoffs (Section 2.3), integration wiring (`D1`–`D10`), and final demo rehearsal (`E8`, `E10`).

### Q6: What contracts must remain frozen?
The REST endpoints (`/health`, `/v1/transaction/evaluate-authorization`, `/v1/enroll`), the WebSocket binary format ($16\text{ kHz}, 16\text{-bit}, 1024\text{ samples}$), and the outbound `TELEMETRY_UPDATE` JSON payload defined in Section 3.

### Q7: How does frontend design customization enter the workflow?
Shub provides design specifications (typography, colors, card styling, reference URLs, layouts) to Sion. Sion passes them to Anti-Gravity as styling guidance. Anti-Gravity applies them cleanly without altering contract schemas or backend architecture.

### Q8: How can frontend development proceed using mocks?
Sion uses `useSimulator.ts` to generate realistic synthetic telemetry, prosody curves, spectrogram slices, and risk score escalations matching the frozen WebSocket contract exactly, enabling complete UI development before the backend is running.

### Q9: When do backend and frontend converge?
At Section D (Integration Track, `D1`–`D10`), once Shub verifies backend standalone readiness (`B20`) and Sion verifies frontend standalone readiness (`C17`).

### Q10: What is the exact MVP cut line?
The 11 mandatory P0 capabilities detailed in Section 11.1. Everything outside this list is classified as P1, P2, or P3.

### Q11: What must be recorded in `MEMORY.md`?
Every completed phase must record: phase ID, owner (Shub / Sion / Joint), what changed, files created/modified, contract diffs, design changes, test results, blockers, and mock vs real status.

### Q12: What must NOT be changed?
The verified backend implementation sequence (`B1`–`B20`), the frozen contract schemas, the DPDP zero-storage policy, the MVP cut line, and the absolute prohibition against automatic Git pushes.

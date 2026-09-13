# VaaniShield: Parallel Engineering Roadmap & Execution Plan

| Document Attribute | Specification Detail |
| :--- | :--- |
| **Document Version** | 2.0.0-PARALLEL-ROADMAP |
| **Status** | Approved Engineering Execution Baseline |
| **Project** | VaaniShield (वाणिShield) — Real-Time Voice Integrity & Anti-Spoofing Platform |
| **Repository Reference** | `Sayan-Mukherjee99/Voice-Cloning-Prototype` |
| **Associated Documents** | `PRD.md`, `TRD.md`, `SECURITY.md`, `AI_ARCHITECTURE.md`, `AI_INSTRUCTIONS.md`, `MEMORY.md` |
| **Lead Strategy** | Contract-First Parallel Development (Backend/AI Track || Frontend Track) |

---

## Table of Contents

1. [Roadmap Strategy & Parallelization Model](#1-roadmap-strategy--parallelization-model)
2. [Contract-First Development & Interface Specifications](#2-contract-first-development--interface-specifications)
3. [Section A: Shared Foundation (A0–A4)](#3-section-a-shared-foundation-a0a4)
4. [Section B: Backend / AI Track (B1–B20)](#4-section-b-backend--ai-track-b1b20)
5. [Section C: Frontend Track (C1–C17)](#5-section-c-frontend-track-c1c17)
6. [Section D: Integration Track (D1–D10)](#6-section-d-integration-track-d1d10)
7. [Section E: Final Validation & Demo Track (E1–E10)](#7-section-e-final-validation--demo-track-e1e10)
8. [Parallelization Matrix & Execution Graph](#8-parallelization-matrix--execution-graph)
9. [MVP Cut Line & Priority Governance](#9-mvp-cut-line--priority-governance)
10. [Anti-Over-Engineering Charter](#10-anti-over-engineering-charter)
11. [Git Safety Protocol & Memory Governance](#11-git-safety-protocol--memory-governance)
12. [Checklists & Demo Runbook](#12-checklists--demo-runbook)

---

## 1. Roadmap Strategy & Parallelization Model

### 1.1 The Tight-Timeline Dual-Track Reality
VaaniShield has a strict delivery window for hackathon demonstration. To maximize delivery speed while guaranteeing technical credibility, development is bifurcated into two concurrent execution tracks decoupled by an unyielding **Contract-First** interface boundary:

* **PRIMARY IMMEDIATE FOCUS (Backend / AI / Infrastructure Track)**: Implemented immediately to replace mock inference with real DSP and neural models (Silero VAD, 80-bin mel spectrograms, Praat Parselmouth prosody, quantized ResNet-18, Asymmetric EMA, and synchronous Pre-Transaction Authorization Gate).
* **SECONDARY PARALLEL FOCUS (Frontend Track)**: Executed concurrently by a dedicated frontend developer using frozen TypeScript types, WebSocket message schemas, and calibrated mock data generators (`useSimulator.ts`), completely independent of backend availability.
* **FINAL FOCUS (Integration & Demo Track)**: Converges both tracks for end-to-end telemetry synchronization, real audio verification, attack validation, and demo stabilization.

```
                                  ┌───────────────────────────────┐
                                  │ SECTION A: SHARED FOUNDATION  │
                                  │ (A0 - A4: Specs, Contracts)   │
                                  └───────────────┬───────────────┘
                                                  │ CONTRACT FREEZE
                        ┌─────────────────────────┴─────────────────────────┐
                        ▼                                                   ▼
         ┌─────────────────────────────┐                     ┌─────────────────────────────┐
         │  SECTION B: BACKEND/AI      │                     │  SECTION C: FRONTEND TRACK  │
         │  (Primary Immediate Track)  │                     │  (Parallel UI Track)        │
         │  B1 ──► B2 ──► B3 ──► B4    │                     │  C1 ──► C2 ──► C3 ──► C4    │
         │  B5 ──► B6 ──► B7 ──► B8    │     PARALLEL        │  C5 ──► C6 ──► C7 ──► C8    │
         │  B9 ──► B10 ──► B11 ──► B12 │    CONCURRENT       │  C9 ──► C10 ──► C11 ──► C12 │
         │  B13 ──► B14 ──► B15 ──► B16│    EXECUTION        │  C13 ──► C14 ──► C15 ──► C16│
         │  B17 ──► B18 ──► B19 ──► B20│                     │  C17                        │
         └──────────────┬──────────────┘                     └──────────────┬──────────────┘
                        │ READY FOR INTEGRATION                             │ READY FOR INTEGRATION
                        └─────────────────────────┬─────────────────────────┘
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │ SECTION D: INTEGRATION TRACK  │
                                  │ (D1 - D10: E2E Pipeline Wire) │
                                  └───────────────┬───────────────┘
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │ SECTION E: FINAL VALIDATION   │
                                  │ (E1 - E10: Hardening & Demo)  │
                                  └───────────────────────────────┘
```

---

## 2. Contract-First Development & Interface Specifications

Both teams develop against strict contracts frozen in `TRD.md` and summarized below. Neither track may deviate without invoking the formal Contract Amendment Protocol.

### 2.1 REST Endpoints Contract
| Endpoint | Method | Request Payload | Success Response | Error Response | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/health` | `GET` | None | `200 OK` JSON (`status`, `redis`, `postgres`, `models`) | `503 Service Unavailable` | Subsystem liveness & readiness |
| `/v1/transaction/evaluate-authorization` | `POST` | `{"session_id": str, "account_id": str, "amount_inr": float, "beneficiary_vpa": str}` | `200 OK` `{"decision": "APPROVED", "risk_score": float, "threat_state": "GREEN"}` | `403 Forbidden` (`BLOCKED`), `428 Precondition Required` (`STEP_UP_REQUIRED`) | Pre-transaction authorization circuit breaker |
| `/v1/enroll` | `POST` | `{"speaker_id": str, "display_name": str, "audio_wav_base64": str}` | `201 Created` `{"speaker_id": str, "embedding_dim": 192, "enrolled_at": str}` | `400 Bad Request`, `422 Unprocessable` | Speaker voiceprint baseline enrollment |
| `/v1/session/{session_id}/status` | `GET` | Path param `session_id` | `200 OK` `{"session_id": str, "threat_state": str, "risk_score": float, "frames_processed": int}` | `404 Not Found` | Active session state poll |

### 2.2 WebSocket Streaming Contract
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

### 2.3 Contract Amendment Protocol
If an unforeseen engineering constraint mandates an interface change:
1. Update `TRD.md` with explicit version bump.
2. Record architectural justification and diff in `MEMORY.md`.
3. Notify the parallel track owner with exact payload modifications before code changes merge.

---

## 3. Section A: Shared Foundation (A0–A4)

*All Section A phases are mandatory dependencies that must be satisfied before either track diverges.*

### Phase A0: Repository Baseline & Ground-Truth Verification
* **Objective**: Establish the factual baseline of running code, containers, and environment variables.
* **Why It Matters**: Prevents building upon invalid assumptions regarding dependencies, models, or configurations.
* **Dependencies**: None.
* **Inputs**: Clean workspace clone.
* **Outputs**: Confirmed container startup, verified test pass baseline, audit of missing files (`models/`).
* **Files Likely to Change**: `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`.
* **Files Likely to be Created**: None.
* **Implementation Tasks**:
  1. `[VALIDATE]` Audit Docker Compose execution (`docker compose up --build`).
  2. `[VALIDATE]` Run existing backend pytest suite (`pytest backend/tests/`).
  3. `[VALIDATE]` Verify frontend package dependencies and compilation (`npm run build`).
  4. `[DOCUMENT]` Audit `models/` directory volume mount and confirm runtime fallbacks.
* **Security Tasks**: Audit plain-text credentials in compose files; establish local `.env` strategy.
* **Validation**: All containers boot healthy; test suite passes without unhandled exceptions.
* **Definition of Done (DoD)**: Baseline status recorded in `MEMORY.md`; repo verified operational.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.
* **What Must NOT Be Done**: Do not write application features or refactor logic.

### Phase A1: Architecture & Specification Lock
* **Objective**: Lock technical, security, AI, and product requirements across all documentation.
* **Why It Matters**: Eliminates architectural drift and conflicting assumptions between engineers.
* **Dependencies**: Phase A0.
* **Inputs**: Audit findings from Phase A0.
* **Outputs**: Approved `PRD.md`, `TRD.md`, `SECURITY.md`, `AI_ARCHITECTURE.md`, `PHASES.md`, `MEMORY.md`.
* **Files Likely to Change**: Documentation files only.
* **Implementation Tasks**: Author and harmonize all specification documents to reflect exact repository capabilities.
* **Validation**: All 6 architectural documents cross-referenced and free of contradictions.
* **Definition of Done (DoD)**: Documentation locked and approved as technical baselines.
* **Priority**: **P0** | **Effort**: MEDIUM | **Blockers**: None.
* **What Must NOT Be Done**: Do not edit application source code.

### Phase A2: API Contract & WebSocket Contract Lock
* **Objective**: Formally define and lock all REST schemas, WebSocket frame formats, and telemetry payloads.
* **Why It Matters**: Provides the immutable boundary allowing backend and frontend to build concurrently.
* **Dependencies**: Phase A1.
* **Inputs**: Section 2 of `PHASES.md` and `TRD.md` Section 5.
* **Outputs**: Pydantic models in backend, TypeScript interfaces in frontend.
* **Files Likely to Change**: `backend/main.py`, `frontend/store/useTelemetryStore.ts`.
* **Files Likely to be Created**: `frontend/lib/types/telemetry.ts`.
* **Implementation Tasks**:
  1. `[BUILD]` Create frozen TypeScript types matching all backend request/response/telemetry schemas.
  2. `[BUILD]` Align Pydantic schemas in `backend/main.py` with the frozen contract.
* **Validation**: Typecheck passes on both Python (`mypy`/Pydantic validation) and TypeScript (`tsc --noEmit`).
* **Definition of Done (DoD)**: Contract types published and imported in both frontend and backend trees.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.
* **What Must NOT Be Done**: Do not introduce ad-hoc fields without updating contracts.

### Phase A3: Shared Data Models & Threat State Schema
* **Objective**: Standardize threat levels (GREEN, AMBER, RED), hysteresis limits, and audit schema.
* **Why It Matters**: Ensures both sides interpret risk numbers identically without UI confusion.
* **Dependencies**: Phase A2.
* **Inputs**: `TRD.md` Section 9.
* **Outputs**: Threat State enum, score ranges ($[0, 100]$), hysteresis thresholds ($<35$, $<70$).
* **Files Likely to Change**: `backend/main.py`, `frontend/store/useTelemetryStore.ts`.
* **Implementation Tasks**:
  1. `[BUILD]` Define `ThreatLevel` enum (`GREEN`, `AMBER`, `RED`) in backend and frontend.
  2. `[BUILD]` Synchronize transaction evaluation decision schema (`APPROVED`, `BLOCKED`, `STEP_UP_REQUIRED`).
* **Validation**: Unit tests verifying state mapping on both sides.
* **Definition of Done (DoD)**: Threat state logic synchronized between backend and client store.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.
* **What Must NOT Be Done**: Do not alter threshold boundaries without documentation update.

### Phase A4: Development Environment & Configuration Contract
* **Objective**: Standardize environment variables, port bindings, and development mocks.
* **Why It Matters**: Ensures seamless local developer execution across Windows, Linux, and Docker.
* **Dependencies**: Phase A0.
* **Inputs**: `docker-compose.yml`, `.env.example`.
* **Outputs**: Functional `.env.example` with documented defaults (ports 8000, 3000, 6379, 5432).
* **Files Likely to Change**: `docker-compose.yml`, `.env.example`.
* **Implementation Tasks**: Create `.env.example` reflecting all verified backend and frontend environment keys.
* **Validation**: Clean startup on bare metal and Docker using environment defaults.
* **Definition of Done (DoD)**: Both developers can start their respective stacks with zero configuration friction.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.
* **What Must NOT Be Done**: Never commit production secrets or actual passwords to repo.

---

## 4. Section B: Backend / AI Track (B1–B20)

*Primary immediate development track. Transforms the backend from mock inference to real DSP, quantized ONNX models, and deterministic transaction interventions.*

### Phase B1: Backend Baseline & FastAPI Modularization
* **Objective**: Establish a clean backend structure, verifying settings, logging, and error handlers.
* **Why It Matters**: Eliminates monolithic fragility before streaming and neural components are integrated.
* **Dependencies**: Section A (A0–A4).
* **Inputs**: `backend/main.py`, `backend/requirements.txt`.
* **Outputs**: Clean ASGI app with configured CORS, structlog, and settings management.
* **Files Likely to Change**: `backend/main.py`.
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
* **Why It Matters**: All downstream AI detection fails if audio frames drop or transport crashes under load.
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
* **Why It Matters**: AI models require temporal context (1.5s) to accurately evaluate vocoder artifacts and pitch.
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
* **Why It Matters**: Prevents wasting expensive neural inference on background room noise and prevents score skew.
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
* **Why It Matters**: Provides spectral feature matrices required for ResNet anti-spoofing and UI waterfall rendering.
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
* **Why It Matters**: Biological human glottal mechanics cannot be perfectly faked by zero-shot neural vocoders.
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
* **Why It Matters**: Detects transposed convolution checkerboard artifacts and phase smearing characteristic of neural TTS.
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
* **Why It Matters**: Prevents identity impersonation even if a synthetic clone produces clean acoustic prosody.
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
* **Why It Matters**: Single indicators produce false positives; multi-signal fusion delivers robust decisions.
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
* **Why It Matters**: Prevents false alarms on energetic speech and ensures reliable threat escalation.
* **Dependencies**: Phase B9.
* **Inputs**: Raw fused scores from test audio.
* **Outputs**: Calibrated score with confidence intervals.
* **Files Likely to Change**: `backend/main.py`.
* **Implementation Tasks**:
  1. `[BUILD]` Implement sigmoid score calibration mapping raw distance metrics to probabilistic risk.
  2. `[BUILD]` Add signal quality penalty: elevate uncertainty if SNR $<12\text{ dB}$.
* **Validation Criteria**: Bonafide clean speech stays securely in $[5.0, 25.0]$ range.
* **Definition of Done (DoD)**: Score calibration verified across diverse audio clips.
* **Priority**: **P1** | **Effort**: LOW | **Blockers**: None.
* **What Must NOT Be Done**: Do not hardcode arbitrary static offsets without empirical justification.

### Phase B11: Temporal Smoothing & Threat State Machine
* **Objective**: Apply asymmetric EMA smoothing and enforce threat state transitions with hysteresis.
* **Why It Matters**: Prevents rapid flickering between GREEN and RED while reacting instantly ($<2\text{ s}$) to attacks.
* **Dependencies**: Phase B10.
* **Inputs**: Instantaneous risk scores $R_{\text{raw}}$.
* **Outputs**: Smoothed risk $R_{\text{EMA}}$ and `ThreatLevel` (`GREEN`, `AMBER`, `RED`).
* **Files Likely to Change**: `backend/main.py`.
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
* **Why It Matters**: Neural voice converters introduce $>2.5\text{ s}$ delay and fail on phonetic tongue-twisters.
* **Dependencies**: Phase B6, Phase B11.
* **Inputs**: AMBER threat state trigger; challenge response audio stream.
* **Outputs**: Challenge evaluation result (`PASS`, `FAIL`, `TIMEOUT`).
* **Files Likely to Change**: `backend/main.py`.
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
* **Why It Matters**: This is the core operational deliverable that stops financial theft in real time.
* **Dependencies**: Phase B11.
* **Inputs**: `POST /v1/transaction/evaluate-authorization` request payload.
* **Outputs**: Deterministic HTTP 200 (APPROVED) or HTTP 403 (BLOCKED) with audit persistence.
* **Files Likely to Change**: `backend/main.py`, `backend/database.sql`.
* **Files Likely to be Created**: `backend/tests/test_transaction_gate.py`.
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
* **Why It Matters**: Guarantees zero memory leaks and guarantees compliance with privacy regulations.
* **Dependencies**: Phase B2, Phase B3.
* **Inputs**: Redis 7.2 container.
* **Outputs**: Hardened async Redis client pool with connection recycling and error handling.
* **Files Likely to Change**: `backend/main.py`.
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
* **Why It Matters**: Provides permanent forensic auditability and high-speed speaker similarity search.
* **Dependencies**: Phase B1, Phase B8.
* **Inputs**: `backend/database.sql`, PostgreSQL 16 container.
* **Outputs**: Initialized schema with `sessions`, `enrolled_voiceprints`, and `transaction_evaluations` tables.
* **Files Likely to Change**: `backend/main.py`, `backend/database.sql`.
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
* **Why It Matters**: The security platform must not become an attack vector for bad actors.
* **Dependencies**: Phase B1, Phase B13.
* **Inputs**: Incoming HTTP/WS requests.
* **Outputs**: Authenticated requests with rate limiting and payload validation.
* **Files Likely to Change**: `backend/main.py`.
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
* **Why It Matters**: Required to prove SLA targets ($<80\text{ ms}$ Tier 1, $<35\text{ ms}$ Gate) to technical judges.
* **Dependencies**: Phase B1 through B13.
* **Inputs**: Execution checkpoints across audio ingestion, DSP, ONNX, and gating.
* **Outputs**: Structured log events with latency breakdowns emitted on every hop.
* **Files Likely to Change**: `backend/main.py`.
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
* **Why It Matters**: Proves compliance with DPDP Act 2023 and enterprise security baselines.
* **Dependencies**: Phase B14, Phase B15.
* **Inputs**: Running backend stack under active streaming.
* **Outputs**: Clean security audit report confirming zero disk artifacts.
* **Files Likely to Change**: `backend/main.py`, `docker-compose.yml`.
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
* **Why It Matters**: Validates that the backend sustains real-time performance without frame accumulation.
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
* **Why It Matters**: Guarantees backend readiness before integrating with the parallel frontend track.
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

## 5. Section C: Frontend Track (C1–C17)

*Parallel UI development track owned by frontend engineer. Builds the SecOps War Room dashboard, visualizers, and interactive banking gate using frozen contracts and mock data.*

### Phase C1: Frontend Foundation & Type System Setup
* **Objective**: Configure frontend environment, strict TypeScript compiler settings, and contract type definitions.
* **Why It Matters**: Establishes type safety across all components and prevents integration regressions.
* **Dependencies**: Section A (A0–A4).
* **Inputs**: `package.json`, `tsconfig.json`, `TRD.md` Section 5.
* **Outputs**: Verified build environment; imported telemetry and API contract types.
* **Files Likely to Change**: `frontend/package.json`.
* **Files Likely to be Created**: `frontend/lib/types/telemetry.ts`, `frontend/lib/types/contracts.ts`.
* **UI Deliverables**: None (foundation).
* **Data Contract**: TypeScript interfaces matching WebSocket telemetry and REST payloads.
* **Mock Data Requirements**: Initial mock telemetry objects for storybook/component testing.
* **Backend Dependency**: None (contract-driven).
* **Validation Criteria**: `npm run build` and `npm run lint` execute with zero errors.
* **Definition of Done (DoD)**: Contract types in place; clean Next.js build.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.

### Phase C2: Application Shell, Theme & Navigation
* **Objective**: Build the cybernetic dark-theme layout, header status indicators, and view switcher.
* **Why It Matters**: Gives judges an immediate premium first impression of a high-tech security operations console.
* **Dependencies**: Phase C1.
* **Inputs**: `frontend/app/layout.tsx`, `frontend/app/globals.css`.
* **Outputs**: Responsive application frame with top navigation bar (`LimelightNavbar.tsx`).
* **Components**: `frontend/components/navigation/LimelightNavbar.tsx`, `frontend/app/layout.tsx`.
* **UI Deliverables**: Top navbar with live time, system status pulse, and view navigation tabs.
* **Mock Data Requirements**: Static mock session ID and system health flag.
* **Backend Dependency**: None.
* **Validation Criteria**: Responsive shell renders cleanly at 1920x1080 and 1366x768 viewports.
* **Definition of Done (DoD)**: Application layout styled with cybernetic dark aesthetic.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.

### Phase C3: Voice Session Control & Mode Switcher
* **Objective**: Implement interactive session controls: Start/Stop Call, Mute, and Mode Toggle (Live Mic vs. Simulated Attack).
* **Why It Matters**: Enables the presenter to smoothly switch between normal conversation and attack scenarios.
* **Dependencies**: Phase C2.
* **Outputs**: Session control toolbar with active call timer and status badge.
* **Components**: `frontend/components/views/OverviewView.tsx`.
* **UI Deliverables**: Start/Stop button, Live Mic toggle, Simulated Attack radio group.
* **Mock Data Requirements**: Simulated session timer and toggle state hooks.
* **Backend Dependency**: None.
* **Validation Criteria**: Clicking Start initiates session state; Mode Toggle switches data stream cleanly.
* **Definition of Done (DoD)**: Session controls responsive and managing client-side session state.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.

### Phase C4: Live Audio Telemetry UI & Metric Cards
* **Objective**: Build real-time metric cards displaying VAD speech ratio, latency, frame rate, and analysis hop count.
* **Why It Matters**: Demonstrates continuous processing and transparency into signal health.
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
* **Why It Matters**: Visual centerpiece of the demo; visually proves that audio frequency characteristics are being analyzed.
* **Dependencies**: Phase C2.
* **Outputs**: Smooth horizontal waterfall scrolling from right to left as audio frames arrive.
* **Components**: `frontend/components/SpectrogramCanvas.tsx`.
* **UI Deliverables**: Responsive canvas component rendering 80 mel frequency bins.
* **Data Contract**: `pushSpectrogramColumn(column: number[])` in store.
* **Mock Data Requirements**: Simulated 80-bin frequency column generator in `useSimulator.ts`.
* **Backend Dependency**: None.
* **Validation Criteria**: Canvas renders at consistent 60 FPS without memory accumulation or browser lag.
* **Definition of Done (DoD)**: Spectrogram canvas scrolls smoothly and displays frequency variations.
* **Priority**: **P0** | **Effort**: MEDIUM | **Blockers**: None.

### Phase C6: Prosody & Biomechanical Telemetry Visualizer
* **Objective**: Render real-time time-series charts for Fundamental Frequency ($F_0$), Jitter, and Shimmer.
* **Why It Matters**: Visually demonstrates how human pitch varies naturally while synthetic clones flatten out.
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
* **Why It Matters**: Primary visual indicator that judges watch during live attack injection.
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
* **Why It Matters**: Eliminates ambiguity during demo; judges instantly know when system enters dangerous state.
* **Dependencies**: Phase C7.
* **Outputs**: Screen-edge glow and state banner switching between GREEN (Secured), AMBER (Caution), RED (Breach).
* **Components**: `frontend/components/ThreatStateBanner.tsx`.
* **UI Deliverables**: Header badge, alert banners, and screen perimeter glow reactive to threat level.
* **Data Contract**: `threat_level` string enum from store.
* **Mock Data Requirements**: State trigger events in `useSimulator.ts`.
* **Backend Dependency**: None.
* **Validation Criteria**: State transitions reflect hysteresis rules; RED state triggers high-visibility warning.
* **Definition of Done (DoD)**: Threat states visually dominate UI when risk escalates.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.

### Phase C9: PITCH Challenge-Response Interactive Drawer
* **Objective**: Build sliding challenge drawer displaying dynamic Hindi tongue-twisters and audio feedback meter.
* **Why It Matters**: Interactive showcase of active defense; presenter reads the phrase on stage.
* **Dependencies**: Phase C8.
* **Outputs**: Expandable drawer showing Hindi/English challenge phrases with countdown timer.
* **Components**: `frontend/components/PitchChallengeDrawer.tsx`.
* **UI Deliverables**: Animated drawer, bold Devanagari text display, vocal stability bar, Pass/Fail stamp.
* **Data Contract**: `challenge_active`, `challenge_phrase`, `challenge_status` in store.
* **Mock Data Requirements**: Mock challenge trigger event in simulator.
* **Backend Dependency**: None.
* **Validation Criteria**: Drawer slides open automatically when AMBER state triggers; displays phrase clearly.
* **Definition of Done (DoD)**: PITCH drawer fully interactive and styled for presentation readability.
* **Priority**: **P0** | **Effort**: MEDIUM | **Blockers**: None.

### Phase C10: Interactive Mock Banking Gate UI
* **Objective**: Build simulated mobile UPI wire transfer interface with interactive PIN pad and automatic circuit lock.
* **Why It Matters**: Closes the loop from AI detection to financial loss prevention; the ultimate demo punchline.
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
* **Why It Matters**: Provides explainability; answers the judges' question: *"Why did the AI flag this voice?"*
* **Dependencies**: Phase C4.
* **Outputs**: Chronological security event log with severity badges and expandable anomaly details.
* **Components**: `frontend/components/SecurityEventLog.tsx`.
* **UI Deliverables**: Scrolling event ledger with timestamps, risk tags, and acoustic anomaly descriptions.
* **Data Contract**: Array of `SecurityEvent` from store.
* **Mock Data Requirements**: Mock anomaly events in `useSimulator.ts`.
* **Backend Dependency**: None.
* **Validation Criteria**: New security anomalies append to log with smooth slide-down animation.
* **Definition of Done (DoD)**: Forensic evidence log operational with realistic explanations.
* **Priority**: **P1** | **Effort**: LOW | **Blockers**: None.

### Phase C12: Session History & Audit Visualization View
* **Objective**: Build secondary view tab showing previous session evaluation records and transaction outcomes.
* **Why It Matters**: Shows enterprise readiness and compliance audit trail capabilities.
* **Dependencies**: Phase C2.
* **Outputs**: Tabular audit ledger view with search, filter, and session detail modal.
* **Components**: `frontend/components/views/SessionHistoryView.tsx`.
* **UI Deliverables**: Data table with status pills, timestamps, risk scores, and transaction amounts.
* **Data Contract**: Schema matching `transaction_evaluations` database table.
* **Mock Data Requirements**: Array of 10 mock historical transactions.
* **Backend Dependency**: None.
* **Validation Criteria**: Switching to History view displays populated audit table.
* **Definition of Done (DoD)**: Historical audit view styled and functional.
* **Priority**: **P2** | **Effort**: LOW | **Blockers**: None.

### Phase C13: API Client Integration Layer
* **Objective**: Build typed API service client for `/health`, `/v1/transaction/evaluate-authorization`, and `/v1/enroll`.
* **Why It Matters**: Encapsulates network calls, timeout handling, and error transformation.
* **Dependencies**: Phase C1.
* **Outputs**: TypeScript API client module with typed request/response methods.
* **Files Likely to Create**: `frontend/lib/api/client.ts`.
* **Data Contract**: Locked REST contract from Section 2.
* **Mock Data Requirements**: Mock interceptor mode when backend is unreachable.
* **Backend Dependency**: None (can run against mock server).
* **Validation Criteria**: Unit tests verifying request payload serialization and error code parsing.
* **Definition of Done (DoD)**: API client ready to connect to real backend endpoints.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.

### Phase C14: WebSocket Client Integration & Audio Capture Hook
* **Objective**: Implement `useAudioStreamer.ts` (Web Audio mic capture at 16kHz PCM) and `useVaaniShieldWs.ts`.
* **Why It Matters**: Captures microphone audio in browser and streams binary PCM chunks to backend.
* **Dependencies**: Phase C1.
* **Outputs**: Fully functional audio capture and WebSocket streaming hook.
* **Components**: `frontend/hooks/useAudioStreamer.ts`, `frontend/hooks/useVaaniShieldWs.ts`.
* **Data Contract**: 1,024-sample `Int16Array` binary chunks; handles inbound `TELEMETRY_UPDATE` JSON.
* **Mock Data Requirements**: Loopback audio buffer for offline testing.
* **Backend Dependency**: None.
* **Validation Criteria**: Browser microphone captures 16kHz audio; chunks dispatches over WebSocket client.
* **Definition of Done (DoD)**: Audio streamer and WebSocket hook tested and handling reconnection.
* **Priority**: **P0** | **Effort**: MEDIUM | **Blockers**: Browser audio permissions.

### Phase C15: Error Boundaries, Offline Modes & Reconnection States
* **Objective**: Implement graceful error boundaries, WebSocket disconnect banners, and fallback toggles.
* **Why It Matters**: Prevents blank-screen crashes during demo if a network glitch occurs.
* **Dependencies**: Phase C2, Phase C14.
* **Outputs**: Toast alerts, reconnecting spinner, and automatic fallback to simulator mode.
* **Components**: `frontend/components/ConnectionBanner.tsx`.
* **UI Deliverables**: Non-intrusive warning bar: *"Backend disconnected — running in simulated demo mode"*.
* **Validation Criteria**: Killing backend triggers reconnecting banner without breaking UI rendering.
* **Definition of Done (DoD)**: Frontend resilient to backend disconnects and rendering exceptions.
* **Priority**: **P1** | **Effort**: LOW | **Blockers**: None.

### Phase C16: Responsive Styling, Accessibility & Cybernetic Polish
* **Objective**: Polish UI contrast, typography, glassmorphism borders, and mobile viewport adaptability.
* **Why It Matters**: Ensures the application looks gorgeous on high-resolution projector screens during evaluation.
* **Dependencies**: Phase C2 through C12.
* **Outputs**: Polished CSS tokens, subtle glowing accents, and crisp typography.
* **Files Likely to Change**: `frontend/app/globals.css`, component styles.
* **UI Deliverables**: Polished cybernetic theme with deep black backgrounds (`#0a0b0e`) and emerald/crimson accents.
* **Validation Criteria**: Visual audit across Chrome, Firefox, and Edge at multiple zoom levels.
* **Definition of Done (DoD)**: UI aesthetics polished to hackathon-winning presentation standards.
* **Priority**: **P1** | **Effort**: LOW | **Blockers**: None.

### Phase C17: Frontend Demo Readiness & Standalone Rehearsal
* **Objective**: Verify that the complete frontend functions flawlessly in standalone mode with simulated data.
* **Why It Matters**: Guarantees a bulletproof presentation fallback even if local Docker networking fails.
* **Dependencies**: Phase C1 through C16.
* **Outputs**: 100% functional standalone frontend running on `localhost:3000`.
* **Validation Criteria**: Presenter can execute the entire 5-minute demo script using simulated attack triggers.
* **Definition of Done (DoD)**: Standalone frontend certified demo-ready and locked for Section D integration.
* **Priority**: **P0** | **Effort**: LOW | **Blockers**: None.

---

## 6. Section D: Integration Track (D1–D10)

*Dedicated convergence track executed once both Backend and Frontend tracks achieve readiness. Connects live audio streaming, real neural inference, and real transaction circuit breaking.*

### Phase D1: Backend API ↔ Frontend API Client Integration
* **Backend Dependency**: Phase B1, B13 (`GET /health`, `POST /v1/transaction/evaluate-authorization`).
* **Frontend Dependency**: Phase C13 (`lib/api/client.ts`).
* **Integration Contract**: REST JSON endpoints defined in Section 2.1.
* **Expected Behavior**: Frontend queries real backend API; backend responds with valid HTTP status and JSON payloads.
* **Validation Criteria**: Frontend health pill turns green; transaction gate requests receive real backend responses.
* **Failure Scenarios**: Backend down (frontend shows offline banner); CORS rejected (verify origin header).
* **Definition of Done (DoD)**: REST communication verified end-to-end between Next.js client and FastAPI server.
* **Priority**: **P0** | **Effort**: LOW.

### Phase D2: Backend WebSocket ↔ Frontend Telemetry Store Integration
* **Backend Dependency**: Phase B2, B11 (WebSocket `/v1/stream/call/{session_id}`).
* **Frontend Dependency**: Phase C14 (`useVaaniShieldWs.ts`), Phase C1 (`useTelemetryStore.ts`).
* **Integration Contract**: Full-duplex WebSocket streaming contract from Section 2.2.
* **Expected Behavior**: Backend emits `TELEMETRY_UPDATE` events; frontend store ingests and updates state.
* **Validation Criteria**: Telemetry metric cards (Phase C4) reflect real backend packet indices and timestamps.
* **Failure Scenarios**: Frame format mismatch (verify 16-bit PCM endianness); socket disconnect (verify auto-reconnect).
* **Definition of Done (DoD)**: Live telemetry streaming smoothly from backend to frontend store at 1.3 Hz.
* **Priority**: **P0** | **Effort**: MEDIUM.

### Phase D3: Real Audio Stream Ingestion & Preprocessing Integration
* **Backend Dependency**: Phase B2, B3 (Sliding ring buffer, 24-frame accumulator).
* **Frontend Dependency**: Phase C14 (`useAudioStreamer.ts` Web Audio microphone capture).
* **Integration Contract**: Binary PCM 1,024-sample chunks ($2,048\text{ bytes}$).
* **Expected Behavior**: Presenter speaks into browser microphone; backend receives and buffers real PCM chunks.
* **Validation Criteria**: Backend logs confirm receipt of consecutive audio chunks; Redis buffer length reaches 24.
* **Failure Scenarios**: Browser mic permissions denied (show prompt); audio clipping (verify float normalization).
* **Definition of Done (DoD)**: Real human speech streamed from browser microphone and buffered in backend.
* **Priority**: **P0** | **Effort**: MEDIUM.

### Phase D4: Real AI Risk Score & Visualizer Synchronization
* **Backend Dependency**: Phase B5, B6, B7, B11 (Real mel spectrogram, Parselmouth prosody, ResNet-18).
* **Frontend Dependency**: Phase C5 (Spectrogram Canvas), Phase C6 (Prosody Chart), Phase C7 (ThreatDial).
* **Integration Contract**: Real 80-bin mel slice and prosody values in `TELEMETRY_UPDATE` payload.
* **Expected Behavior**: Speaking into microphone drives real frequency waterfall and real pitch curve on charts.
* **Validation Criteria**: ThreatDial sits at low baseline ($10–25$) during natural speech; waterfall shows speech formants.
* **Failure Scenarios**: Canvas frozen (verify array length == 80); prosody missing (verify Parselmouth C-lib loaded).
* **Definition of Done (DoD)**: Visualizers driven by real live audio feature extraction in real time.
* **Priority**: **P0** | **Effort**: MEDIUM.

### Phase D5: Live Voice Clone Attack & Threat Escalation Integration
* **Backend Dependency**: Phase B7, B11 (ResNet-18 anti-spoofing, Asymmetric EMA).
* **Frontend Dependency**: Phase C8 (Threat State Banner), Phase C3 (Attack Mode Toggle).
* **Integration Contract**: Synthetic clone audio injected via client or virtual audio cable.
* **Expected Behavior**: Injected clone causes acoustic risk to surge; Asymmetric EMA drives ThreatDial past 75 (RED).
* **Validation Criteria**: Threat state transitions from GREEN to RED within 2 analysis hops ($<2.0\text{ s}$).
* **Failure Scenarios**: Attack fails to escalate (verify ResNet model loaded, check mel scaling).
* **Definition of Done (DoD)**: Synthetic audio attack reliably triggers RED threat state in live integration.
* **Priority**: **P0** | **Effort**: MEDIUM.

### Phase D6: PITCH Challenge-Response Closed-Loop Integration
* **Backend Dependency**: Phase B12 (PITCH challenge evaluator).
* **Frontend Dependency**: Phase C9 (`PitchChallengeDrawer.tsx`).
* **Integration Contract**: Challenge trigger event emitted by backend on AMBER; response audio evaluated.
* **Expected Behavior**: AMBER state slides open PITCH drawer with Hindi phrase; reading phrase passes challenge.
* **Validation Criteria**: Successful challenge completion drops risk back to GREEN; delayed/flat speech triggers RED.
* **Failure Scenarios**: Challenge timeout (escalate to RED); phrase display rendering bug (verify Unicode UTF-8).
* **Definition of Done (DoD)**: PITCH challenge-response loop functioning end-to-end between client and server.
* **Priority**: **P1** | **Effort**: MEDIUM.

### Phase D7: Pre-Transaction Security Gate & Banking UI Integration
* **Backend Dependency**: Phase B13 (`POST /v1/transaction/evaluate-authorization`).
* **Frontend Dependency**: Phase C10 (`MockBankingGate.tsx`).
* **Integration Contract**: JSON transaction payload and HTTP 200/403/428 response contract.
* **Expected Behavior**: Initiating UPI transfer queries backend gate:
  * Under GREEN voice state: Returns HTTP 200 $\rightarrow$ Mock banking gate unlocks and completes transfer.
  * Under RED voice state: Returns HTTP 403 $\rightarrow$ Mock banking gate immediately freezes and locks account.
* **Validation Criteria**: Presenter enters PIN during RED state; UI displays instant "TRANSACTION FROZEN" lock modal.
* **Failure Scenarios**: Gate returns 500 (fail-secure: default to BLOCKED); race condition (session lookup $<25\text{ ms}$).
* **Definition of Done (DoD)**: Pre-transaction circuit breaker deterministically blocks fraudulent payments in UI.
* **Priority**: **P0** | **Effort**: MEDIUM.

### Phase D8: Audit Ledger & Forensic Evidence Integration
* **Backend Dependency**: Phase B15, B17 (PostgreSQL `transaction_evaluations` records).
* **Frontend Dependency**: Phase C11 (Security Event Log), Phase C12 (Session History View).
* **Integration Contract**: Database evaluation query and real-time security events.
* **Expected Behavior**: Every blocked transaction immediately appends a forensic record to the audit log.
* **Validation Criteria**: Blocked wire transfer appears in database table and renders in frontend security ledger.
* **Failure Scenarios**: Database write failure (log error, do not fail transaction authorization).
* **Definition of Done (DoD)**: Forensic decision trail visible in UI and persisted in database.
* **Priority**: **P1** | **Effort**: LOW.

### Phase D9: End-to-End Rehearsal of the 5-Minute Demo Flow
* **Backend Dependency**: Complete integrated backend.
* **Frontend Dependency**: Complete integrated frontend.
* **Integration Contract**: Full platform operating under Docker Compose orchestration.
* **Expected Behavior**: Full execution of the 10-step demo script (Section 12.1) without restarts or glitches.
* **Validation Criteria**: 3 consecutive flawless runs from initial startup to transaction circuit breaking.
* **Failure Scenarios**: Browser permissions lost; port conflict; Docker out-of-memory.
* **Definition of Done (DoD)**: Complete live demo flow validated and repeatable.
* **Priority**: **P0** | **Effort**: MEDIUM.

### Phase D10: Integration Bug Fixing & Hardening
* **Backend Dependency**: Bug triage across all backend components.
* **Frontend Dependency**: Bug triage across all frontend components.
* **Integration Contract**: All system contracts.
* **Expected Behavior**: Rapid resolution of edge cases, race conditions, UI visual misalignments, or log noise.
* **Validation Criteria**: Zero unhandled exceptions in browser console; zero 500 errors in backend logs.
* **Definition of Done (DoD)**: All integration bugs resolved; platform stable and polished.
* **Priority**: **P0** | **Effort**: MEDIUM.

---

## 7. Section E: Final Validation & Demo Track (E1–E10)

*Final stabilization, security validation, and release lock before live presentation.*

### Phase E1: Security Validation & Vulnerability Audit
* **Scope**: Verify CORS restrictions, API key enforcement, SQL parameterization, and non-root container execution.
* **Validation**: Run `docker compose exec api pip audit`; verify no unauthorized endpoints exist.
* **Definition of Done**: Zero high-severity vulnerabilities; security checklist satisfied.
* **Priority**: **P0** | **Effort**: LOW.

### Phase E2: Privacy & DPDP Compliance Audit
* **Scope**: Verify host filesystem and database contain zero raw audio (`.wav`, `.pcm`, base64 strings).
* **Validation**: Execute `find / -name "*.wav"` inside containers; inspect database tables for audio blobs.
* **Definition of Done**: Mathematical proof that system stores only derived 192-dim vectors and scalar telemetry.
* **Priority**: **P0** | **Effort**: LOW.

### Phase E3: AI/ML Inference Credibility Validation
* **Scope**: Confirm ONNX Runtime is executing real model weights (`silero_vad.onnx`, `resnet18_acoustic_quantized.onnx`).
* **Validation**: Inspect backend startup logs; confirm `ONNX models loaded successfully (mock inference DISABLED)`.
* **Definition of Done**: Zero random number math in active inference pathways.
* **Priority**: **P0** | **Effort**: LOW.

### Phase E4: Telephony Audio Robustness Check
* **Scope**: Test detector against bandpass-filtered audio ($300–3,400\text{ Hz}$) emulating AMR-NB phone lines.
* **Validation**: Confirm biomechanical prosody ($F_0$, jitter) and PITCH challenges maintain discrimination on 8kHz audio.
* **Definition of Done**: Telephony resilience documented in presentation materials.
* **Priority**: **P1** | **Effort**: LOW.

### Phase E5: API Contract & Schema Conformance Check
* **Scope**: Validate all incoming and outgoing payloads against frozen Pydantic and TypeScript interfaces.
* **Validation**: Run automated schema validation tests across all REST and WebSocket routes.
* **Definition of Done**: 100% schema conformance; zero missing or unexpected fields.
* **Priority**: **P0** | **Effort**: LOW.

### Phase E6: End-to-End System Integration Test Run
* **Scope**: Execute full automated end-to-end integration test suite (`pytest backend/tests/`).
* **Validation**: All tests pass including streaming ingestion, VAD gating, and transaction blocking.
* **Definition of Done**: Complete test suite passes with green exit code.
* **Priority**: **P0** | **Effort**: LOW.

### Phase E7: Empirical Latency & Performance Benchmarking
* **Scope**: Measure and record actual p50/p95/p99 latencies for Tier 1 inference and transaction evaluation.
* **Validation**: Run benchmark script; verify Tier 1 latency $<80\text{ ms}$ and Gate latency $<35\text{ ms}$.
* **Definition of Done**: Empirical performance numbers documented in `README.md` and presentation slides.
* **Priority**: **P1** | **Effort**: LOW.

### Phase E8: Full 5-Minute Live Demo Rehearsal
* **Scope**: Presenter conducts 5 back-to-back timed rehearsals of the 5-minute live demo script.
* **Validation**: 100% success rate without manual container restarts or browser refreshes.
* **Definition of Done**: Presenter confident; timing locked to 4.5 minutes (30s buffer).
* **Priority**: **P0** | **Effort**: MEDIUM.

### Phase E9: Documentation Lock & README Finalization
* **Scope**: Update `README.md` and `MEMORY.md` with verified setup instructions, architecture diagrams, and test results.
* **Validation**: Fresh clone verified using documented setup commands.
* **Definition of Done**: All documentation synchronized and locked.
* **Priority**: **P0** | **Effort**: LOW.

### Phase E10: Final Demo Release Candidate Tag
* **Scope**: Tag git release `v1.0.0-demo-freeze`; lock codebase against any further modifications.
* **Validation**: Working tree clean; git tag verified locally.
* **Definition of Done**: Codebase frozen; demo laptop configured and offline-capable.
* **Priority**: **P0** | **Effort**: LOW.

---

## 8. Parallelization Matrix & Execution Graph

The following matrix governs team concurrency. Any phase marked **Parallel: YES** can proceed simultaneously with its counterpart in the other track.

| Phase | Track | Description | Backend Dep | Frontend Dep | Parallel? | Blocking Predecessor |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **A0–A4** | SHARED | Baseline, Specs, Contracts, Config | None | None | **NO** | Must complete first |
| **B1** | BACKEND | FastAPI Baseline & Structlog | A4 | None | **YES** | A4 |
| **C1** | FRONTEND| Types & Next.js Foundation | None | A2 | **YES** | A2 |
| **B2** | BACKEND | Audio Ingestion & WebSocket | B1 | None | **YES** | B1 |
| **C2** | FRONTEND| App Shell & Cybernetic Theme | None | C1 | **YES** | C1 |
| **B3** | BACKEND | Redis Ring Buffer (24-frame) | B2 | None | **YES** | B2 |
| **C3** | FRONTEND| Session Controls & Mode Toggle | None | C2 | **YES** | C2 |
| **B4** | BACKEND | Silero VAD Silence Stripping | B3 | None | **YES** | B3 |
| **C4** | FRONTEND| Telemetry Metric Cards | None | C2 | **YES** | C2 |
| **B5** | BACKEND | 80-bin Log-Mel Spectrogram | B4 | None | **YES** | B4 |
| **C5** | FRONTEND| 60 FPS Spectrogram Canvas | None | C2 | **YES** | C2 |
| **B6** | BACKEND | Praat Parselmouth Prosody | B4 | None | **YES** | B4 |
| **C6** | FRONTEND| Prosody Time-Series Chart | None | C2 | **YES** | C2 |
| **B7** | BACKEND | ResNet-18 Quantized ONNX | B5 | None | **YES** | B5 |
| **C7** | FRONTEND| ThreatDial Animated Gauge | None | C2 | **YES** | C2 |
| **B8** | BACKEND | ECAPA-TDNN & pgvector | B4, B15 | None | **YES** | B4, B15 |
| **C8** | FRONTEND| GREEN / AMBER / RED States | None | C7 | **YES** | C7 |
| **B9** | BACKEND | Multi-Signal Feature Fusion | B5, B6, B7 | None | **YES** | B7 |
| **C9** | FRONTEND| PITCH Challenge Drawer UI | None | C8 | **YES** | C8 |
| **B10**| BACKEND | Risk Scoring Engine | B9 | None | **YES** | B9 |
| **C10**| FRONTEND| Mock Banking Gate UPI UI | None | C8 | **YES** | C8 |
| **B11**| BACKEND | Asymmetric EMA & State Machine| B10 | None | **YES** | B10 |
| **C11**| FRONTEND| Security Alerts & Evidence Log | None | C4 | **YES** | C4 |
| **B12**| BACKEND | PITCH Challenge Logic | B6, B11 | None | **YES** | B11 |
| **C12**| FRONTEND| Session Audit History View | None | C2 | **YES** | C2 |
| **B13**| BACKEND | Pre-Transaction Security Gate | B11 | None | **YES** | B11 |
| **C13**| FRONTEND| Typed API Client Module | None | C1 | **YES** | C1 |
| **B14**| BACKEND | Redis 15s TTL Hardening | B3 | None | **YES** | B3 |
| **C14**| FRONTEND| WebSocket & Audio Capture Hook | None | C1 | **YES** | C1 |
| **B15**| BACKEND | PostgreSQL + pgvector Setup | B1 | None | **YES** | B1 |
| **C15**| FRONTEND| Error Boundaries & Reconnect | None | C14 | **YES** | C14 |
| **B16**| BACKEND | API Hardening & Rate Limiting | B1, B13 | None | **YES** | B13 |
| **C16**| FRONTEND| Responsive & Theme Polish | None | C2–C12 | **YES** | C2–C12 |
| **B17**| BACKEND | Latency Instrumentation | B1–B13 | None | **YES** | B13 |
| **C17**| FRONTEND| Standalone Demo Readiness | None | C1–C16 | **YES** | C1–C16 |
| **B18**| BACKEND | Zero-Storage Security Audit | B14, B15 | None | **YES** | B15 |
| **B19**| BACKEND | Performance Benchmarking | B17 | None | **YES** | B17 |
| **B20**| BACKEND | Backend Standalone Readiness | B1–B19 | None | **YES** | B1–B19 |
| **D1–D10**| INTEGRATION| End-to-End System Convergence | B20 | C17 | **NO** | Both B20 & C17 |
| **E1–E10**| FINAL | Hardening, Rehearsal, Freeze | D10 | D10 | **NO** | D10 |

---

## 9. MVP Cut Line & Priority Governance

### 9.1 The 11 Mandatory MVP Capabilities (P0 Cut Line)
To guarantee delivery within the deadline, the team enforces a strict MVP scope cut line. The live demo is judged complete if and only if these 11 items succeed end-to-end:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     MANDATORY MVP CUT LINE (P0)                                  │
├─────┬───────────────────────────────┬────────────────────────────────────────────────────────────┤
│ #   │ Capability                    │ Concrete Deliverable in Repo                               │
├─────┼───────────────────────────────┼────────────────────────────────────────────────────────────┤
│ 1   │ Voice Session Creation        │ Client initiates call session via WebSocket handshake      │
│ 2   │ Audio Ingestion               │ Web Audio API captures 16kHz 16-bit PCM in 64ms chunks     │
│ 3   │ Audio Buffering               │ Redis / In-memory 24-frame sliding buffer (1.5s context)   │
│ 4   │ Voice Activity Detection      │ Silero VAD discards unvoiced windows (<15% speech)         │
│ 5   │ Genuine AI/DSP Authenticity   │ ResNet-18 ONNX mel analysis + Praat Parselmouth prosody    │
│ 6   │ Continuous Risk Scoring       │ Multi-signal weighted fusion producing score [0, 100]      │
│ 7   │ Temporal Threat State         │ Asymmetric EMA with hysteresis (GREEN / AMBER / RED)       │
│ 8   │ PITCH Challenge-Response      │ Dynamic Hindi tongue-twister prompt displayed in UI        │
│ 9   │ Transaction Security Gate     │ Synchronous REST gate blocking high-value transfer on RED  │
│ 10  │ SecOps War Room Visualization │ Next.js dashboard (ThreatDial, Canvas waterfall, UPI gate) │
│ 11  │ End-to-End System Integration │ Live attack triggers visible RED state and payment freeze  │
└─────┴───────────────────────────────┴────────────────────────────────────────────────────────────┘
```

### 9.2 Priority Classification Taxonomy
* **P0 (Mandatory for Demo)**: The 11 MVP items above. Failure of any P0 item constitutes demo failure.
* **P1 (Important Credibility)**: ECAPA-TDNN speaker verification, telephony AMR simulation, structured latency logs, PITCH response latency measurement.
* **P2 (Optional Polish)**: Historical session audit view tab, advanced theme customization, secondary export tools.
* **P3 (Deferred Future Work)**: Carrier-grade SIPREC media-forking, multi-tenant enterprise RBAC, distributed Kafka bus, heavy foundation models (Wav2Vec2/XLS-R), native mobile OS wrappers.

---

## 10. Anti-Over-Engineering Charter

The engineering team strictly prohibits the following architectural distractions:
1. **NO Microservices Sprawl**: Run a clean, unified FastAPI service. Do not decompose into separate VAD services, prosody services, or auth microservices.
2. **NO Cloud Message Queues**: Do not introduce Kafka, RabbitMQ, or AWS SQS. Redis 7.2 list operations provide all necessary buffering.
3. **NO Premature Kubernetes / Helm**: Docker Compose orchestrates the four containers (`api`, `redis`, `postgres`, `frontend`) perfectly.
4. **NO Heavy Foundation Models**: Strictly ban 1GB+ HuggingFace checkpoints (Wav2Vec2, HuBERT, Whisper). Use quantized ONNX models ($<50\text{ MB}$) that execute in $<30\text{ ms}$ on edge CPUs.
5. **NO Unnecessary Database Engines**: PostgreSQL 16 with `pgvector` handles both relational audit logs and vector embeddings. Do not introduce Milvus, Pinecone, or Chroma.
6. **NO Real Payment Gateway Integrations**: Do not integrate Razorpay or Stripe live test keys. The interactive `MockBankingGate` PIN pad tells the security story cleanly and reliably.
7. **NO Complex Client Frameworks**: Use standard React 19 + Zustand + Canvas. Do not introduce complex WebRTC mesh topologies or WASM DSP pipelines.

---

## 11. Git Safety Protocol & Memory Governance

### 11.1 Absolute Git Safety Rules
* **NEVER AUTOMATICALLY PUSH TO GITHUB**:
  The AI assistant and automated scripts are strictly prohibited from executing `git push`, force-pushing, merging to `main`, or triggering remote releases.
* **LOCAL MODIFICATIONS ONLY**:
  All code changes must remain local to the development machine until explicit human authorization is granted.
* **HUMAN COMMIT REVIEW**:
  Every commit must be explicitly requested and reviewed by the human engineering lead.

### 11.2 Standardized `MEMORY.md` Protocol
At the conclusion of **every completed phase**, the responsible engineer/agent must update [`MEMORY.md`](file:///d:/Voice-Cloning-Prototype/MEMORY.md). The ledger maintains separate statuses for each track to avoid overwriting concurrent progress:

```markdown
### [YYYY-MM-DD HH:MM] Phase [ID] Completion: [Phase Name]
- **Track**: SHARED | BACKEND | FRONTEND | INTEGRATION | FINAL
- **Status**: COMPLETE | IN PROGRESS | BLOCKED
- **Owner**: Backend Lead / Frontend Lead / AI Agent
- **What Changed**: Concise summary of delivered capabilities.
- **Files Created**:
  - `path/to/created_file`
- **Files Modified**:
  - `path/to/modified_file`
- **Architecture / Contract Changes**: None (or explicit diff).
- **Dependencies Added**: Package names and pinned versions.
- **Validation Performed**: Command executed and concrete test results.
- **Known Issues / Tech Debt**: Non-blocking observations.
- **Blockers**: Any blocking dependency for next phase.
- **Next Phase**: Recommended next milestone.
```

### 11.3 Phase Completion Report Format
When reporting phase completion to the team, output only this concise 9-line summary:
```
PHASE:         [Phase ID, e.g., B7]
TRACK:         [BACKEND / FRONTEND / INTEGRATION / FINAL]
STATUS:        [COMPLETE / PARTIAL / BLOCKED]
WHAT CHANGED:  [1-2 sentence technical summary]
FILES:         [List of created/modified files]
VALIDATION:    [Test command and numerical result]
KNOWN ISSUES:  [None or brief issue summary]
MEMORY.md:     [UPDATED - Section recorded]
NEXT PHASE:    [Next Phase ID]
```

---

## 12. Checklists & Demo Runbook

### 12.1 The 5-Minute Live Demo Choreography
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

### 12.2 Demo-Day Pre-Flight Checklist
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

### 12.3 Final Freeze Checklist
- [ ] All code changes reviewed and merged into working branch.
- [ ] No uncommitted or untracked temporary files in repository.
- [ ] Quantized model files verified in `models/` directory.
- [ ] Automated test suite executes cleanly (`pytest backend/tests/`).
- [ ] Client builds cleanly without TypeScript or ESLint errors (`npm run build`).
- [ ] `README.md` updated with accurate clone, build, and run instructions.
- [ ] `MEMORY.md` updated with final completion ledger entry.
- [ ] Git release tagged: `v1.0.0-demo-freeze`.

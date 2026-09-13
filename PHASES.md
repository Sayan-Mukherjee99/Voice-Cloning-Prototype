# VaaniShield: Technical Roadmap & Engineering Phase Plan

| Document Attribute | Specification Detail |
| :--- | :--- |
| **Document Version** | 1.0.0-ROADMAP-SPEC |
| **Status** | Approved Engineering Execution Plan |
| **Project** | VaaniShield (वाणिShield) — Real-Time Voice Integrity & Anti-Spoofing Platform |
| **Repository Reference** | `Sayan-Mukherjee99/Voice-Cloning-Prototype` |
| **Associated Documents** | `PRD.md`, `TRD.md`, `SECURITY.md`, `AI_ARCHITECTURE.md`, `MEMORY.md` |
| **Author** | Technical Program Manager & Engineering Lead |

---

## 1. Executive Summary & Roadmap Strategy

### 1.1 Objective & Optimization Constraints
The objective of this engineering roadmap is to transition the current prototype from a reference implementation with mock inference and standalone UI components into a **credible, fully integrated, demo-grade AI voice impersonation detection platform** within strict hackathon time constraints.

To eliminate wasted effort, the roadmap optimizes for:
1. **Maximum Demo Value**: Prioritizing visible, interactive capabilities (live microphone streaming, dynamic spectrogram waterfall, reactive threat dial, real-time audio injection attacks, and immediate transaction blocking).
2. **Minimum Unnecessary Engineering**: Strictly rejecting non-essential abstractions, premature Kubernetes clustering, complex microservices, heavy foundation models (e.g., Wav2Vec2/XLS-R), and speculative carrier telecom integrations.
3. **Strong Technical Credibility**: Replacing mock random-number generators with real quantized ONNX models (Silero VAD, ResNet-18, ECAPA-TDNN) and authentic Praat Parselmouth biomechanical prosody extraction.
4. **Low Rework & High Stability**: Establishing clear contract boundaries between streaming ingestion, DSP feature extraction, risk fusion, and downstream transaction gating.

### 1.2 Task Categorization & Priority Taxonomy
Every technical task across all phases is tagged with:
* **Work Type**: `[BUILD]`, `[REFACTOR]`, `[INTEGRATE]`, `[VALIDATE]`, or `[DOCUMENT]`.
* **Priority Tier**:
  * **P0 (Mandatory for Demo)**: Core MVP cut line; without this, the demo fails.
  * **P1 (Important)**: Elevates technical credibility and robustness.
  * **P2 (Optional)**: Polish or defensive hardening if time permits.
  * **P3 (Future)**: Enterprise / Carrier-grade work deferred post-hackathon.

### 1.3 Git Safety & Operational Governance
* **Feature Branch Isolation**: All work must occur on isolated topic branches (`feature/<phase-name>`).
* **Local Inspection & Verification**: Changes must be validated locally via Docker Compose and test scripts prior to merging.
* **No Unsolicited Commits / Pushes**: The AI assistant and engineering contributors must never execute `git push` or merge to `main` without explicit human authorization.
* **Persistent State Tracking (`MEMORY.md`)**: At the conclusion of every phase, the ledger in `MEMORY.md` must be updated to maintain an audit trail of completed tasks, architectural decisions, and remaining work.

---

## 2. End-to-End Live Demo Sequence

The entire engineering roadmap is reverse-engineered from this 10-step, 5-minute live evaluation choreography:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               5-MINUTE LIVE DEMO CHOREOGRAPHY                                    │
├───────┬───────────────────────────┬──────────────────────────────────────────────────────────────┤
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

---

## 3. Detailed Phase Roadmap (Phases 0 through 10)

```
Phase 0: Repository Audit & Baseline Verification
   │
Phase 1: Architecture & Specification Lock (PRD, TRD, SECURITY, AI_ARCH)
   │
Phase 2: Core Audio Streaming & Ingestion Stability
   │
Phase 3: Signal Processing & Biomechanical Feature Extraction
   │
Phase 4: AI Anti-Spoofing & Model Packaging (ONNX Quantization)
   │
Phase 5: Speaker Verification & PITCH Challenge Integration
   │
Phase 6: Multi-Signal Risk Engine & Threat State Machine
   │
Phase 7: Pre-Transaction Security Gate & Policy Interventions
   │
Phase 8: Frontend War Room Dashboard & Interactive Demo Integration
   │
Phase 9: Security Hardening, DPDP Compliance & Telephony Testing
   │
Phase 10: Evaluation, End-to-End Demo Rehearsal & Final Freeze
```

---

### Phase 0 — Repository Audit & Baseline Verification
* **Goal**: Establish the ground truth of what runs, what fails, and what dependencies exist in the repository.
* **Why It Exists**: Prevents building on false assumptions or broken container environments.
* **Inputs**: Clone of `Sayan-Mukherjee99/Voice-Cloning-Prototype`.
* **Outputs**: Verified running Docker stack; test pass baseline; list of broken/missing components.
* **Files Expected to Change**: None (audit phase only).
* **Files Expected to be Created**: None.
* **Technical Tasks**:
  1. `[VALIDATE]` Audit Docker Compose startup (`docker compose up --build`). **(P0)**
  2. `[VALIDATE]` Run existing backend pytest suite (`pytest backend/tests/`). **(P0)**
  3. `[VALIDATE]` Audit frontend dependencies and linting (`npm run lint` in `frontend/`). **(P0)**
  4. `[DOCUMENT]` Audit `models/` directory volume mount and confirm missing files. **(P0)**
* **AI Tasks**: None.
* **Frontend Tasks**: Verify client builds cleanly via Next.js compiler.
* **Backend Tasks**: Verify FastAPI `/health` endpoint responds with current mock status.
* **Database Tasks**: Verify PostgreSQL 16 container initializes with `pgvector` extension.
* **Security Tasks**: Confirm plaintext database passwords in `docker-compose.yml`.
* **Validation Criteria**: `docker compose ps` shows `api`, `redis`, `postgres`, `frontend` running.
* **Definition of Done (DoD)**: Development environment verified; baseline test run recorded.
* **Dependencies**: None.
* **What Must NOT Be Done**: Do not write new features or refactor code yet.
* **Risk of Skipping**: Building on broken containers resulting in hours of debugging later.
* **Effort**: LOW | **Demo Value**: LOW

---

### Phase 1 — Architecture & Specification Lock
* **Goal**: Lock down all product, technical, security, and AI requirements before modifying code.
* **Why It Exists**: Eliminates architectural ambiguity, scope creep, and conflicting developer assumptions.
* **Inputs**: Audit findings from Phase 0.
* **Outputs**: Approved `PRD.md`, `TRD.md`, `SECURITY.md`, `AI_ARCHITECTURE.md`, `PHASES.md`, `MEMORY.md`.
* **Files Expected to Change**: None.
* **Files Expected to be Created**:
  * `PRD.md` (Product Requirements Document)
  * `TRD.md` (Technical Requirements Document)
  * `SECURITY.md` (Security Architecture & Threat Model)
  * `AI_ARCHITECTURE.md` (AI & Signal Processing Specification)
  * `PHASES.md` (Engineering Roadmap & Phase Plan)
  * `MEMORY.md` (Persistent Project State Ledger)
* **Technical Tasks**:
  1. `[DOCUMENT]` Author PRD defining 20 capabilities, 7 personas, and threat model. **(P0)**
  2. `[DOCUMENT]` Author TRD specifying streaming pipeline, latencies, schemas, and TDR. **(P0)**
  3. `[DOCUMENT]` Author SECURITY specifying 8 attack trees, DPDP controls, and fail-safe matrix. **(P0)**
  4. `[DOCUMENT]` Author AI_ARCHITECTURE defining 12-stage pipeline, VAD, prosody, ResNet, ECAPA. **(P0)**
  5. `[DOCUMENT]` Author PHASES establishing engineering milestones and MVP cut line. **(P0)**
  6. `[DOCUMENT]` Initialize MEMORY.md ledger. **(P0)**
* **Validation Criteria**: All markdown specifications reviewed, internally consistent, and free of contradictions.
* **Definition of Done (DoD)**: All 6 architectural specification documents created and locked.
* **Dependencies**: Phase 0.
* **What Must NOT Be Done**: Do not touch backend/frontend source code.
* **Risk of Skipping**: Architectural drift and rework during coding.
* **Effort**: MEDIUM | **Demo Value**: MEDIUM (Provides technical credibility to judges)

---

### Phase 2 — Core Audio Streaming & Ingestion Stability
* **Goal**: Ensure reliable, bidirectional streaming of 16kHz 16-bit Linear PCM audio between client, FastAPI, and Redis.
* **Why It Exists**: Real-time detection is impossible without a rock-solid, low-latency audio transport.
* **Inputs**: `TRD.md` Section 4 & 5.
* **Outputs**: Stable WebSocket streaming loop with zero dropped frames and accurate Redis ring buffering.
* **Files Expected to Change**:
  * `backend/main.py`
  * `frontend/hooks/useAudioStreamer.ts`
  * `frontend/hooks/useVaaniShieldWs.ts`
* **Files Expected to be Created**:
  * `backend/tests/test_streaming.py`
* **Technical Tasks**:
  1. `[BUILD]` Verify Web Audio capture downsampling to 16,000 Hz Linear PCM in `useAudioStreamer.ts`. **(P0)**
  2. `[REFACTOR]` Harden WebSocket `/v1/stream/call/{session_id}` connection lifecycle in `backend/main.py`. **(P0)**
  3. `[BUILD]` Enforce Redis circular buffer with `LPUSH` + `LTRIM` (24 frames) and 15s `EXPIRE`. **(P0)**
  4. `[BUILD]` Validate frame accumulator logic ensuring analysis triggers exactly every 12 frames (768 ms). **(P0)**
  5. `[SECURITY]` Enforce 15-second TTL on Redis keys and explicit purge in WebSocket `finally` block. **(P0)**
  6. `[VALIDATE]` Create automated streaming test sending 100 PCM chunks and verifying buffer retrieval. **(P0)**
* **Validation Criteria**: WebSocket stays connected for $>5\text{ minutes}$ under continuous streaming; latency $<5\text{ ms}$.
* **Definition of Done (DoD)**: Client streams mic audio; backend buffers and logs 24-frame windows reliably.
* **Dependencies**: Phase 1.
* **What Must NOT Be Done**: Do not implement neural inference yet.
* **Risk of Skipping**: Memory leaks, buffer overflows, and dropped audio frames during live demo.
* **Effort**: MEDIUM | **Demo Value**: HIGH

---

### Phase 3 — Signal Processing & Biomechanical Feature Extraction
* **Goal**: Extract 80-bin log-mel spectrograms and Praat Parselmouth biomechanical prosody parameters in near real-time.
* **Why It Exists**: Forms the mathematical and physical foundation for all downstream AI detection.
* **Inputs**: Sliding 1,536 ms audio buffers from Phase 2.
* **Outputs**: Structured feature extraction yielding log-mel matrices and prosody metrics ($F_0$, jitter, shimmer, HNR).
* **Files Expected to Change**:
  * `backend/main.py`
  * `backend/requirements.txt`
* **Files Expected to be Created**:
  * `backend/tests/test_prosody.py`
* **Technical Tasks**:
  1. `[BUILD]` Verify 80-bin log-mel spectrogram extraction via Librosa/Scipy (25ms window, 10ms hop). **(P0)**
  2. `[BUILD]` Ensure Praat Parselmouth point-process extraction runs inside `run_in_executor` threadpool. **(P0)**
  3. `[BUILD]` Extract $F_0$ mean, $F_0$ variance, local jitter (RAP), local shimmer (APQ5), and HNR (dB). **(P0)**
  4. `[BUILD]` Implement 60ms timeout on Parselmouth with automatic fallback to Scipy autocorrelation. **(P1)**
  5. `[SECURITY]` Sanitize audio input array: clamp non-finite numbers (`NaN`, `Inf`) before native C-calls. **(P0)**
  6. `[VALIDATE]` Benchmark feature extraction latency on 1.5s audio window; must complete in $<45\text{ ms}$. **(P0)**
* **Validation Criteria**: Telemetry stream contains real, dynamic $F_0$, jitter, and shimmer metrics reacting to human voice.
* **Definition of Done (DoD)**: Praat Parselmouth and log-mel pipelines run stably without GIL blocking or memory leaks.
* **Dependencies**: Phase 2.
* **What Must NOT Be Done**: Do not integrate neural network weights yet.
* **Risk of Skipping**: Detection becomes entirely reliant on mock numbers or crude energy heuristics.
* **Effort**: MEDIUM | **Demo Value**: HIGH

---

### Phase 4 — AI Anti-Spoofing & Model Packaging
* **Goal**: Package and serve quantized ONNX models for Silero VAD and ResNet-18 vocoder anti-spoofing.
* **Why It Exists**: Replaces mock inference with authentic neural classification to achieve true credibility.
* **Inputs**: Log-mel spectrograms from Phase 3; Silero VAD & ResNet-18 ONNX model files.
* **Outputs**: Real neural inference outputting speech probability and acoustic spoof risk ($0.0–100.0$).
* **Files Expected to Change**:
  * `backend/main.py`
  * `docker-compose.yml`
* **Files Expected to be Created**:
  * `backend/models/silero_vad.onnx`
  * `backend/models/resnet18_acoustic_quantized.onnx`
  * `backend/scripts/download_or_export_models.py`
* **Technical Tasks**:
  1. `[BUILD]` Create setup script to acquire or package quantized ONNX models into `models/`. **(P0)**
  2. `[INTEGRATE]` Wire Silero VAD ONNX session into `InferenceEngine.vad_speech_ratio`. **(P0)**
  3. `[INTEGRATE]` Wire quantized ResNet-18 ONNX session into `InferenceEngine.acoustic_risk_score`. **(P0)**
  4. `[REFACTOR]` Remove randomized mock fallbacks when models are loaded; add explicit log indicator. **(P0)**
  5. `[BUILD]` Enforce VAD silence stripping: discard windows with $<15\%$ speech activity. **(P0)**
  6. `[VALIDATE]` Verify inference latency: Silero VAD $<10\text{ ms}$, ResNet-18 $<25\text{ ms}$ on edge CPU. **(P0)**
* **Validation Criteria**: Genuine speech produces acoustic risk $<20$; synthetic/vocoder audio produces risk $>75$.
* **Definition of Done (DoD)**: ONNX models loaded from volume mount; real inference executed on every active hop.
* **Dependencies**: Phase 3.
* **What Must NOT Be Done**: Do not train models from scratch during hackathon; use validated pretrained/quantized weights.
* **Risk of Skipping**: Judges discovering that the "AI" is running random number math (`_rng.normal`).
* **Effort**: HIGH | **Demo Value**: CRITICAL

---

### Phase 5 — Speaker Verification & PITCH Challenge Integration
* **Goal**: Implement conditional Tier 2 speaker verification with `pgvector` and active PITCH challenge mechanics.
* **Why It Exists**: Provides identity verification and active cognitive defense against real-time voice conversion.
* **Inputs**: Enrolled baseline voiceprints; Tier 1 risk triggers ($>45.0$).
* **Outputs**: ECAPA-TDNN embedding matching and PITCH challenge verification pipeline.
* **Files Expected to Change**:
  * `backend/main.py`
  * `backend/database.sql`
  * `frontend/components/PitchChallengeDrawer.tsx`
* **Files Expected to be Created**:
  * `backend/models/ecapa_tdnn_192.onnx`
* **Technical Tasks**:
  1. `[INTEGRATE]` Wire ECAPA-TDNN ONNX model into `extract_ecapa_embedding` to output 192-dim unit vectors. **(P1)**
  2. `[INTEGRATE]` Query PostgreSQL `enrolled_voiceprints` using `pgvector` cosine similarity. **(P1)**
  3. `[BUILD]` Enforce conditional gate: Tier 2 executes only when Tier 1 score $>45.0$ and `speaker_id` exists. **(P0)**
  4. `[BUILD]` Connect `/v1/enroll` endpoint to extract and persist legitimate speaker baseline vectors. **(P0)**
  5. `[INTEGRATE]` Connect PITCH challenge drawer in frontend to display dynamic Hindi/English tongue-twister phrases. **(P0)**
  6. `[BUILD]` Implement response latency and pitch excursion ($\Delta F_0$) check on challenge audio. **(P1)**
* **Validation Criteria**: Caller matching enrolled vector yields low risk; mismatched voice surge triggers PITCH drawer.
* **Definition of Done (DoD)**: Speaker enrollment and verification operational; PITCH drawer responds dynamically to threats.
* **Dependencies**: Phase 4.
* **What Must NOT Be Done**: Do not build a full conversational ASR engine for PITCH; use prosodic/latency checks for MVP.
* **Risk of Skipping**: Inability to demonstrate speaker identity verification or active challenge-response.
* **Effort**: MEDIUM | **Demo Value**: HIGH

---

### Phase 6 — Multi-Signal Risk Engine & Threat State Machine
* **Goal**: Implement multi-signal fusion, asymmetric temporal EMA smoothing, and threat state machine with hysteresis.
* **Why It Exists**: Converts raw, noisy acoustic metrics into a stable, explainable threat state (GREEN / AMBER / RED).
* **Inputs**: Tier 1 acoustic score, Tier 1 prosody score, Tier 2 speaker score, PITCH challenge metrics.
* **Outputs**: Smoothed composite risk score ($0.0–100.0$) and deterministic threat level emitted via WebSocket.
* **Files Expected to Change**:
  * `backend/main.py`
  * `frontend/store/useTelemetryStore.ts`
* **Technical Tasks**:
  1. `[BUILD]` Implement weighted linear fusion with configurable parameters (`w_acoustic`, `w_prosody`, etc.). **(P0)**
  2. `[BUILD]` Implement asymmetric EMA in `ThreatState`: fast rise ($\alpha=0.65$), deliberate decay ($\alpha=0.25$). **(P0)**
  3. `[BUILD]` Implement threat state transitions with hysteresis:
     * GREEN $\rightarrow$ AMBER ($\ge 40.0$), AMBER $\rightarrow$ GREEN ($< 35.0$). **(P0)**
     * AMBER $\rightarrow$ RED ($\ge 75.0$), RED $\rightarrow$ AMBER ($< 70.0$). **(P0)**
  4. `[INTEGRATE]` Stream composite score, threat level, latency, and prosody metrics in outbound JSON telemetry. **(P0)**
  5. `[VALIDATE]` Verify state stability: synthetic voice escalates to RED within 2 hops ($<2.0\text{ s}$). **(P0)**
* **Validation Criteria**: Smooth score transitions on frontend dial; zero erratic flapping between threat states.
* **Definition of Done (DoD)**: Multi-signal fusion and asymmetric smoothing verified; state transitions logged in DB.
* **Dependencies**: Phase 5.
* **What Must NOT Be Done**: Do not train a black-box deep meta-classifier; retain explainable weighted fusion.
* **Risk of Skipping**: False alarms on coughing fits or delayed reactions to genuine voice attacks.
* **Effort**: MEDIUM | **Demo Value**: HIGH

---

### Phase 7 — Pre-Transaction Security Gate & Policy Interventions
* **Goal**: Implement the synchronous pre-transaction authorization API that halts high-value fraud at authorization time.
* **Why It Exists**: This is the core operational deliverable that stops financial loss before funds are released.
* **Inputs**: Active session threat state; transaction request payload (`amount_inr`, `beneficiary_vpa`).
* **Outputs**: Deterministic HTTP 200 (APPROVED) or HTTP 403 (BLOCKED) with audit record persistence.
* **Files Expected to Change**:
  * `backend/main.py`
  * `backend/database.sql`
  * `frontend/components/MockBankingGate.tsx`
* **Files Expected to be Created**:
  * `backend/tests/test_transaction_gate.py`
* **Technical Tasks**:
  1. `[BUILD]` Implement `POST /v1/transaction/evaluate-authorization` with strict schema validation. **(P0)**
  2. `[BUILD]` Enforce hard block (HTTP 403 Forbidden) when session threat level is RED ($R_{\text{EMA}} \ge 75.0$). **(P0)**
  3. `[BUILD]` Enforce warning / step-up challenge (HTTP 428) when AMBER and amount $\ge \text{₹}10,000$. **(P1)**
  4. `[BUILD]` Persist evaluation audit records to PostgreSQL table `transaction_evaluations`. **(P0)**
  5. `[INTEGRATE]` Connect frontend `MockBankingGate` PIN pad to invoke authorization endpoint before release. **(P0)**
  6. `[VALIDATE]` Automated integration test: GREEN session approves payment; RED session freezes payment. **(P0)**
* **Validation Criteria**: Mock banking UI displays instant "TRANSACTION FROZEN" modal when RED voice is active.
* **Definition of Done (DoD)**: Synchronous authorization gate operational ($<35\text{ ms}$ latency); audit trail written.
* **Dependencies**: Phase 6.
* **What Must NOT Be Done**: Do not integrate real banking payment gateways (Razorpay/Stripe); use mock banking gate.
* **Risk of Skipping**: Demo remains a passive voice detector with zero operational fraud intervention value.
* **Effort**: MEDIUM | **Demo Value**: CRITICAL

---

### Phase 8 — Frontend War Room Dashboard & Interactive Demo Integration
* **Goal**: Unify all live telemetry into a visually stunning, responsive SecOps War Room interface.
* **Why It Exists**: Judges evaluate software through the frontend; the UI must wow at first glance and tell the security story.
* **Inputs**: Telemetry stream from backend; Zustand store `useTelemetryStore`.
* **Outputs**: High-fidelity dashboard displaying live spectrogram waterfall, ThreatDial, prosody charts, and banking gate.
* **Files Expected to Change**:
  * `frontend/app/page.tsx`
  * `frontend/components/SpectrogramCanvas.tsx`
  * `frontend/components/ThreatDial.tsx`
  * `frontend/components/MockBankingGate.tsx`
  * `frontend/components/PitchChallengeDrawer.tsx`
  * `frontend/hooks/useAudioStreamer.ts`
* **Technical Tasks**:
  1. `[INTEGRATE]` Wire live WebSocket telemetry into Zustand store (`applyTelemetry`, `pushSpectrogramColumn`). **(P0)**
  2. `[BUILD]` Ensure HTML5 Canvas spectrogram renders 80 mel bins with high-contrast color palette. **(P0)**
  3. `[BUILD]` Connect ThreatDial to animate smoothly with dynamic color shifts (Green $\rightarrow$ Amber $\rightarrow$ Red). **(P0)**
  4. `[BUILD]` Add clean UI toggle: "Live Microphone Mode" vs. "Calibrated Test Scenario Mode". **(P0)**
  5. `[BUILD]` Calibrate synthetic audio injectors in `useAudioStreamer` to reliably trigger Green vs. Red states. **(P0)**
  6. `[VALIDATE]` Verify smooth 60 FPS UI rendering without browser lag under active WebSocket streaming. **(P0)**
* **Validation Criteria**: Seamless visual progression from clean green audio to red warning during simulated attack.
* **Definition of Done (DoD)**: Frontend War Room fully functional, responsive, and connected to live backend pipeline.
* **Dependencies**: Phase 7.
* **What Must NOT Be Done**: Do not redesign existing working layouts; refine and connect active hooks.
* **Risk of Skipping**: Clunky UI interaction ruining the live demo presentation.
* **Effort**: MEDIUM | **Demo Value**: CRITICAL

---

### Phase 9 — Security Hardening, DPDP Compliance & Telephony Testing
* **Goal**: Validate zero raw audio retention at rest, harden endpoints, and test detector resilience against degraded phone audio.
* **Why It Exists**: Proves enterprise credibility, privacy compliance (DPDP Act 2023), and telephony viability.
* **Inputs**: Running stack from Phase 8.
* **Outputs**: Hardened configuration; verified DPDP compliance; benchmark report on telephony audio.
* **Files Expected to Change**:
  * `backend/main.py`
  * `backend/database.sql`
  * `docker-compose.yml`
* **Files Expected to be Created**:
  * `backend/scripts/simulate_telephony_audio.py`
* **Technical Tasks**:
  1. `[SECURITY]` Audit host filesystem and database to prove ZERO raw audio bytes (`.wav`/`.pcm`) exist at rest. **(P0)**
  2. `[SECURITY]` Verify Redis audio buffers purge within 15 seconds and on WebSocket disconnect. **(P0)**
  3. `[SECURITY]` Implement API key header validation on `/v1/transaction/evaluate-authorization`. **(P1)**
  4. `[BUILD]` Create software bandpass filter script emulating AMR-NB telephony degradation ($300–3,400\text{ Hz}$). **(P1)**
  5. `[VALIDATE]` Run detector on bandpass-filtered samples to prove prosodic detection survives telephony cutoff. **(P1)**
  6. `[DOCUMENT]` Record DPDP compliance confirmation in project documentation. **(P0)**
* **Validation Criteria**: Disk inspection confirms zero audio storage; detector maintains discrimination on 8kHz audio.
* **Definition of Done (DoD)**: Security and privacy audit passed; telephony adaptation validated.
* **Dependencies**: Phase 8.
* **What Must NOT Be Done**: Do not build complex enterprise IAM systems; use clean API key headers for MVP.
* **Risk of Skipping**: Failing judge cross-examination regarding DPDP compliance or telephony feasibility.
* **Effort**: MEDIUM | **Demo Value**: HIGH

---

### Phase 10 — Evaluation, End-to-End Demo Rehearsal & Final Freeze
* **Goal**: Conduct full end-to-end rehearsals of the 5-minute live demo script, fix edge-case bugs, and freeze the codebase.
* **Why It Exists**: Guarantees zero technical failures, crashes, or unhandled exceptions during the live presentation.
* **Inputs**: Complete, integrated platform from Phase 9.
* **Outputs**: Rehearsed demo flow; frozen codebase; release tag; final presentation collateral.
* **Files Expected to Change**:
  * `README.md`
  * `MEMORY.md`
* **Files Expected to be Created**:
  * `DEMO_RUNBOOK.md`
* **Technical Tasks**:
  1. `[VALIDATE]` Execute 10 consecutive runs of the 10-step demo script; ensure 100% pass rate. **(P0)**
  2. `[VALIDATE]` Test network disconnect and recovery handling during active streaming. **(P0)**
  3. `[DOCUMENT]` Author `DEMO_RUNBOOK.md` with step-by-step speaker notes and contingency fallbacks. **(P0)**
  4. `[DOCUMENT]` Update `README.md` with verified quickstart instructions and benchmark summary. **(P0)**
  5. `[VALIDATE]` Freeze all source files; tag git release `v1.0.0-demo-freeze`. **(P0)**
  6. `[DOCUMENT]` Finalize `MEMORY.md` project state ledger. **(P0)**
* **Validation Criteria**: Demo runs flawlessly in $<5\text{ minutes}$ with zero console errors or backend warnings.
* **Definition of Done (DoD)**: Complete system frozen, documented, and verified ready for live evaluation.
* **Dependencies**: Phase 0 through 9.
* **What Must NOT Be Done**: Absolutely NO code modifications after the freeze tag is applied.
* **Risk of Skipping**: Unrehearsed demo crashing on stage due to edge-case browser permissions or network glitches.
* **Effort**: LOW | **Demo Value**: CRITICAL

---

## 4. MVP Cut Line (Scope Boundary)

To guarantee delivery within hackathon constraints, strict boundaries are enforced:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       MVP CUT LINE                                               │
├──────────────────────────────────────────────────────────────────┬───────────────────────────────┤
│ IN SCOPE (Mandatory for Live Demo - P0)                           │ OUT OF SCOPE (Deferred - P3)  │
├──────────────────────────────────────────────────────────────────┼───────────────────────────────┤
│ • Docker Compose one-command orchestration (API, Redis, DB, UI)  │ • Multi-node Kubernetes / Helm│
│ • Live Web Audio browser mic capture (16kHz 16-bit Mono PCM)     │ • Carrier SIPREC / SBC Media  │
│ • In-memory Redis sliding ring buffer with 15s TTL               │ • Kafka distributed event bus │
│ • Silero VAD silence stripping (<15% speech discard)             │ • Wav2Vec2 / XLS-R models     │
│ • 80-bin Log-Mel Spectrogram extraction (25ms window / 10ms hop) │ • Self-supervised foundations │
│ • Quantized ResNet-18 vocoder anti-spoofing ONNX inference       │ • Real core banking APIs      │
│ • Praat Parselmouth biomechanical prosody (F0, jitter, shimmer)  │ • Full conversational ASR     │
│ • ECAPA-TDNN 192-dim speaker embedding & pgvector cosine query   │ • Hardware NPU acceleration   │
│ • Asymmetric EMA temporal smoothing (α_up=0.65, α_down=0.25)     │ • Enterprise IAM / OAuth2 SSO │
│ • Threat state machine with hysteresis (GREEN / AMBER / RED)     │ • Native iOS/Android apps     │
│ • Synchronous Pre-Transaction Authorization Gate (HTTP 200/403)  │ • Post-call forensic watermarking
│ • Interactive Mock Banking PIN pad & UPI transfer UI             │ • Client-side WASM STFT math  │
│ • PITCH challenge drawer displaying dynamic Hindi phrases        │ • Multi-region DB clustering  │
│ • Zero raw audio storage at rest (DPDP Act 2023 compliance)      │ • Automated billing engines   │
└──────────────────────────────────────────────────────────────────┴───────────────────────────────┘
```

---

## 5. Critical Path & Dependency Flow

```
[Phase 0: Audit] ──► [Phase 1: Specs Lock] ──► [Phase 2: Streaming Ingestion]
                                                        │
                                                        ▼
                                       [Phase 3: DSP & Prosody Pipeline]
                                                        │
                                                        ▼
                                       [Phase 4: AI Model Packaging (ONNX)]
                                                        │
                                                        ▼
                                       [Phase 5: Speaker Verification & PITCH]
                                                        │
                                                        ▼
                                       [Phase 6: Multi-Signal Risk Engine]
                                                        │
                                                        ▼
                                       [Phase 7: Pre-Transaction Gate]
                                                        │
                                                        ▼
                                       [Phase 8: Frontend Dashboard Integration]
                                                        │
                                                        ▼
                                       [Phase 9: Security & Telephony Hardening]
                                                        │
                                                        ▼
                                       [Phase 10: Demo Rehearsal & Final Freeze]
```

### 5.1 Parallelizable Tasks
* **Frontend UI Polish (Phase 8)** can be developed in parallel with **AI Model Packaging (Phase 4)** using calibrated mock injectors.
* **Telephony Simulation Scripts (Phase 9)** can be prepared in parallel with **Pre-Transaction Gate Testing (Phase 7)**.
* **Documentation & Demo Runbook Authoring (Phase 10)** can proceed concurrently with **Security Hardening (Phase 9)**.

---

## 6. Project Memory Protocol (`MEMORY.md`)

At the conclusion of **every single phase**, the engineer/AI must append or update the persistent ledger file [`MEMORY.md`](file:///d:/Voice-Cloning-Prototype/MEMORY.md) using this standardized schema:

```markdown
# VaaniShield Project State Ledger: Phase [X] Completion

- **Phase Completed**: Phase [X] — [Phase Name]
- **Timestamp**: YYYY-MM-DD HH:MM:SS (Local Time)
- **Status**: SUCCESS / PARTIAL / BLOCKED
- **Files Created**:
  - `path/to/file1`
  - `path/to/file2`
- **Files Modified**:
  - `path/to/modified1`
- **Files Deleted / Renamed**: None
- **Major Architectural Changes**: Summary of architectural decisions.
- **Dependencies Added / Removed**: List of packages or models.
- **Commands Executed**: Commands run for verification.
- **Tests & Validation Performed**: Results of test runs.
- **Known Issues & Technical Debt**: Current limitations.
- **Remaining Work**: Tasks outstanding for subsequent phases.
- **Deviations from PRD / TRD / AI_ARCHITECTURE**: Explicit callouts of any scope pivots.
- **Next Recommended Phase**: Phase [X+1] — [Next Phase Name]
```

---

## 7. Demo Day & Final Freeze Checklists

### 7.1 Demo Day Checklist
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

### 7.2 Final Freeze Checklist
- [ ] All code changes reviewed and merged into working branch.
- [ ] No uncommitted or untracked temporary files in repository.
- [ ] Mock fallbacks disabled in production code paths (`models/` contains real ONNX weights).
- [ ] Test suites execute cleanly with 100% pass rate.
- [ ] `README.md` updated with accurate clone, build, and run instructions.
- [ ] `MEMORY.md` updated with final Phase 10 completion ledger entry.
- [ ] Git release tagged: `v1.0.0-demo-freeze`.

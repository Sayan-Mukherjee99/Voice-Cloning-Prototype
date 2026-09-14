# VaaniShield: Project State Ledger (`MEMORY.md`)

| Ledger Attribute | Current Project State |
| :--- | :--- |
| **Project Name** | VaaniShield (वाणिShield) — Real-Time Voice Integrity & Anti-Spoofing Platform |
| **Repository** | `Sayan-Mukherjee99/Voice-Cloning-Prototype` |
| **Current Project Phase** | **Phase B2 Completed** (WebSocket Audio Streaming Stability) \| **Architecture Sync Completed (v2.0.0)** |
| **Next Recommended Phase**| **Phase B3 — Audio Buffering & Preprocessing (Redis Ring Buffer)** (Backend Track / Shub) |
| **Documentation Lock Status**| **SYNCHRONIZED & LOCKED (v2.0.0 Deepfake-First Core Specification)** |
| **Project Ownership** | Person A: **Shub** (Backend / AI Lead) \| Person B: **Sion** (Frontend Lead) |
| **Ledger Last Updated** | September 2026 |

---

## 1. Documentation Status Matrix

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   DOCUMENTATION STATUS MATRIX                                    │
├────────────────────┬──────────┬─────────────────────────────────┬────────────────────────────────┤
│ Document           │ Status   │ Major Findings & Scope Summary  │ Required Engineering Follow-up │
├────────────────────┼──────────┼─────────────────────────────────┼────────────────────────────────┤
│ PRD.md             │ LOCKED   │ v2.0.0: Speaker-independent     │ Primary specification for mass-│
│                    │ (v2.0.0) │ deepfake-first thesis, Mode A   │ user anti-spoof detection and  │
│                    │          │ & B, dual-DB, zero-cost policy. │ transaction gating policies.   │
├────────────────────┼──────────┼─────────────────────────────────┼────────────────────────────────┤
│ TRD.md             │ LOCKED   │ v2.0.0: AASIST/RawNet2 research,│ Technical guide for pipeline,  │
│                    │ (v2.0.0) │ Supabase Free + SQLite schemas, │ latency budgets, and dual DB.  │
│                    │          │ streaming dataflow, SLAs.       │                                │
├────────────────────┼──────────┼─────────────────────────────────┼────────────────────────────────┤
│ SECURITY.md        │ LOCKED   │ v2.0.0: Data poisoning defense, │ Security guide for quarantine  │
│                    │ (v2.0.0) │ holdout gates, DPDP zero-audio  │ pools, promotion gates, and    │
│                    │          │ classification, fail-secure.    │ fail-secure implementations.   │
├────────────────────┼──────────┼─────────────────────────────────┼────────────────────────────────┤
│ AI_ARCHITECTURE.md │ LOCKED   │ v2.0.0: Speaker-independent     │ Architecture guide for AASIST  │
│                    │ (v2.0.0) │ waveform engine, reframed ECAPA,│ integration, Parselmouth DSP,  │
│                    │          │ prosody DSP, temporal model.    │ and multi-signal score fusion. │
├────────────────────┼──────────┼─────────────────────────────────┼────────────────────────────────┤
│ PHASES.md          │ LOCKED   │ v2.2.0: Deepfake-first backend  │ Two-developer roadmap: Shub    │
│                    │ (v2.2.0) │ roadmap (B1–B20), frontend C1–  │ executes B3 next; Sion         │
│                    │          │ C17, integration D1–D10.        │ executes C1/C2 concurrently.   │
├────────────────────┼──────────┼─────────────────────────────────┼────────────────────────────────┤
│ AI_INSTRUCTIONS.md │ ACTIVE   │ v2.0.0: Rules A–J, deepfake-    │ Mandatory operating directive  │
│                    │ (v2.0.0) │ first directives, Git safety.   │ for all AI coding workflows.   │
├────────────────────┼──────────┼─────────────────────────────────┼────────────────────────────────┤
│ README.md          │ LOCKED   │ v2.0.0: Mass-user deepfake      │ Public repository landing page │
│                    │ (v2.0.0) │ overview, research models,      │ with verified commands and     │
│                    │          │ truthful maturity matrix.       │ accurate implementation state. │
├────────────────────┼──────────┼─────────────────────────────────┼────────────────────────────────┤
│ MEMORY.md          │ ACTIVE   │ Persistent state ledger, ADR-08 │ State of record for completed  │
│                    │ (v2.0.0) │ architecture re-alignment.      │ milestones and active blockers.│
└────────────────────┴──────────┴─────────────────────────────────┴────────────────────────────────┘
```

---

## 2. Repository & Technical Baseline

### 2.1 Technology Stack & Versions
* **Operating System**: Windows (Host) / Linux Containers (Docker Compose).
* **Backend Runtime**: Python 3.11-slim, FastAPI 0.115.5, Uvicorn 0.32.1, Pydantic v2.
* **Frontend Runtime**: Next.js 16.3.4 (App Router), React 19.2.8, Tailwind CSS v4, Zustand 5.0.15, Framer Motion 13.2.0.
* **In-Memory Cache**: Redis 7.2-alpine (Circular ring buffer, `allkeys-lru` eviction, 15s TTL).
* **Application Database**: Supabase Free Tier (Managed PostgreSQL 16 with `pgvector` 0.3.6).
* **Learning Registry**: SQLite 3 (`vaani_learning.db` local embedded file).
* **ML Runtimes**: ONNX Runtime 1.20.1 (`CPUExecutionProvider`), PyTorch 2.4.1 (CPU-only utility), Librosa 0.10.2, SciPy 1.14.1, SoundFile 0.12.1.
* **Acoustic DSP**: Praat Parselmouth 0.4.4 (C-bindings for biomechanical micro-prosody).

### 2.2 Baseline Implementation Reality
* **Streaming Transport**: Operational WebSocket `/v1/stream/call/{session_id}` accepting binary PCM audio.
* **Buffering**: Operational Redis ring buffer using `LPUSH` + `LTRIM` (24 frames) with 15s `EXPIRE` and in-memory deque fallback.
* **Relational Persistence**: PostgreSQL schema defined in `backend/database.sql` covering `call_sessions`, `chunk_telemetry`, `enrolled_voiceprints`, and `transaction_evaluations`.
* **State Machine**: Operational `ThreatState` class applying asymmetric EMA smoothing ($\alpha_{\text{escalate}}=0.65, \alpha_{\text{deescalate}}=0.25$) and threat level transitions (GREEN, AMBER, RED).
* **Pre-Transaction Gate**: Operational `POST /v1/transaction/evaluate-authorization` returning HTTP 403 on RED.
* **Frontend UI**: Operational Next.js dashboard with `LimelightNavbar`, real-time `ThreatDial`, `SpectrogramCanvas` waterfall, `ProsodyChart`, and interactive `MockBankingGate`.
* **Current Gap / Reality**: Model files in `models/` are unpopulated in git, forcing the backend `InferenceEngine` to execute heuristic/random mock fallbacks. Real anti-spoof model integration (AASIST-L) is scheduled for Phase B8.

---

## 3. Architecture Baseline

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   LOCKED ARCHITECTURAL CONSTANTS                                 │
├──────────────────────────┬─────────────────────────────┬─────────────────────────────────────────┤
│ Architectural Dimension  │ Value / Specification       │ Rationale                               │
├──────────────────────────┼─────────────────────────────┼─────────────────────────────────────────┤
│ Primary Engine Thesis    │ Speaker-Independent AntiSpf │ Mass-user protection with zero baseline │
│ Audio Ingestion Format   │ 16kHz 16-bit Mono Linear PCM│ Standardized across Web Audio & ML      │
│ Ingestion Frame Size     │ 1,024 samples (64 ms)       │ Granular network chunk size (2048 bytes)│
│ Sliding Analysis Window  │ 24 frames (1,536 ms)        │ Minimum duration for prosody analysis   │
│ Analysis Hop Cadence     │ 12 frames (768 ms)          │ 50% window overlap; ~1.3 updates/sec    │
│ VAD Silence Threshold    │ Speech Ratio < 0.15 Discard │ Bypasses neural inference on silence    │
│ Primary Anti-Spoof Model │ AASIST-L Pretrained ONNX    │ Sub-25ms CPU waveform classification    │
│ Auxiliary Acoustic Cue   │ ResNet-18 Log-Mel ONNX      │ Vocoder transposed conv artifact check  │
│ Biomechanical Prosody    │ Praat Parselmouth (C-bind)  │ F0, Jitter RAP, Shimmer APQ5, HNR dB    │
│ Optional Identity Mode   │ ECAPA-TDNN 192-dim Vector   │ Mode B only; High Sim != Human!         │
│ EMA Escalation Alpha     │ α_escalate = 0.65           │ Reaches RED within 2 analysis hops      │
│ EMA De-escalation Alpha  │ α_deescalate = 0.25         │ Deliberate 4.5s safe recovery to GREEN  │
│ Threat State Boundaries  │ GREEN <40, AMBER 40-74, RED │ Hard block on RED (HTTP 403 Forbidden)  │
│ Application Database     │ Supabase Free Tier          │ $0/mo PostgreSQL 16 + pgvector quota    │
│ Learning Registry        │ SQLite Local Embedded DB    │ vaani_learning.db zero-cost ML logging  │
│ Data Privacy SLA         │ Zero raw audio at rest      │ DPDP Act 2023 compliance; 15s Redis TTL │
│ Cost Constraint          │ Zero Paid Commercial APIs   │ 100% open-source local execution        │
└──────────────────────────┴─────────────────────────────┴─────────────────────────────────────────┘
```

---

## 4. Current Phase & Progress Ledger

### Phase 1 Completion Record: Architecture & Documentation Lock
* **Timestamp**: September 2026
* **Status**: **SUCCESS**
* Initial project baselining and documentation suite creation.

### Phase A0 Completion Record: Project Baseline & Shared Foundation
* **Timestamp**: September 2026
* **Track**: SHARED (Joint: Person A — Shub & Person B — Sion)
* **Status**: **COMPLETE**
* Confirmed repository ground truth, froze shared REST & WebSocket contracts, established two-person ownership boundaries.

### Phase B1 Completion Record: FastAPI Modularization
* **Timestamp**: September 2026
* **Track**: BACKEND / AI (Owner: Person A — Shub)
* **Status**: **COMPLETE**
* Monolithic `backend/main.py` (1,365 lines) successfully refactored into clean, modular packages (`core/`, `schemas/`, `risk/`, `audio/`, `ai/`, `db/`, `services/`, `api/`). 10/10 automated tests passing.

### Phase B2 Completion Record: WebSocket Audio Streaming Stability
* **Timestamp**: September 2026
* **Track**: BACKEND / AI (Owner: Person A — Shub)
* **Status**: **COMPLETE**
* Hardened WebSocket receive loop with 2,048-byte PCM frame length validation, non-binary frame discarding, per-window exception isolation, bounded task tracking, and clean Redis buffer purge on disconnect. 7/7 async streaming tests passing.

---

### [2026-09-14] Architecture Decision Record (ADR-08): Master Documentation Synchronization & Deepfake-First Realignment
* **Track**: ARCHITECTURE & GOVERNANCE (Joint: Person A — Shub & Person B — Sion)
* **Status**: **COMPLETE**
* **Context & Motivation**:
  Earlier specifications positioned speaker verification as a primary gate, assuming callers possessed pre-enrolled voiceprints. This excluded mass-market fraud scenarios (digital arrest extortion, family emergency scams, and first-time call center impersonation). The architecture was formally re-aligned around a speaker-independent, anti-spoof-first thesis where any caller can be analyzed immediately.
* **Decisions Formally Recorded & Locked**:
  1. **Primary Product Thesis**: VaaniShield is primarily a real-time, speaker-independent AI voice deepfake detection and voice-integrity risk engine. The primary capability is classifying incoming speech as bona fide (human) or spoofed (synthetic, cloned, converted, replayed) without requiring caller enrollment.
  2. **Product Modes**:
     * **Mode A (Universal Deepfake Detection — Default)**: Zero enrollment required. Ingests live audio, runs VAD, speaker-independent anti-spoof model (AASIST-L), auxiliary ResNet-18 vocoder cues, and biomechanical prosody. Outputs risk score, threat level, detected signals, and recommended action.
     * **Mode B (Enhanced Identity + Voice Integrity — Optional)**: Enrolled callers provide `speaker_id`. Live ECAPA-TDNN embedding is compared against Supabase `pgvector` baseline.
     * **Critical Security Rule**: High speaker similarity does NOT prove authenticity, as clones mimic target identities. High similarity + High synthetic risk = Target Clone Attack (RED).
  3. **Candidate Model Research Strategy**:
     * Selected **AASIST / AASIST-L** (`clovaai/aasist`, Jung et al., Interspeech 2021) as the primary candidate architecture (SincNet waveform front-end + heterogeneous graph attention, ~290K params, $<25\text{ ms}$ CPU inference, MIT licensed).
     * Maintained **RawNet2** as an alternative reference anti-spoof baseline.
     * Refactored **ResNet-18** as an auxiliary acoustic vocoder signal over 80-bin log-mel spectrograms.
     * Adopted **ASVspoof 2021** and **ASVspoof5** as authoritative research and benchmark references.
     * **Benchmark Attribution Discipline**: External paper benchmarks must never be claimed as VaaniShield measurements.
  4. **Controlled Continual-Learning Architecture**:
     * Strictly banned unsafe blind retraining on individual calls.
     * Established a controlled lifecycle: Inference $\rightarrow$ SQLite logging $\rightarrow$ Operator feedback $\rightarrow$ Validation & quarantine $\rightarrow$ Curated batch quorum (500 genuine, 500 spoof) $\rightarrow$ Retraining in sandbox $\rightarrow$ Holdout benchmark evaluation gate $\rightarrow$ Version tagging $\rightarrow$ Instant rollback.
  5. **Dual-Database Topology**:
     * **Supabase**: Managed PostgreSQL 16 + `pgvector` on the Free Tier ($0/mo, 500 MB DB, 1 GB storage, up to 50k MAU) for persistent operational data (sessions, evaluations, Mode B voiceprints).
     * **SQLite**: Local embedded file database (`vaani_learning.db`) for high-throughput model telemetry, feedback records, and candidate retraining batches with zero server cost.
  6. **Zero-Cost / Free-First Engineering Policy**:
     * Hard constraint: The core architecture is designed so that no paid API is required. 100% open-source local runtimes (Python, FastAPI, ONNX Runtime, SciPy, Librosa, Redis, SQLite) and Supabase Free Tier. Zero paid LLM, speech, or cloud GPU dependencies.
  7. **Positioning of RAG**:
     * RAG is NOT an audio deepfake detector. RAG cannot process waveforms or spectrograms. RAG is reserved for optional later-stage contextual intelligence (policies, transaction limits, incident playbooks).
  8. **Document Synchronization**:
     * Synchronized and locked all 8 project documents: `PRD.md`, `TRD.md`, `SECURITY.md`, `AI_ARCHITECTURE.md`, `AI_INSTRUCTIONS.md`, `PHASES.md`, `README.md`, `MEMORY.md`.
* **Implementation Status Classification**:
  * **Implemented**: WebSocket transport, Redis ring buffer (15s TTL), ThreatState asymmetric EMA smoothing, Pre-transaction authorization gate (HTTP 403 on RED), Speaker enrollment endpoint, Next.js 16 frontend with ThreatDial, SpectrogramCanvas, MockBankingGate, Praat Parselmouth prosody extraction.
  * **Partially Implemented**: Backend modularization (Phase B1 complete), streaming frame validation (Phase B2 complete).
  * **Mock / Fallback**: Silero VAD (RMS fallback), ResNet-18 (variance heuristic fallback), ECAPA-TDNN (hash seed unit vectors), PITCH challenge (UI display only).
  * **Planned**: AASIST-L primary anti-spoof model integration, closed-loop PITCH validation, telephony transcoding simulation filter (AMR-NB/WB).
  * **Proposed**: Supabase Free remote integration, SQLite local learning registry, continual learning anti-poisoning controls.
  * **Unverified**: Telephony EER on real 8kHz cellular lines, multi-accent regional Indian voice resiliency.
* **Next Implementation Phase**:
  * **Backend Track (Shub)**: **Phase B3 — Audio Buffering & Preprocessing (Redis Ring Buffer)**.
  * **Frontend Track (Sion)**: **Phase C1 & C2 — Contract Type System & App Shell Navigation**.

---

## 5. Critical Engineering Blockers & Technical Risks

| Blocker ID | Description | Impact | Target Resolution Phase |
| :--- | :--- | :--- | :--- |
| **BLK-01** | **Unpopulated `models/` Directory**: Missing committed ONNX files (`silero_vad.onnx`, `resnet18_acoustic_quantized.onnx`, `ecapa_tdnn_192.onnx`). | Backend runs mock random-number fallbacks instead of real AI inference. | **Phase B4, B6, B8, B11** |
| **BLK-02** | **RESOLVED in Phase B1**: Monolithic `backend/main.py` modularized into single-responsibility packages. | Resolved. Clean architecture established. | **Closed** |
| **BLK-03** | **Open PITCH Validation Loop**: Challenge phrases sent to UI, but backend lacks automated latency & pitch excursion checks. | PITCH functions only as a UI visual challenge rather than a true cognitive defense. | **Phase B12 & D6** (PITCH Engine & Closed-Loop Integration) |
| **BLK-04** | **Unauthenticated Endpoints**: No API keys or token verification on `/v1/stream/call` or `/v1/transaction`. | Public endpoints vulnerable to unauthorized stream injection and DoS. | **Phase B19 & E1** (API Hardening & Security Validation) |

---

## 6. Immediate Next Implementation Phase

### Parallel Phase Execution: Backend Track (Shub) & Frontend Track (Sion)
* **Backend Track (Shub)**: **Phase B3** — Audio Buffering & Preprocessing (Redis Ring Buffer).
* **Frontend Track (Sion)**: **Phase C1 & C2** — Contract type imports (`lib/types/`), Next.js App Router structure, and cybernetic dark shell (`LimelightNavbar.tsx`).

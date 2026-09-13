# VaaniShield: Project State Ledger (`MEMORY.md`)

| Ledger Attribute | Current Project State |
| :--- | :--- |
| **Project Name** | VaaniShield (वाणिShield) — AI Voice Integrity & Anti-Spoofing Platform |
| **Repository** | `Sayan-Mukherjee99/Voice-Cloning-Prototype` |
| **Current Project Phase** | **Phase 1 Completed** (Architecture & Documentation Lock) |
| **Next Recommended Phase**| **Phase 2** (Core Audio Streaming & Ingestion Stability) |
| **Documentation Lock Status**| **LOCKED (v1.0.0)** — All core architectural specifications frozen |
| **Ledger Last Updated** | September 2026 |

---

## 1. Documentation Status Matrix

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   DOCUMENTATION STATUS MATRIX                                    │
├────────────────────┬──────────┬─────────────────────────────────┬────────────────────────────────┤
│ Document           │ Status   │ Major Findings & Scope Summary  │ Required Engineering Follow-up │
├────────────────────┼──────────┼─────────────────────────────────┼────────────────────────────────┤
│ PRD.md             │ LOCKED   │ 20 mandatory capabilities, 7    │ Guide for acceptance criteria  │
│                    │ (v1.0.0) │ personas, threat model, user    │ and feature prioritization     │
│                    │          │ journeys, strict MVP cut line.  │ during development phases.     │
├────────────────────┼──────────┼─────────────────────────────────┼────────────────────────────────┤
│ TRD.md             │ LOCKED   │ 46 technical sections, streaming│ Refactor monolithic main.py;   │
│                    │ (v1.0.0) │ dataflow, latency budgets, DB   │ implement modular package      │
│                    │          │ schema (pgvector), Redis ring.  │ layout in Phase 2/3.           │
├────────────────────┼──────────┼─────────────────────────────────┼────────────────────────────────┤
│ SECURITY.md        │ LOCKED   │ 41 security areas, 8 attack     │ Implement API key auth and RLS │
│                    │ (v1.0.0) │ trees (A-H), DPDP zero audio at │ policies in Phase 9 security   │
│                    │          │ rest, fail-secure gate matrix.  │ hardening milestone.           │
├────────────────────┼──────────┼─────────────────────────────────┼────────────────────────────────┤
│ AI_ARCHITECTURE.md │ LOCKED   │ 12-stage pipeline, Silero VAD,  │ Package quantized ONNX weights │
│                    │ (v1.0.0) │ ResNet-18 INT8, Parselmouth     │ in models/ to eliminate mock   │
│                    │          │ prosody, ECAPA-TDNN, PITCH.     │ fallbacks in Phase 4.          │
├────────────────────┼──────────┼─────────────────────────────────┼────────────────────────────────┤
│ PHASES.md          │ LOCKED   │ 11-phase execution roadmap,     │ Execute Phase 2 (Audio Stream  │
│                    │ (v1.0.0) │ 10-step demo script, MVP cut    │ Ingestion) as immediate next   │
│                    │          │ line, quality & memory gates.   │ engineering sprint.            │
├────────────────────┼──────────┼─────────────────────────────────┼────────────────────────────────┤
│ AI_INSTRUCTIONS.md │ ACTIVE   │ AI agent operating directives,  │ Binding rules for all AI       │
│                    │ (v1.0.0) │ grounding rules, scope limits.  │ coding agents in this repo.    │
├────────────────────┼──────────┼─────────────────────────────────┼────────────────────────────────┤
│ MEMORY.md          │ ACTIVE   │ Persistent project state ledger,│ Append state entry at the end  │
│                    │ (v1.0.0) │ audit history, active blockers. │ of every completed phase.      │
└────────────────────┴──────────┴─────────────────────────────────┴────────────────────────────────┘
```

---

## 2. Repository & Technical Baseline

### 2.1 Technology Stack & Versions
* **Operating System**: Windows (Host) / Linux Containers (Docker Compose).
* **Backend Runtime**: Python 3.11-slim, FastAPI 0.115.5, Uvicorn 0.32.1, Pydantic v2.
* **Frontend Runtime**: Next.js 16.3.4 (App Router), React 19.2.8, Tailwind CSS v4, Zustand 5.0.15, Framer Motion 13.2.0.
* **In-Memory Cache**: Redis 7.2-alpine (Circular ring buffer, `allkeys-lru` eviction).
* **Database**: PostgreSQL 16 with `pgvector` 0.3.6 (IVFFlat cosine distance indexing).
* **ML Runtimes**: ONNX Runtime 1.20.1 (`CPUExecutionProvider`), PyTorch 2.4.1 (CPU-only utility), Librosa 0.10.2, SciPy 1.14.1, SoundFile 0.12.1.
* **Acoustic DSP**: Praat Parselmouth 0.4.4 (C-bindings for biomechanical micro-prosody).

### 2.2 Baseline Implementation Reality
* **Streaming Transport**: Operational WebSocket `/v1/stream/call/{session_id}` accepting binary PCM audio.
* **Buffering**: Operational Redis ring buffer using `LPUSH` + `LTRIM` (24 frames) with 15s `EXPIRE` and in-memory deque fallback.
* **Relational Persistence**: PostgreSQL schema defined in `backend/database.sql` covering `call_sessions`, `chunk_telemetry`, `enrolled_voiceprints`, and `transaction_evaluations`.
* **State Machine**: Operational `ThreatState` class applying asymmetric EMA smoothing ($\alpha_{\text{up}}=0.65, \alpha_{\text{down}}=0.25$) and threat level transitions (GREEN, AMBER, RED).
* **Pre-Transaction Gate**: Operational `POST /v1/transaction/evaluate-authorization` returning HTTP 403 on RED.
* **Frontend UI**: Operational Next.js dashboard with `LimelightNavbar`, real-time `ThreatDial`, `SpectrogramCanvas` waterfall, `ProsodyChart`, and interactive `MockBankingGate`.
* **Current Weakness / Gap**: Model files in `models/` are unpopulated in git, forcing the backend `InferenceEngine` to execute heuristic/random mock fallbacks.

---

## 3. Architecture Baseline

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   LOCKED ARCHITECTURAL CONSTANTS                                 │
├──────────────────────────┬─────────────────────────────┬─────────────────────────────────────────┤
│ Architectural Dimension  │ Value / Specification       │ Rationale                               │
├──────────────────────────┼─────────────────────────────┼─────────────────────────────────────────┤
│ Audio Ingestion Format   │ 16kHz 16-bit Mono Linear PCM│ Standardized across Web Audio & ML      │
│ Ingestion Frame Size     │ 1,024 samples (64 ms)       │ Granular network chunk size             │
│ Sliding Analysis Window  │ 24 frames (1,536 ms)        │ Minimum duration for prosody analysis   │
│ Analysis Hop Cadence     │ 12 frames (768 ms)          │ 50% window overlap; ~1.3 updates/sec    │
│ VAD Silence Threshold    │ Speech Ratio < 0.15 Discard │ Bypasses neural inference on silence    │
│ Spectrogram Geometry     │ 80 mel bins, 25ms/10ms STFT │ Optimized for vocoder artifact detection│
│ ResNet Inference Latency │ < 25 ms (p95 Target)        │ Quantized INT8 ONNX on edge CPU         │
│ Parselmouth Latency      │ < 40 ms (p95 Target)        │ Asynchronous threadpool execution       │
│ Speaker Embedding        │ 192-dim ECAPA-TDNN Vector   │ L2-normalized; cosine distance matching │
│ EMA Escalation Alpha     │ α_escalate = 0.65           │ Reaches RED within 2 analysis hops      │
│ EMA De-escalation Alpha  │ α_deescalate = 0.25         │ Deliberate 4.5s recovery to GREEN       │
│ Threat State Boundaries  │ GREEN <40, AMBER 40-74, RED │ Hard block on RED (HTTP 403)            │
│ Data Privacy SLA         │ Zero raw audio at rest      │ DPDP Act 2023 compliance; 15s Redis TTL │
└──────────────────────────┴─────────────────────────────┴─────────────────────────────────────────┘
```

---

## 4. Current Phase & Progress Ledger

### Phase 1 Completion Record: Architecture & Documentation Lock
* **Timestamp**: September 2026
* **Status**: **SUCCESS**
* **Files Created**:
  1. `PRD.md` (Product Requirements Document — 20 capabilities, 7 personas, threat model)
  2. `TRD.md` (Technical Requirements Document — 46 technical sections, streaming pipeline)
  3. `SECURITY.md` (Security Architecture — 41 domains, 8 attack trees, DPDP controls)
  4. `AI_ARCHITECTURE.md` (AI Specification — 12-stage pipeline, VAD, prosody, ResNet-18)
  5. `PHASES.md` (Engineering Roadmap — 11 phases, 10-step demo script, MVP cut line)
  6. `AI_INSTRUCTIONS.md` (Operating Guidelines & Grounding Directives for AI Agents)
  7. `MEMORY.md` (Persistent Project State Ledger)
* **Files Modified**: None (clean documentation phase).
* **Major Decisions Made**:
  * Adopted INT8-quantized ResNet-18 over heavy foundation models (XLS-R) for sub-100ms CPU SLA.
  * Formulated asymmetric EMA ($\alpha=0.65 / 0.25$) over symmetric moving averages to stop attacks instantly.
  * Strictly enforced zero raw voice storage at rest with 15s Redis ring buffer TTL (DPDP compliance).
  * Excluded cellular call interception claims; targeted enterprise softphones and WebRTC clients.
* **Validation Performed**:
  * Cross-document audit verified consistency across audio frame geometry, risk scoring formulas, threat thresholds, database schemas, and phase dependency order.

---

## 5. Critical Engineering Blockers & Technical Risks

| Blocker ID | Description | Impact | Target Resolution Phase |
| :--- | :--- | :--- | :--- |
| **BLK-01** | **Unpopulated `models/` Directory**: Missing committed ONNX files (`silero_vad.onnx`, `resnet18_acoustic_quantized.onnx`, `ecapa_tdnn_192.onnx`). | Backend runs mock random-number fallbacks instead of real AI inference. | **Phase 4** (AI Anti-Spoofing & Model Packaging) |
| **BLK-02** | **Monolithic `backend/main.py`**: All 1,365 lines in single file. | Hard to maintain and unit test; high risk of merge conflicts. | **Phase 2 & 3** (Modularization during streaming refactor) |
| **BLK-03** | **Open PITCH Validation Loop**: Challenge phrases sent to UI, but backend lacks automated latency & pitch excursion checks. | PITCH functions only as a UI visual challenge rather than a true cognitive defense. | **Phase 5** (Speaker Verification & PITCH Integration) |
| **BLK-04** | **Unauthenticated Endpoints**: No API keys or token verification on `/v1/stream/call` or `/v1/transaction`. | Public endpoints vulnerable to unauthorized stream injection and DoS. | **Phase 9** (Security Hardening & Telephony Testing) |

---

## 6. Immediate Next Implementation Phase

### Phase 2: Core Audio Streaming & Ingestion Stability
* **Primary Objective**: Verify and harden the full-duplex binary WebSocket streaming loop (`/v1/stream/call/{session_id}`), ensure reliable 16kHz PCM downsampling in the browser, validate Redis circular ring buffer management (`LPUSH` + `LTRIM`), and guarantee zero dropped frames under continuous streaming.
* **Key Tasks**:
  1. `[VALIDATE]` Verify Web Audio capture downsampling in `frontend/hooks/useAudioStreamer.ts`.
  2. `[REFACTOR]` Harden WebSocket connection lifecycle and error recovery in `backend/main.py`.
  3. `[BUILD]` Enforce 15-second TTL on Redis keys and verify explicit purge in WebSocket `finally` block.
  4. `[BUILD]` Create automated streaming integration test (`backend/tests/test_streaming.py`).
* **Expected Output**: Stable, non-leaking streaming transport verified ready for neural inference integration.

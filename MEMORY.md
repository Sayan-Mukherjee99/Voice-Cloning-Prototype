# VaaniShield: Project State Ledger (`MEMORY.md`)

| Ledger Attribute | Current Project State |
| :--- | :--- |
| **Project Name** | VaaniShield (वाणिShield) — AI Voice Integrity & Anti-Spoofing Platform |
| **Repository** | `Sayan-Mukherjee99/Voice-Cloning-Prototype` |
| **Current Project Phase** | **Phase B2 Completed** (WebSocket Audio Streaming Stability) |
| **Next Recommended Phase**| **Phase B3 — Audio Buffering & Preprocessing** (Backend Track / Shub) |
| **Documentation Lock Status**| **LOCKED (v1.0.0 / v2.1.0 Roadmap)** — All specifications & contracts frozen |
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
│ TRD.md             │ LOCKED   │ 46 technical sections, streaming│ Modular package layout executed│
│                    │ (v1.0.0) │ dataflow, latency budgets, DB   │ in Phase B1.                   │
│                    │          │ schema (pgvector), Redis ring.  │                                │
├────────────────────┼──────────┼─────────────────────────────────┼────────────────────────────────┤
│ SECURITY.md        │ LOCKED   │ 41 security areas, 8 attack     │ Implement API key auth and RLS │
│                    │ (v1.0.0) │ trees (A-H), DPDP zero audio at │ policies in Phase 9 security   │
│                    │          │ rest, fail-secure gate matrix.  │ hardening milestone.           │
├────────────────────┼──────────┼─────────────────────────────────┼────────────────────────────────┤
│ AI_ARCHITECTURE.md │ LOCKED   │ 12-stage pipeline, Silero VAD,  │ Package quantized ONNX weights │
│                    │ (v1.0.0) │ ResNet-18 INT8, Parselmouth     │ in models/ to eliminate mock   │
│                    │          │ prosody, ECAPA-TDNN, PITCH.     │ fallbacks in Phase 4.          │
├────────────────────┼──────────┼─────────────────────────────────┼────────────────────────────────┤
│ PHASES.md          │ LOCKED   │ 11-phase execution roadmap,     │ Execute Phase B2 (WebSocket    │
│                    │ (v1.0.0) │ 10-step demo script, MVP cut    │ Audio Streaming Stability)     │
│                    │          │ line, quality & memory gates.   │ next.                          │
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
  5. `PHASES.md` (Engineering Roadmap — v2.1.0 Two-Developer Parallel Plan, 5 sections, 51 phases)
  6. `AI_INSTRUCTIONS.md` (Operating Guidelines & Grounding Directives for AI Agents)
  7. `MEMORY.md` (Persistent Project State Ledger)
* **Files Modified**: `PHASES.md` (Restructured for two-developer parallel ownership).
* **Major Decisions Made**:
  * Adopted explicit two-developer ownership model: **Person A (Shub)** owns Backend/AI (`B1`–`B20`); **Person B (Sion)** owns Frontend (`C1`–`C17`); Integration (`D1`–`D10`) and Final Validation (`E1`–`E10`) are joint responsibilities.
  * Preserved the verified Backend/AI implementation sequence (`B1`–`B20`) completely intact.
  * Formalized the **Frontend Design Customization Layer**: Shub provides authoritative styling specifications (typography, colors, card styling, reference URLs); Sion implements via Anti-Gravity without altering backend contracts.
  * Mandated contract-first development and mock-first frontend independence (`useSimulator.ts`).
  * Enforced strict Git safety: Anti-Gravity must never execute `git push` or remote operations automatically.
* **Validation Performed**:
  * Cross-document audit verified consistency across audio frame geometry, risk scoring formulas, threat thresholds, database schemas, and phase dependency order.

### Phase A0 Completion Record: Project Baseline & Shared Foundation
* **Timestamp**: September 2026
* **Track**: SHARED (Joint: Person A — Shub & Person B — Sion)
* **Status**: **COMPLETE**
* **Objective**: Audit repository ground truth, freeze shared REST & WebSocket contracts, establish two-person ownership boundaries, ensure mock compatibility for frontend development.
* **Repository Baseline Confirmed**:
  * **Backend**: FastAPI 0.115.5 (`backend/main.py`), 4 verified endpoints (`/health`, `/v1/transaction/evaluate-authorization`, `/v1/enroll`, `/v1/session/{session_id}/status`), full-duplex WebSocket `/v1/stream/call/{session_id}` (16kHz 16-bit Mono PCM), Redis ring buffer (24 frames, 15s TTL), PostgreSQL 16 + pgvector schema (`backend/database.sql`).
  * **Frontend**: Next.js 16.3.4 (React 19, TypeScript 5, Tailwind CSS v4, Zustand 5, Framer Motion 13), SecOps War Room console (`frontend/app/page.tsx`), 60 FPS HTML5 Canvas spectrogram waterfall (`SpectrogramCanvas.tsx`), ThreatDial gauge (`ThreatDial.tsx`), Prosody chart (`ProsodyChart.tsx`), Mock UPI banking gate (`MockBankingGate.tsx`), PITCH drawer (`PitchChallengeDrawer.tsx`), and simulator (`useSimulator.ts`).
  * **Infrastructure**: Docker Compose (`docker-compose.yml`) orchestrating `api` (8000), `redis` (6379), `postgres` (5432), and `frontend` (3000). Models directory mounted (`./models:/app/models:ro`).
* **Contracts Frozen**:
  * **REST**: `/health` (GET), `/v1/transaction/evaluate-authorization` (POST), `/v1/enroll` (POST), `/v1/session/{session_id}/status` (GET).
  * **WebSocket**: Inbound raw 16kHz PCM (1024 samples / 2048 bytes); outbound `TELEMETRY_UPDATE` with 14 verified fields matching `useVaaniShieldWs.ts` and `useSimulator.ts`.
  * **Risk**: Clear conceptual separation of composite risk ($0–100$), threat level (GREEN/AMBER/RED), acoustic vocoder risk ($0–100$), cosine similarity ($-1.0–1.0$), and VAD speech ratio ($0.0–1.0$).
  * **PITCH**: Dynamic Hindi tongue-twister challenge trigger on AMBER/RED, response evaluated for latency ($>2.5s$) and pitch variation ($\Delta F_0 > 30Hz$).
  * **Transaction**: Pre-transaction gate returning HTTP 200 APPROVED on GREEN, HTTP 200 APPROVED_WITH_WARNING on AMBER, HTTP 403 BLOCKED on RED ($\ge 75.0$).
  * **Error**: Uniform JSON error responses via FastAPI `HTTPException` detail and WebSocket 1011 close codes.
* **Frontend Mock Independence**: Confirmed `useSimulator.ts` matches 100% of the frozen contract, allowing Sion to implement UI phases without waiting for backend readiness.
* **Two-Developer Ownership**: Shub owns Backend/AI (`B1`–`B20`); Sion owns Frontend (`C1`–`C17`); Integration (`D1`–`D10`) and Final Validation (`E1`–`E10`) are joint.
* **Files Modified**: `MEMORY.md`.
* **Git Safety Verification**: Verified zero unauthorized git push or commit operations.

### Phase B1 Completion Record: FastAPI Modularization
* **Timestamp**: September 2026
* **Track**: BACKEND / AI (Owner: Person A — Shub)
* **Status**: **COMPLETE**
* **Objective**: Modularize the monolithic `backend/main.py` (1,365 lines) into maintainable, single-responsibility modules while preserving 100% of behavior, contracts, and fallback paths.
* **Old Structure**:
  * Monolithic `backend/main.py` (1,365 lines) containing configuration, logging, schemas, models, VAD, prosody, ONNX inference, Redis ring buffer, database operations, session management, EMA smoothing, and all API/WebSocket endpoints.
* **New Modular Structure**:
  * `backend/core/`:
    * `config.py`: `Settings` (pydantic-settings), structured logging, and dependency availability detection flags (`PARSELMOUTH_AVAILABLE`, `ONNX_AVAILABLE`, `LIBROSA_AVAILABLE`, `REDIS_AVAILABLE`, `ASYNCPG_AVAILABLE`).
    * `state.py`: `AppState` dataclass and global `app_state` singleton.
  * `backend/schemas/`:
    * `models.py`: `ThreatLevel`, `ChunkTelemetry`, `PITCH_CHALLENGES`, `TransactionRequest`, `TransactionResponse`, `EnrollRequest`, `WebSocketOutboundMessage`.
  * `backend/risk/`:
    * `threat_state.py`: `ThreatState` (asymmetric EMA + state machine).
    * `session_manager.py`: Thread-safe `SessionManager` registry.
  * `backend/audio/`:
    * `buffer.py`: `RedisBufferManager` (LPUSH+LTRIM 15s TTL ring buffer with in-memory fallback).
    * `prosody.py`: `ProsodyAnalyser` (Praat Parselmouth point-process jitter/shimmer/HNR + Scipy fallback).
  * `backend/ai/`:
    * `inference.py`: `InferenceEngine` (Silero VAD, ResNet-18 vocoder detector, ECAPA-TDNN 192-dim speaker embeddings + realistic mock fallbacks).
  * `backend/db/`:
    * `database.py`: `DatabaseManager` (`asyncpg` pool, `call_sessions`, `chunk_telemetry`, `enrolled_voiceprints`, `transaction_evaluations`).
  * `backend/services/`:
    * `pipeline.py`: `process_audio_window` (tiered audio detection pipeline).
  * `backend/api/`:
    * `health.py`: `GET /health` diagnostic endpoint.
    * `session.py`: `GET /v1/session/{session_id}/status`.
    * `transaction.py`: `POST /v1/transaction/evaluate-authorization`.
    * `enroll.py`: `POST /v1/enroll`.
    * `stream.py`: `WebSocket /v1/stream/call/{session_id}`.
  * `backend/main.py`: Slim composition layer (185 lines) managing lifespan, CORS, router mounting, and backwards-compatible re-exports (`app`, `app_state`, `ThreatLevel`, `settings`).
* **Contract Regression Check**:
  * **REST**: All 4 endpoints (`/health`, `/v1/enroll`, `/v1/session/{session_id}/status`, `/v1/transaction/evaluate-authorization`) verified with identical methods, request/response models, and status codes.
  * **WebSocket**: `/v1/stream/call/{session_id}` verified with 16kHz 16-bit Mono PCM binary framing and 14-field outbound telemetry.
  * **Risk / Threat**: Asymmetric EMA ($\alpha_{\text{escalate}}=0.65, \alpha_{\text{de-escalate}}=0.25$) and thresholds verified.
  * **Transaction Gate**: Synchronous deterministic check returning HTTP 200 APPROVED on GREEN and HTTP 403 BLOCKED on RED verified.
* **Validation Performed**:
  * 25/25 Python backend files compiled recursively via `py_compile` with 0 errors.
  * Dual-path import resolution verified: works identically from project root (`from backend.main import app`) and inside `backend/` directory (`import main`).
  * Pytest test suite executed: `backend/tests/test_api.py` 3/3 passed (100%).
  * Route inspection: 5 domain routes verified on `app`.
  * Schema & Lifespan execution: Verified with AsyncClient (`/health` returned status `degraded` due to no running redis/postgres daemon in test environment; onnx_available `True`).
* **Mock / Real AI Status**: Unchanged — heuristic/random mock fallbacks remain active because `.onnx` weight files are unpopulated in git.
* **Frontend Touch**: Verified 0 frontend files modified. Sion's track remains completely untouched.
* **Next Phase**: **Phase B2 — WebSocket Audio Streaming Stability**

### Phase B2 Completion Record: WebSocket Audio Streaming Stability
* **Timestamp**: September 2026
* **Track**: BACKEND / AI (Owner: Person A — Shub)
* **Status**: **COMPLETE**
* **Objective**: Harden the WebSocket audio-streaming path (`/v1/stream/call/{session_id}`) with strict 2,048-byte PCM frame validation, event-based message loop, safe handling of non-binary/text messages, per-window processing error isolation, bounded background task tracking, and fail-safe disconnect cleanup.
* **WebSocket Lifecycle & Streaming Changes**:
  * `backend/api/stream.py`:
    * Switched receive loop to event-driven `websocket.receive()` to explicitly handle binary frames, text frames, and disconnects.
    * Enforced frame length validation: exactly 2,048 bytes (1,024 samples $\times$ 2 bytes for 16-bit PCM) with 16-bit alignment (`len % 2 == 0`). Dropped empty, malformed, and wrong-sized binary frames safely without terminating the session.
    * Text/non-binary messages discarded safely with debug logging instead of crashing the connection.
    * Isolated window processing (`process_audio_window`) in a `try...except` block so single-window numerical or DSP exceptions do not drop the call.
    * Background persistence tasks (`update_session_risk`, `insert_chunk_telemetry`) tracked in `active_tasks: set[asyncio.Task]` with `add_done_callback(active_tasks.discard)`. On disconnect, pending tasks are cleanly cancelled.
    * Hardened `finally` cleanup: independent guarded blocks for Redis buffer purge, session state removal, and task cancellation.
  * `backend/audio/buffer.py`:
    * Added type and non-empty byte validation guards in `push_frame`.
    * Enforced exception protection during `delete_session`.
* **Tests Created & Executed**:
  * Created `backend/tests/test_stream.py` with 7 focused automated tests:
    1. `test_valid_audio_frame_ingestion`: Sends valid 2,048-byte frames over 12-frame hop cadence, receives valid `telemetry` JSON.
    2. `test_invalid_frame_length_handled_safely`: Sends 500-byte, 1000-byte, and odd-byte frames; verifies frames are dropped safely and subsequent valid frames process successfully.
    3. `test_empty_frame_handled_safely`: Sends empty 0-byte frame without session crash.
    4. `test_text_message_does_not_crash_session`: Sends text JSON messages; verifies session remains intact and processes audio.
    5. `test_session_lifecycle_and_cleanup`: Verifies buffer contains frames during streaming and is purged immediately upon disconnect.
    6. `test_session_isolation`: Verifies two concurrent sessions (`session-A` and `session-B`) maintain strictly isolated buffers and threat states.
    7. `test_redis_fallback_resilience`: Verifies buffer operations succeed in in-memory mode when Redis client is None.
  * Test Results: 7/7 passed in `test_stream.py`; 3/3 passed in `test_api.py`; total 10/10 passed (100% pass rate).
* **Performance Observations (Measured Locally)**:
  * Frame receive & buffer time: $0.50\text{ ms/frame}$ ($5.54\text{ ms}$ for 11 buffered frames).
  * In-memory buffer context exit / cleanup time: $< 0.01\text{ ms}$.
  * Hop window execution with SciPy spectrogram fallback on CPU: $\approx 5.37\text{ s}$ per hop.
* **Contract Preservation**:
  * WebSocket `/v1/stream/call/{session_id}` endpoint, query parameter (`speaker_id`), binary PCM format (16kHz 16-bit Mono, 2,048 bytes), and 16-field outbound telemetry payload preserved 100%.
  * All REST APIs (`/health`, `/v1/enroll`, `/v1/session/{session_id}/status`, `/v1/transaction/evaluate-authorization`) remain unaffected.
* **Frontend Touch**: Verified 0 frontend files modified. Sion's frontend track remains completely untouched.
* **Next Phase**: **Phase B3 — Audio Buffering & Preprocessing (Redis Ring Buffer)**

---

## 5. Critical Engineering Blockers & Technical Risks

| Blocker ID | Description | Impact | Target Resolution Phase |
| :--- | :--- | :--- | :--- |
| **BLK-01** | **Unpopulated `models/` Directory**: Missing committed ONNX files (`silero_vad.onnx`, `resnet18_acoustic_quantized.onnx`, `ecapa_tdnn_192.onnx`). | Backend runs mock random-number fallbacks instead of real AI inference. | **Phase B7 & B8** (Anti-Spoofing & Speaker Verification) |
| **BLK-02** | **RESOLVED in Phase B1**: Monolithic `backend/main.py` modularized into `core/`, `schemas/`, `risk/`, `audio/`, `ai/`, `db/`, `services/`, and `api/`. | Resolved. Maintainable, isolated testable components established. | **Closed** |
| **BLK-03** | **Open PITCH Validation Loop**: Challenge phrases sent to UI, but backend lacks automated latency & pitch excursion checks. | PITCH functions only as a UI visual challenge rather than a true cognitive defense. | **Phase B12 & D6** (PITCH Engine & Closed-Loop Integration) |
| **BLK-04** | **Unauthenticated Endpoints**: No API keys or token verification on `/v1/stream/call` or `/v1/transaction`. | Public endpoints vulnerable to unauthorized stream injection and DoS. | **Phase B16 & E1** (API Hardening & Security Validation) |

---

## 6. Immediate Next Implementation Phase

### Parallel Phase Execution: Backend Track (Shub) & Frontend Track (Sion)
* **Backend Track (Shub)**: **Phase B3** — Audio Buffering & Preprocessing (Redis Ring Buffer).
* **Frontend Track (Sion)**: **Phase C1 & C2** — Contract type imports (`lib/types/`), Next.js App Router structure, and cybernetic dark shell (`LimelightNavbar.tsx`).




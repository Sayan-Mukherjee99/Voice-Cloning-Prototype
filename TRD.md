# Technical Requirements Document (TRD)

# VaaniShield: AI-Powered Real-Time Voice Integrity & Impersonation Detection Platform

| Document Attribute | Specification Detail |
| :--- | :--- |
| **Document Version** | 2.0.0-TECH-SPEC |
| **Status** | Engineering Architectural Baseline / Deepfake-First Realignment |
| **System Architecture ID** | ARCH-VAANI-2026-V2 |
| **Associated Product Document**| `PRD.md` (v2.0.0-PROD-SPEC) |
| **Reference Repository** | `Sayan-Mukherjee99/Voice-Cloning-Prototype` |
| **Core Architecture** | Real-Time Speaker-Independent Voice Deepfake & Anti-Spoof Detection Engine |
| **Target Execution Tier** | Phase 1 (Hackathon MVP / Demo-Grade), Phase 2 (Enterprise Pilot), Phase 3 (Carrier Infrastructure) |
| **Project Ownership** | Person A: **Shub** (Backend / AI) \| Person B: **Sion** (Frontend) |

---

## 1. Document Overview & Architectural Context

This Technical Requirements Document (TRD) establishes the technical blueprint, component specifications, streaming contracts, signal processing pipelines, machine learning serving topologies, database schemas, and learning architectures for **VaaniShield**.

The primary technical mandate of VaaniShield is:
> **Ingest streaming audio in real time and classify whether the speech contains evidence of synthetic, cloned, converted, or replayed manipulation — operating independently of speaker enrollment.**

Speaker verification is refactored into an **optional secondary capability** rather than the primary gatekeeper.

### 1.1 Architectural Guarantees
1. **Speaker-Independent Detection by Default (Mode A)**: Analyzes incoming audio from unknown, first-time, or un-enrolled callers with zero prior voiceprint database requirements.
2. **Sub-100ms Streaming Turnaround (p95 TARGET)**: The streaming analysis loop (ingestion, frame validation, VAD, preprocessing, anti-spoof inference, prosodic modeling, and Asymmetric EMA smoothing) must execute in under 100 ms per 768 ms analysis hop on standard edge CPU hardware.
3. **Sub-35ms Pre-Transaction Decision SLA (p99 TARGET)**: The synchronous transaction authorization gate (`POST /v1/transaction/evaluate-authorization`) returns a deterministic decision (`APPROVED` vs. `BLOCKED` with HTTP 403) in under 35 ms.
4. **Zero Raw Voice Storage at Rest**: In strict compliance with India's **Digital Personal Data Protection (DPDP) Act 2023**, raw audio bytes reside strictly in volatile Redis ring buffers bounded by a 15-second Time-To-Live (TTL). No persistent audio files or blobs touch disk or database tables.
5. **Zero-Cost / Free-First Local Architecture**: The core system runs entirely on open-source runtimes (Python, FastAPI, ONNX Runtime, SciPy, Librosa, Redis, SQLite) and the Supabase Free Tier. No mandatory paid commercial APIs (LLMs, speech APIs, cloud GPUs) are required.

---

## 2. Architectural Audit & Implementation Maturity Matrix

All subsystem states within the repository are classified according to the standardized status taxonomy:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                CURRENT IMPLEMENTATION MATURITY MATRIX                            │
├──────────────────────┬─────────────────────────┬─────────────────────────────────────────────────┤
│ Implementation State │ Subsystem / Component   │ Current Implementation Details                  │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ IMPLEMENTED          │ WebSocket Transport     │ Full-duplex WS at /v1/stream/call/{session_id}   │
│                      │ Redis Ring Buffer       │ LPUSH + LTRIM with 15s EXPIRE; in-memory deque   │
│                      │ Threat State Machine    │ ThreatState class with asymmetric EMA smoothing │
│                      │ Transaction Gate API    │ POST /v1/transaction/evaluate-authorization     │
│                      │ Speaker Enrollment API  │ POST /v1/enroll extracting & persisting vectors │
│                      │ Frontend Dashboard      │ Next.js 16, Zustand store, ThreatDial, Gate UI │
│                      │ Web Audio Mic Streamer  │ useAudioStreamer capturing 16kHz PCM frames     │
│                      │ Biomechanical Prosody   │ Praat Parselmouth extracts F0, Jitter, Shimmer  │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ PARTIALLY            │ Audio Preprocessing     │ Librosa / Scipy mel-spectrogram extraction      │
│ IMPLEMENTED          │ Backend Modularization  │ Modular package layout in backend/ai, api, db   │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ MOCK / FALLBACK      │ Neural Anti-Spoofing    │ Heuristic fallback when resnet18.onnx is absent │
│                      │ Silero VAD              │ RMS energy thresholding when ONNX is absent     │
│                      │ ECAPA-TDNN Embedding    │ Hash-seeded random unit vectors when absent     │
│                      │ Telemetry Simulator     │ useSimulator generating synthetic UI cycles     │
│                      │ Synthetic Audio Inject  │ useAudioStreamer generating synthetic sines     │
│                      │ PITCH Challenge Logic   │ Static UI drawer; lacks backend acoustic check  │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ PLANNED / RESEARCH   │ Primary Anti-Spoof Model│ Pretrained AASIST / RawNet2 ONNX integration    │
│                      │ Closed-Loop PITCH Check │ Backend response latency and intonation check   │
│                      │ Telephony Transcoding   │ AMR-NB/WB bandpass simulation and filter        │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ PROPOSED             │ Dual Database Topology  │ Supabase Free (PostgreSQL/vector) + SQLite log  │
│                      │ Self-Learning Registry  │ SQLite metadata logging with validation gates   │
│                      │ Anti-Poisoning Controls │ Quarantine pool and holdout evaluation runner   │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ EXPERIMENTAL         │ Temporal Sequence Model │ Lightweight Transformer / GRU over hop windows  │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ UNVERIFIED           │ Telephony Codec EER     │ Anti-spoof EER under real 8kHz AMR-NB cell calls│
│                      │ Multi-Accent Resiliency │ False positive rates on regional Indian accents │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ DEFERRED             │ Foundation Audio Models │ Heavy Wav2Vec2 / Whisper models (violates SLA)  │
│                      │ Carrier SIPREC SBC Fork │ Phase 3 enterprise telecom integration          │
└──────────────────────┴─────────────────────────┴─────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Architecture Ready $\neq$ Validated Model Ready.**
> The current repository contains the pipeline scaffolding, endpoints, and mock fallbacks, but model weights in `models/` are unpopulated. Real deepfake detection capability is PLANNED and will be marked complete only after AASIST/RawNet2 weights are integrated and evaluated.

---

## 3. System Architecture & Dual-Database Topology

### 3.1 Logical Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      PRESENTATION LAYER                                         │
│  Next.js 16 (React 19) • Tailwind CSS • Framer Motion • HTML5 Canvas Spectrogram • Zustand Store│
│  [Audio Streamer Hook]  [Live Telemetry Hook]  [Mock Banking Gate]  [PITCH Challenge Drawer]    │
└─────────────────────────────────┬───────────────────────────────┬───────────────────────────────┘
                                  │ Binary 16kHz PCM              │ REST / JSON
                                  ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      INGESTION & API LAYER                                      │
│  FastAPI Gateway (Uvicorn Async Workers) • HTTP/2 & WebSocket (RFC 6455)                        │
│  ├── WS /v1/stream/call/{session_id} (Streaming PCM Ingestion & Telemetry Egress)               │
│  ├── POST /v1/transaction/evaluate-authorization (Synchronous Pre-Transaction Gating)           │
│  ├── POST /v1/enroll (Optional Speaker Voiceprint Registration - Mode B)                        │
│  └── GET /health (Readiness / Liveness Diagnostics)                                             │
└─────────────────────────────────┬───────────────────────────────┬───────────────────────────────┘
                                  │ Sliding Frames                │ Session State
                                  ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   IN-MEMORY EPHEMERAL BUFFER                                    │
│  Redis 7.2 Circular Ring Buffer (LPUSH + LTRIM) • 15-Second TTL (DPDP Act 2023)                 │
│  [In-Memory Thread-Safe Deque Fallback: collections.deque(maxlen=24)]                           │
└─────────────────────────────────┬───────────────────────────────────────────────────────────────┘
                                  │ 1,536ms Audio Window (768ms Hop Cadence)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                MULTI-TIER AI INFERENCE PIPELINE                                 │
│                                                                                                 │
│  [TIER 0: VAD] ────────► Silero VAD (ONNX Quantized) ──► Silence Strip (<15% speech discard)    │
│                                                                                                 │
│  [PRIMARY ENGINE] ─────► Speaker-Independent Anti-Spoof (AASIST / RawNet2 Pretrained ONNX)     │
│                          Classifies Bona Fide Human vs. Synthetic/Cloned/Converted/Replayed     │
│                                                                                                 │
│  [AUXILIARY SIGNALS] ──► 80-bin Log-Mel Spectrogram ──► ResNet-18 Quantized Vocoder ONNX (<25ms)│
│                     └──► Biomechanical Prosody (Praat Parselmouth / SciPy: F0, Jitter, Shimmer) │
│                                                                                                 │
│  [OPTIONAL MODE B] ────► ECAPA-TDNN 192-dim Embedding ONNX ──► Cosine Sim vs. Supabase pgvector│
│                          (Runs only when speaker_id provided; High Sim != Genuine)              │
│                                                                                                 │
│  [ACTIVE DEFENSE] ─────► PITCH Dynamic Phonetic Challenge ──► Conversational Latency & Modulation│
└─────────────────────────────────┬───────────────────────────────────────────────────────────────┘
                                  │ Raw Detection Scores
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                RISK FUSION & STATE MACHINE ENGINE                               │
│  Multi-Signal Weighted Fusion ──► Asymmetric EMA Filter (α_up=0.65, α_down=0.25)                │
│  Threat State Machine: GREEN (<40.0) ──► AMBER (40.0-74.9) ──► RED (>=75.0) with Hysteresis    │
└─────────────────────────────────┬───────────────────────────────┬───────────────────────────────┘
                                  │ Telemetry JSON                │ Hard 403 / Audit
                                  ▼                               ▼
┌─────────────────────────────────────────────────┬───────────────────────────────────────────────┐
│        SUPABASE APPLICATION DATABASE            │          SQLITE LEARNING REGISTRY             │
│  (Managed PostgreSQL 16 + pgvector - Free Tier) │          (Local File: vaani_learning.db)      │
│  • call_sessions (Active session states)        │  • learning_events (Per-hop predictions)      │
│  • enrolled_voiceprints (Mode B vectors)        │  • feedback_records (Operator ground truth)   │
│  • transaction_evaluations (Audit ledger)       │  • training_candidates (Quarantine & Provenance│
│  • model_metadata & active version tags         │  • holdout_evaluations & rollback ledger      │
└─────────────────────────────────────────────────┴───────────────────────────────────────────────┘
```

### 3.2 Dual-Database Pattern (Supabase Free + SQLite)
To strictly enforce the **Zero-Cost / Free-First** requirement, storage is partitioned:
1. **Supabase (PostgreSQL 16 + pgvector)**:
   - Operates within the **Supabase Free Tier** ($0/month, 500 MB DB, 1 GB storage, up to 50k MAU).
   - Houses persistent application state: active sessions, transaction evaluations, operator auth, and optional enrolled speaker vectors.
   - Evaluates vector cosine distance via `pgvector` IVFFlat indexing:
     ```sql
     SELECT speaker_id, 1 - (embedding <=> $1) AS similarity 
     FROM enrolled_voiceprints 
     WHERE speaker_id = $2;
     ```
2. **SQLite (`vaani_learning.db`)**:
   - Embedded, zero-configuration local relational database.
   - High-write throughput for real-time model telemetry, feature hashes, operator feedback, quarantine logs, and candidate retraining batches.
   - Completely isolated from runtime operational traffic; zero server cost.

---

## 4. End-to-End Streaming & Dataflow Architecture

### 4.1 Step-by-Step Streaming Pipeline

```text
Live Audio Stream (16kHz 16-bit Mono Linear PCM)
   ↓
WebSocket Ingestion (/v1/stream/call/{session_id})
   ↓
Frame Validation (Verify 1,024 samples / 2,048 bytes)
   ↓
Redis Ring Buffer (LPUSH / LTRIM max 24 frames = 1,536ms; 15s TTL)
   ↓
Hop Cadence Trigger (Every 12 frames = 768ms)
   ↓
VAD Silence Stripping (Silero ONNX: discard if speech ratio < 0.15)
   ↓
Preprocessing & Quality Check (Float32 [-1, 1], DC offset removal, Hann window)
   ↓
PRIMARY ENGINE: Speaker-Independent Anti-Spoof (AASIST / RawNet2 Waveform Model)
   ↓
┌───────────────────────────────────────┴───────────────────────────────────────┐
▼                                                                               ▼
Auxiliary Acoustic / Spectral Evidence                               Biomechanical Prosodic Evidence
(ResNet-18 Log-Mel Spectrogram -> Vocoder Risk)                       (Praat Parselmouth -> F0, Jitter, Shimmer, HNR)
│                                                                               │
└───────────────────────────────────────┬───────────────────────────────────────┘
                                        ↓
                         Optional Speaker Verification (Mode B)
                         (ECAPA-TDNN 192-dim vector vs. Supabase pgvector)
                                        ↓
                         Multi-Signal Feature / Score Fusion
                                        ↓
                         Temporal Aggregation (Asymmetric EMA)
                         (α_escalate = 0.65, α_deescalate = 0.25)
                                        ↓
                         Threat State Machine (Hysteresis)
                         (GREEN <40.0, AMBER 40.0–74.9, RED >=75.0)
                                        ↓
┌───────────────────────────────────────┴───────────────────────────────────────┐
▼                                                                               ▼
Active PITCH Challenge                                               Pre-Transaction Security Gate
(Triggered on AMBER / RED)                                           (POST /v1/transaction/evaluate-authorization)
│                                                                               │
└───────────────────────────────────────┬───────────────────────────────────────┘
                                        ↓
                            Deterministic Intervention
                        (HTTP 200 Allow / HTTP 403 Hard Block)
```

---

## 5. Model Research & Candidate Selection Framework

### 5.1 Open-Source Anti-Spoof Model Study
The project evaluated authoritative speech deepfake and countermeasure architectures from the **ASVspoof 2021** and **ASVspoof5** research benchmarks:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             CANDIDATE MODEL EVALUATION MATRIX                                    │
├─────────────────────┬──────────────────────┬──────────────────────┬──────────────────────────────┤
│ Selection Dimension │ AASIST / AASIST-L    │ RawNet2              │ Existing ResNet-18 Path      │
├─────────────────────┼──────────────────────┼──────────────────────┼──────────────────────────────┤
│ Reference Repo      │ clovaai/aasist       │ ASVspoof Baseline    │ Custom Spectrogram Baseline  │
│ Primary Focus       │ Integrated Graph Attn│ End-to-End Raw Sinc  │ 2D CNN over Log-Mel Spec     │
│ Input Format        │ Raw 16kHz Waveform   │ Raw 16kHz Waveform   │ 80-bin Log-Mel Spectrogram   │
│ Parameter Count     │ ~290K (L) / ~850K    │ ~14.4M               │ ~11.2M                       │
│ Inference Latency   │ < 25 ms (CPU TARGET) │ ~45 ms (CPU TARGET)  │ < 20 ms (CPU TARGET)         │
│ Memory Footprint    │ Very Small (<50 MB)  │ Moderate (~120 MB)   │ Moderate (~90 MB)            │
│ Telephony Resiliency│ High (Spectro-Temp)  │ Moderate             │ Low (Degrades on AMR 8kHz)   │
│ Pretrained Weights  │ Public (ASVspoof21)  │ Public (ASVspoof21)  │ Requires Custom Weights      │
│ Software License    │ MIT License          │ MIT License          │ MIT License                  │
│ ONNX Exportability  │ Supported            │ Supported            │ Native                       │
│ Project Decision    │ RECOMMENDED PRIMARY  │ REFERENCE / BACKUP   │ AUXILIARY ACOUSTIC SIGNAL    │
└─────────────────────┴──────────────────────┴──────────────────────┴──────────────────────────────┘
```

#### Detailed Model Findings:
1. **AASIST & AASIST-L (Integrated Spectro-Temporal Graph Attention Networks)**:
   * *Architecture*: SincNet raw waveform front-end followed by a heterogeneous graph attention layer modeling spectral and temporal graph representations concurrently.
   * *AASIST-L*: Lightweight variant with ~290K parameters. Delivers state-of-the-art anti-spoof discrimination at minimal CPU overhead.
   * *Status*: Selected as the **primary speaker-independent deepfake detection engine**.
   * *Benchmark Note*: Published EER numbers from `clovaai/aasist` (e.g., $0.83\%$ on ASVspoof 2021 LA) are **external benchmarks** and must not be reported as VaaniShield measurements.
2. **RawNet2**:
   * *Architecture*: End-to-end raw waveform processor using time-distributed convolutional layers and gated recurrent units (GRU).
   * *Status*: Maintained as an alternative reference anti-spoof architecture.
3. **Existing ResNet-18 Spectrogram Path**:
   * *Architecture*: 2D CNN operating over 80-bin log-mel filterbank spectrograms.
   * *Status*: Retained as an **auxiliary acoustic vocoder detector**. Provides complementary frequency-domain cues without masquerading as the primary deepfake classifier.
4. **ECAPA-TDNN Reclassification**:
   * *Status*: Reclassified strictly as an **optional speaker verification / identity signal** (Mode B).
   * *Rule*: High cosine similarity against an enrolled baseline does NOT prove speech is human.

### 5.2 Model Selection Criteria
Candidate models are selected based on rigorous engineering trade-offs:
1. **Speaker-Independent Generalization**: Must generalize across unseen voices and vocoders without caller enrollment.
2. **Codec / Telephony Robustness**: Must maintain discrimination when subjected to AMR-NB (8 kHz) and AMR-WB (16 kHz) lossy compression.
3. **CPU Inference Feasibility**: Must execute within $<35\text{ ms}$ on standard x86_64 CPU cores without requiring GPU hardware.
4. **Local / Offline Execution**: Must run completely locally via ONNX Runtime without network round-trips to commercial APIs.
5. **Licensing**: Must be permissively licensed (MIT / Apache 2.0).

### 5.3 Optional Sequence & Temporal Models
The platform allows future temporal modeling (e.g., lightweight GRU or mini-Transformer encoder) over sliding window score sequences. However, a temporal model will only be adopted if experimental validation shows it outperforms Asymmetric EMA smoothing without violating the $<100\text{ ms}$ hop latency budget.

### 5.4 Positioning of RAG
**RAG is NOT an audio deepfake detector.** RAG cannot process raw waveforms or spectrograms. RAG is designated as an **optional later-stage contextual intelligence layer** (e.g., retrieving banking fraud policies, transaction limits, or historical incident playbooks).

---

## 6. Continual / Self-Learning Pipeline & Poisoning Defense

VaaniShield implements a controlled continual-learning pipeline designed to improve detection over time while guarding against data poisoning.

```text
Inference Stream
       │
       ▼
Prediction + Metadata Logging (SQLite)
       │
       ▼
Feedback / Trusted Label Collection (SecOps / Validated User / PITCH Pass)
       │
       ▼
Validation & Quarantine Gate (Outlier check, duplicate check, provenance check)
       │
       ▼
Curated Training Batch (Minimum quorum: 500 genuine, 500 spoof)
       │
       ▼
Periodic Offline Retraining
       │
       ▼
Benchmark Holdout Evaluation Gate (Candidate EER evaluated against active model)
       │
       ├── Candidate Improves EER ──► Promote Model Version (Tag: model-vX.Y.Z)
       └── Candidate Degrades EER ──► Reject Candidate & Rollback to Active Version
```

### 6.1 Data Poisoning Protection Rules
1. **Source Provenance**: Every training candidate record must document its origin (`controlled_test`, `operator_review`, `pitch_pass`, `research_set`).
2. **Label Trust Tiering**: Unverified user feedback is held in quarantine and never enters training datasets automatically.
3. **Quarantine Pool**: Suspicious or conflicting labels are quarantined for manual SecOps audit.
4. **Immutable Holdout Benchmark**: Models must pass evaluation against an immutable holdout testset before deployment.
5. **Instant Rollback**: The runtime engine supports instant fallback to previous model versions via environment configuration (`ACTIVE_MODEL_VERSION`).

---

## 7. Database Schemas (Supabase Free + SQLite)

### 7.1 Supabase Schema (`backend/database.sql`)

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Mode B Enrolled Speaker Voiceprints
CREATE TABLE IF NOT EXISTS enrolled_voiceprints (
    speaker_id VARCHAR(64) PRIMARY KEY,
    display_name VARCHAR(128) NOT NULL,
    embedding vector(192) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_voiceprint_cosine ON enrolled_voiceprints 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Call Sessions
CREATE TABLE IF NOT EXISTS call_sessions (
    session_id VARCHAR(64) PRIMARY KEY,
    speaker_id VARCHAR(64) REFERENCES enrolled_voiceprints(speaker_id) ON DELETE SET NULL,
    threat_level VARCHAR(16) DEFAULT 'GREEN',
    current_risk_score DOUBLE PRECISION DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chunk Telemetry (Derived metrics ONLY; ZERO raw audio)
CREATE TABLE IF NOT EXISTS chunk_telemetry (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(64) REFERENCES call_sessions(session_id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    risk_score DOUBLE PRECISION NOT NULL,
    threat_level VARCHAR(16) NOT NULL,
    anti_spoof_score DOUBLE PRECISION,
    acoustic_score DOUBLE PRECISION,
    prosody_score DOUBLE PRECISION,
    f0_mean DOUBLE PRECISION,
    jitter_rap DOUBLE PRECISION,
    shimmer_apq5 DOUBLE PRECISION,
    hnr_db DOUBLE PRECISION,
    speaker_similarity DOUBLE PRECISION,
    latency_ms DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-Transaction Evaluations Audit Ledger
CREATE TABLE IF NOT EXISTS transaction_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(64) REFERENCES call_sessions(session_id),
    amount_inr NUMERIC(12, 2) NOT NULL,
    beneficiary_vpa VARCHAR(128),
    risk_score DOUBLE PRECISION NOT NULL,
    threat_level VARCHAR(16) NOT NULL,
    decision VARCHAR(32) NOT NULL, -- APPROVED, APPROVED_WITH_WARNING, PENDING_CHALLENGE, BLOCKED
    http_status INT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.2 SQLite Learning Registry Schema (`vaani_learning.db`)

```sql
-- Per-hop prediction metadata
CREATE TABLE IF NOT EXISTS learning_events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    model_version TEXT NOT NULL,
    anti_spoof_score REAL NOT NULL,
    acoustic_score REAL,
    prosody_score REAL,
    f0_mean REAL,
    jitter REAL,
    shimmer REAL,
    hnr REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Operator and User Feedback
CREATE TABLE IF NOT EXISTS feedback_records (
    feedback_id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    label TEXT CHECK (label IN ('GENUINE', 'SPOOF', 'INCONCLUSIVE')),
    source TEXT NOT NULL, -- 'operator_verified', 'user_report', 'pitch_pass'
    confidence REAL DEFAULT 1.0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Training Candidates Pool
CREATE TABLE IF NOT EXISTS training_candidates (
    candidate_id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    feature_hash TEXT UNIQUE NOT NULL,
    validated_label TEXT NOT NULL,
    provenance TEXT NOT NULL,
    status TEXT DEFAULT 'QUARANTINED' CHECK (status IN ('QUARANTINED', 'APPROVED', 'REJECTED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Retraining Batch & Version Registry
CREATE TABLE IF NOT EXISTS model_versions (
    version_id TEXT PRIMARY KEY,
    architecture TEXT NOT NULL, -- 'AASIST', 'RawNet2'
    holdout_eer REAL NOT NULL,
    promoted_at DATETIME,
    status TEXT DEFAULT 'CANDIDATE' CHECK (status IN ('CANDIDATE', 'ACTIVE', 'REJECTED', 'ROLLED_BACK'))
);
```

---

## 8. Requirements Traceability Matrix (RTM)

| TRD Spec ID | Architecture Component | PRD Requirement | Verification Method |
| :--- | :--- | :--- | :--- |
| **TRD-ING-01** | WebSocket Ingestion (`/v1/stream`) | FR-101, FR-102 | Load test streaming 16kHz PCM chunks |
| **TRD-BUF-01** | Redis 15s Ring Buffer | FR-201, FR-202 | Redis CLI audit verifying TTL expiry |
| **TRD-VAD-01** | Silero VAD Silence Stripping | FR-301 | Verify silence windows skip neural pipeline |
| **TRD-DET-01** | Speaker-Independent Anti-Spoof | FR-401 | Model evaluation on bona fide vs. spoof testset |
| **TRD-DET-02** | Auxiliary ResNet-18 Log-Mel | FR-402 | Latency and feature extraction unit tests |
| **TRD-PRO-01** | Parselmouth Prosody Engine | FR-501 | Verify $F_0$, jitter, shimmer extraction on test WAVs |
| **TRD-IDN-01** | Mode B ECAPA-TDNN Verification | FR-601, FR-602 | Cosine similarity query on Supabase pgvector |
| **TRD-RSK-01** | Asymmetric EMA & State Machine | FR-701, FR-702 | Verify rapid rise ($\alpha=0.65$) and slow decay |
| **TRD-GAT-01** | Pre-Transaction Gate (HTTP 403) | FR-801, FR-802 | Integration test confirming hard block on RED |
| **TRD-PCH-01** | Active PITCH Challenge | FR-901, FR-902 | UI and latency verification testing |
| **TRD-LRN-01** | SQLite Learning Registry | FR-1101, FR-1102| SQLite insert, holdout EER gating, and rollback test |
| **TRD-DB-01**  | Supabase Free + Local SQLite | FR-1201, FR-1202| Test suite passing with zero external paid APIs |

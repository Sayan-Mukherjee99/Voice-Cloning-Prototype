# Technical Requirements Document (TRD)

# VaaniShield: AI-Powered Speech Deepfake Detection & Voice Integrity Platform

| Document Attribute | Specification Detail |
| :--- | :--- |
| **Document Version** | 2.3.0-TECH-SPEC |
| **Status** | Engineering Architectural Baseline / Deepfake-First Realignment |
| **System Architecture ID** | ARCH-VAANI-2026-V2.3 |
| **Associated Product Document**| `PRD.md` (v2.3.0-PROD-SPEC) |
| **Reference Repository** | `Sayan-Mukherjee99/Voice-Cloning-Prototype` |
| **Core Architecture** | Speaker-Independent Speech Deepfake & Anti-Spoof Detection Engine |
| **Product Progression** | Phase 1 (Offline MVP) → Phase 2 (Streaming) → Phase 3 (Fusion) → Phase 4 (Identity) → Phase 5 (PITCH + Action) → Phase 6 (Self-Learning) |
| **Project Ownership** | Person A: **Shub** (Backend / AI) \| Person B: **Sion** (Frontend) |

---

## 1. Document Overview & Architectural Context

This Technical Requirements Document (TRD) establishes the technical specification, component boundaries, dataflows, candidate model evaluation framework, dataset strategy, database schemas, and learning lifecycle for **VaaniShield**.

The primary technical objective is:
> **Ingest audio and classify whether the speech contains evidence of synthetic, cloned, converted, or spoofed generation — operating independently of speaker enrollment.**

Speaker verification is refactored strictly into an **optional supporting identity branch**, not the primary detector.

### 1.1 Architectural Guarantees
1. **Speaker-Independent Detection by Default (Mode A)**: Operates on arbitrary, unknown, or un-enrolled speakers without requiring reference voiceprints.
2. **Offline MVP Foundation**: Ingests uploaded audio files (WAV, MP3) and generates comprehensive deepfake risk scores, categorical classifications (`REAL`, `SUSPICIOUS`, `AI-GENERATED`), and acoustic evidence.
3. **Streaming Turnaround (Phase 2 Adaptation)**: Adapts core detection to streaming audio with sub-100ms processing turnaround per 768ms hop on standard edge CPUs.
4. **Sub-35ms Pre-Transaction Decision SLA**: The synchronous transaction authorization gate (`POST /v1/transaction/evaluate-authorization`) returns a deterministic verdict (`APPROVED` vs. `BLOCKED` with HTTP 403) in under 35 ms.
5. **Zero Raw Voice Storage at Rest**: In compliance with India's **DPDP Act 2023**, raw audio is non-persistent by default. Transient streaming audio resides only in volatile Redis ring buffers (15-second TTL). No raw audio blobs touch permanent disk or database storage.
6. **Zero-Cost / Free-First Local Stack**: Runs completely on open-source runtimes (Python, FastAPI, ONNX Runtime, SciPy, Librosa, Redis, SQLite) and the Supabase Free Tier. No mandatory paid commercial APIs.

---

## 2. Architectural Audit & Implementation Maturity Matrix

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
│ MOCK / FALLBACK      │ Neural Anti-Spoofing    │ Heuristic fallback when model ONNX is absent    │
│                      │ Silero VAD              │ RMS energy thresholding when ONNX is absent     │
│                      │ ECAPA-TDNN Embedding    │ Hash-seeded random unit vectors when absent     │
│                      │ Telemetry Simulator     │ useSimulator generating synthetic UI cycles     │
│                      │ Synthetic Audio Inject  │ useAudioStreamer generating synthetic sines     │
│                      │ PITCH Challenge Logic   │ Static UI drawer; lacks backend acoustic check  │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ RESEARCH / PLANNED   │ Offline Deepfake MVP    │ Offline WAV/MP3 ingestion & baseline detector   │
│                      │ Candidate Baselines     │ ResNet, RawNet2, AASIST model experiments       │
│                      │ Model Metrics Suite     │ EER, ROC-AUC, FAR, FRR, confusion matrix        │
│                      │ Cross-Dataset Eval      │ ASVspoof 2021 DF generalization testing         │
│                      │ Multi-Signal Fusion     │ Weighted fusion of waveform, spectral, prosody  │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ PROPOSED             │ Dual Database Topology  │ Supabase Free (PostgreSQL/vector) + SQLite log  │
│                      │ Self-Learning Registry  │ SQLite metadata logging with validation gates   │
│                      │ Anti-Poisoning Controls │ Quarantine pool and holdout evaluation runner   │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ UNVERIFIED           │ Telephony Codec EER     │ Anti-spoof EER under real 8kHz AMR-NB cell calls│
│                      │ Multi-Accent Resiliency │ False positive rates on regional Indian accents │
└──────────────────────┴─────────────────────────┴─────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Architecture Ready $\neq$ Validated Model Ready.**
> Scaffolding, endpoints, and mock fallbacks exist, but model weights in `models/` remain unpopulated. Real deepfake detection capability is PLANNED and will be marked validated only after candidate models are trained/benchmarked on local research datasets in Phase B4 and B5.

---

## 3. Structural Decomposition: Five Core Subsystems

The technical architecture strictly decouples into five functional subsystems:

```text
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           1. PRIMARY DETECTOR SUBSYSTEM                           │
│  Speaker-Independent Deepfake Detection (Waveform / Acoustic Feature Space)       │
│  Candidate Models: ResNet Baseline, RawNet2, AASIST / AASIST-L                    │
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          │
        ┌─────────────────────────────────┼─────────────────────────────────┐
        ▼                                 ▼                                 ▼
┌───────────────────────────────┐ ┌───────────────────────────────┐ ┌───────────────────────────────┐
│     2. SUPPORTING SIGNALS     │ │  3. OPTIONAL IDENTITY BRANCH  │ │        4. RISK LAYER          │
│ • Acoustic/Spectral (CNN Mel) │ │ • ECAPA-TDNN 192-dim vector   │ │ • Temporal Smoothing (EMA)    │
│ • Prosody (F0, Jitter, Shimmer│ │ • Supabase pgvector Cosine Sim│ │ • Threat State Machine        │
│ • Temporal Continuity         │ │ • High Sim != Authentic Human │ │ • REAL / SUSPICIOUS / SYNTH   │
└───────────────┬───────────────┘ └───────────────┬───────────────┘ └───────────────┬───────────────┘
                │                                 │                                 │
                └─────────────────────────────────┼─────────────────────────────────┘
                                                  ▼
                                ┌───────────────────────────────────┐
                                │        5. SECURITY ACTION         │
                                │ • Active PITCH Challenge Protocol │
                                │ • Pre-Transaction Gate (HTTP 403) │
                                └───────────────────────────────────┘
```

### 3.1 Subsystem 1: Primary Detector (Speaker-Independent Deepfake Detection)
* **Role**: Primary engine answering: *"Does this audio exhibit characteristics of synthetic or spoofed speech?"*
* **Operation**: Analyzes audio representations directly without requiring enrolled speaker profiles.
* **Candidate Model Architectures**:
  1. *ResNet Acoustic Baseline*: 2D CNN operating over 80-bin log-mel filterbanks ($25\text{ ms}$ window, $10\text{ ms}$ hop).
  2. *RawNet2*: Time-distributed convolutional layers and gated recurrent units (GRUs) processing raw 16kHz waveforms.
  3. *AASIST / AASIST-L*: Integrated Spectro-Temporal Graph Attention Network modeling raw waveform spectral and temporal graphs.
* **Intellectual Honesty Mandate**: No candidate model is claimed as the final production model. External benchmarks are external reference literature only.

### 3.2 Subsystem 2: Supporting Signals (Acoustic & Prosodic Features)
* **Acoustic / Spectral Cues**: High-frequency spectral roll-off, vocoder checkerboard upsampling artifacts, and abnormal spectral centroid variance.
* **Biomechanical Prosody (Praat Parselmouth)**:
  * Fundamental pitch ($F_0$) trajectory, mean, and variance ($60–400\text{ Hz}$).
  * Cycle-to-cycle pitch perturbation (Jitter RAP; natural range $0.4\%–1.5\%$).
  * Cycle-to-cycle amplitude perturbation (Shimmer APQ5; natural range $1.0\%–4.5\%$).
  * Harmonics-to-Noise Ratio (HNR dB; voice periodicity indicator).

### 3.3 Subsystem 3: Optional Identity Branch (ECAPA-TDNN)
* **Role**: Optional identity consistency checking for enrolled callers in Mode B.
* **Operation**: Extracts 192-dimensional embeddings and executes cosine distance queries against Supabase `pgvector`.
* **Critical Security Principle**:
  ```text
  ECAPA Similarity HIGH != Authentic Human Speech!
  ```
  Targeted voice clones match enrolled identities. High similarity coupled with high synthetic risk triggers a **RED (Targeted Clone Attack)** alert.

### 3.4 Subsystem 4: Risk Layer (Temporal Smoothing & State Machine)
* **Instantaneous Fusion**: Fuses primary detector output with supporting acoustic and prosodic evidence into composite score $R_{\text{raw}} \in [0.0, 100.0]$.
* **Asymmetric EMA Filter**:
  $$R_{\text{EMA}}^{(t)} = \alpha R_{\text{raw}}^{(t)} + (1 - \alpha) R_{\text{EMA}}^{(t-1)}$$
  $\alpha_{\text{escalate}} = 0.65$ (fast attack surge), $\alpha_{\text{deescalate}} = 0.25$ (deliberate safe recovery).
* **State Categorization**:
  * GREEN / REAL ($R_{\text{EMA}} < 40.0$)
  * AMBER / SUSPICIOUS ($40.0 \le R_{\text{EMA}} < 75.0$)
  * RED / AI-GENERATED ($R_{\text{EMA}} \ge 75.0$)

### 3.5 Subsystem 5: Security Action (PITCH & Pre-Transaction Gating)
* **Active Defense (PITCH)**: Dynamic phonetic challenge testing interactive synthesis latency ($>1.5\text{ s}$) and vocal tract articulation ($\Delta F_0 > 45\text{ Hz}$).
* **Pre-Transaction Gate**: Synchronous API (`POST /v1/transaction/evaluate-authorization`) halting high-stakes transfers with HTTP 403 on RED state.

---

## 4. End-to-End Dataflow Pipelines

### 4.1 Offline Analysis Pipeline (Primary MVP)

```text
Uploaded File (WAV / MP3)
    ↓
Audio Validation & Decoding (Librosa / SoundFile -> Float32 [-1, 1], Mono, 16kHz)
    ↓
Preprocessing (DC Offset Subtraction, RMS Peak Normalization)
    ↓
Voice Activity Detection (Silero VAD ONNX; strip non-speech frames)
    ↓
Sliding Window Segmentation (1,536ms window, 768ms hop)
    ↓
Speaker-Independent Deepfake Detector (Candidate Model Forward Pass)
    ↓
Acoustic & Prosodic Analysis (Mel Spectrogram + Parselmouth F0/Jitter/Shimmer)
    ↓
Window-Level Score Aggregation & Confidence Weighting
    ↓
Forensic Evidence Synthesis & Verdict (REAL / SUSPICIOUS / AI-GENERATED)
    ↓
JSON Response Egress
```

### 4.2 Real-Time Streaming Pipeline (Phase 2 Adaptation)

```text
Microphone / Audio Client
    ↓
WebSocket Ingestion (/v1/stream/call/{session_id})
    ↓
Binary Frame Validation (Verify 1,024 samples / 2,048 bytes Int16)
    ↓
Redis Ring Buffer (LPUSH + LTRIM max 24 frames = 1,536ms; 15s TTL)
    ↓
Hop Cadence Trigger (Every 12 frames = 768ms)
    ↓
VAD Silence Stripping (Discard window if speech ratio < 0.15)
    ↓
Streaming Deepfake Detector + Prosodic Extractor
    ↓
Multi-Signal Fusion -> Asymmetric EMA -> ThreatState
    ↓
WebSocket Telemetry Emission (JSON packet with 14 metric fields)
    ↓
Downstream Gate Interaction (HTTP 200 Allow / HTTP 403 Block)
```

---

## 5. Research Dataset Strategy & Evaluation Protocol

VaaniShield mandates strict separation across dataset roles to avoid data leakage and prevent misleading claims:

```text
Train / Develop (ASVspoof 2019 LA)
        ↓
Baseline Model Experiments
        ↓
Cross-Dataset Generalization (ASVspoof 2021 DF)
        ↓
Communication Robustness (ASVspoof 2021 LA)
        ↓
Independent Datasets (e.g., WaveFake)
        ↓
Analyze Cross-Dataset Generalization & Avoid Data Leakage
```

### 5.1 Dataset Specifications

| Dataset | Designated Technical Role | Partitioning Protocol | Status |
| :--- | :--- | :--- | :--- |
| **ASVspoof 2019 LA** | **Initial Baseline Training & Development** | Official train, dev, and eval splits. Used to train/tune candidate models. | **Download Pending** |
| **ASVspoof 2021 DF** | **Cross-Dataset Generalization Evaluation** | Strictly held-out evaluation set. Measures resilience to unseen vocoders and compression. **NOT training data.** | **Download Pending** |
| **ASVspoof 2021 LA** | **Communication Robustness Evaluation** | Evaluates robustness under telephony/codec channel effects relevant to live calls. **NOT training data.** | **Download Pending** |
| **Future Datasets** (e.g., WaveFake) | **Independent Generalization** | Reserved for subsequent evaluation phases to test novel generative architectures. | **Future Scope** |

### 5.2 Evaluation Metrics Implementation
The evaluation script (`backend/scripts/evaluate_anti_spoof.py` in Phase B5) computes:
* **Equal Error Rate (EER)**: Threshold $\theta$ where $\text{FAR}(\theta) = \text{FRR}(\theta)$.
* **ROC-AUC**: Area under the receiver operating characteristic curve.
* **FAR & FRR**: Calculated across decision thresholds $[0.0, 1.0]$.
* **Confusion Matrix**: Bona fide vs. spoofed counts at default threshold.
* **Precision, Recall, F1-Score**: For bona fide and spoofed classes.

---

## 6. Continual / Self-Learning Architecture & Poisoning Defense

VaaniShield strictly forbids automatic online retraining from single calls:

```text
Inference Stream
       │
       ▼
Prediction + Metadata Logging (SQLite)
       │
       ▼
Validated Label Collection (SecOps / Authenticated Ground Truth)
       │
       ▼
Validation & Quarantine Gate (Outlier check, duplicate check, provenance check)
       │
       ▼
Curated Training Batch (Minimum quorum: 500 genuine, 500 spoof)
       │
       ▼
Periodic Offline Retraining (Isolated Sandbox)
       │
       ▼
Benchmark Holdout Evaluation Gate (Candidate EER evaluated against active model)
       │
       ├── Candidate Improves EER ──► Promote Model Version (Tag: model-vX.Y.Z)
       └── Candidate Degrades EER ──► Reject Candidate & Rollback to Active Version
```

### 6.1 Data Poisoning Protection Rules
1. **Provenance Enforcement**: Every record in `training_candidates` must document origin (`controlled_test`, `operator_review`, `research_set`).
2. **Quarantine Pool**: Samples with low confidence ($<0.90$) or unverified sources remain quarantined.
3. **Class Balancing**: Retraining triggers only with balanced ratios of genuine and diverse spoofed classes.
4. **Immutable Holdout Benchmark**: Models must pass evaluation against an immutable holdout testset before deployment.
5. **Instant Rollback**: The runtime engine supports instant fallback to previous model versions via `ACTIVE_MODEL_VERSION`.

---

## 7. Database Schemas (Supabase Free + SQLite)

### 7.1 Supabase Schema (`backend/database.sql`)

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Mode B Enrolled Speaker Voiceprints (Optional Identity Branch)
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
    architecture TEXT NOT NULL, -- 'ResNet', 'RawNet2', 'AASIST'
    holdout_eer REAL NOT NULL,
    promoted_at DATETIME,
    status TEXT DEFAULT 'CANDIDATE' CHECK (status IN ('CANDIDATE', 'ACTIVE', 'REJECTED', 'ROLLED_BACK'))
);
```

---

## 8. Requirements Traceability Matrix (RTM)

| TRD Spec ID | Architecture Component | PRD Requirement | Verification Method |
| :--- | :--- | :--- | :--- |
| **TRD-OFF-01** | Offline Audio Upload & Analysis | FR-001, FR-002 | Automated test uploading WAV/MP3 files; verify risk score & evidence |
| **TRD-ING-01** | WebSocket Ingestion (`/v1/stream`) | FR-101, FR-102 | Load test streaming 16kHz PCM chunks |
| **TRD-BUF-01** | Redis 15s Ring Buffer | FR-201, FR-202 | Redis CLI audit verifying TTL expiry and disconnect deletion |
| **TRD-VAD-01** | Silero VAD Silence Stripping | FR-301 | Verify silence windows skip neural pipeline |
| **TRD-DET-01** | Speaker-Independent Deepfake Detector | FR-401 | Model evaluation on bona fide vs. spoof testsets |
| **TRD-DET-02** | Auxiliary Acoustic ResNet Log-Mel | FR-402 | Latency and feature extraction unit tests |
| **TRD-PRO-01** | Parselmouth Prosody Engine | FR-501 | Verify $F_0$, jitter, shimmer extraction on test WAVs |
| **TRD-IDN-01** | Optional Mode B ECAPA Verification | FR-601, FR-602 | Cosine similarity query on Supabase pgvector |
| **TRD-RSK-01** | Asymmetric EMA & State Machine | FR-701, FR-702 | Verify rapid rise ($\alpha=0.65$) and slow decay ($\alpha=0.25$) |
| **TRD-GAT-01** | Pre-Transaction Gate (HTTP 403) | FR-801, FR-802 | Integration test confirming hard block on RED |
| **TRD-PCH-01** | Active PITCH Challenge | FR-901, FR-902 | UI and latency verification testing |
| **TRD-LRN-01** | SQLite Learning Registry | FR-1101, FR-1102| SQLite insert, holdout EER gating, and rollback test |
| **TRD-DB-01**  | Supabase Free + Local SQLite | FR-1201, FR-1202| Test suite passing with zero external paid APIs |

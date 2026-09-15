# Product Requirements Document (PRD)

# VaaniShield: Speaker-Independent AI Speech Deepfake Detection & Voice Integrity Platform

| Document Attribute | Specification Detail |
| :--- | :--- |
| **Document Version** | 2.3.0-PROD-SPEC |
| **Status** | Approved Product Specification / Offline Deepfake Direction Realignment |
| **Date** | September 2026 |
| **Product** | VaaniShield (वाणिShield) |
| **Repository Reference** | `Sayan-Mukherjee99/Voice-Cloning-Prototype` |
| **Document Classification** | Engineering Product Requirements / Technical Architecture Specification |
| **Core Product Thesis** | Speaker-Independent AI-Generated & Synthetic Speech Deepfake Detection Engine |
| **Product Progression** | Phase 1 (Offline MVP) → Phase 2 (Streaming) → Phase 3 (Fusion) → Phase 4 (Identity) → Phase 5 (PITCH + Action) → Phase 6 (Self-Learning) |
| **Project Owners** | Person A: **Shub** (Backend / AI Lead) \| Person B: **Sion** (Frontend Lead) |

---

## 1. Executive Summary & Problem Definition

### 1.1 Executive Summary
**VaaniShield** is an AI-powered voice integrity platform focused primarily on **speaker-independent AI-generated and synthetic speech deepfake detection**. It is designed to analyze unknown or random speakers—without requiring a previously enrolled voice—to determine whether an audio recording or live voice stream contains evidence of synthetic, cloned, converted, or spoofed speech.

The primary question VaaniShield answers is:
> **"Does this audio contain evidence of synthetic, cloned, converted, or spoofed speech?"**

Speaker verification is **NOT** the primary detector. Biometric voice verification answers *"Who does this voice sound like?"*, which requires prior enrollment and is intrinsically vulnerable to high-fidelity voice clones that deliberately imitate the victim's acoustic profile. Deepfake detection, by contrast, answers the foundational integrity question independently of speaker identity.

The platform follows a deliberate, research-grounded progression:
```text
PHASE 1: Offline Speech Deepfake Detection (Current Primary MVP)
        ↓
PHASE 2: Real-Time Streaming Deepfake Detection
        ↓
PHASE 3: Multi-Signal Risk Fusion
        ↓
PHASE 4: Optional Speaker Identity Verification
        ↓
PHASE 5: Active Challenge / PITCH + Security Action
        ↓
PHASE 6: Validated Self-Learning / Research Evaluation
```

The **Primary MVP** is an **offline speech deepfake detection experience**:
```text
Upload Audio File (WAV / MP3)
             ↓
    Audio Preprocessing
             ↓
  Voice Activity Detection
             ↓
   Short Sliding Windows
             ↓
Speaker-Independent Detector
             ↓
Acoustic / Spectral / Temporal Evidence
             ↓
    Synthetic Risk Score
             ↓
       Temporal Smoothing
             ↓
        Risk Engine
             ↓
REAL / SUSPICIOUS / AI-GENERATED
```

Subsequent phases adapt this core detector into real-time streaming, fuse multi-signal acoustic/prosodic evidence, introduce optional ECAPA-TDNN speaker verification, enable active challenge-response (**PITCH**), enforce pre-transaction circuit breakers (`POST /v1/transaction/evaluate-authorization` returning HTTP 403 on critical threat), and implement a controlled, validated self-learning pipeline.

### 1.2 The Mass-User Problem Statement
The weaponization of generative voice cloning has expanded far beyond enrolled VIPs to ordinary citizens:
* **Digital Arrest & Law Enforcement Impersonation**: Fraudsters posing as judicial or law enforcement officers intimidate victims into transferring savings into "safe accounts."
* **Family Emergency & Ransom Scams**: Zero-shot voice clones generated from 3-second social media clips deceive relatives into urgent financial transfers.
* **First-Time Caller Impersonation**: Fraudsters contact call centers or financial desks for the first time, bypassing knowledge-based authentication using synthesized voices.

**The Mass-User Design Mandate:**
The system must be capable of analyzing audio from:
1. An unknown person (customer without an account),
2. A first-time caller (citizen or applicant),
3. A caller with no pre-enrolled voiceprint, or
4. A known or enrolled user,

and establishing an evidence-based probability:
> **"Does this speech show evidence of synthesis, cloning, conversion, or replay?"**

A user or enterprise **MUST NOT** be required to register a reference voice sample merely to benefit from core deepfake protection.

### 1.3 Telephony & Physical Reality Check
To maintain strict technical credibility:
* **Mobile OS Sandboxing**: Neither Apple iOS nor Google Android permits non-jailbroken third-party applications to tap two-way native cellular calls. VaaniShield is **not** a consumer mobile call recorder. It ingests audio through uploaded files, enterprise softphones (WebRTC / Electron), carrier SBC media-forking gateways (SIPREC / RFC 7865), and in-app communication clients.
* **Lossy Codec Degradation**: Cellular networks compress voice via lossy speech codecs:
  * **AMR-NB (Adaptive Multi-Rate Narrowband)**: 8 kHz sampling, 300–3,400 Hz passband. Strips high-frequency vocoder cues above 3.4 kHz.
  * **AMR-WB (Adaptive Multi-Rate Wideband / G.722.2 / VoLTE)**: 16 kHz sampling, 50–7,000 Hz passband.
* **Pragmatic Scope**: Live calling infrastructure is **not** a prerequisite for the core detector. The offline upload experience represents the foundational milestone. Telecom robustness is evaluated as an explicit research phase (using ASVspoof 2021 LA).

---

## 2. Core Product Thesis & Operating Principles

### 2.1 Core Product Thesis
> **VaaniShield is primarily a speaker-independent AI speech deepfake detection engine.**

The core system classifies speech as **bona fide (genuine human)** or **spoofed (synthetic/cloned/converted/replayed)** without requiring prior speaker enrollment.

### 2.2 Conceptual Distinction Matrix

```text
Speaker Verification
=
"Who does this voice sound like?"
(Compares incoming voice against an enrolled biometric baseline)

Deepfake Detection
=
"Does this speech show evidence of synthesis/spoofing?"
(Analyzes acoustic, spectral, vocoder, and waveform properties independently of identity)

Voice Integrity
=
Combined evidence from deepfake detection,
acoustic/prosodic signals, temporal consistency,
optional identity verification, and transactional context.
```

> [!IMPORTANT]
> **High speaker similarity does NOT prove speech is genuine.**
> A neural voice clone intentionally matches the target speaker's vocal characteristics. Relying on speaker verification as proof of authenticity creates a dangerous vulnerability. Speaker verification is an optional contextual modifier, never the primary detector.

### 2.3 Scientifically Responsible Product Principles

| Principle | Operational Rule |
| :--- | :--- |
| **1. Speaker-Independent by Default** | Core detection requires zero enrollment. Any speaker or caller can be evaluated immediately. |
| **2. Probabilistic Risk Framing** | The system estimates the likelihood that speech exhibits characteristics of synthetic speech. Risk score is a probabilistic signal, not absolute proof of authenticity. |
| **3. Offline MVP Foundation** | The offline audio upload experience is the primary foundational milestone before real-time streaming adaptation. |
| **4. Zero-Cost / Free-First Core** | Core capabilities execute locally using open-source runtimes and the Supabase Free Tier. No paid commercial APIs are required. |
| **5. Privacy-Preserving (DPDP Act 2023)** | Ephemeral in-memory audio processing (15s TTL). Zero permanent retention of raw customer voice recordings without explicit, separate consent. |
| **6. Multi-Signal Defense-in-Depth** | Combine waveform models, spectral cues, biomechanical prosody, and active challenge-response. Avoid fragile single-point detectors. |
| **7. Grounded Scientific Honesty** | No claims of 100% detection. No claiming external academic benchmark results as VaaniShield achievements. Differentiate measured, target, and baseline metrics. |
| **8. Fail-Secure Protection** | Escalation is rapid; de-escalation is deliberate. High-risk financial transactions are frozen on critical threat (HTTP 403). |

---

## 3. Product Modes: Universal Detection vs. Enhanced Identity

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    VAANISHIELD PRODUCT MODES                                     │
├─────────────────────────────────────────────────┬────────────────────────────────────────────────┤
│ MODE A: UNIVERSAL DEEPFAKE DETECTION            │ MODE B: ENHANCED IDENTITY + INTEGRITY          │
│ (Primary / Default / Zero Enrollment)           │ (Optional / Known-User Enrollment)             │
├─────────────────────────────────────────────────┼────────────────────────────────────────────────┤
│ • Analyzes any speaker (unknown, guest, random) │ • Requires pre-enrolled voiceprint baseline    │
│ • Zero voice database required                  │ • Verifies claimed identity via ECAPA-TDNN     │
│ • Speaker-independent deepfake detector         │ • Deepfake engine still runs unconditionally   │
│ • Acoustic, spectral, and prosodic analysis     │ • High similarity + High synthetic risk = RED  │
│ • Output: Synthetic Risk Score (0-100), Verdict │ • High similarity + Low synthetic risk = GREEN │
│   (REAL / SUSPICIOUS / AI-GENERATED)            │ • Output: Composite Voice Integrity Score      │
└─────────────────────────────────────────────────┴────────────────────────────────────────────────┘
```

### 3.1 Mode A: Universal Deepfake Detection (Primary MVP)
* **Target Users**: General public, bank customers, unknown callers, fraud analysts inspecting audio recordings.
* **Preconditions**: None. Zero biometric enrollment required.
* **Input**: Uploaded audio file (WAV / MP3) or live audio chunk.
* **Processing**:
  1. Audio normalization, DC offset removal, and 16 kHz resampling.
  2. Voice Activity Detection (VAD) stripping silence and background noise.
  3. Short sliding window segmentation ($1.5\text{ s}$ window, $768\text{ ms}$ hop).
  4. Speaker-independent deepfake detector evaluating raw waveform and spectral patterns.
  5. Feature aggregation computing synthetic risk score ($0.0–100.0$).
  6. Threshold categorization into `REAL`, `SUSPICIOUS`, or `AI-GENERATED`.
* **Output Payload**:
  ```json
  {
    "mode": "UNIVERSAL_DEEPFAKE_DETECTION",
    "verdict": "AI_GENERATED",
    "synthetic_risk_score": 84.5,
    "confidence": 0.88,
    "detected_signals": {
      "deepfake_model_score": 86.2,
      "spectral_artifacts": "high_frequency_checkerboard",
      "prosody_anomaly": "unnatural_pitch_rigidity",
      "jitter_anomaly": true
    },
    "recommended_action": "FLAG_OR_BLOCK"
  }
  ```

### 3.2 Mode B: Enhanced Identity + Integrity (Optional Supporting Branch)
* **Target Users**: Enrolled corporate approvers, high-value treasury callers, VIP authentication.
* **Preconditions**: Caller has completed prior enrollment (`POST /v1/enroll`) generating a 192-dim ECAPA-TDNN vector in Supabase `pgvector`.
* **Input**: Audio + `speaker_id` identifier.
* **Processing**:
  1. Executes all Mode A speaker-independent deepfake checks unconditionally.
  2. Extracts live ECAPA-TDNN 192-dim embedding and computes cosine similarity against enrolled baseline.
  3. Interprets joint risk matrix:
     * **Case 1 (Cloned Impersonation Attack)**: Speaker similarity is HIGH ($\ge 0.85$), but synthetic risk is HIGH ($\ge 75.0$). **Verdict: CRITICAL ATTACK (RED)**. The attacker is presenting an enrolled identity using an AI clone.
     * **Case 2 (Wrong Speaker / Impostor)**: Speaker similarity is LOW ($< 0.65$), but synthetic risk is LOW. **Verdict: IDENTITY MISMATCH (AMBER/RED)**. Legitimate human, but not the authorized person.
     * **Case 3 (Authentic Speaker)**: Speaker similarity is HIGH ($\ge 0.85$) and synthetic risk is LOW ($< 40.0$). **Verdict: AUTHENTIC (GREEN)**.

---

## 4. Detection Pipeline & Architectural Evolution

### 4.1 Primary Detection Pipeline (Phase 1 & Phase 2)

```text
Uploaded / Live Audio
        ↓
Audio Preprocessing (Resample 16kHz Mono Float32, DC offset subtraction)
        ↓
Voice Activity Detection (Silence Stripping; discard <15% speech)
        ↓
Short Sliding Windows (24 frames = 1,536ms; 12-frame hop = 768ms)
        ↓
Speaker-Independent Deepfake Detector (Raw waveform / acoustic model)
        ↓
Acoustic / Spectral / Temporal Evidence
        ↓
Synthetic Risk Score (0.0 – 100.0)
        ↓
Temporal Smoothing (Asymmetric EMA: α_up=0.65, α_down=0.25)
        ↓
Risk Engine (Threshold boundaries with hysteresis)
        ↓
REAL / SUSPICIOUS / AI-GENERATED
```

### 4.2 Multi-Signal Fusion Architecture (Phase 3)

```text
                         AUDIO
                           ↓
                    PREPROCESSING
                           ↓
             ┌─────────────┼─────────────┐
             ↓             ↓             ↓
        Acoustic CNN    Raw Waveform   Prosody /
        / ResNet        Model          Temporal
             ↓             ↓             ↓
             └─────────────┼─────────────┘
                           ↓
                  Deepfake Score Fusion
                           ↓
                    Final Risk Score
                           ↓
                  GREEN / AMBER / RED
```

1. **Acoustic CNN / ResNet**: Analyzes 80-bin log-mel filterbanks for frequency-domain vocoder artifacts (transposed convolution checkerboards, spectral roll-off).
2. **Raw Waveform Model**: Evaluates time-domain sample discontinuities, phase inconsistencies, and filterbank anomalies directly from raw PCM audio.
3. **Prosody / Temporal Analysis**: Extracts biomechanical speech generation metrics ($F_0$ pitch dynamics, cycle jitter RAP, shimmer APQ5, Harmonics-to-Noise Ratio).

---

## 5. Model Candidate Exploration & Research Strategy

### 5.1 Candidate Model Profiles
VaaniShield investigates three candidate baseline architectures from the speech anti-spoofing research literature:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             CANDIDATE MODEL RESEARCH MATRIX                                      │
├─────────────────────┬──────────────────────┬──────────────────────┬──────────────────────────────┤
│ Dimension           │ ResNet Acoustic      │ RawNet2              │ AASIST / AASIST-L            │
├─────────────────────┼──────────────────────┼──────────────────────┼──────────────────────────────┤
│ Primary Domain      │ Time-Frequency       │ End-to-End Raw Sinc  │ Integrated Spectro-Temporal  │
│ Input Format        │ 80-bin Log-Mel Spec  │ Raw 16kHz Waveform   │ Raw 16kHz Waveform           │
│ Model Footprint     │ ~11.2M params        │ ~14.4M params        │ ~290K (L) / ~850K params     │
│ Target Latency (CPU)│ < 25 ms              │ ~45 ms               │ < 25 ms                      │
│ Candidate Role      │ Acoustic baseline    │ Raw waveform baseline│ Graph attention baseline     │
│ Selection Status    │ Candidate Experiment │ Candidate Experiment │ Candidate Experiment         │
└─────────────────────┴──────────────────────┴──────────────────────┴──────────────────────────────┘
```

> [!CAUTION]
> **Disciplined Intellectual Honesty**:
> 1. **No Pre-Selection**: No candidate model is claimed as already selected as the final production model.
> 2. **No Claimed Benchmarks**: VaaniShield makes **NO claim** of having achieved published benchmark results (e.g., AASIST paper figures). All external benchmark results are external reference literature only.
> 3. **Current Reality**: The `models/` directory in the repository is unpopulated; current backend code executes heuristic/mock fallbacks. Real model integration will occur in Phase B4 and B5.

---

## 6. Research Dataset Strategy & Evaluation Protocol

VaaniShield establishes a structured dataset progression to prevent data leakage and ensure generalizability across diverse generative architectures:

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

### 6.1 Dataset Roles & Status
1. **Initial Baseline: ASVspoof 2019 LA**:
   - *Role*: Initial baseline training, development, and held-out evaluation for synthetic and spoofed speech detection.
   - *Protocol*: Strictly partitioned into training, development/validation, and evaluation subsets according to official keys.
   - *Status*: **VERIFIED & INTEGRATED** (121,461 CM utterances verified across train [25,380], dev [24,844], and eval [71,237] partitions; 7.12 GB corpus at `datasets/LA/LA/`; streaming JSONL manifests generated; partition governance enforced).
2. **Cross-Dataset Generalization: ASVspoof 2021 DF**:
   - *Role*: Evaluates model generalization against out-of-domain synthetic speech, unseen neural vocoders, and lossy compression.
   - *Protocol*: Held out strictly for cross-dataset evaluation. **NOT** the current training dataset.
   - *Status*: **Download pending**.
3. **Communication Robustness: ASVspoof 2021 LA**:
   - *Role*: Evaluates robustness under logical-access and telephony transmission channel conditions relevant to eventual live calling.
   - *Protocol*: Evaluated after baseline models are established. **NOT** the current training dataset.
   - *Status*: **Download pending**.
4. **Future Independent Datasets (e.g., WaveFake)**:
   - *Role*: Future evaluation sources for verifying generalization across novel diffusion and language-model-based TTS systems.
   - *Protocol*: Evaluated without adding datasets merely for the sake of adding datasets.
   - *Status*: **Future scope**.

### 6.2 Evaluation Metrics Suite & Baseline Results
Model evaluation and candidate benchmarking use standard anti-spoofing and classification metrics (implemented in `backend/ai/training/metrics.py`):
* **Equal Error Rate (EER)**: The operational point where False Acceptance Rate equals False Rejection Rate.
* **Receiver Operating Characteristic — Area Under Curve (ROC-AUC)**.
* **False Acceptance Rate (FAR)**: Proportion of synthetic speech incorrectly classified as genuine.
* **False Rejection Rate (FRR)**: Proportion of genuine human speech incorrectly classified as synthetic.
* **Confusion Matrix**: Bona fide vs. spoofed counts.
* **Precision, Recall, F1-Score**: Evaluated at calibrated threshold $\theta^*$.

**Empirical ResNet Acoustic Baseline Results (Phase B4)**:
* Architecture: `ResNetAcousticBaseline` (11.24M parameters, 42.86 MB) with 80-bin log-mel front-end.
* DEV Partition (Calibrated $\theta^* = 0.5000$): EER = **0.00%**, ROC-AUC = **1.0000**, Accuracy = **100.00%** (2,000 samples).
* Held-Out EVAL Partition (Frozen $\theta^* = 0.5000$): EER = **31.26%**, ROC-AUC = **0.6605**, Accuracy = **31.00%** (2,000 samples).
* Analysis: Generalization gap on unseen spoofing algorithms (A07–A19) empirically confirms the need for raw-audio architectures (RawNet2) and multi-signal fusion.

---

## 7. Operational Risk Engine & Security Actions

### 7.1 Temporal Risk Aggregation (Asymmetric EMA)
In streaming scenarios, instantaneous hop scores fluctuate. The platform applies an Asymmetric Exponential Moving Average:

$$R_{\text{EMA}}^{(t)} = \alpha R_{\text{raw}}^{(t)} + (1 - \alpha) R_{\text{EMA}}^{(t-1)}$$

Where:
$$\alpha = \begin{cases} 
\alpha_{\text{escalate}} = 0.65 & \text{if } R_{\text{raw}}^{(t)} > R_{\text{EMA}}^{(t-1)} \quad \text{(Rapid Attack Escalation)} \\ 
\alpha_{\text{deescalate}} = 0.25 & \text{if } R_{\text{raw}}^{(t)} \le R_{\text{EMA}}^{(t-1)} \quad \text{(Deliberate Safe Recovery)} 
\end{cases}$$

### 7.2 Threat State Boundaries & Hysteresis
* **GREEN (Normal / Genuine, $R_{\text{EMA}} < 40.0$)**: Audio exhibits characteristics consistent with organic human speech. Standard operations permitted.
* **AMBER (Suspicious / Step-Up, $40.0 \le R_{\text{EMA}} < 75.0$)**: Ambiguous acoustic cues or prosodic stiffness detected. Triggers advisory warning, enables step-up verification, and unlocks PITCH challenge.
* **RED (Critical Threat / AI Deepfake, $R_{\text{EMA}} \ge 75.0$)**: High-confidence synthetic voice detected. Hard operational intervention enforced.

### 7.3 Active Defense: PITCH Challenge-Response
When monitoring drifts into **AMBER**, the system triggers **PITCH (Phonetic Instability & Transient Challenge for Humans)**:
* Displays dynamic, phonetically complex tongue-twisters (e.g., *"Pital ke bartan mein papita peela peela"*).
* **Vulnerabilities Exploited**: Exposes generative latency ($>1.5\text{ s}$) and causes neural vocoders to stutter on rapid aspirated plosives.
* **Verification Criteria**: Response latency ($<1.2\text{ s}$) and organic pitch excursion ($\Delta F_0 > 45\text{ Hz}$).

### 7.4 Pre-Transaction Authorization Gate
Synchronous circuit breaker (`POST /v1/transaction/evaluate-authorization`) halting high-stakes fraud:

| Threat State | Risk Score ($R_{\text{EMA}}$) | Amount (INR) | Gate Decision | HTTP Status | Action Enforced |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GREEN** | $0.0 - 39.9$ | Any amount | `APPROVED` | `200 OK` | Payment proceeds immediately. |
| **AMBER** | $40.0 - 74.9$ | $< \text{₹}10,000$ | `APPROVED_WITH_WARNING` | `200 OK` | Proceeds with SMS alert. |
| **AMBER** | $40.0 - 74.9$ | $\ge \text{₹}10,000$ | `PENDING_CHALLENGE` | `428 Precondition`| Paused until PITCH challenge passes. |
| **RED** | $\ge 75.0$ | Any amount ($> \text{₹}0$) | `BLOCKED` | `403 Forbidden` | **Hard Circuit Breaker**. Transaction frozen. |

---

## 8. Controlled Continual / Self-Learning Architecture

VaaniShield strictly avoids automated, online retraining after single calls:

```text
Inference
   ↓
Prediction + Metadata Logging (SQLite)
   ↓
Trusted / Validated Feedback (Supervisor review / authenticated ground truth)
   ↓
Curated Training Data (Quarantine & Outlier filtering)
   ↓
Periodic Training Batch (Minimum balanced sample quorum: 500 genuine / 500 spoof)
   ↓
Holdout Benchmark Evaluation (Immutable testset)
   ↓
Compare Against Current Model EER
   ↓
Promote ONLY if Validated (Otherwise discard & rollback)
```

### Risk Controls:
* **Incorrect Labels**: Low-confidence or unauthenticated feedback is held in quarantine.
* **Data Poisoning**: Outlier clustering and balanced class checks prevent adversarial injection.
* **Model Drift & Regression**: Candidate weights must achieve lower EER on immutable holdouts before promotion.
* **Evaluation Leakage**: Strict separation between training, development, and evaluation corpora.

---

## 9. Dual-Database & Zero-Cost Architecture

1. **Supabase Free Tier (Managed PostgreSQL 16 + pgvector)**:
   - Houses persistent application state: call sessions, transaction evaluations, operator auth, and Mode B voiceprints ($0/month).
2. **SQLite (`vaani_learning.db`)**:
   - Local embedded database for high-throughput ML telemetry, feedback records, and candidate retraining batches with zero server cost.
3. **Zero Mandatory Paid APIs**:
   - Core capabilities execute locally using open-source libraries (FastAPI, ONNX Runtime, SciPy, Librosa, Redis). No commercial LLMs, speech APIs, or cloud GPUs are required.

---

## 10. Privacy Architecture (DPDP Act 2023)

* **Zero Raw Audio at Rest**: Audio frames reside in volatile RAM within Redis circular ring buffers bounded by a **15-second TTL** (`EXPIRE 15`), purged on disconnect.
* **Mathematical Telemetry Only**: Audit logs store non-invertible derived features ($F_0$, jitter, mel energies, risk scores), never raw voice recordings.
* **No Silent Harvesting**: Retraining audio originates strictly from controlled test suites, public research datasets, or explicit opt-in agreements.

---

## 11. Functional Requirements Matrix

| ID | Area | Requirement Statement | Priority | Status |
| :--- | :--- | :--- | :--- | :--- |
| **FR-001** | Offline MVP | System shall accept uploaded WAV/MP3 audio files via REST API and return synthetic risk score, confidence, and forensic evidence. | P0 | PLANNED (B3/B4) |
| **FR-002** | Offline MVP | System shall categorize offline audio into REAL, SUSPICIOUS, or AI-GENERATED based on calibrated risk thresholds. | P0 | PLANNED (B4) |
| **FR-101** | Ingestion | System shall accept full-duplex binary WebSocket connections at `/v1/stream/call/{session_id}` accepting 16-bit Linear PCM at 16kHz mono. | P0 | IMPLEMENTED (B2) |
| **FR-102** | Ingestion | Audio frames of 1,024 samples ($64\text{ ms}$) shall be validated and ingested without blocking the event loop. | P0 | IMPLEMENTED (B2) |
| **FR-201** | Buffer | Ephemeral circular ring buffer in Redis shall store max 24 frames (~$1.54\text{ s}$) with in-memory deque fallback. | P0 | IMPLEMENTED |
| **FR-202** | Privacy | Redis audio keys shall enforce a mandatory TTL of 15 seconds (`EXPIRE 15`), purged on disconnect. | P0 | IMPLEMENTED |
| **FR-301** | VAD | Voice Activity Detection shall evaluate speech ratio; windows with $<15\%$ speech shall bypass neural inference. | P0 | MOCK / FALLBACK |
| **FR-401** | Deepfake Model| Speaker-independent deepfake detector shall classify speech as bona fide or spoofed without prior enrollment. | P0 | PLANNED / RESEARCH (B4) |
| **FR-402** | Acoustic Signal| 80-bin log-mel spectrogram features shall be extracted as complementary acoustic cues. | P1 | MOCK / FALLBACK |
| **FR-501** | Prosody | Praat Parselmouth engine shall extract $F_0$, jitter RAP, shimmer APQ5, and HNR for voiced segments. | P0 | IMPLEMENTED (PARSELMOUTH) |
| **FR-601** | Identity | System shall conditionally extract 192-dim ECAPA-TDNN embeddings when `speaker_id` is supplied in Mode B. | P1 | MOCK / FALLBACK |
| **FR-602** | Identity | Supabase `pgvector` IVFFlat cosine similarity shall evaluate identity resemblance (High Sim != Genuine). | P1 | IMPLEMENTED (POSTGRES) |
| **FR-701** | Smoothing | Asymmetric EMA smoothing ($\alpha_{\text{escalate}}=0.65, \alpha_{\text{deescalate}}=0.25$) shall prevent alert flapping. | P0 | IMPLEMENTED |
| **FR-702** | State Machine| Deterministic state machine shall transition between GREEN, AMBER, and RED with hysteresis. | P0 | IMPLEMENTED |
| **FR-801** | Transaction | Synchronous `POST /v1/transaction/evaluate-authorization` shall return HTTP 200 (APPROVED) or HTTP 403 (BLOCKED). | P0 | IMPLEMENTED |
| **FR-802** | Transaction | Authorization gate shall enforce a deterministic hard block if session threat level is RED. | P0 | IMPLEMENTED |
| **FR-901** | PITCH | Randomized phonetic challenge phrases shall be presented on AMBER/RED escalation. | P1 | IMPLEMENTED (UI) |
| **FR-902** | PITCH | Backend shall evaluate challenge response latency and pitch trajectory to verify organic response. | P2 | PLANNED (B10) |
| **FR-1001**| Telemetry | Structured JSON telemetry shall be emitted per hop over WebSocket to power live SecOps dashboards. | P0 | IMPLEMENTED |
| **FR-1002**| Audit | Derived telemetry features and transaction decisions shall be logged to Supabase without saving raw audio. | P0 | IMPLEMENTED |
| **FR-1101**| Learning | Feature vectors, predictions, and validated feedback shall be recorded in local SQLite registry (`vaani_learning.db`). | P1 | PROPOSED (B11) |
| **FR-1102**| Poisoning | Learning pipeline shall enforce quarantine pools, sample quorum, and holdout EER verification before model promotion. | P1 | PROPOSED (B11) |
| **FR-1201**| Zero-Cost | Core detection pipeline and evaluation shall operate with zero dependencies on paid commercial APIs. | P0 | VERIFIED POLICY |
| **FR-1202**| Dual Database | Application shall operate on Supabase Free Tier quotas for persistent data and SQLite for local ML event logging. | P0 | ARCHITECTED |

---

## 12. Current Implementation Maturity Matrix

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                CURRENT IMPLEMENTATION MATURITY MATRIX                            │
├──────────────────────┬─────────────────────────┬─────────────────────────────────────────────────┤
│ Implementation State │ Subsystem / Component   │ Empirical Repository Status (`Voice-Cloning`)   │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ IMPLEMENTED          │ WebSocket Transport     │ Full-duplex WS at /v1/stream/call/{session_id}   │
│                      │ Redis Ring Buffer       │ LPUSH + LTRIM with 15s EXPIRE; deque fallback   │
│                      │ Threat State Machine    │ ThreatState class with asymmetric EMA smoothing │
│                      │ Transaction Gate API    │ POST /v1/transaction/evaluate-authorization     │
│                      │ Speaker Enrollment API  │ POST /v1/enroll extracting & persisting vectors │
│                      │ Frontend Dashboard      │ Next.js 16, Zustand store, ThreatDial, Gate UI │
│                      │ Biomechanical Prosody   │ Praat Parselmouth extracts F0, Jitter, Shimmer  │
│                      │ Dataset & Preprocessing │ ASVspoof 2019 LA verified (121,461 utterances)   │
│                      │                         │ JSONL manifests, non-destructive preprocessing   │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ MOCK / FALLBACK      │ Neural Anti-Spoofing    │ Heuristic fallback when model ONNX is absent    │
│                      │ Silero VAD              │ RMS energy thresholding when ONNX is absent     │
│                      │ ECAPA-TDNN Embedding    │ Hash-seeded random unit vectors when absent     │
│                      │ PITCH Challenge Logic   │ Static UI drawer; lacks backend acoustic check  │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ RESEARCH / PLANNED   │ Offline Deepfake MVP    │ Offline WAV/MP3 ingestion & baseline detector   │
│                      │ Candidate Baselines     │ ResNet, RawNet2, AASIST model experiments       │
│                      │ Model Metrics Suite     │ EER, ROC-AUC, FAR, FRR, confusion matrix        │
│                      │ Cross-Dataset Eval      │ ASVspoof 2021 DF generalization testing         │
│                      │ Multi-Signal Fusion     │ Weighted fusion of waveform, spectral, prosody  │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ PROPOSED             │ Self-Learning Registry  │ SQLite metadata logging with validation gates   │
│                      │ Anti-Poisoning Controls │ Quarantine pool and holdout evaluation runner   │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ UNVERIFIED           │ Telephony Codec EER     │ Anti-spoof EER under real 8kHz AMR-NB cell calls│
│                      │ Multi-Accent Resiliency │ False positive rates on regional Indian accents │
└──────────────────────┴─────────────────────────┴─────────────────────────────────────────────────┘
```

---

## 13. What This PRD Explicitly Does NOT Claim

1. **No Guaranteed 100% Detection**: The system does not claim to always detect AI voices.
2. **Probabilistic Risk**: Risk scores estimate the statistical likelihood of synthetic speech characteristics; they do not represent absolute proof of authenticity.
3. **No Claimed External Benchmarks**: External paper benchmark results are not claimed as internal achievements.
4. **Speaker Similarity Disclaimer**: High speaker similarity confirms identity resemblance, not human authenticity.
5. **No Blind Online Retraining**: System does not retrain automatically after single calls.
6. **No Telecom Prerequisite**: Live telephony carrier infrastructure is not a prerequisite for the core detector.

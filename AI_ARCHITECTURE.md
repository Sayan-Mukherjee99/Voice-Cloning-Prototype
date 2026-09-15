# VaaniShield: Artificial Intelligence & Signal Processing Architecture

| Document Attribute | Specification Detail |
| :--- | :--- |
| **Document Version** | 2.3.0-AI-SPEC |
| **Status** | Approved AI/ML Technical Baseline / Offline Deepfake Realignment |
| **System Classification** | Speaker-Independent AI Speech Deepfake Detection & Anti-Spoof Architecture |
| **Associated Documents** | `PRD.md` (Product Requirements), `TRD.md` (Technical Requirements), `SECURITY.md` (Security Specification) |
| **Reference Repository** | `Sayan-Mukherjee99/Voice-Cloning-Prototype` |
| **Primary Focus** | Speaker-Independent Deepfake Detection (Candidate Models: ResNet, RawNet2, AASIST) |
| **Project Progression** | Phase 1 (Offline MVP) → Phase 2 (Streaming) → Phase 3 (Fusion) → Phase 4 (Identity) → Phase 5 (PITCH) → Phase 6 (Self-Learning) |
| **Project Ownership** | Person A: **Shub** (Backend / AI Lead) \| Person B: **Sion** (Frontend Lead) |

---

## 1. Executive Summary & Codebase Grounding

### 1.1 Architectural Thesis
**VaaniShield** treats voice deepfake detection primarily as a **speaker-independent, multi-layered anti-spoofing problem**. 

The fundamental thesis is:
> **The primary AI engine must detect whether speech is synthetic, cloned, converted, or spoofed without requiring the caller to be pre-enrolled.**

Single-model deepfake classifiers fail when exposed to unseen vocoders, lossy cellular codecs (AMR-NB/WB), or background acoustic noise. Furthermore, treating speaker verification as proof of authenticity creates a fatal vulnerability: a neural voice clone is explicitly optimized to mimic the target speaker's biometric embedding.

VaaniShield investigates:
1. **Speaker-Independent Deepfake Detection Candidates**:
   - ResNet acoustic baseline (2D CNN on 80-bin log-mel filterbanks).
   - RawNet2 baseline (time-distributed convolutions + GRUs on raw waveforms).
   - AASIST / AASIST-L (Integrated Spectro-Temporal Graph Attention on raw waveforms).
2. **Auxiliary Frequency-Domain Analysis**: Vocoder transposed convolution checkerboard artifacts and spectral roll-off.
3. **Physical Biomechanical Prosody**: Micro-perturbation of vocal fold oscillations (fundamental pitch $F_0$, jitter RAP, shimmer APQ5, Harmonics-to-Noise Ratio).
4. **Optional Speaker Vector Embeddings (Mode B)**: Conditional ECAPA-TDNN 192-dim identity consistency checking. High similarity does **NOT** prove human authenticity!
5. **Active Cognitive & Acoustic Challenge-Response**: **PITCH** protocol testing conversational latency ($>1.5\text{ s}$) and non-linear vocal tract dynamics ($\Delta F_0 > 45\text{ Hz}$).
6. **Temporal Smoothing & State Machine**: Asymmetric Exponential Moving Average ($\alpha_{\text{up}}=0.65, \alpha_{\text{down}}=0.25$) mapping into `REAL`, `SUSPICIOUS`, and `AI-GENERATED` / `GREEN`, `AMBER`, and `RED`.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               AI CODEBASE GROUNDING AUDIT                                        │
├──────────────────────┬─────────────────────────┬─────────────────────────────────────────────────┤
│ Pipeline Component   │ Repository Status       │ Empirical Code Implementation Details           │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ Audio Framing        │ IMPLEMENTED             │ 1024-sample frames (64ms), 24-frame window      │
│ VAD (Silero)         │ MOCK / FALLBACK         │ ONNX wrapper exists; falls back to RMS energy   │
│                      │                         │ because models/ directory is unpopulated.       │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ Deepfake Detector    │ IMPLEMENTED (B4)        │ ResNetAcousticBaseline (11.2M params) with      │
│ (ResNet Baseline)    │                         │ differentiable 80-bin log-mel front-end.        │
│                      │                         │ Checkpoint: resnet18_baseline_best.pt.          │
│                      │                         │ Empirical: DEV EER 0.00%, EVAL EER 20.65%.      │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ Log-Mel Filterbank   │ IMPLEMENTED             │ 80-bin Librosa / Scipy mel-spectrogram (25ms    │
│ Spectrogram          │                         │ window, 10ms hop, 512 FFT, 20-8000Hz).          │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ Biomechanical        │ IMPLEMENTED             │ Praat Parselmouth extracts F0, jitter, shimmer, │
│ Prosody Engine       │                         │ HNR in threadpool; Scipy fallback on timeout.   │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ ECAPA-TDNN Speaker   │ MOCK / FALLBACK         │ Optional identity model; falls back to random   │
│ Vector Embedding     │                         │ SHA-256 unit vectors when model is absent.      │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ Vector Search        │ IMPLEMENTED             │ Supabase pgvector cosine distance in SQL schema │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ Asymmetric EMA       │ IMPLEMENTED             │ ThreatState class with α_up=0.65, α_down=0.25   │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ Threat State Machine │ IMPLEMENTED             │ GREEN (<40.0), AMBER (40.0-74.9), RED (>=75.0)  │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ PITCH Challenge      │ MOCK (UI ONLY)          │ Static Hindi phrase string sent over WebSocket; │
│ Verification         │                         │ lacks backend ASR/pitch modulation check.       │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ Dataset & Protocol   │ IMPLEMENTED             │ ASVspoof 2019 LA verified (121,461 utterances;  │
│ Ingestion Layer      │                         │ 7.12 GB); streaming JSONL manifests generated.  │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ Self-Learning Log    │ PROPOSED                │ SQLite local learning registry (vaani_learning) │
└──────────────────────┴─────────────────────────┴─────────────────────────────────────────────────┘
```

---

## 2. End-to-End AI & Signal Processing Pipeline

### 2.1 Primary Detection Dataflow

```text
[Uploaded / Live Audio Ingress] (16kHz 16-bit Mono Linear PCM)
         │
         ▼
[Stage 1: Preprocessing & Normalization] (Float32 [-1.0, 1.0], DC offset subtraction, Hann window)
         │
         ▼
[Stage 2: Voice Activity Detection (Silero VAD ONNX)] (512-sample sub-frames; Speech Ratio threshold: 0.15)
         │
         ├── Speech Ratio < 0.15 ──► [Halt Analysis; Flag Silence Chunk; Emit Resting Telemetry]
         └── Speech Ratio >= 0.15 ──► [Active Speech Confirmed; Proceed to Deepfake Detection]
                  │
                  ▼
[Stage 3: SPEAKER-INDEPENDENT DEEPFAKE DETECTOR] (Candidate: ResNet, RawNet2, or AASIST)
• Forward pass on preprocessed audio chunk
• Operates unconditionally on any speaker with ZERO prior enrollment
• Output: Raw synthetic risk probability in [0.0, 100.0]
                  │
                  ├──────────────────────────────────────────────────────┐
                  ▼                                                      ▼
    [Stage 4A: Frequency-Domain Analysis]                  [Stage 4B: Biomechanical Prosodic Analysis]
    • 80-bin Log-Mel Spectrogram (STFT: 25ms/10ms)         • Pitch (F0) Tracking (60Hz - 400Hz range)
    • ResNet / CNN Feature Extraction                      • Pitch Variance & Glottal Dynamics
    • Vocoder Transposed Convolution Artifacts             • Jitter (Local RAP cycle perturbation)
    • Output: S_acoustic in [0.0, 100.0]                   • Shimmer (Local APQ5 amplitude variation)
                  │                                        • Harmonics-to-Noise Ratio (HNR in dB)
                  │                                        • Respiration Pauses & Vocal Micro-Tremor
                  │                                        • Output: S_prosody in [0.0, 100.0]
                  │                                                      │
                  └──────────────────────────┬───────────────────────────┘
                                             │
                                             ▼
                          [Stage 5: Multi-Signal Score Fusion]
                          Combined Risk = (0.50 * S_detector) + (0.25 * S_acoustic) + (0.25 * S_prosody)
                                             │
                                             ▼
                          [Stage 6: Optional Identity Verification (Mode B)]
                          Condition: speaker_id supplied AND enrolled voiceprint exists?
                                             │
                                             ├── YES ──► Extract ECAPA-TDNN 192-dim Embedding
                                             │           • Cosine Match vs. Supabase pgvector
                                             │           • Similarity Sim in [-1.0, 1.0]
                                             │           • CRITICAL RULE: High Sim != Human!
                                             │           • If Sim >= 0.85 AND Combined Risk >= 75:
                                             │               Flag as Targeted Clone Impersonation (RED)
                                             │
                                             └── NO ───► Mode A (Universal Detection; Identity Bypassed)
                                             │
                                             ▼
                          [Stage 7: Active PITCH Challenge Evaluation]
                          Condition: State in AMBER/RED?
                                             │
                                             ├── YES ──► Dynamic Phonetic Challenge Prompt
                                             │           • Conversational Latency Check (<1.2s human vs >2.5s neural)
                                             │           • Pitch Trajectory Excursion (ΔF0 > 45Hz)
                                             │           • Output: S_challenge in [0.0, 100.0]
                                             │
                                             └── NO ───► S_challenge = 0.0
                                             │
                                             ▼
                          [Stage 8: Asymmetric Temporal Smoothing (EMA)]
                          If R_raw > EMA_(t-1): α = 0.65 (Rapid Attack Escalation)
                          Else:                 α = 0.25 (Deliberate Safe Recovery)
                          EMA_(t) = α * R_raw + (1 - α) * EMA_(t-1)
                                             │
                                             ▼
                          [Stage 9: Threat State Machine & Categorization]
                          REAL / GREEN (<40.0) ◄──► SUSPICIOUS / AMBER (40.0 - 74.9) ◄──► AI-GENERATED / RED (>= 75.0)
                                             │
                                             ▼
                          [Stage 10: Security Action & Transaction Gate]
                          POST /v1/transaction/evaluate-authorization
                          • RED State ──► Deterministic Hard Circuit Breaker (HTTP 403 BLOCKED)
                          • AMBER State + High Value ──► PENDING_CHALLENGE (HTTP 428)
                          • GREEN State ──► APPROVED (HTTP 200)
```

---

## 3. Research Dataset Strategy & Evaluation Progression

The research roadmap strictly isolates dataset partitions to prevent evaluation leakage:

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

1. **ASVspoof 2019 LA (Initial Baseline Training & Development)**:
   - Partitioned into official train (25,380), dev (24,844), and eval (71,237) sets.
   - Status: **VERIFIED & INTEGRATED** (121,461 CM utterances; 7.12 GB; streaming JSONL manifests generated; strict partition governance enforced).
2. **ASVspoof 2021 DF (Cross-Dataset Generalization Evaluation)**:
   - Out-of-domain evaluation subset testing unseen vocoders and lossy compression.
   - Status: **Download pending** (Held out strictly for evaluation; NOT current training data).
3. **ASVspoof 2021 LA (Communication Robustness Evaluation)**:
   - Evaluates robustness under telephony channels.
   - Status: **Download pending** (NOT current training data).
4. **Independent Future Datasets (e.g., WaveFake)**:
   - Reserved for subsequent generalization studies across novel diffusion architectures.

---

## 4. Candidate Model Exploration Framework

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             CANDIDATE MODEL COMPARATIVE STUDY                                    │
├─────────────────────┬──────────────────────┬──────────────────────┬──────────────────────────────┤
│ Metric / Dimension  │ ResNet Acoustic      │ RawNet2              │ AASIST / AASIST-L            │
├─────────────────────┼──────────────────────┼──────────────────────┼──────────────────────────────┤
│ Primary Focus       │ Log-Mel Frequency    │ End-to-End Raw Sinc  │ Integrated Spectro-Temporal  │
│ Input Representation│ 80-bin Log-Mel Spec  │ Raw 16kHz Waveform   │ Raw 16kHz Waveform           │
│ Front-End Feature   │ STFT Mel Filterbank  │ SincNet Filters      │ SincNet Filters              │
│ Core Architecture   │ 2D Residual Conv     │ Time-Distributed CNN │ Heterogeneous Graph          │
│                     │ Blocks (ResNet)      │ + GRU Layers         │ Attention (Spectro-Temporal) │
│ Parameters          │ ~11.2M               │ ~14.4M               │ ~290K (L) / ~850K            │
│ Target Latency (CPU)│ < 20 ms              │ ~45 ms               │ < 25 ms                      │
│ Telephony Resilience│ Moderate             │ Moderate             │ High                         │
│ Candidate Role      │ Acoustic baseline    │ Raw waveform baseline│ Graph attention baseline     │
│ Selection Status    │ Candidate Experiment │ Candidate Experiment │ Candidate Experiment         │
└─────────────────────┴──────────────────────┴──────────────────────┴──────────────────────────────┘
```

> [!CAUTION]
> **Disciplined Intellectual Honesty**:
> 1. **No Candidate Model is Final**: No candidate architecture is claimed as already selected as the final production model.
> 2. **No Claimed Benchmark Achievements**: Published paper metrics from external literature belong to external authors and are not claimed as VaaniShield achievements.
> 3. **Unpopulated Weights**: Pretrained weights are not yet committed to `models/`. Real evaluation will occur on local datasets in Phase B4/B5.

---

## 5. Role of ECAPA-TDNN in Mode B

* ECAPA-TDNN (Emphasized Channel Attention, Propagation, and Aggregation Time Delay Neural Network) extracts 192-dimensional $L_2$-normalized speaker identity vectors.
* **Refactored Mandate**: ECAPA-TDNN is an **optional supporting identity consistency metric** used exclusively in Mode B when `speaker_id` is supplied.
* **Non-Negotiable Rule**:
  ```text
  ECAPA Cosine Similarity >= 0.85
  DOES NOT MEAN speech is genuine.
  ```
  A cloned voice intentionally matches the target speaker's embedding. Relying on speaker verification as proof of human authenticity creates a fatal security flaw.

---

## 6. Biomechanical Prosody & Acoustic Signal Processing

Synthetic speech generated by neural TTS and voice conversion models frequently violates human laryngeal mechanics:
1. **Fundamental Frequency ($F_0$) Trajectory**: Tracked between $60\text{ Hz}$ and $400\text{ Hz}$. Unnatural pitch flatness or step-wise quantization signals synthesis.
2. **Jitter (RAP)**: Organic speech micro-perturbation ($0.4\%–1.8\%$). Robotic speech shows unnaturally low jitter ($<0.2\%$) or algorithmic vocoder jitter ($>3.0\%$).
3. **Shimmer (APQ5)**: Amplitude perturbation quotient ($1.5\%–5.0\%$). Clones frequently exhibit abnormal shimmer ($>10\%$).
4. **Harmonics-to-Noise Ratio (HNR)**: Glottal vibration to aperiodic noise. Low HNR ($<10\text{ dB}$) during vowels indicates vocoder phase smearing.

---

## 7. Continual / Self-Learning Architecture & Poisoning Defense

```text
                        LIVE INFERENCE
                              │
                              ▼
               Prediction + Features + Metadata
                              │
                              ▼
                 Optional Feedback / Label
                (SecOps / User / PITCH Pass)
                              │
                              ▼
                     SQLite Learning Log
                  (Local Event Registry)
                              │
                              ▼
                    Validation & Quarantine
              (Outlier check, duplicate check)
                              │
                              ▼
                   Curated Training Batch
              (Quorum: >=500 genuine, >=500 spoof)
                              │
                              ▼
                  Periodic Offline Retraining
                              │
                              ▼
                   Benchmark Holdout Gate
              (Evaluated on Immutable Testset)
                              │
                    ┌─────────┴─────────┐
                    │                   │
                Improves              Degrades
                    │                   │
                    ▼                   ▼
             Promote Version         Reject
             (model-vX.Y.Z)      (Keep Current)
```

* **Risks Addressed**: Incorrect labels, data poisoning, model drift, regression, and evaluation leakage.
* Retraining requires minimum sample quorum, supervisor provenance, and strict EER improvement on immutable holdouts before version promotion. Instant rollback is supported via `ACTIVE_MODEL_VERSION`.

---

## 8. Zero-Cost / Free-First Engineering Policy

* **Core Inference**: 100% local CPU execution using open-source PyTorch and ONNX Runtime.
* **Database**: Supabase Free Tier ($0/mo, managed PostgreSQL 16 + pgvector) for persistent application state + SQLite (`vaani_learning.db`) for local learning telemetry.
* **Prohibited Mandatory Dependencies**: Zero paid LLM APIs, zero paid speech-to-text APIs, zero paid cloud GPU instances.
* **Policy Statement**: *"The core architecture is designed so that no paid API is required."*

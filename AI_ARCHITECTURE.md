# VaaniShield: Artificial Intelligence & Signal Processing Architecture

| Document Attribute | Specification Detail |
| :--- | :--- |
| **Document Version** | 2.0.0-AI-SPEC |
| **Status** | Approved AI/ML Technical Baseline / Deepfake-First Realignment |
| **System Classification** | Real-Time Speaker-Independent Multi-Tier Voice Deepfake Detection & Anti-Spoof Architecture |
| **Associated Documents** | `PRD.md` (Product Requirements), `TRD.md` (Technical Requirements), `SECURITY.md` (Security Specification) |
| **Reference Repository** | `Sayan-Mukherjee99/Voice-Cloning-Prototype` |
| **Primary AI Engine** | Speaker-Independent Waveform Anti-Spoof Detector (AASIST / RawNet2) |
| **Project Ownership** | Person A: **Shub** (Backend / AI Lead) \| Person B: **Sion** (Frontend Lead) |

---

## 1. Executive Summary & Codebase Grounding

### 1.1 Architectural Thesis
**VaaniShield** treats voice deepfake detection primarily as a **speaker-independent, multi-layered anti-spoofing problem**. 

The fundamental thesis is:
> **The primary AI engine must detect whether speech is synthetic, cloned, converted, or replayed without requiring the caller to be pre-enrolled.**

Single-model deepfake classifiers fail when exposed to unseen vocoders, lossy cellular codecs (AMR-NB/WB), or background acoustic noise. Furthermore, treating speaker verification as proof of authenticity creates a fatal vulnerability: a neural voice clone is explicitly optimized to mimic the target speaker's biometric embedding.

VaaniShield fuses:
1. **Primary Speaker-Independent Anti-Spoof Engine** (AASIST / RawNet2 end-to-end raw waveform modeling).
2. **Auxiliary Frequency-Domain Vocoder Analysis** (ResNet-18 log-mel spectrogram transposed convolution artifact detection).
3. **Physical Biomechanical Prosody** (Micro-perturbation of vocal cord oscillations: fundamental pitch $F_0$, jitter RAP, shimmer APQ5, Harmonics-to-Noise Ratio).
4. **Optional Speaker Vector Embeddings** (Conditional ECAPA-TDNN 192-dim identity consistency in Mode B).
5. **Active Cognitive & Acoustic Challenge-Response** (**PITCH** protocol testing conversational latency and non-linear vocal tract dynamics).
6. **Asymmetric Temporal Smoothing** (Sub-second attack escalation with deliberate safe de-escalation).

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
│ Primary Anti-Spoof   │ PLANNED / RESEARCH      │ AASIST / RawNet2 candidate model evaluation.    │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ Log-Mel Filterbank   │ IMPLEMENTED             │ 80-bin Librosa / Scipy mel-spectrogram (25ms    │
│ Spectrogram          │                         │ window, 10ms hop, 512 FFT, 20-8000Hz).          │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ ResNet-18 Acoustic   │ MOCK / FALLBACK         │ Auxiliary detector; falls back to mel variance  │
│ Vocoder Detector     │                         │ heuristic when resnet18.onnx is absent.         │
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
│ Self-Learning Log    │ PROPOSED                │ SQLite local learning registry (vaani_learning) │
└──────────────────────┴─────────────────────────┴─────────────────────────────────────────────────┘
```

---

## 2. End-to-End AI & Signal Processing Pipeline

```text
[Streaming Audio Ingress] (16kHz 16-bit Mono Linear PCM, 1024 samples/frame)
         │
         ▼
[Stage 1: Ingestion & Sliding Frame Windowing] (24-frame window = 1,536ms; 768ms hop cadence)
         │
         ▼
[Stage 2: Audio Preprocessing & Normalization] (Float32 [-1.0, 1.0], DC offset subtraction, Hann window)
         │
         ▼
[Stage 3: Voice Activity Detection (Silero VAD ONNX)] (512-sample sub-frames; Speech Ratio threshold: 0.15)
         │
         ├── Speech Ratio < 0.15 ──► [Halt Analysis; Flag Silence Chunk; Emit Resting Telemetry]
         └── Speech Ratio >= 0.15 ──► [Active Speech Confirmed; Proceed to Deepfake Detection]
                  │
                  ▼
[Stage 4: PRIMARY SPEAKER-INDEPENDENT ANTI-SPOOF ENGINE] (AASIST / RawNet2 Pretrained Model)
• End-to-end raw waveform classification (Bona Fide vs. Spoofed Speech)
• Operates unconditionally on any caller with ZERO prior enrollment
• Output: S_antispoof in [0.0, 100.0]
                  │
                  ├──────────────────────────────────────────────────────┐
                  ▼                                                      ▼
    [Stage 5A: Auxiliary Frequency-Domain Analysis]       [Stage 5B: Biomechanical Prosodic Analysis]
    • 80-bin Log-Mel Spectrogram (STFT: 25ms/10ms)         • Pitch (F0) Tracking (60Hz - 400Hz range)
    • ResNet-18 Quantized ONNX Inference                   • Pitch Variance & Glottal Dynamics
    • Vocoder Transposed Convolution Artifacts             • Jitter (Local RAP cycle perturbation)
    • Output: S_acoustic in [0.0, 100.0]                   • Shimmer (Local APQ5 amplitude variation)
                  │                                        • Harmonics-to-Noise Ratio (HNR in dB)
                  │                                        • Respiration Pauses & Vocal Micro-Tremor
                  │                                        • Output: S_prosody in [0.0, 100.0]
                  │                                                      │
                  └──────────────────────────┬───────────────────────────┘
                                             │
                                             ▼
                          [Stage 6: Multi-Signal Feature Fusion]
                          Combined Risk = (0.50 * S_antispoof) + (0.25 * S_acoustic) + (0.25 * S_prosody)
                                             │
                                             ▼
                          [Stage 7: Optional Identity Verification (Mode B)]
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
                          [Stage 8: Active PITCH Challenge Evaluation]
                          Condition: State in AMBER/RED?
                                             │
                                             ├── YES ──► Dynamic Phonetic Challenge Prompt
                                             │           • Conversational Latency Check (<1.2s human vs >2.5s neural)
                                             │           • Pitch Trajectory Excursion (ΔF0 > 45Hz)
                                             │           • Output: S_challenge in [0.0, 100.0]
                                             └── NO ───► S_challenge = 0.0
                                             │
                                             ▼
                          [Stage 9: Asymmetric Temporal Smoothing (EMA)]
                          If R_raw > EMA_(t-1): α = 0.65 (Rapid Attack Escalation)
                          Else:                 α = 0.25 (Deliberate Safe Recovery)
                          EMA_(t) = α * R_raw + (1 - α) * EMA_(t-1)
                                             │
                                             ▼
                          [Stage 10: Threat State Machine & Hysteresis]
                          GREEN (<40.0) ◄──► AMBER (40.0 - 74.9) ◄──► RED (>= 75.0)
                                             │
                                             ▼
                          [Stage 11: Contextual Intervention & Transaction Gate]
                          POST /v1/transaction/evaluate-authorization
                          • RED State ──► Deterministic Hard Circuit Breaker (HTTP 403 BLOCKED)
                          • AMBER State + High Value ──► PENDING_CHALLENGE (HTTP 428)
                          • GREEN State ──► APPROVED (HTTP 200)
```

---

## 3. Research-Backed Model Selection Framework

### 3.1 Comparative Analysis of Anti-Spoof Architectures

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             CANDIDATE MODEL COMPARATIVE STUDY                                    │
├─────────────────────┬──────────────────────┬──────────────────────┬──────────────────────────────┤
│ Metric / Dimension  │ AASIST / AASIST-L    │ RawNet2              │ ResNet-18 (Current Path)     │
├─────────────────────┼──────────────────────┼──────────────────────┼──────────────────────────────┤
│ Official Repo       │ clovaai/aasist       │ ASVspoof Baseline    │ Custom Implementation        │
│ Input Representation│ Raw 16kHz Waveform   │ Raw 16kHz Waveform   │ 80-bin Log-Mel Spectrogram   │
│ Front-End Feature   │ SincNet Filters      │ SincNet Filters      │ STFT Mel Filterbank          │
│ Core Architecture   │ Heterogeneous Graph  │ Time-Distributed CNN │ 2D Residual Convolutional    │
│                     │ Attention (Spectro-T)│ + GRU Layers         │ Blocks (ResNet)              │
│ Parameters          │ ~290K (L) / ~850K    │ ~14.4M               │ ~11.2M                       │
│ Inference Latency   │ < 25 ms (CPU TARGET) │ ~45 ms (CPU TARGET)  │ < 20 ms (CPU TARGET)         │
│ Telephony Resilience│ High                 │ Moderate             │ Low (Strips high mel-bins)   │
│ Pretrained License  │ MIT License          │ MIT License          │ Custom / Untrained in repo   │
│ Selected Role       │ PRIMARY DETECTOR     │ REFERENCE BACKUP     │ AUXILIARY ACOUSTIC SIGNAL    │
└─────────────────────┴──────────────────────┴──────────────────────┴──────────────────────────────┘
```

#### Detailed Findings on Research Candidates:
1. **AASIST / AASIST-L (Integrated Spectro-Temporal Graph Attention Networks)**:
   * *Citation*: Jung et al., *"AASIST: Audio Anti-Spoofing using Integrated Spectro-Temporal Graph Attention Networks"*, Interspeech 2021 / IEEE ACM TASLP.
   * *Mechanism*: AASIST processes raw speech waveforms through SincNet filters to extract spectral representations. A Heterogeneous Graph Attention Network (HGAT) models spectral and temporal dependencies concurrently via stacked graph modules and graph readout.
   * *AASIST-L*: The lightweight variant contains only ~290K parameters, achieving sub-25ms CPU inference while preserving high spoof discrimination.
   * *Decision*: **Selected as the Primary Speaker-Independent Anti-Spoof Engine** for VaaniShield.
   * *Benchmark Discipline*: Published paper results (e.g., $0.83\%$ EER on ASVspoof 2021 LA) are external benchmarks and shall not be claimed as VaaniShield achievements.
2. **RawNet2**:
   * *Citation*: Tak et al., *"End-to-End Anti-Spoofing with RawNet2"*, Interspeech 2021.
   * *Mechanism*: Direct waveform modeling using parameterized SincNet filters followed by residual blocks and GRU layers.
   * *Decision*: Serves as a validated reference and backup architecture.
3. **ResNet-18 Acoustic Vocoder Detector (Existing Repository Path)**:
   * *Mechanism*: 2D CNN classifying vocoder checkerboard artifacts and phase smearing on 80-bin log-mel spectrograms.
   * *Decision*: Retained strictly as an **auxiliary acoustic cue**. It does not replace the validated waveform-based anti-spoof model.

### 3.2 Role of ECAPA-TDNN in Mode B
* ECAPA-TDNN (Emphasized Channel Attention, Propagation, and Aggregation Time Delay Neural Network) extracts 192-dimensional $L_2$-normalized speaker identity vectors.
* **Refactored Mandate**: ECAPA-TDNN is an **identity consistency metric** used exclusively in Mode B when a `speaker_id` is supplied.
* **Non-Negotiable Rule**:
  ```text
  ECAPA Cosine Similarity >= 0.85
  DOES NOT MEAN speech is genuine.
  ```
  A cloned voice intentionally matches the target speaker's embedding. Relying on speaker verification as proof of human authenticity creates a critical vulnerability.

### 3.3 Optional Sequence & Temporal Models
The architecture supports evaluating a temporal model (e.g., lightweight GRU, mini-Transformer encoder) over sliding window score sequences ($[R_1, R_2, \dots, R_T]$). However, a temporal model will only be adopted if experimental validation confirms it outperforms Asymmetric EMA smoothing without exceeding the 100ms CPU latency limit.

### 3.4 Positioning of RAG (Retrieval-Augmented Generation)
* **RAG is NOT an audio deepfake detector.** RAG cannot analyze audio waveforms, spectrograms, or prosodic features.
* RAG is reserved for **optional later-stage contextual intelligence** (retrieving enterprise fraud policies, transaction limit rules, or incident response playbooks).

---

## 4. Biomechanical Prosody & Acoustic Signal Processing

### 4.1 Biomechanical Micro-Prosody Analysis
Synthetic speech generated by neural TTS and voice conversion models frequently violates the physical biomechanics of the human laryngeal tract:
1. **Fundamental Frequency ($F_0$) Trajectory**:
   * Tracked between $60\text{ Hz}$ and $400\text{ Hz}$ across voiced frames.
   * *Synthetic Indicator*: Unnatural pitch flatness (standard deviation $<10\text{ Hz}$) or robotic step-wise pitch quantization.
2. **Micro-Perturbation (Jitter & Shimmer)**:
   * **Jitter (RAP)**: Relative Average Perturbation of cycle-to-cycle frequency. Natural human speech exhibits organic micro-instability ($0.4\% \le \text{Jitter} \le 1.8\%$). Neural clones often generate either unnaturally periodic waveforms ($\text{Jitter} < 0.2\%$) or algorithmic vocoder jitter ($>3.0\%$).
   * **Shimmer (APQ5)**: 5-point Amplitude Perturbation Quotient. Natural human range: $1.5\% \le \text{Shimmer} \le 5.0\%$. Clones frequently exhibit abnormal shimmer distributions ($>10\%$).
3. **Harmonics-to-Noise Ratio (HNR)**:
   * Evaluates ratio of periodic glottal vibration to aperiodic noise. Low HNR ($<10\text{ dB}$) during voiced vowels indicates vocoder phase hiss.
4. **Respiration Gaps & Pulmonary Pauses**:
   * Measures biological inhalation pauses ($150–400\text{ ms}$) preceding long phonetic utterances.

*Rule*: Biomechanical prosodic features are **complementary supporting evidence**. No single prosody metric proves speech is synthetic.

---

## 5. Continual / Self-Learning Architecture & Poisoning Defense

VaaniShield implements a controlled continual-learning pipeline designed to improve detection over time without risking data poisoning.

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

### 5.1 Poisoning Defense & Model Governance
1. **Source Provenance**: Every training candidate record in SQLite documents its provenance (`controlled_test`, `operator_review`, `pitch_pass`, `external_dataset`).
2. **Quarantine Pool**: Unverified user feedback is held in quarantine and never enters training datasets automatically.
3. **Outlier & Duplicate Rejection**: Feature vectors undergo cosine clustering to reject adversarial duplicates and anomalous noise injections.
4. **Holdout Evaluation Gate**: Retrained candidate weights must achieve lower Equal Error Rate (EER) on an immutable benchmark set before promotion. If performance degrades, the candidate is discarded.
5. **Instant Rollback**: Model versions are tagged in the registry (`model_versions` table), enabling instant rollback via `ACTIVE_MODEL_VERSION` environment configuration.

---

## 6. Zero-Cost / Free-First Engineering Policy

To ensure complete independence from paid commercial APIs during hackathon evaluation and development:
* **Core Inference**: 100% local CPU execution using open-source PyTorch and ONNX Runtime.
* **Database**: Supabase Free Tier ($0/mo, managed PostgreSQL 16 + pgvector) for persistent application state + SQLite (`vaani_learning.db`) for local learning telemetry.
* **Prohibited Mandatory Dependencies**: Zero paid LLM APIs, zero paid speech-to-text APIs, zero paid cloud GPU instances.
* **Statement**: *"The core architecture is designed so that no paid API is required."*

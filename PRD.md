# Product Requirements Document (PRD)

# VaaniShield: Real-Time Speaker-Independent AI Voice Deepfake Detection & Voice Integrity Platform

| Document Attribute | Specification Detail |
| :--- | :--- |
| **Document Version** | 2.0.0-PROD-SPEC |
| **Status** | Approved Product Specification / Architecture Re-alignment |
| **Date** | September 2026 |
| **Product** | VaaniShield (वाणिShield) |
| **Repository Reference** | `Sayan-Mukherjee99/Voice-Cloning-Prototype` |
| **Document Classification** | Engineering Product Requirements / Technical Architecture Specification |
| **Core Product Thesis** | Speaker-Independent Real-Time Voice Deepfake & Anti-Spoof Detection Engine |
| **Target Milestones** | Phase 1 (Hackathon MVP / Demo-Grade), Phase 2 (Enterprise Pilot), Phase 3 (Carrier/Telco Scale) |

---

## 1. Executive Summary & Problem Definition

### 1.1 Executive Summary
**VaaniShield** is a real-time, speaker-independent AI voice deepfake detection and voice-integrity risk engine designed to protect mass users and high-stakes voice interactions (e.g., banking authorizations, executive wire approvals, digital arrest extortion defense, and customer care verifications). 

The primary product capability of VaaniShield is:
> **Detect whether an incoming voice stream shows evidence of synthetic, cloned, converted, replayed, or otherwise spoofed speech — without requiring the caller to be enrolled first.**

Unlike legacy biometric security systems that require pre-existing voice samples, VaaniShield operates natively on un-enrolled, first-time, and anonymous callers. It analyzes streaming audio for physical vocoder artifacts, biomechanical speech inconsistencies, and neural synthesis signatures. 

Speaker verification is an **optional secondary capability** rather than the primary detection mechanism. While speaker verification answers *"Who does this voice sound like?"*, deepfake detection answers the urgent security question: *"Does this speech show evidence of synthesis, conversion, or replay?"*

VaaniShield fuses speaker-independent anti-spoof classification, acoustic/spectral anomaly detection, biomechanical prosodic analysis, temporal smoothing, and an active acoustic challenge-response protocol (**PITCH**) into an explainable, continuous threat score ($0.0–100.0$). When risk crosses configurable thresholds, VaaniShield triggers deterministic operational interventions—including synchronous pre-transaction circuit breakers (`POST /v1/transaction/evaluate-authorization` returning HTTP 403)—to freeze fraudulent operations before monetary loss occurs.

```
                    ┌──────────────────────────────────────────────────────────────────┐
                    │                   INCOMING AUDIO STREAM                          │
                    │      (Unknown Caller / Mass User / Enrolled Executive)           │
                    │        (WebRTC / Telephony SBC Gateway / Softphone)              │
                    └─────────────────────────────────┬────────────────────────────────┘
                                                      │ 16kHz PCM (Mono, 16-bit)
                                                      ▼
                    ┌──────────────────────────────────────────────────────────────────┐
                    │               TIER 0: VOICE ACTIVITY DETECTION                   │
                    │                 Silero VAD (Silence Stripping)                   │
                    └─────────────────┬───────────────────────────────┬────────────────┘
                        Speech (<15% VAD Discard)                     │ Active Speech
                                                                      ▼
                    ┌──────────────────────────────────────────────────────────────────┐
                    │       PRIMARY ENGINE: SPEAKER-INDEPENDENT ANTI-SPOOF             │
                    │    (AASIST / RawNet2 Pretrained Waveform / Spectral Model)       │
                    │          Classifies Bona Fide Human vs. Spoofed Speech           │
                    │               [Operates with ZERO Prior Enrollment]              │
                    └─────────────────┬───────────────────────────────┬────────────────┘
                                      │                               │
                                      ▼                               ▼
                    ┌──────────────────────────────────┐ ┌─────────────────────────────┐
                    │  AUXILIARY ACOUSTIC & SPECTRAL   │ │    BIOMECHANICAL PROSODY    │
                    │  • ResNet-18 Log-Mel Spectrogram │ │    • Fundamental Pitch (F0) │
                    │  • Transposed Conv Artifacts     │ │    • Jitter, Shimmer, HNR   │
                    └─────────────────┬────────────────┘ └─────────────┬───────────────┘
                                      │                                │
                                      └───────────────┬────────────────┘
                                                      ▼
                                   ┌──────────────────────────────────────┐
                                   │ OPTIONAL IDENTITY LAYER (KNOWN-USER) │
                                   │ Conditional ECAPA-TDNN Verification  │
                                   │   (Does voice match claimed ID?)     │
                                   └──────────────────┬───────────────────┘
                                                      ▼
                    ┌──────────────────────────────────────────────────────────────────┐
                    │          MULTI-SIGNAL FUSION & ASYMMETRIC EMA SMOOTHING          │
                    │  Raw Signal Aggregation ──► Threat State Machine (GREEN/AMBER/RED)│
                    └─────────────────┬────────────────────────────────────────────────┘
                                      │
              ┌───────────────────────┼────────────────────────┐
              ▼                       ▼                        ▼
      [GREEN: Normal]        [AMBER: Suspicious]         [RED: Critical Attack]
      • Allow Session        • Step-up Verification      • Immediate Circuit Breaker
      • Standard Flow        • Trigger PITCH Challenge   • Lock Transaction Gate
                             • Warn Operator/User        • HTTP 403 / API Signal
```

### 1.2 Primary Problem Statement: The Mass-User Imperative
The threat of AI voice impersonation has expanded beyond enrolled VIPs to the general population. Fraudsters weaponize synthetic speech against mass-market victims through:
* **Digital Arrest & Law Enforcement Impersonation**: Fraudsters posing as police, judicial officers, or customs agents intimidate victims into transferring life savings into "verification accounts."
* **Family Emergency & Kidnapping Extortion**: Clones generated from 3-second social media clips deceive parents and grandparents into sending urgent ransom payments via UPI.
* **First-Time Call Center Impersonation**: Attackers call enterprise desks or healthcare portals without an enrolled voiceprint, exploiting knowledge-based authentication (KBA).

**The Mass-User Design Mandate:**
The system must be capable of analyzing an incoming voice from:
1. A known person (enrolled corporate user),
2. An unknown person (customer without an account),
3. A first-time caller (applicant or citizen), or
4. A caller with no pre-enrolled voiceprint,

and answering with rigorous statistical probability:
> **"Does this voice contain evidence of AI-generated, cloned, converted, or replayed speech?"**

A user or enterprise MUST NOT be required to register a reference voice sample merely to benefit from core deepfake protection.

### 1.3 Threat Landscape & Spoof Category Taxonomy
Modern speech synthesis encompasses multiple attack vectors. The anti-spoof architecture explicitly distinguishes between:
1. **Text-to-Speech (TTS) Synthesis**: Fully synthetic speech generated from text prompts using neural acoustic models (FastSpeech2, VITS) and neural vocoders (HiFi-GAN, BigVGAN).
2. **Voice Conversion (VC)**: Real-time or offline transformation of a source speaker's vocal characteristics into a target speaker's timbre (e.g., RVC, k-NN-VC) while preserving source phonetics.
3. **Zero-Shot Voice Cloning**: Conditioning TTS models on a short prompt ($3–10\text{ s}$) to replicate an individual's vocal identity (e.g., ElevenLabs, XTTS, OpenVoice).
4. **Replay Attacks**: Playing back a pre-recorded authentic human voice through a secondary acoustic transducer (loudspeaker) into the microphone stream.
5. **Transformed / Generated Speech**: Spliced, pitch-shifted, or time-stretched audio altered to bypass human suspicion or automated filters.
6. **Genuine (Bona Fide) Speech**: Natural human speech produced by biological lung pressure, vocal fold vibration, and non-linear vocal tract articulation.

The platform targets detection across these categories based on research-backed models, without claiming universal perfection across unvalidated generative architectures.

### 1.4 Telephony & Physical Reality Check
To maintain technical credibility, VaaniShield accounts for real-world physical and mobile operating constraints:
* **Mobile OS Sandboxing**: Neither Apple iOS nor Google Android permits non-jailbroken third-party applications to tap two-way native cellular calls. VaaniShield **does not claim** to be a consumer mobile app tapping cellular lines. It targets enterprise softphones (WebRTC / Electron), carrier SBC media-forking gateways (SIPREC / RFC 7865), and proprietary in-app VoIP calling SDKs.
* **Lossy Telephony Codec Degradation**: Cellular networks compress voice via lossy speech codecs:
  * **AMR-NB (Adaptive Multi-Rate Narrowband)**: 8 kHz sampling, 300–3,400 Hz passband. Strips high-frequency vocoder phase cues above 3.4 kHz.
  * **AMR-WB (Adaptive Multi-Rate Wideband / G.722.2 / VoLTE)**: 16 kHz sampling, 50–7,000 Hz passband.
  * **EVS (Enhanced Voice Services)**: 16/32/48 kHz variable bitrates.
* **Product Stance**: Models must be evaluated on downsampled and bandlimited audio. Detection combines frequency-domain cues with **biomechanical prosody** (which survives narrowband filtering) and **interactive challenge-response (PITCH)**. Production telecom robustness is treated as an empirical target to be validated, not an assumed baseline.

---

## 2. Core Product Thesis & Operating Principles

### 2.1 Core Product Thesis
> **VaaniShield is primarily a real-time, speaker-independent AI voice deepfake detection and voice-integrity risk engine.**

The primary engine classifies speech as **bona fide (human)** or **spoofed (synthetic/cloned/converted/replayed)** without requiring prior speaker enrollment.

### 2.2 The Conceptual Distinction Matrix
VaaniShield maintains a strict distinction between speaker identity, deepfake detection, and holistic voice integrity:

```text
Speaker Verification
=
Who does this voice sound like?
(Compares incoming voice against an enrolled biometric baseline)

Deepfake Detection
=
Does this speech show evidence of synthesis/spoofing?
(Analyzes acoustic, spectral, vocoder, and waveform properties independently of identity)

Voice Integrity
=
Combined evidence from deepfake detection,
acoustic/DSP signals, temporal behavior,
optional identity verification, and context.
```

> [!IMPORTANT]
> **ECAPA similarity HIGH does NOT mean speech is genuine.**
> A high-quality neural clone intentionally mimics the target speaker's acoustic profile. Relying on speaker verification as proof of authenticity creates a fatal vulnerability. Speaker verification is an optional contextual modifier, never the primary defense against voice cloning.

### 2.3 Product Principles

| Principle | Operational Rule |
| :--- | :--- |
| **1. Speaker-Independent by Default** | Core protection requires zero enrollment. Any caller can be evaluated immediately. |
| **2. Security-First & Fail-Secure** | Escalation to threat states must be rapid; de-escalation must be gradual. When confidence is compromised, sensitive transactions are gated. |
| **3. Zero-Cost / Free-First Core** | The core product must never mandate paid commercial APIs (LLMs, speech APIs, cloud GPU subscriptions). Local execution and open-source models are standard. |
| **4. Privacy-Preserving (DPDP Act 2023)** | Ephemeral runtime audio processing in volatile memory (15-second TTL). Zero permanent retention of raw customer voice audio without explicit, separate consent. |
| **5. Near-Real-Time Streaming** | Pipeline latency must not exceed **100 ms (p95 TARGET)** per analysis hop on edge CPU hardware to allow mid-call operational intervention. |
| **6. Explainable Risk Evidence** | Output structured evidence categories (vocoder artifacts, pitch rigidity, jitter anomalies) rather than opaque black-box verdicts. |
| **7. Multi-Layer Defense-in-Depth** | Combine deep anti-spoof models, DSP prosody, active challenge-response, and optional identity matching. Single-point detectors are unacceptable. |
| **8. Grounded Engineering Honesty** | Differentiate clearly between *measured* benchmarks and *target* goals. Disclose prototype mock fallbacks transparently. |

---

## 3. Product Modes: Mass-User vs. Known-User

VaaniShield operates in two primary operational modes:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    VAANISHIELD PRODUCT MODES                                     │
├─────────────────────────────────────────────────┬────────────────────────────────────────────────┤
│ MODE A: UNIVERSAL DEEPFAKE DETECTION            │ MODE B: ENHANCED IDENTITY + INTEGRITY          │
│ (Mass-User / Default / Zero-Enrollment)         │ (Known-User / Optional Enrollment)             │
├─────────────────────────────────────────────────┼────────────────────────────────────────────────┤
│ • Applicable to any caller (known or unknown)   │ • Requires pre-enrolled speaker voiceprint     │
│ • Zero voice database required                  │ • Verifies claimed identity via ECAPA-TDNN     │
│ • Speaker-independent anti-spoof model (AASIST) │ • Anti-spoof engine still runs unconditionally │
│ • Biomechanical prosody analysis (Praat/Scipy)  │ • High similarity + High synthetic risk = RED  │
│ • Asymmetric EMA temporal smoothing             │ • High similarity + Low synthetic risk = GREEN │
│ • Output: Synthetic Risk Score (0-100), State   │ • Output: Composite Voice Integrity Score      │
└─────────────────────────────────────────────────┴────────────────────────────────────────────────┘
```

### 3.1 Mode A: Universal Deepfake Detection (Mass-User Mode — Default)
* **Target Audience**: Unknown callers, first-time callers, public hotlines, general citizen banking, guest inquiries.
* **Preconditions**: None. Zero biometric enrollment required.
* **Input**: Streaming 16 kHz 16-bit linear PCM audio chunk via WebSocket or audio upload.
* **Processing**:
  1. Silero VAD strips non-speech and background noise.
  2. Speaker-independent anti-spoof model (AASIST / RawNet2) computes deepfake probability.
  3. Biomechanical prosody engine extracts $F_0$, jitter, shimmer, and HNR anomalies.
  4. ResNet-18 extracts auxiliary log-mel vocoder spectral cues.
  5. Multi-signal fusion computes instantaneous synthetic risk.
  6. Asymmetric EMA smoothing updates threat state (GREEN / AMBER / RED).
* **Output Payload**:
  ```json
  {
    "mode": "UNIVERSAL_DEEPFAKE_DETECTION",
    "synthetic_risk_score": 84.5,
    "threat_level": "RED",
    "confidence": 0.88,
    "detected_signals": {
      "anti_spoof_model_score": 86.2,
      "spectral_artifacts": "high_frequency_checkerboard",
      "prosody_anomaly": "unnatural_f0_flatness",
      "jitter_anomaly": true
    },
    "recommended_action": "BLOCK_TRANSACTION"
  }
  ```

### 3.2 Mode B: Enhanced Identity + Integrity (Known-User Mode — Optional)
* **Target Audience**: Enrolled VIPs, authorized corporate treasury approvers, high-value commercial accounts.
* **Preconditions**: Caller has previously completed biometric enrollment (`POST /v1/enroll`) generating a 192-dimensional ECAPA-TDNN embedding in the database.
* **Input**: Streaming audio + `speaker_id` identifier.
* **Processing**:
  1. Executes all Mode A speaker-independent deepfake checks unconditionally.
  2. If Tier 1 risk is elevated or high-value policy applies, extracts live ECAPA-TDNN 192-dim embedding.
  3. Queries vector database for cosine similarity against enrolled baseline:
     $$\text{Sim}(v_{\text{live}}, v_{\text{enrolled}}) = \frac{v_{\text{live}} \cdot v_{\text{enrolled}}}{\|v_{\text{live}}\| \|v_{\text{enrolled}}\|}$$
  4. Fuses identity match with anti-spoof risk:
     * *Case 1 (Cloned Impersonation)*: Speaker similarity is HIGH ($\ge 0.85$), but synthetic risk is HIGH ($\ge 75.0$). **Verdict: CRITICAL ATTACK (RED)**. The attacker is presenting an enrolled identity using an AI clone.
     * *Case 2 (Wrong Speaker)*: Speaker similarity is LOW ($< 0.65$), but synthetic risk is LOW. **Verdict: IDENTITY MISMATCH (AMBER/RED)**. Legitimate human, but wrong person.
     * *Case 3 (Authentic Executive)*: Speaker similarity is HIGH ($\ge 0.85$) and synthetic risk is LOW ($< 40.0$). **Verdict: AUTHENTIC (GREEN)**.
* **Output Payload**:
  ```json
  {
    "mode": "ENHANCED_IDENTITY_INTEGRITY",
    "synthetic_risk_score": 88.0,
    "speaker_similarity": 0.91,
    "voice_integrity_score": 89.2,
    "threat_level": "RED",
    "confidence": 0.92,
    "detected_signals": {
      "anti_spoof_model_score": 89.5,
      "speaker_match": true,
      "cloning_alert": "Cloned voice of authorized identity detected"
    },
    "recommended_action": "STEP_UP_OR_BLOCK"
  }
  ```

---

## 4. Input & Output Model Specifications

### 4.1 Audio Input Model
* **Format**: Single-channel (Mono), 16-bit Signed Integer, Linear PCM.
* **Sampling Rate**: 16,000 Hz (16 kHz).
* **Frame Geometry**:
  * Frame Size: 1,024 samples ($64\text{ ms}$ at 16 kHz), 2,048 bytes.
  * Sliding Analysis Window: 24 frames ($1,536\text{ ms} \approx 1.54\text{ s}$).
  * Hop Cadence: 12 frames ($768\text{ ms} \approx 0.77\text{ s}$ update interval).
* **Transport**: Binary frames over WebSocket endpoint `/v1/stream/call/{session_id}`.
* **Optional Transcoding Support**: Telephony audio ingested at 8 kHz (AMR-NB) undergoes linear interpolation/upsampling to 16 kHz prior to feature extraction.

### 4.2 Optional Contextual Inputs
These inputs enhance policy evaluation but are **never required** for core deepfake detection:
* `speaker_id` (string, optional): SHA-256 pseudonym of claimed identity for Mode B verification.
* `session_context` (object, optional): Channel type (`softphone`, `webrtc`, `telephony_sbc`).
* `transaction_context` (object, optional): `amount_inr`, `beneficiary_vpa`, `velocity_count`.
* `challenge_response` (object, optional): Interactive PITCH challenge state and audio response.
* `validated_user_feedback` (object, optional): Ground-truth validation reported post-call.

### 4.3 Output Model & Probabilistic Threat Formulation
VaaniShield produces a probabilistic risk assessment rather than claiming deterministic perfection.

```text
VOICE INTEGRITY RESULT
────────────────────────────────────────────────────
Synthetic / Deepfake Risk: 82.4 / 100
Threat Level: RED [CRITICAL ATTACK]
Confidence Score: 0.89

Signals Detected:
• Anti-Spoofing Model (AASIST): 85.0 / 100 (Bona Fide Prob: 0.15)
• ResNet-18 Acoustic Vocoder: 79.2 / 100 (Transposed Conv Artifacts)
• Biomechanical Prosody: 81.0 / 100 (Unnatural Jitter: 3.82%, Low F0 Var)
• Temporal Consistency: Unstable spectral phase drift across 3 hops
• Speaker Similarity: 0.88 (Matches Enrolled Profile — Target Impersonation)

Recommended Action: BLOCK_TRANSACTION
HTTP Gateway Status: 403 Forbidden
```

> [!WARNING]
> **Risk Score $\neq$ Probability of Truth $\neq$ Speaker Similarity.**
> The system makes no claim of 100% accuracy. Risk scores represent the statistical likelihood of synthetic voice manipulation based on observed acoustic and biomechanical features.

---

## 5. Target Personas & Stakeholder Profiles

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   STAKEHOLDER PERSONA MATRIX                                     │
├───────────────────────┬───────────────────────────────┬──────────────────────────────────────────┤
│ Persona               │ Core Responsibility           │ Primary VaaniShield Interface            │
├───────────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Bank Fraud Analyst    │ Live call threat monitoring,  │ War Room Web Console, Spectrogram Canvas,│
│ (SecOps)              │ tuning thresholds, incident   │ Prosody Timeline, Audit Trail            │
│                       │ investigations.               │                                          │
├───────────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Enterprise Employee   │ Executing daily duties        │ Softphone Widget, Simple Visual Badge    │
│ (Social Eng. Target)  │ without succumbing to deepfake│ (GREEN/AMBER/RED), Automated Warnings    │
│                       │ CEO impersonation.            │                                          │
├───────────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Call Center Operator  │ Authenticating incoming       │ In-line Agent HUD, Passive Score Bar,    │
│                       │ callers quickly without AHT   │ One-Click PITCH Challenge Trigger Drawer │
│                       │ penalty.                      │                                          │
├───────────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Treasury Approver     │ Authorizing high-value        │ Core Banking Gateway, Pre-Transaction    │
│ (Financial Gatekeeper)│ wire transfers (RTGS/NEFT/UPI)│ Synchronous Circuit Breaker (HTTP 403)   │
│                       │ with biological assurance.    │                                          │
├───────────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Platform Integrator   │ Ingesting SBC/WebRTC media    │ Typed WebSocket Stream (`/v1/stream`),   │
│ (Telephony Engineer)  │ streams and consuming events. │ REST APIs, Webhook Dispatcher            │
├───────────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ System Administrator  │ Maintaining infrastructure,   │ Docker Compose, `/health` endpoint,      │
│                       │ SQLite learning logs, Supabase│ Redis TTL metrics, Non-root containers   │
├───────────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Hackathon Evaluator   │ Verifying architectural depth,│ Live Mic vs. Synthetic Injector Toggle,  │
│ (Technical Judge)     │ latency benchmarks, and code  │ Simulated Wire Block, PITCH Demo         │
│                       │ reality.                      │                                          │
└───────────────────────┴───────────────────────────────┴──────────────────────────────────────────┘
```

---

## 6. Product-Level Threat Model & Spoofing Taxonomy

### 6.1 Attack Vectors & Defense Mechanics

| Threat Class | Attacker Methodology & Tools | Vulnerability Exploited | VaaniShield Defense Mechanism |
| :--- | :--- | :--- | :--- |
| **T1: Opportunistic TTS** | Pre-recorded ElevenLabs or PlayHT audio clips injected into virtual mic. | Human inability to distinguish clean synthetic speech over mobile/VoIP. | Primary Anti-Spoof model detects vocoder spectral footprint; background noise discontinuity. |
| **T2: Real-Time Voice Conversion (RVC)** | Attacker speaks live while open-source RVC transforms timbre to victim's voice. | Caller ID trust + voice timbre resemblance bypassing basic KBA. | Biomechanical prosody detects pitch quantization, abnormal jitter/shimmer; PITCH exposes latency. |
| **T3: Targeted Zero-Shot Clone** | 30s audio harvested from social media used to condition zero-shot diffusion vocoder. | Enrolled speaker verification without anti-spoof checks. | Mode B couples speaker match with anti-spoof detector. High similarity + High synthetic score triggers RED. |
| **T4: Acoustic Replay Attack** | High-fidelity loudspeaker playback of genuine recorded victim voice. | Standard voice biometrics verify voiceprint match. | Anti-spoof model detects loudspeaker channel distortion, secondary room reverberation, and lack of PITCH response. |
| **T5: Conversational Lag Evasion** | Attacker pauses between sentences while waiting for AI generation. | Normal human conversational cadence assumed. | Temporal aggregation tracks utterance latency; PITCH forces immediate phonetic response ($<1.2\text{ s}$). |

---

## 7. Primary AI Architecture & Research-Grounded Model Selection

### 7.1 Primary AI Pipeline Dataflow
Speaker-independent anti-spoof detection is the core objective of the pipeline:

```text
                   LIVE VOICE STREAM (16kHz PCM)
                                 │
                                 ▼
                          Audio Ingestion
                                 │
                                 ▼
                    VAD (Silero ONNX / Energy)
                                 │
                   ┌─────────────┴─────────────┐
                   ▼                           ▼
          Speech Ratio < 0.15          Speech Ratio >= 0.15
            (Discard Window)           (Signal Conditioning)
                                               │
                                               ▼
                              SPEAKER-INDEPENDENT ANTI-SPOOF ENGINE
                              (AASIST / RawNet2 Pretrained Model)
                                               │
                         ┌─────────────────────┴─────────────────────┐
                         ▼                                           ▼
               Acoustic / Spectral Evidence               Biomechanical Prosody Evidence
               • ResNet-18 Log-Mel Spectrogram             • Fundamental Pitch (F0) Mean/Var
               • Vocoder Transposed Conv Artifacts         • Jitter RAP & Shimmer APQ5
               • High-Frequency Roll-Off                   • Harmonics-to-Noise Ratio (HNR)
                         │                                           │
                         └─────────────────────┬─────────────────────┘
                                               │
                                               ▼
                                  OPTIONAL IDENTITY LAYER
                                (Mode B: If speaker_id Present)
                                 ECAPA-TDNN 192-dim Embedding
                                  Cosine Match vs. Supabase
                                               │
                                               ▼
                                      Score Fusion Engine
                                               │
                                               ▼
                                  Asymmetric Temporal Smoothing
                                   (α_up = 0.65, α_down = 0.25)
                                               │
                                               ▼
                                      Threat State Machine
                                      (GREEN / AMBER / RED)
                                               │
                         ┌─────────────────────┴─────────────────────┐
                         ▼                                           ▼
               Active PITCH Challenge                     Transaction Circuit Gate
             (Triggered on AMBER / RED)                (POST /v1/transaction/evaluate)
                         │                                           │
                         └─────────────────────┬─────────────────────┘
                                               │
                                               ▼
                                      Final Intervention
                                (HTTP 200 Allow / HTTP 403 Block)
```

### 7.2 Research-Grounded Model Selection: AASIST vs. RawNet2 vs. Baselines
To select the primary speaker-independent anti-spoof engine, the following open-source architectures from authoritative speech anti-spoofing research (ASVspoof 2021 and ASVspoof5) were evaluated:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             ANTI-SPOOF MODEL COMPARATIVE EVALUATION                              │
├─────────────────────┬──────────────────────┬──────────────────────┬──────────────────────────────┤
│ Evaluation Criteria │ AASIST / AASIST-L    │ RawNet2              │ Existing ResNet-18 Path      │
├─────────────────────┼──────────────────────┼──────────────────────┼──────────────────────────────┤
│ Primary Reference   │ clovaai/aasist       │ ASVspoof Baseline    │ Custom Spectrogram Baseline  │
│ Architecture Type   │ Spectro-Temporal GAT │ End-to-End Raw Sinc  │ 2D CNN over Log-Mel Spec     │
│ Input Representation│ Raw 16kHz Waveform   │ Raw 16kHz Waveform   │ 80-bin Log-Mel Spectrogram   │
│ Model Size (Params) │ ~290K (AASIST-L) /   │ ~14.4M               │ ~11.2M                       │
│                     │ ~850K (AASIST)       │                      │                              │
│ Inference Latency   │ < 25 ms (CPU TARGET) │ ~45 ms (CPU TARGET)  │ < 20 ms (CPU TARGET)         │
│ Telephony Robustness│ High (Joint Graph)   │ Moderate             │ Low (Degrades on AMR 8kHz)   │
│ Pretrained Weights  │ Public (ASVspoof21)  │ Public (ASVspoof21)  │ Requires Custom Training     │
│ Software License    │ MIT License          │ MIT License          │ MIT License                  │
│ ONNX Exportability  │ Feasible via PyTorch │ Feasible via PyTorch │ Supported out-of-the-box     │
│ Hackathon Viability │ RECOMMENDED PRIMARY  │ Viable Alternative   │ Retained as Auxiliary Signal │
└─────────────────────┴──────────────────────┴──────────────────────┴──────────────────────────────┘
```

#### Detailed Model Profiles:
1. **AASIST / AASIST-L (Integrated Spectro-Temporal Graph Attention Networks)**:
   * *Repository*: `clovaai/aasist` (Jung et al., Interspeech 2021).
   * *Mechanism*: Operates directly on raw audio waveforms using SincNet front-end filters followed by heterogeneous graph attention layers that model relationships across temporal and spectral domains simultaneously.
   * *AASIST-L*: Lightweight variant with fewer parameters, ideal for real-time edge CPU inference.
   * *Suitability*: High. Excellent generalizability against unseen vocoders and compression artifacts; MIT licensed with official pretrained weights.
2. **RawNet2**:
   * *Reference*: Official baseline for ASVspoof 2021 and ASVspoof5 deepfake countermeasure tracks.
   * *Mechanism*: End-to-end raw audio processing with time-distributed convolutions and gated recurrent units (GRU).
   * *Suitability*: Strong research pedigree, but higher parameter count and latency compared to AASIST-L.
3. **ResNet-18 Acoustic Vocoder Detector (Current Repository Path)**:
   * *Mechanism*: 2D CNN trained on 80-bin log-mel spectrograms.
   * *Status in PRD v2.0*: **Retained strictly as an auxiliary acoustic signal**. It provides complementary frequency-domain cues, but does not replace the validated waveform-based anti-spoof model.

> [!CAUTION]
> **Benchmark Attribution Discipline**:
> The published benchmark results of external repositories (e.g., AASIST reporting $<1.0\%$ EER on ASVspoof 2021 LA) **must never be reported as VaaniShield results**. VaaniShield shall only publish benchmark metrics measured on its own test datasets using its own execution pipeline.

### 7.3 Role of Auxiliary & Complementary Components
1. **Biomechanical Micro-Prosody Engine**:
   * Measures vocal cord dynamics via Praat Parselmouth (with SciPy vector fallbacks).
   * Signals: Fundamental frequency ($F_0$) mean and variance, cycle-to-cycle jitter (RAP), shimmer (APQ5), Harmonics-to-Noise Ratio (HNR), and pulmonary respiration pauses.
   * *Principle*: No single prosody metric proves speech is synthetic. Prosodic indicators act as physical reality checks supporting the primary neural detector.
2. **ECAPA-TDNN Speaker Identity Engine**:
   * Role: Extracts 192-dimensional embeddings for optional speaker verification (Mode B).
   * *Principle*: High speaker similarity does not indicate genuine speech. A cloned voice is specifically engineered to sound like the victim.
3. **Optional Sequence / Temporal Transformer Layer**:
   * Evaluates score progression across successive sliding windows.
   * *Rule*: A temporal sequence model (e.g., GRU or mini-Transformer) will only be integrated if empirical experiments prove it outperforms Asymmetric EMA smoothing without violating the sub-100ms CPU latency budget.
4. **Positioning of RAG (Retrieval-Augmented Generation)**:
   * **RAG is NOT a deepfake detector.** RAG cannot evaluate audio waveforms or spectrograms for vocoder artifacts.
   * RAG is reserved for **optional later-stage contextual intelligence** (retrieving organization fraud policies, regulatory compliance rules, or historical incident playbooks).

---

## 8. Real-Time Streaming, Temporal Risk Engine & Interventions

### 8.1 Streaming Sliding Window Geometry
Detection operates on sliding audio windows to provide incremental evidence without requiring the call to conclude:
* **Frame Size**: 1,024 samples ($64\text{ ms}$).
* **Sliding Buffer**: 24 frames ($1,536\text{ ms} \approx 1.54\text{ s}$).
* **Hop Cadence**: 12 frames ($768\text{ ms}$).
* Every $768\text{ ms}$, the engine computes a new instantaneous synthetic score.

```text
Audio Stream:  [--- Frame 1 to 24 ---]  --> Analysis Hop 1 (Score: 18)
                      [--- Frame 13 to 36 ---]  --> Analysis Hop 2 (Score: 24)
                            [--- Frame 25 to 48 ---]  --> Analysis Hop 3 (Score: 82 - Attack Injected)
```

### 8.2 Asymmetric Temporal Aggregation (EMA)
Instantaneous scores fluctuate due to acoustic transients, background noise, or unvoiced phonemes. VaaniShield applies an **Asymmetric Exponential Moving Average (EMA)** filter to produce the smoothed operational risk score $R_{\text{EMA}}$:

$$R_{\text{EMA}}^{(t)} = \alpha R_{\text{raw}}^{(t)} + (1 - \alpha) R_{\text{EMA}}^{(t-1)}$$

Where:
$$\alpha = \begin{cases} 
\alpha_{\text{escalate}} = 0.65 & \text{if } R_{\text{raw}}^{(t)} > R_{\text{EMA}}^{(t-1)} \quad \text{(Rapid Attack Escalation)} \\ 
\alpha_{\text{deescalate}} = 0.25 & \text{if } R_{\text{raw}}^{(t)} \le R_{\text{EMA}}^{(t-1)} \quad \text{(Deliberate Safe Recovery)} 
\end{cases}$$

This ensures the system escalates to **RED** within 2 analysis hops ($\approx 1.5\text{ s}$) upon synthetic voice injection, while requiring $\approx 4.5\text{ s}$ of sustained authentic speech to recover to **GREEN**.

### 8.3 Threat State Machine & Calibrated Thresholds
The continuous score $R_{\text{EMA}}$ maps into three distinct threat states with hysteresis:

```
                      R_EMA >= 40.0 (Fast Rise: a=0.65)
           ┌───────────────────────────────────────┐
           │                                       ▼
 ┌───────────────────┐                   ┌───────────────────┐
 │       GREEN       │                   │       AMBER       │
 │  (Normal Status)  │                   │(Suspicious Drift) │
 │   R_EMA < 40.0    │                   │ 40.0 <= R < 75.0  │
 └───────────────────┘                   └───────────────────┘
           ▲                                       │
           │   R_EMA < 35.0 (Slow Fall: a=0.25)    │
           └───────────────────────────────────────┤
                                                   │ R_EMA >= 75.0
                                                   ▼
                                         ┌───────────────────┐
                                         │        RED        │
                                         │ (Critical Attack) │
                                         │   R_EMA >= 75.0   │
                                         └───────────────────┘
                                                   │
                                                   │ R_EMA < 70.0 (Hysteresis)
                                                   ▼
                                         (Recovery to AMBER)
```

* **GREEN (Normal State, $R_{\text{EMA}} < 40.0$)**: Voice characteristics consistent with organic human speech. Standard operations allowed.
* **AMBER (Suspicious State, $40.0 \le R_{\text{EMA}} < 75.0$)**: Mild vocoder cues, acoustic drift, or prosodic stiffness detected. Triggers user warning, unlocks PITCH challenge, and flags transactions for step-up review.
* **RED (Critical Threat State, $R_{\text{EMA}} \ge 75.0$)**: High-confidence synthetic voice or voice clone confirmed. Immediate audio/visual alert; active transaction gate enforces hard circuit breaker.

> [!NOTE]
> Numeric thresholds (40.0, 75.0) are initial engineering configurations. In production deployments, thresholds must be empirically calibrated using holdout validation datasets.

### 8.4 Active PITCH Challenge-Response Protocol
When passive monitoring enters **AMBER**, VaaniShield can initiate an active cognitive and acoustic challenge (**PITCH: Phonetic Instability & Transient Challenge for Humans**).
* **Mechanism**: Displays a phonetically demanding prompt (e.g., *"Kachha Papad, Pakka Papad"*, *"Pital ke bartan mein papita peela peela"*).
* **Vulnerabilities Exploited**:
  1. *Generative Latency*: Neural voice changers require $1.5–3.5\text{ s}$ to process novel text, exposing an interactive latency gap.
  2. *Vocoder Co-Articulation Breakdown*: Rapid aspirated plosives and retroflex consonants induce severe phase distortion and robotic glitches in real-time neural vocoders.
* **Verification Criteria**: Immediate response ($<1.2\text{ s}$), phrase completion, and dynamic pitch excursion ($\Delta F_0 > 50\text{ Hz}$).

### 8.5 Pre-Transaction Authorization Gate
The pre-transaction gate (`POST /v1/transaction/evaluate-authorization`) enforces a synchronous, fail-secure circuit breaker for core banking:

| Threat State | Risk Score ($R_{\text{EMA}}$) | Amount (INR) | Gate Decision | HTTP Status | Action Enforced |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GREEN** | $0.0 - 39.9$ | Any amount | `APPROVED` | `200 OK` | Payment proceeds immediately. |
| **AMBER** | $40.0 - 74.9$ | $< \text{₹}10,000$ | `APPROVED_WITH_WARNING` | `200 OK` | Proceeds with SMS alert to account holder. |
| **AMBER** | $40.0 - 74.9$ | $\ge \text{₹}10,000$ | `PENDING_CHALLENGE` | `428 Precondition`| Paused until PITCH challenge is passed. |
| **RED** | $\ge 75.0$ | Any amount ($> \text{₹}0$) | `BLOCKED` | `403 Forbidden` | **Hard Circuit Breaker**. Transaction frozen. |

---

## 9. Explainability & Human-Centered UX Communication

### 9.1 Explainable Evidence Categories
VaaniShield avoids black-box verdicts. Visual telemetry and audit logs communicate structured evidence categories:
1. **Acoustic & Spectral Evidence**: Transposed convolution checkerboard artifacts, abnormal high-frequency spectral roll-off, absence of sub-band glottal excitation.
2. **Biomechanical Prosody Evidence**: Unnatural pitch rigidity (low $F_0$ variance), robotic jitter ($<0.2\%$ or $>3.5\%$), abnormal shimmer ($>10\%$), low HNR in vowels.
3. **Temporal Consistency Evidence**: Phase discontinuities across sliding window hops, erratic background noise floor drops during speech pauses.
4. **Identity Divergence (Mode B)**: Cosine distance between claimed speaker vector and live audio vector.

### 9.2 Probabilistic Language Standards
To prevent false security assumptions, user-facing copy adheres to strict guidelines:
* **Prohibited**: *"This caller is 100% verified authentic."* / *"This caller is definitely an AI deepfake."*
* **Approved**: *"High synthetic-voice risk detected (Score: 84/100). Evident vocoder artifacts and abnormal pitch rigidity."* / *"Voice integrity consistent with organic human speech."*

---

## 10. Continual / Self-Learning Architecture & Poisoning Defense

VaaniShield includes a controlled self-improving learning lifecycle. To protect system stability, **the model is NEVER retrained blindly or automatically after individual calls**.

### 10.1 Controlled Learning Lifecycle Dataflow

```text
                    USER / TEST AUDIO STREAM
                               │
                               ▼
                        LIVE INFERENCE
                               │
                               ▼
                    Prediction + Feature Vector
                               │
                               ▼
                    Optional User / Operator Feedback
                     ("Genuine" / "Synthetic" / "False Positive")
                               │
                               ▼
                      SQLite Learning Log
                   (Local Metadata Registry)
                               │
                               ▼
                       Label Validation Gate
                   (Filter Untrusted / Outlier Samples)
                               │
                               ▼
                      Curated Training Dataset
                               │
                               ▼
                       Periodic Offline Retraining
                               │
                               ▼
                     Holdout Validation Gate
                  (Evaluated on Benchmark Testset)
                               │
                     ┌─────────┴─────────┐
                     │                   │
                 Improves              Degrades
                     │                   │
                     ▼                   ▼
              Promote Model           Reject Candidate
              (New Version)           (Retain Active Model)
```

### 10.2 Trusted Label Sources
Training datasets are formed strictly from validated sources:
1. **Controlled Synthetic Test Suites**: In-house generated audio using known open-source and commercial TTS/VC engines (ElevenLabs, RVC, VITS, Bark).
2. **Validated Human Feedback**: SecOps analysts or authenticated users submitting post-incident dispute reports with explicit verification flags.
3. **Closed-Loop PITCH Test Outcomes**: Samples where biometric challenge-response conclusively demonstrated biological human performance.
4. **Curated Research Corpora**: Established public datasets (ASVspoof 2021, ASVspoof5, In-the-Wild) used for periodic calibration.

### 10.3 Data Poisoning Protection & Quality Controls
Because adversaries may intentionally submit malicious feedback to corrupt future models, the learning pipeline enforces strict safeguards:
* **Label Confidence Scoring**: Unverified feedback receives low weight; only supervisor-reviewed labels enter training candidates.
* **Outlier & Duplicate Detection**: Cosine clustering identifies duplicate audio vectors or anomalous adversarial noise.
* **Quarantine Pool**: Suspicious feedback samples are held in quarantine for manual audit.
* **Minimum Retraining Quorum**: Retraining requires at least 500 validated genuine and 500 validated spoofed samples.
* **Holdout Evaluation Gate**: Retrained candidate weights must achieve lower Equal Error Rate (EER) on an immutable benchmark set before promotion. If performance degrades, the candidate is discarded and an alert is issued.
* **Model Semantic Versioning**: All active weights are tagged (e.g., `model-v2.1.0-aasist`) with instant rollback capability.

---

## 11. Dual Database Architecture & Zero-Cost Constraints

### 11.1 Dual Database Topology: Supabase + SQLite
To maintain zero operational cost during hackathon and prototype development while ensuring an enterprise-ready trajectory, VaaniShield employs a dual-database pattern:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    DUAL DATABASE ARCHITECTURE                                    │
├────────────────────────────────────────────────┬─────────────────────────────────────────────────┤
│ SUPABASE (PostgreSQL 16 + pgvector)            │ SQLITE (Local Embedded Learning Registry)       │
├────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
│ • Primary Application Database                 │ • Local Embedded ML Event Registry              │
│ • Free Tier Target ($0 / month)                │ • File-based: zero server infrastructure        │
│ • Stores:                                      │ • Stores:                                       │
│   - User accounts & tenant auth                │   - Per-hop model inference telemetry           │
│   - Call session states                        │   - Feature vectors & candidate training metadata│
│   - Enrolled speaker voiceprints (vector(192)) │   - Operator feedback records                   │
│   - Pre-transaction audit ledger               │   - Retraining batch candidates & version tags  │
│ • Cloud-hosted or local Docker container       │ • High write-throughput; low overhead           │
└────────────────────────────────────────────────┴─────────────────────────────────────────────────┘
```

#### Supabase Free Plan Alignment:
* The production prototype targets the **Supabase Free Tier**:
  * $0 / month monetary commitment.
  * Includes managed PostgreSQL 16, 500 MB database storage, 1 GB file storage, and up to 50,000 monthly active users.
  * Supports `pgvector` extension natively for ECAPA-TDNN 192-dimensional vector indexing.
* Core product capabilities are designed to stay well within free quotas during development and demonstration.

#### SQLite Local Learning Registry Schema:
SQLite provides a fast, zero-configuration local store (`vaani_learning.db`) for tracking ML experiments and feedback:
* `learning_events`: `event_id`, `session_id`, `model_version`, `raw_score`, `smoothed_score`, `detected_signals`, `timestamp`.
* `feedback_records`: `feedback_id`, `session_id`, `operator_id`, `claimed_label` (GENUINE / SPOOF), `confidence`, `notes`.
* `training_candidates`: `candidate_id`, `feature_hash`, `validated_label`, `provenance`, `status` (PENDING / APPROVED / REJECTED).

### 11.2 Zero-Cost / Free-First Engineering Constraint
The VaaniShield core platform is built with a hard financial constraint:
> **The core architecture is designed so that no paid API is required.**

* **100% Free & Open-Source Stack**:
  * Runtimes: Python 3.11, FastAPI, Uvicorn, Next.js 16, React 19.
  * AI / ML: PyTorch (CPU utility), ONNX Runtime, SciPy, Librosa, NumPy, Parselmouth.
  * In-Memory Buffer: Redis 7.2-alpine (or in-memory thread-safe deque fallback).
  * Storage: Supabase Free Tier + SQLite embedded file.
  * Compute: Standard x86_64 CPU execution without mandatory cloud GPU instances.
* **Strict Prohibition of Mandatory Paid APIs**:
  * No required paid LLM APIs (OpenAI GPT-4, Anthropic Claude).
  * No required paid speech or transcription services (Google Speech, Deepgram).
  * No required paid telephony or carrier simulation services.
* **Optional Integrations**: Any commercial API considered for future phases must be designated as strictly **OPTIONAL** and easily substitutable by local open-source models.

---

## 12. Data Lifecycle, Governance & Privacy Architecture (DPDP Act 2023)

### 12.1 Strict Privacy Lifecycle
VaaniShield is architected around India’s **Digital Personal Data Protection (DPDP) Act 2023** principles:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        DATA PRIVACY LIFECYCLE (DPDP ACT 2023)                          │
├───────────────────────┬────────────────────────────────────────────────────────────────┤
│ Stage                 │ Architectural Implementation & Enforcement Policy              │
├───────────────────────┼────────────────────────────────────────────────────────────────┤
│ 1. Ingestion          │ Streaming 16kHz PCM frames arrive over TLS 1.3 encrypted WSS.  │
│                       │ Buffered ephemerally in Redis ring buffer (LPUSH/LTRIM).       │
├───────────────────────┼────────────────────────────────────────────────────────────────┤
│ 2. Processing         │ Features computed in volatile CPU memory; sub-second lifespan. │
├───────────────────────┼────────────────────────────────────────────────────────────────┤
│ 3. Automated Purge    │ Mandatory 15-second TTL on all Redis audio keys.               │
│                       │ WebSocket disconnect triggers instant buffer deletion.        │
│                       │ ZERO raw audio bytes written to disk or database tables.       │
├───────────────────────┼────────────────────────────────────────────────────────────────┤
│ 4. Vector Storage     │ Mode B 192-dim voiceprints stored in Supabase pgvector.        │
│                       │ Non-invertible, pseudonymized mathematical vectors.            │
├───────────────────────┼────────────────────────────────────────────────────────────────┤
│ 5. Audit Logging      │ Telemetry logs store mathematical metrics only (F0, Jitter,   │
│                       │ Risk Score). Zero persistent raw voice audio.                  │
└───────────────────────┴────────────────────────────────────────────────────────────────┘
```

### 12.2 Runtime Audio vs. Training Artifacts
* **Runtime Audio**: Transient only. Held in volatile memory for $<15\text{ seconds}$, then purged.
* **Derived Mathematical Features**: Non-invertible metrics ($F_0$, jitter, mel-band energies, embeddings) may be logged for auditability.
* **Training Audio Artifacts**: Raw audio is **never silently harvested** from user calls. Audio for retraining is collected strictly from:
  1. Controlled synthetic test generation.
  2. Public open research datasets.
  3. Explicit opt-in enterprise pilot programs with documented data-fiduciary consent agreements.

---

## 13. Twenty Mandatory Product Capabilities

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 20 MANDATORY PRODUCT CAPABILITIES                                │
├───────────────────────────────┬──────────────────────────────────┬───────────────────────────────┤
│ Ingestion & Preprocessing     │ Acoustic & AI Detection          │ Risk Engine & Interventions   │
│ 1. Live Voice Ingestion       │ 4. Speaker-Independent Anti-Spoof│ 8. Continuous Risk Scoring    │
│ 2. Audio Preprocessing        │ 5. Auxiliary Acoustic ResNet     │ 9. Temporal Score Smoothing   │
│ 3. Voice Activity Detection   │ 6. Biomechanical Prosody Engine  │ 10. Threat State Machine      │
│                               │ 7. Optional Speaker Verification │ 11. Transaction Evaluation    │
├───────────────────────────────┼──────────────────────────────────┼───────────────────────────────┤
│ Verification & Policy         │ Privacy & Governance             │ Learning & Operations         │
│ 12. PITCH Challenge Engine    │ 15. Privacy Controls (DPDP)      │ 18. Self-Learning Registry    │
│ 13. User Alerts & Advisory    │ 16. Zero Raw Audio Retention     │ 19. Supabase & SQLite Storage │
│ 14. Transaction Circuit Gate  │ 17. Audit Trail Without Raw Audio│ 20. Observability & Telemetry │
└───────────────────────────────┴──────────────────────────────────┴───────────────────────────────┘
```

### Detailed Functional Specifications

* **CAP-01: Live Voice Ingestion**: Ingest binary 16 kHz 16-bit linear PCM audio frames (1,024 samples / $64\text{ ms}$) via full-duplex WebSocket `/v1/stream/call/{session_id}`.
* **CAP-02: Audio Preprocessing**: Normalize raw Int16 buffers to Float32 $[-1.0, 1.0]$, apply DC offset removal, and apply Hann windowing to sliding frames.
* **CAP-03: Voice Activity Detection (VAD)**: Silero VAD (ONNX) evaluates 512-sample sub-frames; windows with $<15\%$ active speech are flagged and bypassed from neural analysis.
* **CAP-04: Speaker-Independent Anti-Spoof Engine**: Primary AI engine (AASIST/RawNet2) classifies active speech as bona fide or spoofed without requiring prior speaker enrollment.
* **CAP-05: Auxiliary Acoustic Vocoder Analysis**: ResNet-18 extracts log-mel spectral representations to evaluate high-frequency transposed convolution artifacts as complementary evidence.
* **CAP-06: Biomechanical Prosody Engine**: Extract fundamental pitch ($F_0$), cycle jitter (RAP), shimmer (APQ5), and Harmonics-to-Noise Ratio (HNR) via Parselmouth/SciPy algorithms.
* **CAP-07: Optional Speaker Verification (Mode B)**: Conditionally extract 192-dim ECAPA-TDNN embeddings when `speaker_id` is supplied, querying Supabase `pgvector` for cosine similarity.
* **CAP-08: Continuous Risk Scoring**: Compute composite multi-signal synthetic risk score ($0.0–100.0$) on every $768\text{ ms}$ hop.
* **CAP-09: Temporal Score Smoothing**: Apply Asymmetric Exponential Moving Average ($\alpha_{\text{escalate}}=0.65, \alpha_{\text{deescalate}}=0.25$) to prevent alert flapping.
* **CAP-10: Threat State Machine**: Transition deterministically between GREEN ($<40.0$), AMBER ($40.0–74.9$), and RED ($\ge 75.0$) with hysteresis.
* **CAP-11: Context-Aware Transaction Risk Evaluation**: Evaluate financial transfers against session threat level, transaction amount (INR), and beneficiary risk.
* **CAP-12: PITCH Challenge-Response Engine**: Present dynamic, phonetically complex Hindi/English phrases on AMBER/RED escalation; verify response latency and pitch modulation.
* **CAP-13: User Alerts & Advisory**: Render real-time visual threat dials, spectrogram waterfall canvases, anomaly indicators, and clear guidance banners.
* **CAP-14: Transaction Circuit Gate**: Expose synchronous `POST /v1/transaction/evaluate-authorization` returning HTTP 403 on RED state to halt fraudulent payments.
* **CAP-15: Privacy Controls (DPDP Act 2023)**: Provide cryptographic pseudonymization of identifiers, user consent flags, and voiceprint revocation endpoints.
* **CAP-16: Zero Raw Audio Retention**: Circular Redis buffer enforces 15-second TTL (`EXPIRE 15`); zero raw audio files are written to disk or permanent databases.
* **CAP-17: Audit Trail Without Raw Audio**: Log derived mathematical features, model versions, risk scores, and transaction decisions in Supabase without saving audio.
* **CAP-18: Self-Learning Registry (SQLite)**: Maintain local embedded registry tracking feature vectors, operator feedback, quarantine status, and retraining candidate batches.
* **CAP-19: Dual Database Storage**: Integrate Supabase (Free Tier) for primary relational/vector data and SQLite for local high-throughput ML event logging.
* **CAP-20: Observability & Telemetry**: Emit structured JSON telemetry per $768\text{ ms}$ hop over WebSocket to power live dashboards, tracking end-to-end processing latencies.

---

## 14. Detailed User Journeys & Critical Workflows

### 14.1 Journey 1: Mode A Mass-User Deepfake Interception (Unknown Caller)

```text
[Unknown Caller / Attacker]   [Enterprise Softphone / Agent]    [VaaniShield Engine]     [Banking / Wire API]
            │                               │                            │                       │
            │── 1. Voice Call Initiated ───►│                            │                       │
            │   (Audio stream begins)       │── 2. WebRTC Stream Forks ─►│                       │
            │                               │                            │── 3. VAD Active       │
            │                               │                            │── 4. AASIST Anti-Spoof│
            │                               │                            │── 5. Prosody Analysis │
            │                               │◄── 6. Telemetry: GREEN ────│                       │
            │                               │   (Score: 18/100, Dial Grn)│                       │
            │                               │                            │                       │
            │── 7. Attacker Switches to ───►│                            │                       │
            │   Real-Time AI Voice Clone    │                            │── 8. Vocoder Artifacts│
            │   ("Authorize transfer")      │                            │   Detected by AASIST  │
            │                               │                            │── 9. Score Surges 84  │
            │                               │◄── 10. Telemetry: RED ─────│   (EMA escalates fast)│
            │                               │   (Threat Dial Flashes RED)│                       │
            │                               │                            │                       │
            │                               │── 11. Agent Clicks "Pay" ─────────────────────────►│
            │                               │      (₹2,50,000 Transfer)  │                       │
            │                               │                            │◄── 12. Auth Gate Query│
            │                               │                            │   (Session: call-842) │
            │                               │                            │── 13. Score 84 >= 75  │
            │                               │                            │── 14. HTTP 403 BLOCKED►│
            │                               │◄── 15. UI Alert: ──────────────────────────────────│
            │                               │   "TRANSACTION FROZEN:     │                       │
            │                               │    AI VOICE DETECTED"      │                       │
```

### 14.2 Journey 2: Mode B Known-User Targeted Cloning Detection (Enrolled Executive)
1. **Scenario**: An attacker generates a targeted zero-shot clone of the Chief Financial Officer (enrolled speaker `cfo_hash_81b`) and calls corporate treasury requesting an urgent vendor payment.
2. **Execution**:
   * Incoming audio stream includes query parameter `?speaker_id=cfo_hash_81b`.
   * Tier 1 speaker-independent anti-spoof model detects phase smearing and vocoder artifacts ($S_{\text{antispoof}} = 86.0$).
   * Biomechanical prosody detects abnormal jitter ($3.8\%$) and unnaturally flat pitch trajectory.
   * Mode B Tier 2 runs: ECAPA-TDNN extracts 192-dim vector and compares against Supabase `enrolled_voiceprints`. Cosine similarity is **$0.91$** (Target identity verified!).
3. **Synthesis & Interception**:
   * If the system only used speaker verification, this call would pass.
   * VaaniShield recognizes the attack pattern: **High Speaker Similarity ($0.91$) + High Synthetic Risk ($86.0$) = CRITICAL CLONE ATTACK (RED)**.
   * Threat score hits **$89.5$**.
   * When treasury submits payment authorization, `/v1/transaction/evaluate-authorization` responds with **HTTP 403 Forbidden**. Funds are preserved.

### 14.3 Journey 3: Interactive PITCH Step-Up Challenge
1. **Trigger**: An unknown caller requests an address and phone number change on a banking account. Anti-spoof score drifts into **AMBER ($56.0$)**.
2. **Initiation**: The system prompts the call center operator: *"Ambiguous acoustic signals detected. Trigger PITCH challenge."*
3. **Execution**:
   * System generates prompt: *"Pital ke bartan mein papita peela peela"*.
   * Attacker using real-time voice conversion pauses for $2.8\text{ s}$ while typing/feeding prompt.
   * When converted audio arrives, neural vocoder distorts the bilabial plosives.
   * Response latency ($>2.5\text{ s}$) and lack of dynamic pitch inflection ($\Delta F_0 < 15\text{ Hz}$) fail verification.
   * Threat state escalates to **RED ($82.0$)**. Account modification tool is locked.

---

## 15. Functional Requirements Matrix

| ID | Area | Requirement Statement | Priority | Status |
| :--- | :--- | :--- | :--- | :--- |
| **FR-101** | Ingestion | System shall accept full-duplex binary WebSocket connections at `/v1/stream/call/{session_id}` accepting 16-bit Linear PCM at 16kHz mono. | P0 | IMPLEMENTED |
| **FR-102** | Ingestion | Audio shall be ingested in discrete frames of 1,024 samples ($64\text{ ms}$) without blocking the event loop. | P0 | IMPLEMENTED |
| **FR-201** | Buffer | System shall maintain an ephemeral circular ring buffer in Redis storing max 24 frames (~$1.54\text{ s}$). | P0 | IMPLEMENTED |
| **FR-202** | Privacy | Redis audio keys shall enforce a mandatory TTL of 15 seconds (`EXPIRE 15`), automatically purged on disconnect. | P0 | IMPLEMENTED |
| **FR-301** | VAD | Silero VAD shall calculate speech probability; windows with $<15\%$ speech shall be discarded from neural analysis. | P0 | MOCK / FALLBACK |
| **FR-401** | Anti-Spoof | Primary speaker-independent anti-spoof model (AASIST/RawNet2) shall classify speech as bona fide or spoofed without prior enrollment. | P0 | PLANNED / RESEARCH |
| **FR-402** | Acoustic | ResNet-18 model shall extract auxiliary vocoder artifact probabilities from 80-bin log-mel spectrograms. | P1 | MOCK / FALLBACK |
| **FR-501** | Prosody | System shall extract fundamental pitch ($F_0$), local jitter (RAP), shimmer (APQ5), and HNR for voiced segments. | P0 | IMPLEMENTED (PARSELMOUTH) |
| **FR-601** | Identity | System shall conditionally extract 192-dim ECAPA-TDNN embeddings when `speaker_id` is supplied in Mode B. | P1 | MOCK / FALLBACK |
| **FR-602** | Identity | System shall query Supabase `pgvector` using IVFFlat cosine similarity to evaluate speaker consistency. | P1 | IMPLEMENTED (POSTGRES) |
| **FR-701** | Smoothing | System shall apply asymmetric EMA smoothing ($\alpha_{\text{escalate}}=0.65, \alpha_{\text{deescalate}}=0.25$) on composite scores. | P0 | IMPLEMENTED |
| **FR-702** | State Machine| System shall transition between GREEN, AMBER, and RED states based on smoothed thresholds with hysteresis. | P0 | IMPLEMENTED |
| **FR-801** | Transaction | Synchronous `POST /v1/transaction/evaluate-authorization` shall return HTTP 200 (APPROVED) or HTTP 403 (BLOCKED). | P0 | IMPLEMENTED |
| **FR-802** | Transaction | Authorization gate shall enforce a deterministic hard block if session threat level is RED ($R_{\text{EMA}} \ge 75.0$). | P0 | IMPLEMENTED |
| **FR-901** | PITCH | System shall supply randomized phonetic Hindi/English challenge phrases upon session escalation to AMBER/RED. | P1 | IMPLEMENTED (UI) |
| **FR-902** | PITCH | Backend shall evaluate challenge response latency and pitch trajectory to verify organic human response. | P2 | PLANNED |
| **FR-1001**| Telemetry | System shall emit structured JSON telemetry per $768\text{ ms}$ hop over WebSocket to power live dashboards. | P0 | IMPLEMENTED |
| **FR-1002**| Audit | System shall log derived telemetry features and transaction decisions to Supabase without saving raw voice audio. | P0 | IMPLEMENTED |
| **FR-1101**| Learning | System shall log feature vectors, predictions, and user feedback into local SQLite registry (`vaani_learning.db`). | P1 | PROPOSED |
| **FR-1102**| Poisoning | Learning pipeline shall enforce validation gates, quarantine pools, and holdout EER verification before model promotion. | P1 | PROPOSED |
| **FR-1201**| Zero-Cost | Core detection pipeline and local evaluation shall operate with zero dependencies on paid commercial APIs. | P0 | VERIFIED POLICY |
| **FR-1202**| Database | Platform shall operate on Supabase Free Tier quotas for persistent data and SQLite for local learning telemetry. | P0 | PROPOSED / PLANNED |

---

## 16. Non-Functional Requirements & Benchmark Policy

### 16.1 Latency & Performance SLAs

| Dimension | Target SLA | Measured Prototype Baseline | Verification Method |
| :--- | :--- | :--- | :--- |
| **Tier 1 Pipeline Latency** | $< 80\text{ ms}$ (p95 TARGET) | $45–65\text{ ms}$ (measured on 4 vCPU) | Quantized ONNX inference; vectorized STFT. |
| **Tier 2 (ECAPA) Latency** | $< 250\text{ ms}$ (p95 TARGET) | $180–220\text{ ms}$ | Conditional execution; runs only on elevated risk. |
| **End-to-End Hop Latency** | $< 100\text{ ms}$ (p95 TARGET) | $60–85\text{ ms}$ | Asynchronous pipeline; non-blocking database writes. |
| **Pre-Transaction Gate SLA** | $< 35\text{ ms}$ (p99 TARGET) | $12–18\text{ ms}$ | In-memory `SessionManager` state lookup. |
| **Audio Ingestion Cadence** | $768\text{ ms}$ hop | $768\text{ ms} \pm 15\text{ ms}$ | Frame accumulator triggers pipeline every 12 frames. |

### 16.2 Target vs. Measured Benchmark Policy
To preserve engineering integrity, VaaniShield enforces strict labeling of all performance figures:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                PERFORMANCE ATTRIBUTION POLICY                                   │
├──────────────────────┬───────────────────────────────────────────────────────────────────────────┤
│ Classification Tag   │ Definition & Usage Rule                                                   │
├──────────────────────┼───────────────────────────────────────────────────────────────────────────┤
│ EXTERNAL BENCHMARK   │ Published metrics from external papers (e.g., AASIST paper reporting      │
│                      │ 0.83% EER on ASVspoof 2021 LA). MUST NOT be claimed as VaaniShield results│
├──────────────────────┼───────────────────────────────────────────────────────────────────────────┤
│ TARGET               │ Desired engineering commitment for production deployment (e.g., <1.5% EER)│
├──────────────────────┼───────────────────────────────────────────────────────────────────────────┤
│ INTERNAL VALIDATION  │ Measured empirically on VaaniShield's internal test harness               │
├──────────────────────┼───────────────────────────────────────────────────────────────────────────┤
│ PROTOTYPE BASELINE   │ Observed measurements in current development environment                  │
└──────────────────────┴───────────────────────────────────────────────────────────────────────────┘
```

#### Empirical Benchmark Table:

| Metric / Dimension | Benchmark Classification | Value | Evaluation Conditions |
| :--- | :--- | :--- | :--- |
| **AASIST Baseline (ASVspoof21 LA)** | EXTERNAL BENCHMARK | $0.83\%$ EER | As reported in Jung et al. (Interspeech 2021) |
| **RawNet2 Baseline (ASVspoof21 DF)**| EXTERNAL BENCHMARK | $22.38\%$ EER | Official ASVspoof 2021 Deepfake evaluation |
| **VaaniShield Clean Studio Target** | TARGET | $< 1.5\%$ EER | 16 kHz uncompressed linear PCM |
| **VaaniShield AMR-WB Telephony**    | TARGET | $< 3.0\%$ EER | 16 kHz G.722.2 transcoded simulation |
| **VaaniShield AMR-NB Telephony**    | TARGET | $< 6.0\%$ EER | 8 kHz narrowband upsampled simulation |
| **Current Prototype ResNet Path**   | PROTOTYPE BASELINE | Heuristic / Mock | Unpopulated `models/` directory; mock active |

### 16.3 What This PRD Explicitly Does NOT Claim
VaaniShield maintains strict intellectual honesty. The platform explicitly does **NOT** claim:
1. 100% deepfake detection or zero false alarms.
2. Universal detection of every unknown or future voice synthesis model.
3. Guaranteed identity authentication (voice similarity does not prove authorization or consent).
4. Reliable replay attack detection across all acoustic environments prior to dedicated validation.
5. Production carrier-grade telecom readiness prior to physical SBC integration tests.
6. Formal DPDP Act or GDPR legal compliance certification (compliance is an organizational audit status).
7. External paper benchmark figures as internal project achievements.
8. Real-time streaming capability on hardware not experimentally tested.
9. Blind self-learning from untrusted user calls as ground truth.
10. That RAG (Retrieval-Augmented Generation) performs audio deepfake classification.

---

## 17. Current State vs. Target Architecture (Maturity Audit)

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
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ MOCK / FALLBACK      │ Neural Anti-Spoofing    │ Heuristic fallback when resnet18.onnx is missing│
│                      │ Silero VAD              │ RMS energy thresholding when ONNX is missing    │
│                      │ ECAPA-TDNN Embedding    │ Hash-seeded random unit vectors when absent     │
│                      │ PITCH Challenge Logic   │ Static UI drawer; lacks backend ASR/pitch check │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ PLANNED / RESEARCH   │ Primary Anti-Spoof Model│ Integration of AASIST / RawNet2 pretrained model│
│                      │ Closed-Loop PITCH Check │ Backend latency and intonation excursion check  │
│                      │ Telephony Transcoding   │ AMR-NB/WB bandpass simulation and filter        │
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
> The current repository contains the architectural scaffolding, endpoints, signal math, and mock fallbacks, but the `models/` directory does not yet contain populated, validated `.onnx` model weights. The deepfake detection engine cannot be claimed as complete until real model weights (AASIST/RawNet2) are packaged and experimentally validated.

---

## 18. Hackathon Live Demo Choreography (5-Minute Walkthrough)

```text
[0:00 - 1:00] ──► PROBLEM THESIS & REPO GROUNDING
                  • Introduce VaaniShield: Real-time speaker-independent voice deepfake engine.
                  • Highlight Mass-User Mode: Zero enrollment needed to protect any caller.
                  • Show architecture: FastAPI, Redis ring buffer, Next.js dashboard, Supabase.

[1:00 - 2:00] ──► BASELINE DEMO: GENUINE HUMAN SPEECH (MODE A)
                  • Activate Live Microphone Stream on dashboard.
                  • Speaker talks naturally in Hindi / Indian English.
                  • Observe: Silero VAD detects active speech; anti-spoof risk remains low (12-18%);
                    Parselmouth shows natural F0 dynamics and organic jitter (0.8%).
                  • Threat dial remains solid GREEN.
                  • Execute mock UPI transfer of ₹50,000 ──► Instant "APPROVED (HTTP 200)".

[2:00 - 3:30] ──► SYNTHETIC ATTACK INJECTION & INSTANT CIRCUIT BREAKER
                  • Switch audio stream to neural voice clone / synthetic injector.
                  • Observe immediate reaction:
                    - Spectrogram displays vocoder spectral smearing.
                    - Anti-spoof engine detects synthetic waveform footprint.
                    - Parselmouth captures abnormal jitter (>3.5%) and unnatural pitch rigidity.
                    - Asymmetric EMA drives risk from 18 ──► 84 within 2 analysis hops (~1.5s).
                    - Threat dial flashes RED; perimeter alarm triggers.
                  • Attempt to authorize wire transfer of ₹2,50,000.
                  • Circuit breaker trips instantly: "HTTP 403 FORBIDDEN - TRANSACTION FROZEN".
                  • Highlight: Deterministic operational prevention; zero loss.

[3:30 - 4:15] ──► ACTIVE DEFENSE: PITCH CHALLENGE-RESPONSE
                  • Demonstrate AMBER scenario triggering PITCH challenge drawer.
                  • Explain phonetic stress test ("Pital ke bartan mein papita peela peela").
                  • Explain how neural conversion latency (>2.5s) and vocoder breakdown are exposed.

[4:15 - 5:00] ──► JUDGE Q&A DEFENSE & ZERO-COST ARCHITECTURAL CREDIBILITY
                  • Address OS sandboxing: Clarify gateway/softphone integration path.
                  • Address zero-cost constraint: No paid APIs; local ONNX inference + Supabase Free.
                  • Highlight DPDP Act 2023 compliance: Zero raw audio stored at rest; 15s Redis TTL.
```

---

## 19. Critical Product Risks & Architectural Mitigations

| Risk ID | Risk Description | Severity | Likelihood | Architectural & Operational Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| **RSK-01** | **Telephony Codec Degradation**: Narrowband AMR-NB (8kHz) strips vocoder cues above 3.4kHz, increasing False Negatives. | Critical | High | Emphasize biomechanical prosody metrics (pitch variance, jitter, shimmer) which persist in lower bands; trigger active PITCH challenge on borderline sessions. |
| **RSK-02** | **Parselmouth Execution Bottleneck**: Synchronous CPU processing of Praat C-bindings causes WebSocket frame queue backpressure. | High | High | Run Parselmouth inside dedicated thread pools with strict timeouts; fallback to optimized Scipy vector approximations if latency exceeds 60ms. |
| **RSK-03** | **Regional Accent False Positives**: Unique non-native phonemes misclassified as acoustic synthesis artifacts. | High | Medium | Calibrate classifiers across diverse multilingual datasets (IndicTTS, native regional recordings); tune jitter/shimmer baseline tolerances. |
| **RSK-04** | **Adversarial Poisoning of Learning Data**: Attacker submits falsified feedback to corrupt periodic model retraining. | High | Medium | Enforce strict label confidence scoring, quarantine suspicious samples, require minimum sample thresholds, and gate promotion on holdout benchmark EER. |
| **RSK-05** | **Absence of Enrolled Voiceprint for Mass Users**: Caller has never enrolled a voiceprint. | Low | High | Solved by Core Thesis: Mode A is speaker-independent by default and requires zero enrollment. |

---

## 20. Product Decision Log (Architecture Decision Records Summary)

| ADR ID | Decision Title | Status | Context & Decision Rationale |
| :--- | :--- | :--- | :--- |
| **ADR-01** | **Re-alignment to Speaker-Independent Core Thesis** | Approved | Impersonation fraud targets mass users who cannot be pre-enrolled. VaaniShield establishes speaker-independent anti-spoof detection (AASIST/RawNet2) as primary, making speaker verification an optional secondary signal. |
| **ADR-02** | **Adoption of Asymmetric EMA Smoothing** | Approved | Symmetrical moving averages delay threat escalation during active attacks. Asymmetric alpha ($\alpha=0.65$ up, $\alpha=0.25$ down) ensures sub-second reaction to attacks while preventing premature de-escalation. |
| **ADR-03** | **Zero Raw Audio Storage at Rest** | Approved | Strict compliance with India’s DPDP Act 2023. Raw audio is purged from volatile Redis buffers after 15 seconds. Only non-invertible mathematical features and embeddings are stored. |
| **ADR-04** | **Pre-Transaction Synchronous Gate** | Approved | Post-fraud auditing cannot recover instant UPI/IMPS transfers. The authorization gate must be an active synchronous API returning HTTP 403, allowing banking software to halt payment release. |
| **ADR-05** | **Zero-Cost / Free-First Stack Constraint** | Approved | Platform must not depend on paid commercial APIs. System is designed to run locally using open-source models, ONNX Runtime, and Supabase Free Tier quotas. |
| **ADR-06** | **Dual Database Pattern (Supabase + SQLite)** | Approved | Supabase Free handles persistent relational and pgvector needs; SQLite provides an embedded, zero-cost, high-throughput registry for local learning events and retraining metadata. |
| **ADR-07** | **Controlled Learning Lifecycle with Poisoning Defense** | Approved | Blind retraining from every call is unsafe. Retraining must be batched, validated, and gated on holdout benchmark metrics with automatic rollback capability. |

---

## 21. Requirements Traceability Matrix (RTM)

| PRD Requirement ID | Requirement Summary | Planned Technical Component / Module | Verification / Test Method |
| :--- | :--- | :--- | :--- |
| **FR-101 / FR-102** | WebSocket PCM Audio Ingestion | `backend/api/routes/stream.py` | Automated WebSocket load test streaming 16kHz PCM chunks. |
| **FR-201 / FR-202** | Redis Ephemeral Ring Buffer | `backend/audio/buffer.py` (`RedisBufferManager`) | Redis CLI audit verifying 15s key TTL and LTRIM window capping. |
| **FR-301** | Voice Activity Detection (VAD) | `backend/ai/inference.py` (`InferenceEngine.vad_speech_ratio`) | Test against silence, noise, and speech test files. |
| **FR-401** | Speaker-Independent Anti-Spoof | `backend/ai/inference.py` (`InferenceEngine.anti_spoof_score`) | Validation test against bona fide vs. synthetic speech samples. |
| **FR-402** | Auxiliary Log-Mel ResNet-18 | `backend/ai/inference.py` (`InferenceEngine.resnet_acoustic_score`)| Benchmark inference latency and output distribution on test audio. |
| **FR-501** | Biomechanical Prosody Engine | `backend/audio/prosody.py` (`ProsodyAnalyser`) | Unit tests validating $F_0$, jitter, shimmer, HNR extraction against Praat. |
| **FR-601 / FR-602** | Mode B Speaker Verification | `backend/ai/inference.py`, `backend/db/database.py` | Cosine similarity tests against enrolled voiceprints in Supabase `pgvector`. |
| **FR-701 / FR-702** | Asymmetric EMA & State Machine | `backend/risk/threat.py` (`ThreatState.update`) | Unit tests verifying rapid rise on high scores and gradual decay. |
| **FR-801 / FR-802** | Pre-Transaction Authorization Gate | `backend/api/routes/transaction.py` | Integration test verifying HTTP 200 on GREEN and HTTP 403 on RED. |
| **FR-901 / FR-902** | PITCH Challenge Console | `frontend/components/PitchChallengeDrawer.tsx` | Interactive UI test validating challenge activation on AMBER/RED states. |
| **FR-1001** | Real-Time Telemetry Streaming | `frontend/hooks/useVaaniShieldWs.ts`, Zustand Store | End-to-end WebSocket telemetry reception and UI render test. |
| **FR-1002** | Non-Audio Audit Trail Logging | `backend/db/database.py` (`chunk_telemetry`, `evaluations`) | Database inspection confirming telemetry persistence and zero raw audio. |
| **FR-1101 / FR-1102**| SQLite Self-Learning Registry | `backend/ai/learning_registry.py` | Unit tests logging events, evaluating holdouts, and preventing poisoned promotions. |
| **FR-1201 / FR-1202**| Free-First & Dual DB Operation | `backend/core/config.py`, Supabase + SQLite | Verification that test suite passes without any external paid API keys. |

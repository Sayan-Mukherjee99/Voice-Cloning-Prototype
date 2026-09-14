# VaaniShield: Comprehensive Security Architecture & Threat Model

| Document Attribute | Specification Detail |
| :--- | :--- |
| **Document Version** | 2.0.0-SEC-SPEC |
| **Status** | Approved Security Architecture Baseline / Deepfake-First Realignment |
| **Security Classification** | Enterprise Confidential / Security Architecture Specification |
| **Associated Documents** | `PRD.md` (Product Requirements), `TRD.md` (Technical Requirements), `AI_ARCHITECTURE.md` |
| **Reference Repository** | `Sayan-Mukherjee99/Voice-Cloning-Prototype` |
| **Project Ownership** | Person A: **Shub** (Backend / AI Lead) \| Person B: **Sion** (Frontend Lead) |

---

## 1. Executive Summary & Security Charter

### 1.1 Core Security Objective
**VaaniShield** is designed to inspect real-time audio streams, detect synthetic, neural, and voice-cloned impersonation attacks, and deterministically protect sensitive transactions. 

The primary security mandate is:
> **The defense platform itself must not introduce a new attack surface, become an attack vector against the enterprise, or compromise caller privacy.**

A vulnerability in VaaniShield could allow an adversary to:
1. Blind the fraud detection engine to execute multi-crore unauthorized wire transfers.
2. Poison the self-learning training registry to establish persistent adversarial backdoors.
3. Exfiltrate proprietary voice biometric embeddings or sensitive call telemetry.
4. Exploit audio processing memory buffers to achieve Remote Code Execution (RCE) inside the security perimeter.
5. Manipulate threat thresholds to induce widespread Denial of Service (False Alarm Flooding) on legitimate operations.

### 1.2 Probabilistic Risk vs. Absolute Identity
To prevent dangerous security assumptions, the system strictly enforces this foundational principle:
> **"Voice verified" never implies a person is definitely authentic.**

Voice integrity detection is probabilistic and signals acoustic authenticity, not human authorization:
* A low voice integrity risk score indicates the audio is consistent with organic biological speech and an enrolled baseline (Mode B). It cannot verify if the caller is speaking under physical duress, social engineering coercion, or in collusion with fraudsters.
* High speaker similarity in Mode B does NOT prove human authenticity; an AI clone intentionally mimics the target speaker.
* The system outputs a **probabilistic threat score ($0.0–100.0$)**, which must be coupled with contextual transaction limits, out-of-band approvals, and multi-factor gates.

### 1.3 Regulatory & Privacy Positioning (DPDP Act 2023)
VaaniShield is **architected to support compliance** with privacy frameworks, including India's **Digital Personal Data Protection (DPDP) Act 2023** and global data privacy standards (e.g., GDPR Article 9 regarding biometric data processing):
* Strict **zero raw audio retention at rest**.
* Processing occurs strictly within **ephemeral in-memory circular buffers** (bounded by a $15$-second TTL).
* Storage is limited to derived, mathematically non-invertible feature vectors.

---

## 2. Threat Landscape & Extended Threat Taxonomy

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   EXTENDED THREAT ACTOR TAXONOMY                                 │
├───────────────────────┬───────────────────────────────┬──────────────────────────────────────────┤
│ Threat Actor Class    │ Motivation & Capabilities     │ Primary Attack Vectors                   │
├───────────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Cybercrime Syndicates │ High financial gain; low-to-  │ Real-time voice conversion (RVC), zero-  │
│ (Digital Arrest/Scams)│ medium technical capability.  │ shot TTS soundboards, SIP trunk spoofing,│
│                       │ High volume of targeted calls.│ social engineering of panic & urgency.   │
├───────────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Targeted Fraudsters   │ High financial gain; advanced │ Custom diffusion vocoders, speaker clone │
│ (CEO / Treasury Wire) │ OSINT reconnaissance; custom  │ harvested from public media, bypass of   │
│                       │ ML models; patient execution. │ transaction authorization gates.         │
├───────────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Malicious Insiders &  │ Financial fraud, credential   │ Feedback poisoning in learning registry, │
│ Rogue Operators       │ theft, or operational sabotage│ manual override abuse, unauthorized      │
│                       │ with authenticated access.    │ export of vector embeddings or logs.     │
├───────────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Adversarial ML        │ Academic/syndicate research;  │ Adversarial acoustic perturbation, data  │
│ Attackers             │ algorithm evasion; model theft│ poisoning of training candidates, model  │
│                       │ and decision boundary mapping.│ inversion, threshold manipulation probing│
├───────────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Telephony/Network MitM│ Traffic interception; packet  │ RTP media-injection, replay of genuine   │
│ (Compromised Gateway) │ manipulation; eavesdropping.  │ audio clips, session ID hijacking.       │
└───────────────────────┴───────────────────────────────┴──────────────────────────────────────────┘
```

### 2.1 Attack Taxonomy Detail
1. **Adversarial Generated Speech**: Audio produced by zero-shot diffusion or vocoders with imperceptible acoustic perturbations designed to cross decision boundaries without being flagged.
2. **Replay Attacks**: Playing back a pre-recorded authentic human voice through a secondary acoustic transducer (loudspeaker) into the microphone stream.
3. **Training Data & Feedback Poisoning**: Adversaries submitting false feedback ("Mark as Genuine" on AI clones) to manipulate future model retraining.
4. **Model Replacement & Supply-Chain Attacks**: Tampering with ONNX model files or container base images to insert backdoors.
5. **Threshold & Boundary Manipulation**: Probing API endpoints to discover exact numeric gating thresholds ($40.0, 75.0$) and designing evasion audio just below trigger points.

---

## 3. Data Privacy Architecture & Data Classification (DPDP Act 2023)

To ensure total transparency and data governance, the platform establishes five distinct data classifications:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                DATA PRIVACY CLASSIFICATION MATRIX                                │
├──────────────────────┬─────────────────────────┬──────────────┬──────────────────────────────────┤
│ Data Category        │ Content Description     │ Persistence  │ Storage Location & Policy        │
├──────────────────────┼─────────────────────────┼──────────────┼──────────────────────────────────┤
│ 1. Transient Audio   │ Raw PCM stream chunks   │ Ephemeral    │ Volatile RAM (Redis 15s TTL).    │
│                      │ (16kHz 16-bit mono)     │ (<15 sec)    │ ZERO disk/database persistence.  │
├──────────────────────┼─────────────────────────┼──────────────┼──────────────────────────────────┤
│ 2. Operational       │ Session ID, timestamps, │ Persistent   │ Supabase (PostgreSQL 16).        │
│    Metadata          │ gate decisions, amounts │ (90 days)    │ Auditable transaction logs.      │
├──────────────────────┼─────────────────────────┼──────────────┼──────────────────────────────────┤
│ 3. Derived Features  │ F0, jitter, shimmer,    │ Persistent   │ Supabase chunk_telemetry.        │
│                      │ mel energies, 192-dim v │ (30 days)    │ Mathematically non-invertible.   │
├──────────────────────┼─────────────────────────┼──────────────┼──────────────────────────────────┤
│ 4. Retained Learning │ Controlled test audio / │ Quarantined/ │ Isolated local file store; NEVER │
│    Samples (Optional)│ explicit consent audio  │ Controlled   │ silently harvested from calls.   │
├──────────────────────┼─────────────────────────┼──────────────┼──────────────────────────────────┤
│ 5. Model Artifacts   │ ONNX weights, version   │ Read-Only    │ Read-only container volume mounts│
│                      │ tags, holdout metrics   │ (Static)     │ SHA-256 pinned checksums.        │
└──────────────────────┴─────────────────────────┴──────────────┴──────────────────────────────────┘
```

> [!CAUTION]
> **Prohibition of Silent Audio Harvesting**:
> The system must **never silently save or persist raw voice audio** from mass users or unknown callers for training purposes. Training datasets must originate strictly from controlled synthetic generation, public research corpora, or explicit opt-in agreements.

---

## 4. Self-Learning Pipeline Security & Poisoning Defense

VaaniShield implements a controlled continual-learning pipeline to prevent corrupted feedback from compromising production models:

```text
Incoming Call Feedback
       │
       ▼
[Label Trust Check] ──► Untrusted / Unknown? ──► [Quarantine Pool (No Training)]
       │
       ├── Verified Operator / Supervisor
       ▼
[Anomaly & Outlier Check] ──► Cosine distance outlier? ──► [Quarantine Pool]
       │
       ├── Clean Feature Cluster
       ▼
[Duplicate Detection Check] ──► Near-duplicate hash? ──► [Discard / Deduplicate]
       │
       ├── Unique Valid Sample
       ▼
[Class Balance Pool] ──► Target 50% Genuine / 50% Spoof
       │
       ▼
[Quorum Gate] ──► Requires >= 500 Genuine AND >= 500 Spoofed Samples
       │
       ▼
[Periodic Offline Retraining] (Isolated Sandbox Environment)
       │
       ▼
[Holdout Evaluation Gate] ──► Evaluates candidate against immutable benchmark testset
       │
       ├── Candidate EER < Current EER?
       │      │
       │      ├── YES ──► [Promotion Gate: Tag model-vX.Y.Z, Update ACTIVE_MODEL_VERSION]
       │      │
       │      └── NO  ──► [Reject Candidate: Retain Active Model; Alert SecOps]
       │
       └── Post-Promotion Degradation? ──► [Trigger Instant Rollback to Previous Tag]
```

### 4.1 Anti-Poisoning Controls
1. **Provenance Enforcement**: Every record in `training_candidates` must include cryptographically signed provenance metadata.
2. **Quarantine Pool**: Samples with low confidence scores ($<0.90$) or submitted by unauthenticated sources are permanently held in quarantine.
3. **Class Balancing**: Retraining triggers only when balanced ratios of genuine and diverse spoofed classes are accumulated.
4. **Promotion Gate**: No model is ever deployed directly after training. Candidate weights must be evaluated against an immutable holdout benchmark dataset. Promotion occurs only if Equal Error Rate (EER) strictly improves.
5. **Instant Rollback**: The runtime engine supports instant rollback to prior model versions via environment configuration (`ACTIVE_MODEL_VERSION`).

---

## 5. Auditability, Safe Logging & Security Monitoring

### 5.1 Safe Logging Rules
1. **Zero Raw Audio Logging**: Under no circumstances shall raw PCM audio, base64 chunks, spectrogram matrices, or WAV buffers be written to log files.
2. **PII Masking**: Customer phone numbers, account numbers, and VPAs must be masked in logs (e.g., `98****1234`, `cust****@oksbi`).
3. **Structured Format**: Logs must emit structured JSON via `structlog`:

```json
{
  "timestamp": "2026-09-14T08:15:00.124Z",
  "level": "warn",
  "event": "Threat state escalated to RED",
  "logger": "vaanishield.security",
  "session_id": "call-secops-842",
  "threat_level": "RED",
  "composite_risk_score": 84.5,
  "anti_spoof_score": 88.0,
  "trigger_signal": "aasist_synthetic_waveform_detected",
  "client_ip": "10.0.12.45"
}
```

### 5.2 High-Priority Security Telemetry Metrics

| Metric Name | Threshold Alarm | Incident Response Action |
| :--- | :--- | :--- |
| `vaani_red_threat_spikes_total` | $> 5$ in $60\text{ seconds}$ | Active voice impersonation campaign detected across tenant. |
| `vaani_model_integrity_failure_total`| $\ge 1$ event | Potential container tampering or model supply-chain attack. |
| `vaani_auth_gate_403_blocks_total` | $> 10$ in $5\text{ minutes}$ | Coordinated financial wire fraud attempt underway. |
| `vaani_redis_memory_eviction_spikes` | $> 100$ drops/sec | Denial of service attack or memory leak in audio stream buffering. |
| `vaani_poisoning_quarantine_total` | $> 50$ events/hour | Coordinated feedback poisoning attempt detected. |

---

## 6. Pre-Transaction Gate Fail-Secure Posture

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 FAIL-SECURE SUBSYSTEM FAILURE MATRIX                             │
├───────────────────────┬────────────────────────────┬─────────────────────────────────────────────┤
│ Subsystem Failure     │ Technical Failure State    │ Deterministic Security System Posture       │
├───────────────────────┼────────────────────────────┼─────────────────────────────────────────────┤
│ Anti-Spoof ONNX Fail  │ Model session unavailable  │ FAIL-SECURE: Elevate default risk to AMBER  │
│                       │ or weights missing         │ (50.0). Trigger mandatory PITCH challenge.  │
├───────────────────────┼────────────────────────────┼─────────────────────────────────────────────┤
│ Parselmouth Crash     │ Threadpool timeout (>60ms) │ Fall back to Scipy pitch estimator. Log     │
│                       │ or segmentation fault      │ security alert. Retain active EMA score.    │
├───────────────────────┼────────────────────────────┼─────────────────────────────────────────────┤
│ Redis Cluster Down    │ Socket timeout on LPUSH    │ Fall back to in-memory deque. If memory is  │
│                       │                            │ full, reject new streams with HTTP 503.     │
├───────────────────────┼────────────────────────────┼─────────────────────────────────────────────┤
│ Supabase Down         │ DB connection pool failure │ Live streaming threat scoring CONTINUES in  │
│                       │                            │ memory. Transaction gate queries FAIL-CLOSED│
│                       │                            │ on high-value transfers (> ₹10,000).        │
├───────────────────────┼────────────────────────────┼─────────────────────────────────────────────┤
│ Corrupted / Noisy PCM │ VAD Speech Ratio < 0.15    │ Discard window. Transaction gate returns    │
│                       │ or non-speech noise        │ HTTP 428 Precondition Required (Hold).      │
└───────────────────────┴────────────────────────────┴─────────────────────────────────────────────┘
```

> **CRITICAL SECURITY DIRECTIVE**: In high-value transaction authorization workflows ($\ge \text{₹}10,000$), **FAIL-OPEN BEHAVIOR IS PROHIBITED**. If the system is uncertain or components fail, transactions must be frozen or held for out-of-band verification.

# VaaniShield: AI Agent Guidelines & Operating Instructions

| Instruction Attribute | Detail |
| :--- | :--- |
| **Document Version** | 2.0.0-AGENT-INSTRUCTIONS |
| **Status** | Active Operating Directive (Mandatory Project Policy) |
| **Applies To** | All AI Coding Assistants, Subagents, and Automation Workflows |
| **Project** | VaaniShield (वाणिShield) — Real-Time Voice Integrity & Anti-Spoofing Platform |
| **Primary Thesis** | Speaker-Independent AI Speech Deepfake & Anti-Spoof Detection Engine |
| **Project Owners** | Person A: **Shub** (Backend / AI Lead) \| Person B: **Sion** (Frontend Lead) |
| **Reference Documents** | `PRD.md`, `TRD.md`, `SECURITY.md`, `AI_ARCHITECTURE.md`, `PHASES.md`, `MEMORY.md`, `README.md` |

---

## 1. Primary Operating Directives

When working inside the `Voice-Cloning-Prototype` repository, any AI assistant MUST adhere strictly to these non-negotiable engineering directives:

### Directive 1: Ground in Reality (No Hallucinations)
* **Never pretend mock code is real AI**: The repository contains heuristic/mock fallbacks in `backend/ai/inference.py` when ONNX model files are missing from `models/`. Always distinguish between implemented code, mocked fallbacks, and target architecture.
* **Never invent benchmark numbers**: Any latency, Equal Error Rate (EER), accuracy, F1, or throughput figure must be labeled as `TARGET` (aspirational commitment), `MEASURED` (verified by experiment), or `EXTERNAL BENCHMARK` (published in external academic literature).
* **Never invent customer commitments or regulatory certifications**: Frame privacy capabilities as *"designed to support DPDP Act 2023 principles"* rather than claiming rubber-stamp compliance.

### Directive 2: Respect Platform & Telephony Constraints
* **Mobile OS Sandboxing**: Do not claim or write code attempting to tap raw cellular voice calls on consumer iOS or Android devices without jailbreak/root. Audio ingestion targets enterprise softphones, WebRTC clients, and carrier SBC media-forking gateways.
* **Telephony Degradation**: Understand that cellular codecs (AMR-NB at 8 kHz, AMR-WB at 16 kHz) bandlimit audio ($300–3,400\text{ Hz}$) and strip high-frequency vocoder cues. Always evaluate and preserve lower-band biomechanical prosody ($F_0$, jitter, shimmer).

### Directive 3: Git & Source Code Safety
* **Do not write application code unless explicitly instructed by the user.**
* **Never push code to GitHub (`git push`), force push, merge, release, or delete remote branches.**
* **Work strictly on topic feature branches (`feature/<phase-name>`).**
* **Verify all changes locally via Docker Compose or targeted test commands before reporting completion.**

### Directive 4: Memory & Persistent State Protocol
* After completing any engineering phase or major architectural modification, the AI assistant MUST update [`MEMORY.md`](file:///d:/Voice-Cloning-Prototype/MEMORY.md) with:
  * Phase completed and timestamp.
  * Files created, modified, or deleted.
  * Major architectural decisions and dependencies changed.
  * Test validation performed and commands executed.
  * Known issues, remaining work, and deviations from specifications.
  * Exact next recommended phase.

---

## 2. Mandatory Architectural Rules (Rules A–J)

### Rule A — Deepfake-First Core Architecture
The primary product capability of VaaniShield is **speaker-independent speech deepfake and anti-spoof detection**, beginning with an **offline speech deepfake detection MVP** (analyzing uploaded audio) and progressing to **real-time streaming detection**. The system classifies speech as bona fide (genuine) or spoofed (synthetic, cloned, converted, replayed). Never silently revert the architecture to a speaker-verification-first or identity-matching-first system.

### Rule B — Universal Detection (No Enrollment Required for Core Capability)
The core anti-spoof engine must analyze incoming speech from any caller—including unknown callers, first-time callers, and callers with no pre-enrolled voiceprint. Speaker enrollment must never be a prerequisite for basic deepfake detection.

### Rule C — ECAPA-TDNN Role: Optional Identity Signal Only
ECAPA-TDNN embeddings provide **optional speaker verification (identity consistency)** in Mode B. They do NOT prove whether speech is human or synthetic. A cloned voice intentionally mimics the target speaker; therefore:
```text
High speaker similarity does NOT prove genuine speech.
High similarity + High synthetic risk = Target Voice Cloning Attack (RED).
```

### Rule D — No Fabricated AI Implementation Claims
Never claim the project has a validated, production-grade deepfake detector unless a real pretrained model (e.g., AASIST, AASIST-L, RawNet2) has been integrated, packaged into `models/`, and empirically evaluated on real test audio.

### Rule E — Self-Learning & Retraining Safety
Never implement or describe blind retraining on every incoming call. Continual learning must follow a strict, controlled lifecycle:
```text
Inference → Feature/Metadata Logging (SQLite) → Validated Labels → Curated Training Batch → 
Periodic Retraining → Benchmark Holdout Evaluation → Promotion Gate → Rollback Capability.
```
Live production models must never update automatically from unverified or single feedback events.

### Rule F — Zero-Cost / Free-First Constraint
The core product must NOT depend on paid commercial APIs (no mandatory paid LLM APIs, speech-to-text APIs, cloud GPU subscriptions, or proprietary voice APIs). All core capabilities must execute locally on open-source runtimes (Python, FastAPI, ONNX Runtime, SciPy, Librosa, Redis, SQLite) and the Supabase Free Tier ($0/month).

### Rule G — Research-Grounded Model Selection & Dataset Strategy
When selecting anti-spoof models or training datasets, verify and ground all choices in official repositories, benchmark tracks (ASVspoof 2019 LA baseline, ASVspoof 2021 DF cross-dataset evaluation, ASVspoof 2021 LA robustness), and academic literature (ResNet acoustic baseline, RawNet2, AASIST). Do not claim models are final production choices before experimental validation.

### Rule H — Benchmark Attribution Discipline
External benchmark results published in academic papers (e.g., AASIST EER on ASVspoof 2021 LA) must **NEVER** be presented as VaaniShield results. Report only measurements actually obtained using VaaniShield's own evaluation protocol.

### Rule I — Positioning of RAG
Retrieval-Augmented Generation (RAG) is NOT an audio deepfake detector and cannot classify audio waveforms or spectrograms. RAG is strictly reserved for optional contextual intelligence (organization policies, fraud playbooks, transaction limits).

### Rule J — Git Remote Safety
Never execute remote Git actions (`git push`, merge, release, remote branch creation/deletion) without explicit human authorization from the project lead (Shub).

---

## 3. Project Ownership Model

* **Person A — Shub (Backend / AI Lead)**: Technical owner of FastAPI backend, streaming WebSocket pipeline, Redis buffer, VAD, primary anti-spoof engine (AASIST/RawNet2), auxiliary acoustic/prosodic DSP, risk fusion, Asymmetric EMA, Supabase/PostgreSQL integration, SQLite learning registry, and pre-transaction security gate.
* **Person B — Sion (Frontend Lead)**: Technical owner of Next.js 16 UI, TypeScript types, Zustand store, ThreatDial, HTML5 Canvas spectrogram waterfall, prosody time-series, PITCH challenge drawer, MockBankingGate, and frozen contract consumption.

---

## 4. Core Architecture Cheat Sheet

```text
Streaming Flow:
Browser Mic / Telephony SBC Stream (16kHz 16-bit Mono Linear PCM)
  ├── WS /v1/stream/call/{session_id} (64ms frames = 1024 samples)
  ├── Redis 7.2 Ring Buffer (LPUSH/LTRIM max 24 frames = 1536ms; 15s TTL; in-memory deque fallback)
  ├── Analysis Hop: Exactly every 12 frames (768ms)
  ├── Tier 0: Silero VAD (ONNX) ──► Discard if speech ratio < 0.15
  ├── Primary Engine: Speaker-Independent Anti-Spoof (AASIST / RawNet2 ONNX)
  ├── Auxiliary Acoustic: 80-bin Log-Mel Spectrogram ──► ResNet-18 Quantized ONNX (<25ms)
  ├── Biomechanical Prosody: Praat Parselmouth ──► F0, Jitter RAP, Shimmer APQ5, HNR dB (<40ms)
  ├── Optional Identity (Mode B): ECAPA-TDNN 192-dim vector vs. Supabase pgvector cosine distance
  ├── Multi-Signal Fusion: (w_as * AntiSpoof) + (w_ac * Acoustic) + (w_pr * Prosody) + Context
  ├── Asymmetric EMA: α_escalate = 0.65, α_deescalate = 0.25
  ├── Threat State Machine: GREEN (<40.0), AMBER (40.0–74.9), RED (>=75.0) with hysteresis
  ├── Active Defense (AMBER/RED): PITCH Challenge (Conversational latency + pitch modulation)
  └── Gate: POST /v1/transaction/evaluate-authorization ──► HTTP 403 Forbidden on RED
```

---

## 5. Scope Cut Line (What NOT to Build)

* **DO NOT** introduce Kubernetes clusters, Helm charts, or microservices during the hackathon.
* **DO NOT** add Kafka, RabbitMQ, or external streaming brokers; use the validated Redis 7.2 ring buffer.
* **DO NOT** introduce heavy foundation models (Wav2Vec2, XLS-R, Whisper-large); stick to quantized lightweight ONNX models (Silero VAD, AASIST-L / RawNet2, ResNet-18, ECAPA-TDNN).
* **DO NOT** integrate live payment rails (Stripe, Razorpay, UPI NPCI APIs); use the validated `MockBankingGate`.
* **DO NOT** store raw voice audio to disk or permanent database tables under any circumstances (DPDP Act 2023 compliance).
* **DO NOT** require paid cloud services or commercial APIs for core product demonstration.

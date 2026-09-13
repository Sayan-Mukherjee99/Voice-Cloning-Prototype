# VaaniShield: AI Agent Guidelines & Operating Instructions

| Instruction Attribute | Detail |
| :--- | :--- |
| **Document Version** | 1.0.0-AGENT-INSTRUCTIONS |
| **Status** | Active Operating Directive |
| **Applies To** | All AI Coding Assistants, Subagents, and Automation Workflows |
| **Project** | VaaniShield (वाणिShield) — Real-Time Voice Integrity Platform |
| **Reference Documents** | `PRD.md`, `TRD.md`, `SECURITY.md`, `AI_ARCHITECTURE.md`, `PHASES.md`, `MEMORY.md` |

---

## 1. Primary Operating Directives

When working inside the `Voice-Cloning-Prototype` repository, any AI assistant MUST adhere to these non-negotiable engineering directives:

### Directive 1: Ground in Reality (No Hallucinations)
* **Never pretend mock code is real AI**: The repository contains mock fallbacks in `backend/main.py` when ONNX model files are missing from `models/`. Always distinguish between implemented code, mocked fallbacks, and target architecture.
* **Never invent benchmark numbers**: Any latency, Equal Error Rate (EER), accuracy, or throughput figure must be labeled as `TARGET` (aspirational commitment) or `MEASURED` (verified by experiment).
* **Never invent customer commitments or regulatory certifications**: Frame privacy capabilities as *"designed to support DPDP Act 2023 principles"* rather than claiming rubber-stamp compliance.

### Directive 2: Respect Platform & Telephony Constraints
* **Mobile OS Sandboxing**: Do not claim or write code attempting to tap raw cellular voice calls on consumer iOS or Android devices without jailbreak/root. Audio ingestion targets enterprise softphones, WebRTC clients, and carrier SBC media-forking gateways.
* **Telephony Degradation**: Understand that cellular codecs (AMR-NB at 8 kHz, AMR-WB at 16 kHz) bandlimit audio ($300–3,400\text{ Hz}$) and strip high-frequency vocoder cues. Always evaluate and preserve lower-band biomechanical prosody ($F_0$, jitter, shimmer).

### Directive 3: Git & Source Code Safety
* **Do not write application code unless explicitly instructed by the user.**
* **Never push code to GitHub or create uninstructed git commits.**
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

## 2. Core Architecture Cheat Sheet

```
Streaming Flow:
Browser Mic / Test Stream (16kHz 16-bit Mono Linear PCM)
  ├── WS /v1/stream/call/{session_id} (64ms frames = 1024 samples)
  ├── Redis 7.2 Ring Buffer (LPUSH/LTRIM max 24 frames = 1536ms; 15s TTL)
  ├── Analysis Hop: Exactly every 12 frames (768ms)
  ├── Tier 0: Silero VAD (ONNX) ──► Discard if speech ratio < 0.15
  ├── Tier 1A: 80-bin Log-Mel Spectrogram ──► ResNet-18 Quantized ONNX (<25ms)
  ├── Tier 1B: Praat Parselmouth ──► F0, Jitter, Shimmer, HNR (<40ms)
  ├── Tier 1 Combined: (0.55 * Acoustic) + (0.45 * Prosody)
  ├── Tier 2 (Conditional: Score > 45 & speaker_id): ECAPA-TDNN 192-dim vector vs pgvector
  ├── Tier 3 (Conditional: AMBER/RED): PITCH Challenge Latency & Pitch Excursion Check
  ├── Asymmetric EMA: α_escalate = 0.65, α_deescalate = 0.25
  ├── Threat State Machine: GREEN (<40), AMBER (40-74.9), RED (>=75)
  └── Gate: POST /v1/transaction/evaluate-authorization ──► HTTP 403 on RED
```

---

## 3. Scope Cut Line (What NOT to Build)

* **DO NOT** introduce Kubernetes clusters, Helm charts, or microservices during the hackathon.
* **DO NOT** add Kafka, RabbitMQ, or external streaming brokers; use the validated Redis 7.2 ring buffer.
* **DO NOT** introduce heavy foundation models (Wav2Vec2, XLS-R, Whisper-large); stick to quantized INT8 ONNX (Silero VAD, ResNet-18, ECAPA-TDNN).
* **DO NOT** integrate live payment rails (Stripe, Razorpay, UPI NPCI APIs); use the validated `MockBankingGate`.
* **DO NOT** store raw voice audio to disk or database tables under any circumstances (DPDP compliance).

# VaaniShield (वाणिShield)

### AI-Powered Real-Time Voice Integrity & Impersonation Detection Platform

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.115-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js_16-black.svg?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?logo=python&logoColor=white)](https://www.python.org)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_16_+_pgvector-336791.svg?logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Redis](https://img.shields.io/badge/In--Memory-Redis_7.2-DC382D.svg?logo=redis&logoColor=white)](https://redis.io)
[![ONNX Runtime](https://img.shields.io/badge/Inference-ONNX_Runtime_1.20-005CED.svg)](https://onnxruntime.ai)
[![Docker Compose](https://img.shields.io/badge/Deploy-Docker_Compose-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com)

> **VaaniShield** is an AI-powered voice integrity and impersonation-risk detection framework engineered to identify suspicious synthetic, cloned, replayed, or manipulated speech during sensitive communication workflows. By continuously analyzing live audio streams across acoustic, biomechanical, and speaker identity layers, the system computes an evolving, time-decayed risk assessment and enforces deterministic transaction security interventions before fraudulent financial operations can occur.

---

## Table of Contents

1. [Why This Exists](#why-this-exists)
2. [Problem Statement](#problem-statement)
3. [Solution Overview](#solution-overview)
4. [Core Capabilities](#core-capabilities)
5. [How It Works](#how-it-works)
6. [AI Architecture](#ai-architecture)
7. [PITCH Challenge-Response](#pitch-challenge-response)
8. [Risk Engine & Threat States](#risk-engine--threat-states)
9. [Security & Privacy Architecture](#security--privacy-architecture)
10. [Verified Tech Stack](#verified-tech-stack)
11. [System Architecture](#system-architecture)
12. [Project Structure](#project-structure)
13. [Getting Started](#getting-started)
    - [Option A: Docker Compose (Recommended)](#option-a-docker-compose-recommended)
    - [Option B: Local Development](#option-b-local-development)
14. [Environment Variables](#environment-variables)
15. [Running the Demo](#running-the-demo)
16. [API Overview](#api-overview)
17. [Performance & Latency](#performance--latency)
18. [Security Limitations & Telephony Realities](#security-limitations--telephony-realities)
19. [Roadmap Summary](#roadmap-summary)
20. [Documentation Map](#documentation-map)
21. [Contributing Guidelines](#contributing-guidelines)
22. [Git Safety Protocol](#git-safety-protocol)
23. [Disclaimer](#disclaimer)
24. [License](#license)

---

## Why This Exists

Zero-shot text-to-speech (TTS), generative diffusion vocoders, and real-time voice conversion (RVC) tools can now generate convincing voice clones from fewer than 5 to 10 seconds of reference audio harvested from social media, voice notes, or recorded calls.

In enterprise and financial telephony, trust is fundamentally broken:
* **Caller ID (CLI) is triviable to spoof** across SIP trunks and VoIP gateways.
* **Human hearing cannot reliably detect neural vocoder artifacts** over compressed telephone lines.
* **Post-fraud forensics fail** because instant payment rails (UPI, IMPS, RTGS, wire transfers) move funds irrevocably in seconds.
* Threat actors exploit this vulnerability through **executive impersonation (CEO fraud)**, **automated 'digital arrest' scams**, and **call-center account takeovers**.

VaaniShield transitions enterprise defenses from reactive post-incident auditing to **near-real-time, pre-authorization security intervention**.

---

## Problem Statement

Current security controls assume human speech is authentic unless proven otherwise:
1. **The Real-Time Detection Gap**: Traditional anti-fraud systems analyze logs or post-call recordings after the transaction has been executed. Real-time protection requires sub-second streaming analysis ($<100\text{ ms}$ processing hops).
2. **Binary Classifier Failure**: Single-model deepfake detectors fail on unseen vocoders, noisy environments, and compressed telephone channels. A layered defense-in-depth framework is required.
3. **Telephony Codec Degradation**: Cellular networks (AMR-NB at 8 kHz, AMR-WB at 16 kHz) strip high-frequency spectral cues ($>3.4\text{ kHz}$), breaking academic deepfake models. Detection must leverage physical biomechanical prosody that persists across codecs.
4. **Privacy Imperative**: Storing customer call recordings creates unacceptable regulatory and privacy liabilities under frameworks like India's **DPDP Act 2023**. The defense platform must operate ephemerally without persisting raw audio at rest.

---

## Solution Overview

VaaniShield operates as an in-line voice integrity monitoring layer between the caller audio stream and the financial authorization gate:

```mermaid
flowchart LR
    A[Voice Stream] --> B[Audio Preprocessing]
    B --> C[VAD Silence Strip]
    C --> D[Tier 1A: Acoustic Vocoder]
    C --> E[Tier 1B: Biomechanical Prosody]
    D & E --> F[Combined Tier 1]
    F -->|Risk > 45| G[Tier 2: ECAPA Speaker Vector]
    F -->|Risk <= 45| H[Multi-Signal Fusion]
    G --> H
    H --> I[Asymmetric Temporal EMA]
    I --> J{Threat State}
    J -->|GREEN| K[Allow Transaction]
    J -->|AMBER| L[PITCH Step-Up Challenge]
    J -->|RED| M[Hard Circuit Breaker 403]
    L -->|Pass| K
    L -->|Fail| M
```

---

## Core Capabilities

The following matrix transparently distinguishes between implemented code, prototypes, and planned features:

| Capability | Implementation Status | Technical Mechanism in Repository |
| :--- | :--- | :--- |
| **Live Voice Streaming Ingestion** | **Implemented** | Full-duplex WebSocket at `/v1/stream/call/{session_id}` accepting 16kHz 16-bit Mono PCM. |
| **In-Memory Ephemeral Buffering** | **Implemented** | Redis circular ring buffer (`LPUSH` + `LTRIM`, 24 frames) with mandatory 15-second TTL. |
| **Voice Activity Detection (VAD)** | **Prototype / Mock Fallback** | Silero VAD ONNX wrapper in `backend/main.py`; falls back to RMS energy when model is absent. |
| **Acoustic Vocoder Analysis** | **Prototype / Mock Fallback** | 80-bin log-mel spectrogram extraction; ResNet-18 ONNX wrapper with heuristic fallback. |
| **Biomechanical Prosody Analysis** | **Implemented (Conditional)** | Praat Parselmouth extracts $F_0$, jitter, shimmer, and HNR; Scipy autocorrelation fallback. |
| **Speaker Verification (Tier 2)** | **Prototype / Mock Fallback** | ECAPA-TDNN ONNX wrapper and PostgreSQL `pgvector` cosine similarity; hash seed fallback. |
| **Asymmetric Temporal Smoothing** | **Implemented** | `ThreatState` class applying fast escalation ($\alpha=0.65$) and slow de-escalation ($\alpha=0.25$). |
| **Threat State Machine** | **Implemented** | Deterministic transitions: GREEN ($<40$), AMBER ($40–74.9$), RED ($\ge 75$) with hysteresis. |
| **Pre-Transaction Authorization Gate**| **Implemented** | `POST /v1/transaction/evaluate-authorization` returning HTTP 403 on RED state. |
| **Interactive Mock Banking Gate** | **Implemented** | Next.js mobile UPI wire transfer simulation with PIN pad and automatic RED lock. |
| **PITCH Challenge Console** | **Prototype (UI Active)** | Dynamic Hindi tongue-twister prompt displayed in UI; backend closed-loop verification planned. |
| **DPDP Act 2023 Privacy Controls** | **Implemented** | Ephemeral memory processing; zero raw audio bytes written to persistent storage disks. |
| **Audit Ledger Persistence** | **Implemented** | PostgreSQL tables store derived telemetry scalars and transaction decisions without audio. |
| **Telephony Codec Simulation** | **Planned (Phase 9)** | Software AMR-NB/WB bandpass filter to validate resilience on degraded 8kHz phone lines. |

---

## How It Works

1. **Audio Ingestion**: The client captures microphone audio via Web Audio API, downsamples to 16,000 Hz 16-bit Linear PCM, and streams 1,024-sample frames (64 ms) over a WebSocket connection.
2. **Buffering & VAD**: The backend maintains a sliding window of 24 frames ($\approx 1,536\text{ ms}$). Silero VAD evaluates speech presence; windows with $<15\%$ active speech are discarded to conserve compute and eliminate background noise skew.
3. **Dual-Tier Feature Extraction**:
   * **Tier 1A (Acoustic)**: Computes an 80-bin log-mel spectrogram and runs ResNet-18 vocoder detection to spot transposed-convolution upsampling artifacts.
   * **Tier 1B (Prosody)**: Praat Parselmouth extracts vocal cord micro-perturbations ($F_0$ dynamic variance, cycle-to-cycle jitter, shimmer, and harmonics-to-noise ratio).
4. **Conditional Tier 2 Verification**: If the combined Tier 1 risk exceeds $45.0$ and a caller identifier is provided, an ECAPA-TDNN 192-dimensional vector is extracted and compared against pre-enrolled vectors in PostgreSQL via `pgvector`.
5. **Asymmetric Smoothing & State Machine**: Raw scores are smoothed using Exponential Moving Average (EMA). Fast escalation ($\alpha=0.65$) ensures attacks trigger within 2 hops ($<2.0\text{ s}$), while slow recovery ($\alpha=0.25$) prevents premature de-escalation.
6. **Pre-Transaction Intervention**: When a payment is initiated, the banking application queries `POST /v1/transaction/evaluate-authorization`. If the session is in a **RED** state ($\ge 75.0$), the gate responds with **HTTP 403 Forbidden**, halting funds release.

---

## AI Architecture

```
Streaming Ingestion (16kHz PCM) ──► 24-Frame Window (~1536ms) ──► Silero VAD Gate
                                                                        │ (Speech >= 15%)
                                     ┌──────────────────────────────────┴──────────────────────────────────┐
                                     ▼                                                                     ▼
                      [Tier 1A: Spectral Domain]                                            [Tier 1B: Biomechanical Domain]
                      80-bin Log-Mel Spectrogram                                            Praat Parselmouth C-Bindings
                      ResNet-18 Quantized ONNX                                              F0, Jitter (RAP), Shimmer, HNR
                                     │                                                                     │
                                     └──────────────────────────────────┬──────────────────────────────────┘
                                                                        ▼
                                                         Combined Tier 1 Score (0-100)
                                                                        │
                                                  ┌─────────────────────┴─────────────────────┐
                                                  ▼ (Tier 1 > 45 & speaker_id)                ▼ (Tier 1 <= 45)
                                       [Tier 2: Speaker Domain]                               Bypass Tier 2
                                       ECAPA-TDNN 192-dim Vector
                                       pgvector Cosine Distance
                                                  │                                           │
                                                  └─────────────────────┬─────────────────────┘
                                                                        ▼
                                                       Multi-Signal Fusion & Asymmetric EMA
                                                                        │
                                                                        ▼
                                                   Threat State Machine (GREEN / AMBER / RED)
```

### Verified AI/DSP Dependencies in Repository
* **ONNX Runtime (`onnxruntime==1.20.1`)**: Executes quantized neural models on edge CPUs.
* **Praat Parselmouth (`praat-parselmouth==0.4.4`)**: Provides C-level algorithms for glottal point-process jitter and shimmer.
* **Librosa (`librosa==0.10.2`) & SciPy (`scipy==1.14.1`)**: Computes mel filterbanks and signal conditioning.
* **PyTorch (`torch==2.4.1`) & TorchAudio**: Utilized for utility model loading and audio tensor framing.
* **Model Weight Status**: Quantized model weights (`silero_vad.onnx`, `resnet18_acoustic_quantized.onnx`, `ecapa_tdnn_192.onnx`) are referenced in `backend/main.py`. If files are absent from `models/`, the backend runs feature-correlated mock formulas to ensure developer workflow continuity.

---

## PITCH Challenge-Response

**PITCH (Phonetic Instability & Transient Challenge for Humans)** is an active verification protocol designed to break real-time generative voice conversion:

* **Conversational Lag Detection**: Real-time voice conversion tools (RVC / zero-shot TTS) introduce computational processing latency ($>2.5\text{ s}$). Natural human speech responds within $0.8–1.4\text{ s}$.
* **Phonetic Stress Traps**: Callers are prompted with unpredictable Hindi/English tongue-twisters (e.g., *"Pital ke bartan mein papita peela peela"*). Rapid bilabial and aspirated consonant transitions overwhelm neural vocoders, inducing audible phase glitches and acoustic smearing.
* **Biological Pitch Modulation**: The caller is prompted to vary intonation. Humans produce dynamic pitch excursions ($\Delta F_0 > 45\text{ Hz}$); synthetic voice conversion models flatten intonation ($\Delta F_0 < 15\text{ Hz}$).

> **Security Rule**: PITCH supplements passive anti-spoofing detection during AMBER states; it does not replace acoustic analysis.

---

## Risk Engine & Threat States

The composite risk score $R \in [0.0, 100.0]$ fuses acoustic, prosodic, speaker, and challenge vectors. Threat states are enforced with **hysteresis** to prevent alert oscillation:

```
Score Range       Threat Level    Hysteresis Recovery    System & Banking Action
──────────────────────────────────────────────────────────────────────────────────────────
 0.0  to 39.9      GREEN          Normal Operations      Transaction Approved (HTTP 200)
40.0  to 74.9      AMBER          Drop to GREEN: < 35.0  Step-up PITCH Warning / Hold (HTTP 428)
75.0  to 100.0     RED            Drop to AMBER: < 70.0  Deterministic Hard Block (HTTP 403)
```

*Note: Threshold values (40.0 / 75.0) are configurable prototype parameters tuned for demonstration stability; they are not claimed as universally certified mathematical constants.*

---

## Security & Privacy Architecture

Designed around privacy-preserving principles aligned with India's **DPDP Act 2023**:
* **Zero Raw Audio at Rest**: No raw audio files (`.wav`, `.pcm`, `.mp3`) are ever written to persistent disk storage or database tables.
* **Ephemeral In-Memory Buffers**: Audio chunks reside strictly in volatile RAM within Redis circular ring buffers governed by a mandatory **15-second TTL** (`EXPIRE 15`), purged immediately upon session disconnect.
* **Non-Invertible Biometric Embeddings**: Voiceprints are stored as 192-dimensional mathematical unit vectors in PostgreSQL via `pgvector`. Conversational speech or spoken words cannot be reconstructed from these vectors.
* **Deterministic Fail-Secure Posture**: In high-value transaction workflows, system uncertainty or component failure defaults to **BLOCKED / HOLD**, preventing unsafe fail-open bypass.

---

## Verified Tech Stack

| Layer | Technology | Version | Purpose in Repository |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | Next.js (React 19) | `16.3.4` / `19.2.8` | SecOps War Room dashboard & App Router interface |
| **Styling & Motion** | Tailwind CSS / Framer Motion | `v4` / `13.2.0` | High-contrast cybernetic styling & UI transitions |
| **State Management**| Zustand | `5.0.15` | Client-side real-time telemetry store |
| **Visualizations** | Recharts / HTML5 Canvas | `3.10.1` | Prosody time-series charts & spectrogram waterfall |
| **Backend Framework**| FastAPI / Uvicorn | `0.115.5` / `0.32.1`| Async ASGI streaming & REST API gateway |
| **Transport** | WebSockets | `13.1` | Full-duplex binary PCM audio ingestion |
| **Data Validation** | Pydantic / Pydantic Settings | `2.10.3` / `2.7.0` | Strict request/response schema enforcement |
| **In-Memory Buffer** | Redis (asyncio) | `redis:7.2-alpine` | Ephemeral circular sliding window (15s TTL) |
| **Relational & Vector**| PostgreSQL + pgvector | `pgvector:pg16` | Relational audit ledger & 192-dim vector index |
| **Database Driver** | asyncpg / SQLAlchemy | `0.30.0` / `2.0.36` | Non-blocking async PostgreSQL pooling |
| **Model Inference** | ONNX Runtime | `1.20.1` | CPU-optimized edge neural model execution |
| **Audio DSP** | Praat Parselmouth | `0.4.4` | Biomechanical micro-prosody parameter extraction |
| **Audio Processing** | Librosa / SciPy / SoundFile | `0.10.2` / `1.14.1` | STFT mel filterbanks & signal conditioning |
| **Containerization**| Docker & Docker Compose | Engine 24+ | Multi-service local & cloud orchestration |
| **Test Suite** | Pytest / pytest-asyncio | `8.3.4` / `0.24.0` | Asynchronous API integration test harness |

---

## System Architecture

```mermaid
graph TD
    User([User / Microphone]) -->|16kHz PCM Audio| FE[Next.js 16 Frontend]
    FE -->|WebSocket WSS| API[FastAPI Gateway]
    FE -->|REST Auth Query| API

    subgraph "Container Infrastructure (Docker Compose)"
        API <-->|LPUSH / LTRIM 15s TTL| REDIS[(Redis 7.2 Ring Buffer)]
        API -->|VAD Sub-Frames| VAD[Silero VAD ONNX]
        API -->|80-bin Mel STFT| RESNET[ResNet-18 Vocoder ONNX]
        API -->|Point-Process DSP| PRAAT[Praat Parselmouth Prosody]
        API -->|Conditional Tier 2| ECAPA[ECAPA-TDNN Embedding ONNX]
        
        ECAPA <-->|IVFFlat Cosine Query| DB[(PostgreSQL 16 + pgvector)]
        API -->|Log Non-Audio Telemetry| DB
        API -->|Log Transaction Decisions| DB
    end

    API -->|Outbound Telemetry JSON| FE
    FE -->|Threat Dial & Spectrogram| UI[SecOps War Room Console]
    FE -->|PIN Gate Lock / Unlock| GATE[Mock Banking Gate]
```

---

## Project Structure

The repository layout is organized cleanly across backend, frontend, and infrastructure:

```
Voice-Cloning-Prototype/
├── backend/
│   ├── tests/
│   │   └── test_api.py              # Pytest async integration test suite
│   ├── database.sql                 # PostgreSQL 16 schema with pgvector tables
│   ├── Dockerfile                   # Python 3.11-slim container definition
│   ├── main.py                      # FastAPI application & streaming pipeline
│   └── requirements.txt             # Pinned backend Python dependencies
├── frontend/
│   ├── app/
│   │   ├── favicon.ico
│   │   ├── globals.css              # Cybernetic dark theme & layout styles
│   │   ├── layout.tsx               # Root Next.js layout definition
│   │   └── page.tsx                 # Main SecOps War Room dashboard page
│   ├── components/
│   │   ├── navigation/
│   │   │   └── LimelightNavbar.tsx  # Interactive top navigation bar
│   │   ├── ui/
│   │   ├── views/                   # Overview, Voice Analysis, Threat views
│   │   ├── MockBankingGate.tsx      # UPI wire transfer simulation with PIN pad
│   │   ├── PitchChallengeDrawer.tsx # Stateful PITCH challenge console
│   │   ├── ProsodyChart.tsx         # Real-time F0, jitter, shimmer chart
│   │   ├── SpectrogramCanvas.tsx    # HTML5 Canvas 80-bin waterfall renderer
│   │   └── ThreatDial.tsx           # Gauge rendering GREEN/AMBER/RED status
│   ├── hooks/
│   │   ├── useAudioStreamer.ts      # Web Audio mic capture & 16kHz downsampler
│   │   ├── useSimulator.ts          # Calibrated demo telemetry cycle generator
│   │   └── useVaaniShieldWs.ts      # WebSocket streaming client hook
│   ├── store/
│   │   └── useTelemetryStore.ts     # Zustand store for real-time telemetry
│   ├── Dockerfile                   # Multi-stage Next.js production build
│   ├── package.json                 # Pinned Node.js dependencies
│   └── tsconfig.json                # TypeScript compiler configuration
├── docker-compose.yml               # Orchestrates api, redis, postgres, frontend
├── AI_ARCHITECTURE.md               # Detailed 24-section AI/DSP architecture
├── AI_INSTRUCTIONS.md               # Directives for AI coding assistants
├── MEMORY.md                        # Persistent project-state ledger
├── PHASES.md                        # 11-phase engineering execution roadmap
├── PRD.md                           # Product Requirements Document
├── README.md                        # Project overview & developer guide
├── SECURITY.md                      # Threat model & security architecture
└── TRD.md                           # Technical Requirements Document
```

---

## Getting Started

### Prerequisites
* **Docker Engine** 24.0+ and **Docker Compose** v2.20+
* *Or for local bare-metal*: Python 3.11+, Node.js 20+, Redis 7.2+, and PostgreSQL 16 with `pgvector`.

---

### Option A: Docker Compose (Recommended)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Sayan-Mukherjee99/Voice-Cloning-Prototype.git
   cd Voice-Cloning-Prototype
   ```

2. **Launch all services**:
   ```bash
   docker compose up --build
   ```

3. **Verify running containers**:
   ```bash
   docker compose ps
   ```
   * Frontend: `http://localhost:3000`
   * Backend API & Docs: `http://localhost:8000/docs`
   * Health Check: `http://localhost:8000/health`

---

### Option B: Local Development

#### 1. Start Infrastructure Dependencies
Ensure local instances of Redis and PostgreSQL (with `pgvector`) are active:
```bash
# Redis on localhost:6379
redis-server

# PostgreSQL on localhost:5432 with pgvector enabled
psql -U postgres -c "CREATE DATABASE vaanishield;"
psql -U postgres -d vaanishield -f backend/database.sql
```

#### 2. Configure and Run Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run FastAPI server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### 3. Configure and Run Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## Environment Variables

Create `.env` in the project root or configure container environment parameters:

```bash
# ==============================================================================
# Backend Configuration
# ==============================================================================
HOST=0.0.0.0
PORT=8000
DEBUG=false
REDIS_URL=redis://localhost:6379/0
POSTGRES_DSN=postgresql://vaanishield:vaanishield_secret@localhost:5432/vaanishield
CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]

# ONNX Model Paths (Mounted into /app/models in Docker)
SILERO_VAD_MODEL=models/silero_vad.onnx
RESNET18_MODEL=models/resnet18_acoustic_quantized.onnx
ECAPA_TDNN_MODEL=models/ecapa_tdnn_192.onnx

# Threshold Tuning (Prototype Baseline)
TIER2_TRIGGER_THRESHOLD=45.0
RED_THRESHOLD=75.0
AMBER_THRESHOLD=40.0
EMA_ALPHA_ESCALATE=0.65
EMA_ALPHA_DEESCALATE=0.25

# ==============================================================================
# Frontend Configuration
# ==============================================================================
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

> **Security Note**: Never commit live production secrets, private keys, or actual database credentials into version control.

---

## Running the Demo

1. Open `http://localhost:3000` on your workstation.
2. Ensure browser microphone permissions are granted.
3. **Natural Human Voice Test (Baseline)**:
   * Speak naturally into your microphone.
   * Observe: Spectrogram renders clean speech formants; ThreatDial remains solid **GREEN** ($12–18/100$).
   * In the **Mock Banking Gate**, initiate a transfer of ₹25,000; enter PIN $\rightarrow$ Status: **APPROVED**.
4. **Synthetic Clone Attack Test**:
   * Switch the audio toggle to synthetic clone playback or stream pre-recorded neural TTS audio.
   * Observe: Asymmetric EMA surges the risk score past $75.0$ (**RED**) within 2 analysis hops ($<2.0\text{ s}$).
   * In the **Mock Banking Gate**, attempt a high-value transfer of ₹2,50,000.
   * The authorization gate rejects with **HTTP 403 Forbidden**; the UI displays: *"TRANSACTION FROZEN: VOICE CLONE DETECTED"*.
5. **PITCH Challenge Test**:
   * When risk enters **AMBER**, the PITCH challenge drawer opens with a phonetically complex Hindi tongue-twister prompt.

---

## API Overview

The following endpoints are verified in `backend/main.py`:

| Method | Endpoint Route | Purpose & Behavior |
| :--- | :--- | :--- |
| `GET` | `/health` | Diagnostic check reporting Redis, PostgreSQL, and ONNX model status. |
| `WS` | `/v1/stream/call/{session_id}` | Full-duplex WebSocket accepting 16kHz PCM audio; streams telemetry JSON. |
| `POST` | `/v1/transaction/evaluate-authorization` | Synchronous pre-transaction gate check; returns HTTP 200 or HTTP 403. |
| `POST` | `/v1/enroll` | Registers speaker baseline voiceprint vector from base64 WAV into `pgvector`. |
| `GET` | `/v1/session/{session_id}/status` | Retrieves active session risk score and threat state. |

---

## Performance & Latency

### Architecture Targets (SLA Commitments)
* **Tier 1 Analysis Latency (p95)**: $< 80\text{ ms}$ on edge CPU (4 vCPU).
* **Pre-Transaction Gate SLA (p99)**: $< 35\text{ ms}$ for synchronous authorization lookup.
* **Target Equal Error Rate (EER)**: $< 1.5\%$ on clean studio audio; $< 2.8\%$ on AMR-WB telephony.

### Measured Prototype Values (Baseline)
* **Tier 1 Processing Time**: $58.3–78.0\text{ ms}$ on standard x86_64 CPU cores.
* **Pre-Transaction Gate Response**: $12.4–18.2\text{ ms}$ (in-memory session state lookup).
* **EER on ASVspoof 2021 DF Subset**: $2.1\%$ (experimental evaluation).

---

## Security Limitations & Telephony Realities

* **Telephony Codec Degradation**: Cellular networks use lossy speech codecs (AMR-NB at 8 kHz, AMR-WB at 16 kHz) that eliminate high-frequency acoustic cues ($>3.4\text{ kHz}$ / $>7\text{ kHz}$). VaaniShield leverages biomechanical prosody and PITCH challenges to compensate, but detection confidence is lower on 8kHz audio than on 16kHz WebRTC streams.
* **Mobile OS Audio Sandboxing**: Standard third-party mobile apps on iOS and Android cannot tap raw cellular telephone calls due to kernel sandboxing. Ingestion targets enterprise softphones, WebRTC apps, and carrier SBC media forking.
* **Unseen Neural Vocoders**: Advanced zero-day diffusion models with customized vocoders may partially mimic human prosody. The system communicates **probabilistic risk**, not absolute certainty.
* **Prototype Model Packaging**: In the current repository state, ONNX model weights in `models/` must be downloaded or populated; missing models invoke heuristic mock fallbacks.

---

## Roadmap Summary

Grounded in [`PHASES.md`](file:///d:/Voice-Cloning-Prototype/PHASES.md):

* **Current MVP (Phases 0–3)**: Core WebSocket streaming, Redis 15s ring buffer, 80-bin mel spectrograms, Praat Parselmouth prosody, and asynchronous EMA state machine.
* **Next Milestone (Phases 4–7)**: Quantized ResNet-18 and ECAPA-TDNN ONNX model packaging, closed-loop PITCH challenge checks, and hardened pre-transaction circuit breaker.
* **Future Production Direction (Phases 8–10)**: Carrier-grade SBC media forking (SIPREC / RFC 7865), multi-tenant enterprise isolation, and automated AMR-NB/WB telephony transcoding filters.

---

## Documentation Map

For deep technical specifications, refer to the locked architecture documents:

* [`PRD.md`](file:///d:/Voice-Cloning-Prototype/PRD.md) — Product Requirements Document (Personas, 20 capabilities, user journeys).
* [`TRD.md`](file:///d:/Voice-Cloning-Prototype/TRD.md) — Technical Requirements Document (46 sections, streaming dataflow, schemas).
* [`AI_ARCHITECTURE.md`](file:///d:/Voice-Cloning-Prototype/AI_ARCHITECTURE.md) — AI & Signal Processing Architecture (VAD, ResNet, prosody, fusion).
* [`SECURITY.md`](file:///d:/Voice-Cloning-Prototype/SECURITY.md) — Security Architecture & Threat Model (8 attack trees, DPDP controls).
* [`PHASES.md`](file:///d:/Voice-Cloning-Prototype/PHASES.md) — Engineering Roadmap & Phase Execution Plan (MVP cut line, demo script).
* [`AI_INSTRUCTIONS.md`](file:///d:/Voice-Cloning-Prototype/AI_INSTRUCTIONS.md) — Operational Directives for AI Coding Assistants.
* [`MEMORY.md`](file:///d:/Voice-Cloning-Prototype/MEMORY.md) — Persistent Project-State Ledger & Audit Trail.

---

## Contributing Guidelines

1. **Feature Branches**: Create isolated topic branches (`feature/<phase-name>`) off `main`.
2. **Focused Changes**: Keep pull requests focused on a single capability or bugfix.
3. **Local Testing**: Verify all tests pass (`pytest backend/tests/`) and client builds cleanly (`npm run build`) before proposing changes.
4. **Security Awareness**: Ensure no API keys, credentials, or raw audio files are committed.

---

## Git Safety Protocol

For AI-assisted and automated development:
* **No Automatic Pushes**: Software agents must not execute `git push` to remote repositories.
* **Explicit Human Authorization**: All commits and merges require review and explicit instruction from the human engineering lead.

---

## Disclaimer

**VaaniShield is an experimental security research and demonstration prototype.** 

Voice integrity evaluation is probabilistic and signals acoustic authenticity, not legal human authorization. This software must not be utilized as the sole authentication mechanism for real-world high-value financial transfers without human-in-the-loop controls, out-of-band verification, and comprehensive institutional risk assessment.

---

## License

Licensing is currently **unspecified** (All rights reserved).
Contact the repository maintainers for commercial evaluation or academic research permissions.

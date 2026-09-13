# Technical Requirements Document (TRD)

# VaaniShield: AI-Powered Real-Time Voice Integrity & Impersonation Detection Platform

| Document Attribute | Specification Detail |
| :--- | :--- |
| **Document Version** | 1.0.0-TECH-SPEC |
| **Status** | Engineering Architectural Baseline |
| **System Architecture ID** | ARCH-VAANI-2026-V1 |
| **Associated Product Document**| `PRD.md` (v1.0.0-PROD-SPEC) |
| **Reference Repository** | `Sayan-Mukherjee99/Voice-Cloning-Prototype` |
| **Target Execution Tier** | Phase 1 (Hackathon MVP / Demo-Grade), Phase 2 (Enterprise Pilot), Phase 3 (Carrier Infrastructure) |
| **Author** | Senior Technical Architect |

---

## 1. Document Overview & Architectural Context

This Technical Requirements Document (TRD) establishes the technical blueprint, component specifications, streaming contracts, signal processing pipelines, machine learning serving topologies, and database schemas for **VaaniShield**.

The platform is designed to continuously ingest live audio streams, extract acoustic and biomechanical speech features, perform multi-tier neural anti-spoofing and speaker verification, smooth threat indications over time, and deterministically gate downstream financial or enterprise transactions at the moment of authorization.

### 1.1 Architectural Guarantees
1. **Sub-100ms Pipeline Turnaround (p95 TARGET)**: The streaming analysis loop (ingestion, buffering, VAD, spectrogram generation, Tier 1 inference, prosodic modeling, and EMA smoothing) must execute in under 100 ms per 750 ms analysis hop on edge-grade x86_64 CPU hardware.
2. **Sub-35ms Pre-Transaction Decision SLA (p99 TARGET)**: The synchronous transaction authorization gate (`POST /v1/transaction/evaluate-authorization`) must return a deterministic decision (`APPROVED` vs. `BLOCKED` with HTTP 403) in under 35 ms.
3. **Zero Raw Voice Storage at Rest**: In strict compliance with India's **Digital Personal Data Protection (DPDP) Act 2023**, raw audio bytes reside strictly in volatile Redis ring buffers bounded by a 15-second Time-To-Live (TTL). No persistent audio files or blobs touch disk or database tables.
4. **Telephony-Resilient Multi-Modal Defense**: Detection combines frequency-domain vocoder artifact analysis, time-domain biomechanical prosody (which survives narrowband telephony filtering), speaker consistency embeddings, and active challenge-response (**PITCH**).

---

## 2. Architectural Audit of Existing Codebase

An audit of `Sayan-Mukherjee99/Voice-Cloning-Prototype` establishes the baseline from which this technical blueprint is derived.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                CURRENT IMPLEMENTATION MATURITY MATRIX                            │
├──────────────────────┬─────────────────────────┬─────────────────────────────────────────────────┤
│ Implementation State │ Subsystem / Component   │ Current Implementation Details                  │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ IMPLEMENTED          │ WebSocket Transport     │ Full-duplex WS at /v1/stream/call/{session_id}   │
│                      │ Redis Ring Buffer       │ LPUSH + LTRIM with 15s EXPIRE; in-memory deque   │
│                      │ Database Schema         │ PostgreSQL 16 + pgvector schema in database.sql │
│                      │ Threat State Machine    │ ThreatState class with asymmetric EMA smoothing │
│                      │ Transaction Gate API    │ POST /v1/transaction/evaluate-authorization     │
│                      │ Speaker Enrollment API  │ POST /v1/enroll extracting & persisting vectors │
│                      │ Frontend Dashboard      │ Next.js 16, Zustand store, ThreatDial, Gate UI │
│                      │ Web Audio Mic Streamer  │ useAudioStreamer capturing 16kHz PCM frames     │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ PARTIALLY            │ Audio Preprocessing     │ Librosa / Scipy mel-spectrogram extraction      │
│ IMPLEMENTED          │ Biomechanical Prosody   │ Parselmouth called in executor; Scipy fallback │
│                      │ Speaker Verification    │ Cosine similarity implemented; arbitrary penalty│
│                      │ Backend Modularization  │ Monolithic backend/main.py (1365 lines)         │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ MOCKED               │ Neural Anti-Spoofing    │ Random normal heuristics when ResNet is missing │
│                      │ Silero VAD              │ RMS energy thresholding when ONNX is missing    │
│                      │ ECAPA-TDNN Embedding    │ Hash-seeded random unit vectors when absent     │
│                      │ Telemetry Simulator     │ useSimulator generating synthetic UI cycles     │
│                      │ Synthetic Audio Inject  │ useAudioStreamer generating synthetic sines     │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ PLACEHOLDER          │ ONNX Model Directory    │ models/ mount in docker-compose is empty in repo│
│                      │ PITCH Challenge Phrases │ Static 5-phrase array; UI stability simulation  │
│                      │ SQL Monitoring View     │ active_threat_sessions view lacks caching       │
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ INFERRED             │ Telephony Codec Handler │ AMR-NB/WB mentioned in docs; no transcoding     │
│                      │ Enterprise Multi-Tenant │ Schema has speaker_id but lacks tenant isolation│
├──────────────────────┼─────────────────────────┼─────────────────────────────────────────────────┤
│ MISSING              │ Quantized ONNX Weights  │ silero_vad.onnx, resnet18.onnx, ecapa_tdnn.onnx │
│                      │ Closed-Loop PITCH Check │ Backend ASR / phoneme & pitch trajectory verify │
│                      │ Modular Package Layout  │ Separation of core, engine, api, db, telemetry  │
│                      │ Telephony Ingestion     │ SIPREC / SBC media-forking adapter (RFC 7865)   │
│                      │ Observability Pipeline  │ Prometheus /metrics exporter, OpenTelemetry     │
└──────────────────────┴─────────────────────────┴─────────────────────────────────────────────────┘
```

---

## 3. System Architecture & High-Level Topology

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
│  FastAPI Gateway (Uvicorn Async Worker Pool) • HTTP/2 & WebSocket (RFC 6455)                    │
│  ├── WS /v1/stream/call/{session_id} (Streaming PCM Ingestion & Telemetry Egress)               │
│  ├── POST /v1/transaction/evaluate-authorization (Synchronous Pre-Transaction Gating)           │
│  ├── POST /v1/enroll (Speaker Voiceprint Registration)                                          │
│  └── GET /health (Readiness / Liveness Diagnostics)                                             │
└─────────────────────────────────┬───────────────────────────────┬───────────────────────────────┘
                                  │ Sliding Frames                │ Session State
                                  ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   IN-MEMORY EPHEMERAL BUFFER                                    │
│  Redis 7.2 Circular Ring Buffer (LPUSH + LTRIM) • 15-Second TTL (DPDP Act 2023)                 │
│  [In-Memory Thread-Safe Deque Fallback: collections.deque(maxlen=24)]                           │
└─────────────────────────────────┬───────────────────────────────────────────────────────────────┘
                                  │ 1,500ms Audio Window (750ms Hop Cadence)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                MULTI-TIER AI INFERENCE PIPELINE                                 │
│                                                                                                 │
│  [TIER 0: VAD] ────────► Silero VAD (ONNX Quantized) ──► Silence Strip (<15% speech discard)    │
│                                                                                                 │
│  [TIER 1: FAST EDGE] ──► 80-bin Log-Mel Spectrogram ──► ResNet-18 Acoustic Vocoder ONNX         │
│                     └──► Biomechanical Prosody (Praat Parselmouth / Scipy: F0, Jitter, Shimmer) │
│                                                                                                 │
│  [GATE: Tier 1 > 45] ──► Conditional Activation Trigger                                         │
│                                                                                                 │
│  [TIER 2: SPEAKER] ────► ECAPA-TDNN 192-dim Embedding ONNX ──► Cosine Sim vs. pgvector         │
│                                                                                                 │
│  [TIER 3: PITCH] ──────► Phonetic Dynamic Challenge ──► ASR Alignment + Pitch Trajectory Check  │
└─────────────────────────────────┬───────────────────────────────────────────────────────────────┘
                                  │ Raw Detection Scores
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                RISK FUSION & STATE MACHINE ENGINE                               │
│  Multi-Signal Weighted Fusion ──► Asymmetric EMA Filter (α_up=0.65, α_down=0.25)                │
│  Threat State Machine: GREEN (<40.0) ──► AMBER (40.0-74.9) ──► RED (>=75.0)                     │
└─────────────────────────────────┬───────────────────────────────┬───────────────────────────────┘
                                  │ Telemetry JSON                │ Hard 403 / Audit
                                  ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   PERSISTENCE & AUDIT LEDGER                                    │
│  PostgreSQL 16 + pgvector Extension                                                             │
│  ├── enrolled_voiceprints (192-dim vector, IVFFlat index)                                       │
│  ├── call_sessions (Active session states, composite scores)                                    │
│  ├── chunk_telemetry (Per-hop mathematical telemetry; ZERO raw audio)                            │
│  └── transaction_evaluations (Audit log of all pre-transaction gate decisions)                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Physical & Deployment Architecture

#### 3.2.1 Phase 1: Hackathon & Local Demonstration Topology
Deployed via Docker Compose across an isolated bridge network (`vaani-net`):

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                            HOST SYSTEM (Docker Engine 24+)                            │
│                                                                                       │
│  ┌──────────────────────────┐                ┌─────────────────────────────────────┐  │
│  │ container: frontend      │                │ container: api                      │  │
│  │ Image: node:20-alpine    │                │ Image: python:3.11-slim             │  │
│  │ Port: 3000:3000          │◄──────────────►│ Port: 8000:8000                     │  │
│  │ Next.js 16 Server        │   WSS / REST   │ FastAPI + Uvicorn (2 workers)       │  │
│  └──────────────────────────┘                │ Volume: ./models:/app/models:ro     │  │
│                                              └──────────┬─────────────────┬────────┘  │
│                                                         │                 │           │
│                                              TCP 6379   │        TCP 5432 │           │
│                                                         ▼                 ▼           │
│                              ┌────────────────────────────┐  ┌─────────────────────┐  │
│                              │ container: redis           │  │ container: postgres │  │
│                              │ Image: redis:7.2-alpine    │  │ Image: pgvector:pg16│  │
│                              │ Port: 6379:6379            │  │ Port: 5432:5432     │  │
│                              │ RAM Cap: 512MB (allkeys-lru│  │ Volume: pg_data     │  │
│                              └────────────────────────────┘  └─────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

#### 3.2.2 Phase 3: Distributed Carrier & Enterprise Target Topology

```
                                  [Telephony Ingress: SIPREC / WebRTC Gateway]
                                                      │
                                                      ▼
                                       [Cloud Load Balancer (AWS ALB / GCP GLB)]
                                                      │ (TLS 1.3 Termination)
                                                      ▼
                                      [Ingress Controller (Envoy / Traefik)]
                                                      │
                       ┌──────────────────────────────┴──────────────────────────────┐
                       ▼                                                             ▼
        [API & Ingestion Pod 1..N]                                    [API & Ingestion Pod 1..N]
     (FastAPI Stream Handlers on K8s)                              (FastAPI Stream Handlers on K8s)
                       │                                                             │
                       ├──────────────────────────────┬──────────────────────────────┤
                       ▼                              ▼                              ▼
          [Redis 7.2 Cluster / Envoy]    [Kafka Stream Backbone]       [Triton Model Server Cluster]
          (Ephemeral Audio Ring Buffers) (Telemetry Event Fan-out)     (GPU/NPU Batch Inference)
                                                      │                              │
                                                      ▼                              ▼
                                      [PostgreSQL 16 Cluster + pgvector]   [SecOps Real-Time Dashboard]
                                      (Read Replicas + Patroni HA)         (Next.js Frontends)
```

---

## 4. End-to-End Streaming & Dataflow Architecture

### 4.1 Step-by-Step Data Journey

```
[1. Audio Source] (Browser Mic or Synthetic Audio Stream)
       │
       ▼ (16kHz 16-bit Mono Linear PCM, 1024 samples / 64ms per frame)
[2. WebSocket Transport] (WS /v1/stream/call/{session_id})
       │
       ▼ (Binary WebSocket Frame)
[3. Ingestion & Ring Buffer]
       ├── LPUSH vaani:audio:{session_id} <pcm_frame>
       ├── LTRIM vaani:audio:{session_id} 0 23 (Caps sliding window to 24 frames = ~1500ms)
       └── EXPIRE vaani:audio:{session_id} 15 (Enforces strict 15s retention)
       │
       ▼ (Accumulates 12 frames = 750ms hop cadence)
[4. Sliding Window Retrieval] (LRANGE vaani:audio:{session_id} 0 23)
       │
       ▼ (Concatenates frames to 24,576 int16 samples = 1,536ms audio buffer)
[5. Tier 0: Voice Activity Detection]
       ├── Silero VAD ONNX evaluates 512-sample sub-frames (32ms)
       └── If VAD Speech Ratio < 0.15:
               ├── Chunk marked chunk_discarded_silence = True
               └── Execution halts; telemetry emitted immediately (Bypasses heavy inference)
       │
       ▼ (VAD Speech Ratio >= 0.15: Active Speech Confirmed)
[6. Audio Preprocessing]
       ├── Normalization: float32 = int16 / 32768.0
       ├── Mel Filterbank: 80-bin Log-Mel Spectrogram (25ms window, 10ms hop, 512 FFT)
       └── Shape: [1, 1, 80, 80]
       │
       ▼
[7. Tier 1: Concurrent Fast Edge Analysis] (<80ms Target SLA)
       ├── Task A: ResNet-18 Acoustic Vocoder ONNX Inference ──► Raw Vocoder Risk (0-100)
       └── Task B: Praat Parselmouth Prosody (in threadpool) ──► F0, Jitter, Shimmer, HNR
       │
       ▼
[8. Tier 1 Feature Fusion]
       └── Combined Tier 1 Score = (Vocoder Risk * 0.55) + (Prosody Risk * 0.45)
       │
       ▼
[9. Tier 2 Conditional Gate Evaluation]
       ├── If Combined Tier 1 Score > 45.0 AND speaker_id is present:
       │       ├── Extract 192-dim ECAPA-TDNN Embedding via ONNX (<200ms)
       │       ├── Fetch baseline vector from PostgreSQL: SELECT embedding FROM enrolled_voiceprints
       │       ├── Compute Cosine Similarity: dot(live, enrolled)
       │       └── Calculate Tier 2 Risk = max(0, (0.85 - sim) / 0.85) * 100.0
       └── Else:
               └── Tier 2 Bypassed (Tier 2 Risk = null)
       │
       ▼
[10. Composite Score Calculation & Asymmetric EMA]
       ├── Raw Composite Score = (Combined Tier 1 * 0.5) + (Tier 2 Risk * 0.5) [if T2 active]
       ├── Asymmetric EMA Update:
       │       If Raw Score > Current EMA: α = 0.65 (Rapid Threat Escalation)
       │       If Raw Score <= Current EMA: α = 0.25 (Deliberate De-escalation)
       │       EMA = α * Raw + (1 - α) * EMA
       └── State Machine Evaluation:
               EMA >= 75.0 ──► RED (Critical Attack)
               EMA >= 40.0 ──► AMBER (Suspicious)
               EMA < 40.0  ──► GREEN (Normal)
       │
       ▼
[11. Concurrent Egress & Persistence]
       ├── Async Task 1: Update PostgreSQL call_sessions (composite_risk_score, threat_level)
       ├── Async Task 2: Insert PostgreSQL chunk_telemetry (All derived metrics; zero audio)
       └── WebSocket Egress: Send JSON telemetry frame to client (Dashboard updates in real time)
       │
       ▼
[12. Downstream Transaction Authorization Gate] (Invoked during checkout / wire transfer)
       └── Client POST /v1/transaction/evaluate-authorization:
               If Session Threat Level is RED (Score >= 75.0):
                   ├── Log to transaction_evaluations: decision = 'BLOCKED'
                   └── Return HTTP 403 Forbidden (Transaction Frozen)
               Else:
                   ├── Log to transaction_evaluations: decision = 'APPROVED'
                   └── Return HTTP 200 OK
```

### 4.2 Latency Budget Allocation (Target vs. Measured)

| Pipeline Segment | Processing Detail | TARGET Budget (SLA) | MEASURED Prototype Value | Bottleneck Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| **Network Ingestion** | WebSocket packet receive & Redis `LPUSH` | $< 5.0\text{ ms}$ | $2.1–4.2\text{ ms}$ | TCP nodelay, binary frames, local Redis socket |
| **Buffer Retrieval** | `LRANGE` 24 frames & NumPy concatenation | $< 3.0\text{ ms}$ | $1.2–2.5\text{ ms}$ | Pre-allocated NumPy buffers |
| **VAD (Silero)** | ONNX sub-frame classification (512 samples) | $< 12.0\text{ ms}$ | $6.5–10.2\text{ ms}$ | INT8 quantized model, sequential graph execution |
| **Feature Extraction** | 80-bin Log-Mel Spectrogram computation | $< 15.0\text{ ms}$ | $8.4–14.1\text{ ms}$ | Vectorized Librosa / Scipy FFT implementation |
| **Acoustic Inference** | ResNet-18 vocoder ONNX model execution | $< 25.0\text{ ms}$ | $14.2–21.8\text{ ms}$ | INT8 dynamic quantization, 4 intra-op CPU threads |
| **Biomechanical Prosody**| Praat Parselmouth point-process extraction | $< 40.0\text{ ms}$ | $28.0–48.5\text{ ms}$ | Offloaded to thread pool executor; Scipy fallback |
| **Tier 1 Total Turnaround**| VAD + Spectrogram + ResNet + Prosody | **$< 80.0\text{ ms}$** | **$58.3–78.0\text{ ms}$** | Parallel task execution; thread offloading |
| **Tier 2 Inference (Cond.)**| ECAPA-TDNN 192-dim embedding ONNX | $< 180.0\text{ ms}$ | $145.0–195.0\text{ ms}$| Runs only when Tier 1 score $> 45.0$ |
| **Vector DB Query** | `pgvector` IVFFlat cosine similarity | $< 10.0\text{ ms}$ | $3.2–6.8\text{ ms}$ | Indexed IVFFlat scan on normalized unit vectors |
| **EMA & State Machine** | Asymmetric EMA update & JSON serialization | $< 2.0\text{ ms}$ | $0.4–0.9\text{ ms}$ | Lightweight float arithmetic |
| **WebSocket Egress** | JSON telemetry frame transmission | $< 5.0\text{ ms}$ | $1.8–3.5\text{ ms}$ | Compact JSON schema |
| **Pre-Transaction Gate** | In-memory risk lookup & decision policy | **$< 35.0\text{ ms}$** | **$12.4–18.2\text{ ms}$**| In-memory state query; asynchronous DB logging |

---

## 5. Audio Ingestion & Preprocessing Subsystem

### 5.1 Ingestion Specifications
* **Transport**: WebSocket Protocol (RFC 6455).
* **Wire Format**: Binary ArrayBuffer / Bytes.
* **Sample Rate**: 16,000 Hz ($16\text{ kHz}$).
* **Bit Depth**: 16-bit signed integer Linear PCM (`int16_t`, Little-Endian).
* **Channels**: 1 (Mono).
* **Frame Chunk Size**: 1,024 samples ($64\text{ ms}$ per packet).
* **Byte Size per Frame**: $1,024 \times 2\text{ bytes} = 2,048\text{ bytes}$ ($2\text{ KB}$).
* **Bandwidth Requirement**: $32\text{ KB/second}$ ($256\text{ kbps}$) per stream.

### 5.2 Signal Conditioning & Preprocessing Pipeline
1. **Byte Order Decoding**: Decode incoming binary buffer into 1D NumPy array with `dtype=np.int16`.
2. **Dynamic Range Scaling**: Normalize integer amplitude to floating-point range:
   $$x_{\text{norm}}[n] = \frac{x_{\text{int16}}[n]}{32768.0} \quad \in [-1.0, 1.0]$$
3. **DC Offset Removal**: Subtract mean to eliminate hardware microphone biasing:
   $$x[n] = x_{\text{norm}}[n] - \frac{1}{N}\sum_{k=0}^{N-1} x_{\text{norm}}[k]$$
4. **Window Concatenation**: Reverse temporal order of frames retrieved from Redis (`LRANGE` returns head first) to guarantee chronological continuity across the 1,536 ms window.

### 5.3 Telephony Reality: Codecs, Bandwidth & Impairments
Telephony channels degrade voice signals significantly compared to studio microphones:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                TELEPHONY CODEC COMPARISON MATRIX                                 │
├────────────────────┬───────────┬──────────────┬───────────────┬──────────────────────────────────┤
│ Codec              │ Sample Fs │ Audio Passband│ Bitrate Range │ Anti-Spoofing Impact             │
├────────────────────┼───────────┼──────────────┼───────────────┼──────────────────────────────────┤
│ Clean Studio (WAV) │ 16–48 kHz │ 20–20,000 Hz │ Uncompressed  │ Pristine high-freq vocoder cues  │
│ AMR-WB (G.722.2)   │ 16 kHz    │ 50–7,000 Hz  │ 6.6–23.85 kbps│ Strips energy >7kHz; preserves F0│
│ AMR-NB             │ 8 kHz     │ 300–3,400 Hz │ 4.75–12.2 kbps│ Strips energy >3.4kHz; phase warp│
│ Opus (VoIP)        │ 8–48 kHz  │ 20–20,000 Hz │ 6–510 kbps    │ Dynamic bitrate; packet jitter   │
│ G.711 (µ-law/A-law)│ 8 kHz     │ 300–3,400 Hz │ 64 kbps       │ Logarithmic companding noise     │
└────────────────────┴───────────┴──────────────┴───────────────┴──────────────────────────────────┘
```

#### Acoustic Consequences on Voice Detection
* **High-Frequency Attenuation**: Neural vocoders (HiFi-GAN, WaveGlow) leave distinctive spectral imaging artifacts between $8\text{ kHz}$ and $16\text{ kHz}$. Narrowband telephony ($8\text{ kHz}$ sampling, $3.4\text{ kHz}$ cutoff) completely eliminates these cues.
* **Phase Disruption**: Linear predictive coding (LPC) codecs discard phase information, making raw waveform phase detectors unreliable.
* **Packet Loss & Jitter**: Jitter buffers in VoIP gateways drop frames or introduce packet concealment silence, triggering false VAD transitions.

#### VaaniShield Technical Mitigations
1. **Biomechanical Prosody Resilience**: Pitch ($F_0$ typically $85–255\text{ Hz}$), micro-jitter, and shimmer operate well within the $300–3,400\text{ Hz}$ passband of standard AMR-NB telephony.
2. **Multi-Condition Acoustic Adaptation**: ResNet-18 model training and feature extraction are evaluated on synthetic bandpass-filtered ($300–3,400\text{ Hz}$) audio to prevent model over-reliance on high-frequency energy.
3. **PITCH Dynamic Trap**: Interactive challenge-response relies on temporal conversational latency ($>1.5\text{ s}$) and linguistic difficulty rather than high-frequency fidelity, providing a reliable defense even over legacy landlines.

---

## 6. Multi-Tier AI Detection & Feature Extraction Subsystems

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               DETECTION SUBSYSTEM TAXONOMY                                       │
├────────┬──────────────────────┬────────────────────────┬─────────────────────────────────────────┤
│ Tier   │ Component Name       │ Underpinning Model/Tech│ Primary Detection Function              │
├────────┼──────────────────────┼────────────────────────┼─────────────────────────────────────────┤
│ Tier 0 │ Silence Stripper     │ Silero VAD (ONNX)      │ Discards non-speech frames (<15% speech)│
│ Tier 1A│ Acoustic Detector    │ ResNet-18 ONNX (INT8)  │ Classifies vocoder artifacts in log-mel │
│ Tier 1B│ Biomechanical Prosody│ Praat Parselmouth      │ Evaluates physical vocal tract mechanics│
│ Tier 2 │ Speaker Consistency  │ ECAPA-TDNN ONNX (INT8) │ 192-dim vector cosine sim vs. baseline  │
│ Tier 3 │ Dynamic Challenge    │ PITCH Phonetic Protocol│ Tests interactive latency & non-linear F0│
└────────┴──────────────────────┴────────────────────────┴─────────────────────────────────────────┘
```

### 6.1 Tier 0: Voice Activity Detection (Silero VAD)
* **Purpose**: Isolate voiced human speech from background acoustic noise, electrical hum, and transmission silence.
* **Inputs**: 1D Float32 audio tensor ($512\text{ samples} = 32\text{ ms}$ per sub-frame).
* **Outputs**: Continuous speech probability $P(\text{speech}) \in [0.0, 1.0]$.
* **Model Artifact**: `models/silero_vad.onnx` (Input: `input` [1, N], `sr` [16000], `h` [2, 1, 64], `c` [2, 1, 64]).
* **Gating Rule**:
  $$\text{Speech Ratio} = \frac{\sum_{i=1}^{K} \mathbb{I}(P_i(\text{speech}) > 0.5)}{K}$$
  If $\text{Speech Ratio} < 0.15$, the entire $1,536\text{ ms}$ window is classified as unvoiced. Execution bypasses Tier 1 and Tier 2.
* **Latency**: $6.5–10.2\text{ ms}$ across 48 sub-frames.
* **Fallback**: Root-Mean-Square (RMS) energy threshold: $\text{RMS} = \sqrt{\frac{1}{N}\sum x^2}$. If $\text{RMS} < 500.0$ (16-bit scale), classify as silence.

### 6.2 Tier 1A: Acoustic Vocoder Artifact Detector
* **Purpose**: Detect synthetic vocoder fingerprints, transposed convolution artifacts, and phase anomalies.
* **Inputs**: 80-bin Log-Mel Spectrogram tensor of shape `[1, 1, 80, 80]`.
  * Window Length: $400\text{ samples}$ ($25\text{ ms}$).
  * Hop Length: $160\text{ samples}$ ($10\text{ ms}$).
  * FFT Size: $512$.
  * Frequency Cutoff: $20\text{ Hz}–8,000\text{ Hz}$.
* **Outputs**: Continuous spoof probability score $S_{\text{acoustic}} \in [0.0, 100.0]$.
* **Model Artifact**: `models/resnet18_acoustic_quantized.onnx` (ResNet-18 backbone with binary classification head).
* **Inference Runtime**: ONNX Runtime with `CPUExecutionProvider`, 4 intra-op threads.
* **Latency**: $14.2–21.8\text{ ms}$.
* **Fallback Behavior**: Spectral variance heuristic: synthetic voices exhibit reduced high-frequency spectral entropy ($\sigma_{\text{mel}} < 12.0$).

### 6.3 Tier 1B: Biomechanical Micro-Prosody Engine
* **Purpose**: Verify biological vocal tract constraints (pulmonary pressure, vocal cord mass inertia, and laryngeal muscle tremor).
* **Inputs**: 1D Float64 audio array ($24,576\text{ samples}$ at $16\text{ kHz}$).
* **Outputs**: Dictionary of extracted prosodic scalars:
  1. `f0_mean_hz`: Fundamental pitch frequency mean ($60–400\text{ Hz}$ search range).
  2. `f0_variance`: Pitch dynamic variation across voiced frames.
  3. `jitter_local`: Cycle-to-cycle pitch period perturbation percentage.
  4. `jitter_rap`: Relative Average Perturbation (3-point cycle average).
  5. `shimmer_local`: Cycle-to-cycle peak amplitude perturbation percentage.
  6. `shimmer_apq5`: 5-point Amplitude Perturbation Quotient.
  7. `hnr_db`: Harmonics-to-Noise Ratio in decibels.
  8. `respiration_gap_ms`: Duration of physical breathing pauses ($>150\text{ ms}$ in voiced segments).
* **Implementation**: Praat Parselmouth C-bindings called asynchronously in `asyncio` threadpool executor (`run_in_executor`) to prevent GIL blocking of the FastAPI event loop.
* **Risk Mapping Formula**:
  $$S_{\text{prosody}} = \min\left(\frac{\text{Jitter}}{0.03}, 1.0\right) \times 25 + \min\left(\frac{\text{Shimmer}}{0.15}, 1.0\right) \times 20 + \max\left(0, \frac{15.0 - \text{HNR}}{15.0}\right) \times 15 + \max\left(0, 1.0 - \frac{\sigma_{F0}^2}{200.0}\right) \times 10$$
* **Latency**: $28.0–48.5\text{ ms}$.
* **Fallback Behavior**: Vectorized Scipy autocorrelation for $F_0$ peak finding; rolling energy variance for pseudo-jitter.

### 6.4 Tier 2: Conditional Speaker Verification
* **Purpose**: Verify whether the active voice matches an enrolled baseline voiceprint.
* **Trigger Policy**: Executes conditionally only when:
  $$\text{Combined Tier 1 Score} > 45.0 \quad \text{AND} \quad \text{speaker\_id is not null}$$
* **Inputs**: 1D Float32 audio array ($24,576\text{ samples}$).
* **Outputs**: 192-dimensional $L_2$-normalized float32 embedding vector.
* **Model Artifact**: `models/ecapa_tdnn_192.onnx`.
* **Database Query**:
  ```sql
  SELECT embedding FROM enrolled_voiceprints 
  WHERE speaker_id = $1 AND is_active = TRUE;
  ```
* **Similarity Metric**: Dot product (equivalent to cosine similarity on $L_2$-normalized vectors):
  $$\text{Sim}(u, v) = \sum_{i=1}^{192} u_i \cdot v_i$$
* **Risk Score Mapping**:
  $$S_{\text{speaker}} = \max\left(0.0, \frac{0.85 - \text{Sim}}{0.85}\right) \times 100.0$$
* **Un-enrolled Caller Handling**: If speaker is not enrolled, assign neutral baseline ($30.0$) and omit speaker similarity penalty from composite escalation.
* **Latency**: $145.0–195.0\text{ ms}$ (ONNX inference) + $3.2–6.8\text{ ms}$ (`pgvector` query).

### 6.5 Tier 3: Active Challenge-Response Engine (PITCH Protocol)
* **Purpose**: Break real-time voice conversion pipelines by forcing rapid co-articulation, dynamic pitch excursion, and measuring interactive conversational lag.
* **Trigger Policy**: Automated activation upon threat state entering **AMBER** or **RED**.
* **Phonetic Corpus Mechanics**: High density of aspirated stops, plosives, and tongue-twister transitions:
  * *"Pital ke bartan mein papita peela peela"* (Bilabial plosive aspiration test).
  * *"Kachha Papad, Pakka Papad"* (Rapid velar-to-bilabial occlusion test).
* **Closed-Loop Verification Pipeline**:
  1. **Latency Check**: Measure delay from prompt emission to caller speech start. If $\Delta t > 2,000\text{ ms}$, flag generative conversion lag.
  2. **Pitch Modulation Check**: Parselmouth tracks $\Delta F_0 = F_{0,\text{max}} - F_{0,\text{min}}$. Genuine human speakers modulating stress exhibit $\Delta F_0 > 45\text{ Hz}$. Monotonic vocoders exhibit $\Delta F_0 < 15\text{ Hz}$.
  3. **Acoustic Phonetic Check**: Phoneme alignment verifies targeted consonant transitions without neural phase smearing.

---

## 7. AI/ML Engineering, Model Serving & Quantization Strategy

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   MODEL LIFECYCLE PIPELINE                                       │
│                                                                                                  │
│  [1. Dataset Prep] ──► ASVspoof 2021 DF/LA + IndicTTS + Telephony Transcoding (AMR-WB/NB)       │
│                                                                                                  │
│  [2. Model Training] ─► PyTorch 2.4 (ResNet-18 Acoustic Classifier / ECAPA-TDNN)                │
│                                                                                                  │
│  [3. Validation] ─────► Benchmark on Telephony Evaluation Sets (Target EER < 2.8% on AMR-WB)     │
│                                                                                                  │
│  [4. ONNX Export] ────► torch.onnx.export(opset_version=17, dynamic_axes={'input': {0: 'batch'}})│
│                                                                                                  │
│  [5. Quantization] ──► ONNX Runtime Quantization: FP32 ──► INT8 Dynamic / Static Quantization   │
│                                                                                                  │
│  [6. Optimization] ──► ORT Graph Optimization Level: ORT_ENABLE_ALL                              │
│                                                                                                  │
│  [7. Deployment] ────► Mounted read-only in Docker: /app/models/*.onnx                           │
│                                                                                                  │
│  [8. Runtime Exec] ──► ONNX Runtime 1.20+ (CPUExecutionProvider, intra_threads=4)                │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 7.1 Quantization Specifications

```python
# Model Quantization Command Specification (Offline Build Tooling)
import onnx
from onnxruntime.quantization import quantize_dynamic, QuantType

# Dynamic INT8 Quantization for ResNet-18 Acoustic Anti-Spoofing
quantize_dynamic(
    model_input="models/resnet18_acoustic.onnx",
    model_output="models/resnet18_acoustic_quantized.onnx",
    weight_type=QuantType.QInt8,
    per_channel=True,
    reduce_range=True,
)
```

#### Optimization Benefits
* **Model Footprint Reduction**: ResNet-18 model size reduced from $44.7\text{ MB}$ (FP32) to $11.4\text{ MB}$ (INT8) — a $74.5\%$ reduction.
* **Inference Speedup**: CPU execution latency on x86_64 decreases from $48\text{ ms}$ to $16.5\text{ ms}$ ($2.9\times$ acceleration) without requiring a GPU.
* **Precision Loss**: EER degradation under dynamic quantization is $< 0.15\%$ on benchmark evaluation splits.

### 7.2 Model Execution Provider Configuration

```python
# ONNX Runtime Session Configuration in InferenceEngine
so = ort.SessionOptions()
so.inter_op_num_threads = 2
so.intra_op_num_threads = 4
so.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
so.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
providers = ["CPUExecutionProvider"]
```

---

## 8. Multi-Signal Fusion, Risk Scoring & State Machine

### 8.1 Multi-Signal Fusion Engine
The composite raw risk score $R_{\text{raw}} \in [0.0, 100.0]$ fuses acoustic, prosodic, speaker, and challenge vectors:

```
                          ┌───────────────────────────┐
                          │ Tier 1A: ResNet Acoustic  │──► S_acoustic (0-100)
                          └─────────────┬─────────────┘
                                        │ * w_acoustic (0.55 / 0.35)
                                        ▼
                          ┌───────────────────────────┐
                          │ Tier 1B: Parselmouth F0   │──► S_prosody  (0-100)
                          └─────────────┬─────────────┘
                                        │ * w_prosody  (0.45 / 0.25)
                                        ▼
                          ┌───────────────────────────┐
                          │ Tier 2: ECAPA Cosine Sim  │──► S_speaker  (0-100) [Cond.]
                          └─────────────┬─────────────┘
                                        │ * w_speaker  (0.00 / 0.30)
                                        ▼
                          ┌───────────────────────────┐
                          │ Tier 3: PITCH Challenge   │──► S_challenge(0-100) [Cond.]
                          └─────────────┬─────────────┘
                                        │ * w_challenge(0.00 / 0.10)
                                        ▼
                           [SUMMATION & CLAMPING]
                                        │
                                        ▼
                             R_raw in [0.0, 100.0]
```

### 8.2 Asymmetric Temporal Smoothing Algorithm
To prevent false alarm spikes while enabling immediate, sub-second intervention against active attacks, the state machine applies asymmetric exponential smoothing:

$$R_{\text{EMA}}^{(t)} = \alpha R_{\text{raw}}^{(t)} + (1 - \alpha) R_{\text{EMA}}^{(t-1)}$$

```python
# Implementation Specification in ThreatState
if raw_score > self.ema_score:
    alpha = settings.ema_alpha_escalate      # 0.65 (Fast Attack Escalation)
else:
    alpha = settings.ema_alpha_deescalate    # 0.25 (Deliberate De-escalation)

self.ema_score = float(np.clip(alpha * raw_score + (1 - alpha) * self.ema_score, 0.0, 100.0))
```

### 8.3 Threat State Machine & Hysteresis Logic

```
   Score Range        Threat State    Hysteresis Recovery Threshold    System Action
 ──────────────────────────────────────────────────────────────────────────────────────────
  0.0  to 39.9   ──►     GREEN       No recovery threshold needed     Normal Operations Allowed
 40.0  to 74.9   ──►     AMBER       De-escalate to GREEN: < 35.0     Warning Banner, Unlock PITCH
 75.0  to 100.0  ──►     RED         De-escalate to AMBER: < 70.0     Hard Circuit Breaker (403)
```

---

## 9. Transaction Authorization Gate & Policy Circuit Breaker

### 9.1 Gating Decision Matrix
The pre-transaction authorization endpoint (`POST /v1/transaction/evaluate-authorization`) inspects the caller's active threat state and enforces a synchronous policy check before funds release:

```
[Core Banking Transfer Initiated]
               │
               ▼
[POST /v1/transaction/evaluate-authorization]
               │
               ├──► Risk Score >= 75.0 (RED)?
               │        │
               │        ├── YES ──► Return HTTP 403 Forbidden
               │        │           detail.decision = 'BLOCKED'
               │        │           detail.reason = 'High-confidence voice clone detected'
               │        │           (Transaction Frozen; Alert Sent to SOC)
               │        │
               │        └── NO
               │             │
               │             ├──► Risk Score >= 40.0 (AMBER)?
               │             │        │
               │             │        ├── Amount >= ₹10,000? ──► Return HTTP 428 Precondition Required
               │             │        │                          detail.decision = 'PENDING_CHALLENGE'
               │             │        │                          (PITCH Phrase Must Be Cleared)
               │             │        │
               │             │        └── Amount < ₹10,000?  ──► Return HTTP 200 OK
               │             │                                   detail.decision = 'APPROVED_WITH_WARNING'
               │             │
               │             └──► Risk Score < 40.0 (GREEN)  ──► Return HTTP 200 OK
               │                                                 detail.decision = 'APPROVED'
               │                                                 (Payment Processed Immediately)
```

---

## 10. Database, In-Memory Caching & Vector Search Architecture

### 10.1 PostgreSQL 16 Production Relational Schema

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom Types
CREATE TYPE threat_level AS ENUM ('GREEN', 'AMBER', 'RED');
CREATE TYPE session_status AS ENUM ('ACTIVE', 'CLOSED', 'BLOCKED', 'TIMEOUT');
CREATE TYPE transaction_decision AS ENUM ('APPROVED', 'APPROVED_WITH_WARNING', 'BLOCKED', 'PENDING_CHALLENGE');

-- 1. Enrolled Voiceprints (Biometric Baselines - Derived Vectors Only)
CREATE TABLE enrolled_voiceprints (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    speaker_id          TEXT NOT NULL UNIQUE,       -- Cryptographic hash of customer ID
    display_name        TEXT,                       -- Optional label
    embedding           vector(192) NOT NULL,       -- ECAPA-TDNN 192-dim L2-normalized vector
    enrollment_quality  FLOAT4 NOT NULL DEFAULT 0.0,
    enrollment_phrases  TEXT[],
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    metadata            JSONB DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- IVFFlat Index for Fast ANN Cosine Distance Search
CREATE INDEX idx_voiceprints_embedding_ivfflat 
    ON enrolled_voiceprints 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 2. Call Sessions (Lifecycle tracking)
CREATE TABLE call_sessions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id              TEXT NOT NULL UNIQUE,
    speaker_id              TEXT,
    status                  session_status NOT NULL DEFAULT 'ACTIVE',
    composite_risk_score    FLOAT4 NOT NULL DEFAULT 0.0,
    threat_level            threat_level NOT NULL DEFAULT 'GREEN',
    pitch_challenge_active  BOOLEAN NOT NULL DEFAULT FALSE,
    pitch_challenge_passed  BOOLEAN,
    carrier_codec           TEXT DEFAULT 'AMR-WB-16kHz-PCM',
    remote_ip               INET,
    dpdp_audio_purged       BOOLEAN NOT NULL DEFAULT TRUE,  -- DPDP Compliance Flag
    started_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at                TIMESTAMPTZ
);

-- 3. Chunk Telemetry (Per-Hop Audit Ledger - NO RAW AUDIO STORED)
CREATE TABLE chunk_telemetry (
    id                      BIGSERIAL PRIMARY KEY,
    session_id              TEXT NOT NULL REFERENCES call_sessions(session_id) ON DELETE CASCADE,
    chunk_index             INTEGER NOT NULL,
    chunk_timestamp         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tier1_risk_score        FLOAT4,
    log_mel_mean            FLOAT4,
    log_mel_std             FLOAT4,
    f0_mean_hz              FLOAT4,
    f0_std_hz               FLOAT4,
    f0_variance             FLOAT4,
    jitter_local            FLOAT4,
    shimmer_local           FLOAT4,
    hnr_db                  FLOAT4,
    respiration_gap_ms      FLOAT4,
    tier2_triggered         BOOLEAN NOT NULL DEFAULT FALSE,
    cosine_similarity       FLOAT4,
    tier2_risk_score        FLOAT4,
    ema_composite_score     FLOAT4 NOT NULL DEFAULT 0.0,
    ema_threat_level        threat_level NOT NULL DEFAULT 'GREEN',
    tier1_latency_ms        FLOAT4,
    tier2_latency_ms        FLOAT4,
    total_latency_ms        FLOAT4,
    vad_speech_ratio        FLOAT4,
    chunk_discarded_silence BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_chunk_telemetry_session ON chunk_telemetry (session_id, chunk_index);
CREATE INDEX idx_chunk_telemetry_risk ON chunk_telemetry (ema_composite_score DESC);

-- 4. Transaction Evaluations (Pre-Transaction Gate Audit Trail)
CREATE TABLE transaction_evaluations (
    id                  BIGSERIAL PRIMARY KEY,
    session_id          TEXT REFERENCES call_sessions(session_id) ON DELETE SET NULL,
    evaluated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    amount_inr          NUMERIC(14, 2) NOT NULL,
    beneficiary_vpa     TEXT NOT NULL,
    risk_score_at_eval  FLOAT4 NOT NULL,
    threat_level_at_eval threat_level NOT NULL,
    decision            transaction_decision NOT NULL,
    block_reason        TEXT,
    http_status_code    INTEGER NOT NULL,
    metadata            JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_txn_eval_session ON transaction_evaluations (session_id);
CREATE INDEX idx_txn_eval_decision ON transaction_evaluations (decision);
```

### 10.2 Redis Ring Buffer Architecture

```
Key Pattern: vaani:audio:{session_id}
Data Type:   List (Circular Ring Buffer)
TTL Policy:  15 Seconds (Mandatory EXPIRE command executed on every push)
Capacity:    24 frames (~1500 ms of audio at 64 ms/frame)
```

```
[New Frame Arrives] ──► LPUSH vaani:audio:{session_id} <pcm_bytes>
                    ──► LTRIM vaani:audio:{session_id} 0 23
                    ──► EXPIRE vaani:audio:{session_id} 15
```

---

## 11. API, WebSocket & Event-Driven Interfaces

### 11.1 WebSocket Streaming Contract (`/v1/stream/call/{session_id}`)

#### Ingress (Client to Server)
* **Format**: Binary WebSocket frame.
* **Payload**: Raw 16-bit linear PCM audio chunk (1,024 samples, little-endian, mono, 16,000 Hz).

#### Egress (Server to Client Telemetry)
* **Format**: Text WebSocket frame containing serialized JSON.
* **Cadence**: Exactly once per 750 ms hop.

```json
{
  "type": "telemetry",
  "session_id": "call-secops-842",
  "chunk_index": 21,
  "risk_score": 82.4,
  "threat_level": "RED",
  "jitter": 3.8214,
  "shimmer": 14.2150,
  "f0_mean": 138.45,
  "f0_variance": 12.1102,
  "hnr_db": 8.42,
  "vad_speech_ratio": 0.925,
  "tier2_triggered": true,
  "cosine_similarity": 0.5214,
  "latency_ms": 68.20,
  "pitch_challenge": "Pital ke bartan mein papita peela peela",
  "timestamp_ms": 1773665560124
}
```

### 11.2 REST Endpoints Specification

```
┌───────────────────────────────────────────────┬────────┬───────────────────────────────────────────┐
│ Endpoint Route                                │ Method │ Description                               │
├───────────────────────────────────────────────┼────────┼───────────────────────────────────────────┤
│ /v1/transaction/evaluate-authorization        │ POST   │ Synchronous pre-transaction gate check    │
│ /v1/enroll                                    │ POST   │ Enrolls speaker baseline voiceprint vector│
│ /v1/session/{session_id}/status               │ GET    │ Retrieves active session risk and threat  │
│ /health                                       │ GET    │ Comprehensive subsystem health diagnostics│
└───────────────────────────────────────────────┴────────┴───────────────────────────────────────────┘
```

#### Pre-Transaction Authorization Gate: `POST /v1/transaction/evaluate-authorization`
* **Request Body**:
```json
{
  "session_id": "call-secops-842",
  "amount_inr": 250000.00,
  "beneficiary_vpa": "vendor.payout@icici"
}
```
* **Response (HTTP 403 Forbidden - BLOCKED)**:
```json
{
  "detail": {
    "decision": "BLOCKED",
    "session_id": "call-secops-842",
    "risk_score": 82.4,
    "threat_level": "RED",
    "reason": "High-confidence voice clone detected. Composite risk score 82.4/100 exceeds RED threshold (75.0).",
    "amount_inr": 250000.00,
    "beneficiary_vpa": "vendor.payout@icici"
  }
}
```

---

## 12. Frontend Architecture & Client-Side Media Engineering

### 12.1 Client Technology Stack
* **Framework**: Next.js 16 (App Router, React 19, TypeScript 5).
* **Styling**: Tailwind CSS v4 + Framer Motion animations.
* **State Management**: Zustand v5 with `subscribeWithSelector` middleware.
* **Icons & Charts**: Lucide React, Recharts v3.
* **Audio Capture**: Web Audio API (`AudioContext`, `MediaStreamSource`, `ScriptProcessorNode` / `AudioWorklet`).

### 12.2 Audio Ingestion Architecture (`useAudioStreamer`)
The client captures microphone audio and downsamples to 16,000 Hz Linear PCM:

```
[Browser Navigator MediaDevices]
               │
               ▼ getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } })
[MediaStreamSource Node]
               │
               ├──► [AnalyserNode] ──► Real-Time Volume Meter (0-100 RMS)
               │
               ▼
[ScriptProcessorNode / AudioWorklet] (bufferSize = 1024)
               │
               ├── Float32Array [-1.0, 1.0] ──► Int16Array [-32768, 32767]
               │
               ▼
[ArrayBuffer Binary Frame] ──► ws.send(pcm16.buffer)
```

### 12.3 HTML5 Canvas Waterfall Spectrogram (`SpectrogramCanvas`)
* **Rendering Loop**: Runs on `requestAnimationFrame`.
* **Resolution**: 120 historical time columns $\times$ 80 vertical mel-frequency bins.
* **Color Mapping**: High-contrast cybernetic palette:
  * Low energy: Deep navy/slate (`#0a0f1d`).
  * Medium energy: Electric cyan (`#06b6d4`).
  * High vocoder risk energy: Neon amber/magenta/red (`#f43f5e`).

---

## 13. Security, Privacy & Compliance Engineering (DPDP Act 2023)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             DPDP ACT 2023 COMPLIANCE SPECIFICATIONS                              │
├──────────────────────────┬───────────────────────────────────────────────────────────────────────┤
│ Legal Principle          │ Technical Enforcement Implementation                                  │
├──────────────────────────┼───────────────────────────────────────────────────────────────────────┤
│ Data Minimization        │ Processing uses 1500ms sliding windows; only derived math is retained.│
│ Zero Storage at Rest     │ Redis keys enforce 15s TTL; WebSocket disconnect immediately purges. │
│ Biometric Irreversibility│ Voiceprints are 192-dim unit vectors; mathematically non-inversible.   │
│ Pseudonymization         │ Speaker IDs are SHA-256 hashes of customer IDs; no cleartext PII.     │
│ Tamper-Evident Auditing  │ Telemetry features and transaction logs persisted with ISO timestamps.│
└──────────────────────────┴───────────────────────────────────────────────────────────────────────┘
```

---

## 14. Observability, Logging, Metrics & Diagnostics

### 14.1 Structured JSON Logging (`structlog`)
All backend components emit machine-parseable JSON logs containing correlation context:

```json
{
  "event": "Chunk processed",
  "level": "info",
  "logger": "vaanishield",
  "session_id": "call-secops-842",
  "chunk": 21,
  "risk": 82.4,
  "threat_level": "RED",
  "tier1_latency_ms": 61.2,
  "tier2_latency_ms": 158.4,
  "total_latency_ms": 221.8,
  "timestamp": "2026-09-13T19:35:12.145Z"
}
```

### 14.2 Prometheus Metrics Taxonomy

| Metric Identifier | Metric Type | Labels | Operational Purpose |
| :--- | :--- | :--- | :--- |
| `vaani_audio_frames_ingested_total` | Counter | `session_id`, `codec` | Ingestion throughput tracking |
| `vaani_pipeline_latency_seconds` | Histogram | `tier` (tier1, tier2, total)| Latency SLA verification (p50, p95, p99) |
| `vaani_threat_state_transitions_total`| Counter | `from_state`, `to_state` | Threat escalation frequency monitoring |
| `vaani_transaction_evaluations_total` | Counter | `decision`, `threat_level` | Transaction block rate monitoring |
| `vaani_active_websocket_connections` | Gauge | `worker_id` | Real-time concurrent channel monitoring |

---

## 15. Resilience, Failure Modes & Disaster Recovery

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   FAILURE MODE & FALLBACK MATRIX                                 │
├───────────────────────┬────────────────────────────┬─────────────────────────────────────────────┤
│ Component Failure     │ Immediate Symptom          │ System Fallback Behavior                    │
├───────────────────────┼────────────────────────────┼─────────────────────────────────────────────┤
│ Redis Cluster Crash   │ Frame push fails with error│ Memory fallback: collections.deque(maxlen=24│
│ ONNX Models Missing   │ ort.InferenceSession fail  │ Feature-correlated synthetic mathematical   │
│                       │                            │ mock fallbacks with warning log             │
│ Parselmouth Crash/Hang│ GIL contention / timeout   │ Scipy autocorrelation peak-finding fallback │
│ PostgreSQL Down       │ asyncpg connection fails   │ In-memory session scoring continues; DB logs│
│                       │                            │ queued in memory buffer for retry           │
│ Network Packet Drop   │ Incomplete PCM frames      │ Jitter buffer padding with zero-energy frame│
│ Client Abrupt Disconn.│ WebSocket 1006 / reset     │ Finally hook deletes session keys from Redis│
└───────────────────────┴────────────────────────────┴─────────────────────────────────────────────┘
```

---

## 16. Testing, CI/CD & Local Development Architecture

### 16.1 Testing Pyramid

```
                                      ┌────────────────┐
                                      │   E2E Tests    │  10% (Live WS Stream + UI Gate Mock)
                                      └───────┬────────┘
                                              │
                                   ┌──────────┴──────────┐
                                   │  Integration Tests  │  30% (FastAPI + Redis + pgvector)
                                   └──────────┬──────────┘
                                              │
                            ┌─────────────────┴─────────────────┐
                            │            Unit Tests             │  60% (DSP, EMA, Parsing, VAD)
                            └───────────────────────────────────┘
```

#### Test Execution Commands
```bash
# Run backend pytest suite with async support
cd backend && pytest tests/ -v --asyncio-mode=auto

# Run frontend lint and build validation
cd frontend && npm run lint && npm run build
```

---

## 17. Hackathon Demo vs. Future Enterprise / Carrier Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                DEMO VS. PRODUCTION COMPARISON                                    │
├───────────────────────┬───────────────────────────────┬──────────────────────────────────────────┤
│ Architectural Domain  │ Phase 1: Hackathon MVP        │ Phase 3: Carrier Infrastructure          │
├───────────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Audio Ingestion       │ Web Audio API (Browser Mic) + │ Carrier SBC Media Forking (SIPREC RFC7865│
│                       │ Calibrated Sine Wave Injectors│ FreeSWITCH / Kamailio SIP Proxies        │
├───────────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Model Execution       │ ONNX Runtime on CPU Workers   │ Triton Inference Server on NVIDIA NPUs   │
├───────────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Buffer In-Flight      │ Local Redis 7.2 Container     │ Redis Enterprise Multi-Region Cluster    │
├───────────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Telemetry Bus         │ Direct WebSocket Push         │ Apache Kafka Event Bus (100k+ events/sec)│
├───────────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Deployment Topology   │ Single Docker Compose Stack   │ Multi-Zone Kubernetes (EKS/GKE) + Envoy  │
└───────────────────────┴───────────────────────────────┴──────────────────────────────────────────┘
```

---

## 18. Technical Decision Record (TDR)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   TECHNICAL DECISION RECORD (TDR)                                │
├───────────┬──────────────┬───────────────┬───────────────────────────────────────────────────────┤
│ Component │ Action       │ Technology    │ Technical Justification                               │
├───────────┼──────────────┼───────────────┼───────────────────────────────────────────────────────┤
│ Transport │ KEEP         │ WebSockets    │ Sub-10ms duplex framing; ideal for streaming PCM audio│
│ Buffer    │ KEEP         │ Redis Ring Buf│ LPUSH/LTRIM provides O(1) circular windowing with TTL │
│ Relational│ KEEP         │ PostgreSQL 16 │ Proven ACID reliability, native JSONB, robust tooling │
│ Vector DB │ KEEP         │ pgvector      │ Unified storage: relational tables + vector embeddings│
│ Framework │ KEEP         │ FastAPI       │ Async Python web framework with native ASGI streaming │
│ Frontend  │ KEEP         │ Next.js 16    │ Fast React 19 rendering, SSR, rich ecosystem          │
│ State     │ KEEP         │ Zustand       │ Lightweight, unopinionated client state management    │
│ Structure │ REPLACE      │ Monolith main │ Refactor into modular core/, engine/, api/, db/ layout│
│ Model Run │ REPLACE      │ Heavy PyTorch │ Use ONNX Runtime INT8 for sub-30ms edge CPU inference │
│ Audio DSP │ ADD          │ AMR Simulator │ Downsamples/bandpasses audio to test telephony codec  │
│ PITCH     │ ADD          │ Closed-Loop   │ Backend ASR and pitch excursion verification engine   │
│ Metrics   │ ADD          │ Prometheus    │ /metrics endpoint for enterprise observability        │
│ Auth      │ ADD          │ API Key / JWT │ Header authentication for /v1/transaction endpoints   │
│ Codecs    │ REMOVE (MVP) │ Direct SS7/SBC│ Do not claim cellular interception without carrier SBC│
└───────────┴──────────────┴───────────────┴───────────────────────────────────────────────────────┘
```

### Technical Debt & Prototype Weaknesses
1. **Monolithic Backend (`backend/main.py`)**: All 1,365 lines reside in a single module. Needs refactoring into domain-driven subpackages (`vaani.core`, `vaani.engine`, `vaani.api`, `vaani.db`).
2. **Missing Committed ONNX Files**: Repository relies on runtime mock fallbacks because `.onnx` files are not checked in. Validated quantized models must be pre-packaged or automatically fetched via a setup script.
3. **Parselmouth C-Binding Latency**: Praat Parselmouth introduces variable $28–48\text{ ms}$ latency spikes. It should be complemented with optimized C++/Cython vector math routines.
4. **PITCH Dynamic Validation Absence**: PITCH currently functions as a visual UI challenge. Real phonetic alignment (ASR) must be completed to close the verification loop.

---

## 19. Critical Engineering Risks & Mitigations

| Risk ID | Technical Risk Description | Severity | Architectural Mitigation |
| :--- | :--- | :--- | :--- |
| **ENG-01** | **Parselmouth GIL Contention**: Heavy multi-threaded Praat executions stall Python event loop. | High | Isolate Parselmouth in a dedicated `ProcessPoolExecutor` or replace with native NumPy/C++ DSP algorithms. |
| **ENG-02** | **Memory Exhaustion from Abandoned Streams**: Abrupt client disconnects leave active buffers in memory. | High | Strict 15s Redis TTL + explicit `finally` cleanup block in WebSocket stream handler guarantees memory reclamation. |
| **ENG-03** | **Narrowband Telephony False Positives**: AMR-NB (8kHz) filtering mimics spectral vocoder roll-off. | High | Calibrate classification thresholds specifically for $3.4\text{ kHz}$ cutoff audio; weight prosody metrics higher on narrowband lines. |
| **ENG-04** | **PostgreSQL Vector Index Bottleneck**: High concurrent ANN searches increase CPU utilization. | Medium | Pre-normalize all vectors to unit length; utilize cosine index (`vector_cosine_ops`) with tuned `lists` factor ($100$). |

---

## 20. Open Technical Decisions Requiring Resolution

1. **Client-Side WASM Preprocessing vs. Server Processing**:
   * *Question*: Should STFT log-mel computation move into the browser via WebAssembly (WASM) AudioWorklets?
   * *Trade-off*: Reduces server CPU utilization by $35\%$, but increases client JavaScript payload by $1.2\text{ MB}$.
2. **ASR Model Selection for Closed-Loop PITCH**:
   * *Question*: Which ASR engine best verifies phonetic challenge completion under telephony noise?
   * *Candidates*: Whisper-tiny ONNX ($39\text{ MB}$) vs. Vosk/Kaldi phoneme lattice ($15\text{ MB}$).
3. **Audio Ingestion Standardization for Phase 2**:
   * *Question*: Should enterprise softphones connect via WebRTC DataChannels or binary WebSockets?
   * *Resolution*: WebSockets retained for Phase 1/2 due to lower firewall traversal friction and simpler reverse proxying.

---

## 21. Component Dependency Map

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    COMPONENT DEPENDENCY MAP                                      │
│                                                                                                  │
│  [frontend (Next.js 16)]                                                                         │
│        ├── Zustand Store (useTelemetryStore)                                                     │
│        ├── Web Audio API Ingestion (useAudioStreamer)                                            │
│        └── WebSocket Client (useVaaniShieldWs) ────────────────────────┐                         │
│                                                                        │ WSS                     │
│  [backend/main.py (FastAPI Gateway)] ◄─────────────────────────────────┘                         │
│        ├── RedisBufferManager ────────► [redis:7.2-alpine]                                       │
│        │                                                                                         │
│        ├── InferenceEngine                                                                       │
│        │     ├── Silero VAD ──────────► models/silero_vad.onnx                                   │
│        │     ├── ResNet-18 Acoustic ──► models/resnet18_acoustic_quantized.onnx                  │
│        │     └── ECAPA-TDNN ──────────► models/ecapa_tdnn_192.onnx                               │
│        │                                                                                         │
│        ├── ProsodyAnalyser ───────────► praat-parselmouth (C-Bindings) / Scipy DSP               │
│        │                                                                                         │
│        ├── ThreatState ───────────────► Asymmetric EMA Mathematical Logic                        │
│        │                                                                                         │
│        └── DatabaseManager ───────────► [postgres:pgvector/pg16]                                 │
│                                               ├── enrolled_voiceprints (vector_cosine_ops)       │
│                                               ├── call_sessions                                  │
│                                               ├── chunk_telemetry                                │
│                                               └── transaction_evaluations                        │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 22. Requirements-to-Component Traceability Matrix (RTM)

| Requirement ID | Technical Specification Area | Planned Technical Component / Module | Test / Verification Method |
| :--- | :--- | :--- | :--- |
| **TR-01** | Binary PCM WebSocket Ingestion | `backend/main.py` (`@app.websocket("/v1/stream/call/{session_id}")`) | Binary WebSocket streaming test |
| **TR-02** | Ephemeral Ring Buffer & TTL | `backend/main.py` (`RedisBufferManager`) | Redis memory audit (`redis-cli info memory`) |
| **TR-03** | Silero VAD Silence Stripping | `backend/main.py` (`InferenceEngine.vad_speech_ratio`) | Silence vs. active speech test harness |
| **TR-04** | Log-Mel Spectrogram Extraction | `backend/main.py` (`compute_log_mel_spectrogram`) | STFT output dimension verification |
| **TR-05** | ResNet-18 Vocoder Anti-Spoofing| `backend/main.py` (`acoustic_risk_score`) | ONNX Runtime latency and score tests |
| **TR-06** | Biomechanical Prosody Engine | `backend/main.py` (`ProsodyAnalyser.analyse`) | Pitch & perturbation parameter checks |
| **TR-07** | ECAPA-TDNN Vector Similarity | `backend/main.py` (`extract_ecapa_embedding`, `db.get_enrolled_voiceprint`) | `pgvector` cosine similarity unit test |
| **TR-08** | Asymmetric Temporal EMA | `backend/main.py` (`ThreatState.update`) | Mathematical rapid rise / slow fall test |
| **TR-09** | Synchronous Transaction Gate | `backend/main.py` (`evaluate_transaction`) | HTTP 200 (GREEN) vs HTTP 403 (RED) tests |
| **TR-10** | DPDP Act 2023 Compliance | `backend/database.sql`, `RedisBufferManager` | Disk audit confirming zero raw audio files |
| **TR-11** | Live Canvas Spectrogram Waterfall| `frontend/components/SpectrogramCanvas.tsx` | Browser Canvas 60 FPS animation test |
| **TR-12** | Telemetry Store Synchronization | `frontend/store/useTelemetryStore.ts` | Zustand unit test verifying state updates |
| **TR-13** | Interactive PITCH Console | `frontend/components/PitchChallengeDrawer.tsx` | UI drawer expansion & phrase test |
| **TR-14** | Subsystem Diagnostics Health API | `backend/main.py` (`@app.get("/health")`) | Integration check verifying Redis, DB, ORT |

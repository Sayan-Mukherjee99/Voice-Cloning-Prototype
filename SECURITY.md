# VaaniShield: Comprehensive Security Architecture & Threat Model

| Document Attribute | Specification Detail |
| :--- | :--- |
| **Document Version** | 1.0.0-SEC-SPEC |
| **Status** | Security Architecture Baseline |
| **Security Classification** | Enterprise Confidential / Security Architecture Specification |
| **Associated Documents** | `PRD.md` (Product Requirements), `TRD.md` (Technical Requirements) |
| **Reference Repository** | `Sayan-Mukherjee99/Voice-Cloning-Prototype` |
| **Author** | Senior Security Architect |

---

## 1. Executive Summary & Security Charter

### 1.1 Core Security Objective
**VaaniShield** is designed to inspect real-time audio streams, detect synthetic, neural, and voice-cloned impersonation attacks, and deterministically protect sensitive transactions. 

The primary security mandate is: **The defense platform itself must not introduce a new attack surface or become an attack vector against the enterprise.**

A vulnerability in VaaniShield could allow an adversary to:
1. Blind the fraud detection engine to execute multi-crore unauthorized wire transfers.
2. Poison speaker enrollment databases to establish persistent biometric persistence.
3. Exfiltrate proprietary voice biometric embeddings or sensitive call metadata.
4. Exploit audio processing memory buffers to achieve Remote Code Execution (RCE) inside the enterprise security perimeter.
5. Manipulate risk thresholds to induce widespread denial of service (False Alarm Flooding) on legitimate customer operations.

### 1.2 Probabilistic Risk vs. Absolute Identity
To avoid dangerous security assumptions, the system explicitly enforces this foundational principle:
> **"Voice verified" never implies a person is definitely authentic.**

Voice integrity detection is probabilistic and signals acoustic authenticity, not human authorization. A low voice integrity risk score indicates the audio is consistent with organic biological speech and an enrolled baseline, but cannot verify if the caller is speaking under physical duress, social engineering coercion, or in collusion with fraudsters. The system outputs a **probabilistic threat score ($0.0–100.0$)**, which must be coupled with contextual transaction limits, out-of-band approvals, and multi-factor gates.

### 1.3 Regulatory & Privacy Positioning
VaaniShield is **architected to support compliance** with privacy frameworks, including India's **Digital Personal Data Protection (DPDP) Act 2023** and global data privacy standards (e.g., GDPR Article 9 regarding biometric data processing). 
* The system enforces **zero raw audio retention at rest**.
* It operates strictly on **ephemeral in-memory circular buffers** (bounded by a $15$-second TTL).
* It stores only derived, mathematically non-invertible feature vectors.
* *Note: Formal legal compliance is an organizational and operational achievement verified by audit, not an automatic guarantee conferred solely by software installation.*

---

## 2. Threat Landscape & Threat Actor Taxonomy

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   THREAT ACTOR TAXONOMY                                          │
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
│ Malicious Insiders &  │ Financial fraud, credential   │ Enrollment baseline poisoning, manual    │
│ Rogue Operators       │ theft, or operational sabotage│ override abuse, unauthorized export of   │
│                       │ with authenticated access.    │ vector embeddings or call metadata.      │
├───────────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Adversarial ML        │ Academic/syndicate research;  │ Adversarial acoustic perturbation, model │
│ Attackers             │ algorithm evasion; model theft│ inversion, transferability attacks,      │
│                       │ and decision boundary mapping.│ black-box boundary probing.              │
├───────────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Telephony/Network MitM│ Traffic interception; packet  │ RTP media-injection, replay of genuine   │
│ (Compromised Gateway) │ manipulation; eavesdropping.  │ audio clips, session ID hijacking.       │
└───────────────────────┴───────────────────────────────┴──────────────────────────────────────────┘
```

---

## 3. System Assets & Trust Boundaries

### 3.1 Asset Classification

| Asset ID | Asset Description | Sensitivity Level | Impact of Compromise | Storage & Protection Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **AST-01** | **In-Flight Raw Audio** | Extremely High (Biometric/PII) | Severe privacy violation, voice theft | Volatile RAM only; Redis ring buffer (15s TTL). **Never written to disk.** |
| **AST-02** | **Enrolled Voiceprints** | High (Pseudonymized Biometric)| Identity impersonation, enrollment spoofing| PostgreSQL `vector(192)`, salted and encrypted with AES-256-GCM via KMS. |
| **AST-03** | **Transaction Decision Gate**| Critical (Financial Authority)| Direct financial loss via fraudulent release| In-memory state machine; cryptographically signed HMAC authorization tokens. |
| **AST-04** | **Detection ONNX Models** | High (Intellectual Property) | Evasion model creation, backdooring | Read-only volume mount (`:ro`), SHA-256 checksum pinning, secure enclave loading. |
| **AST-05** | **Session Telemetry Logs** | Medium (Operational Metadata)| Operational profiling, user activity leak| PostgreSQL `chunk_telemetry`; strict Row-Level Security (RLS) and 90-day retention. |
| **AST-06** | **Database & Redis Secrets** | Critical (Infrastructure Access)| Total system compromise | External secret managers (HashiCorp Vault / AWS Secrets Manager); no plaintext envs. |

### 3.2 Trust Boundaries Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [UNTRUSTED ZONE]                                                                                │
│ External Telephony Networks • Public Internet • Caller Audio Streams • Browser Microphones       │
└─────────────────────────────────┬───────────────────────────────────────────────────────────────┘
                                  │ TLS 1.3 / WSS (Port 443)
                      [TRUST BOUNDARY 1: PERIMETER INGRESS]
                                  │ Reverse Proxy / Envoy / Cloudflare WAF / API Gateway
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [DEMILITARIZED ZONE (DMZ) - INGESTION & TRANSPORT]                                              │
│ FastAPI Ingestion Gateway • WebSocket Stream Handlers                                           │
│ • Binary Frame Validation (int16 mono 16kHz) • mTLS / Session Token Authentication              │
│ • Frame Rate Limiting (Token Bucket: Max 20 frames/sec)                                         │
└─────────────────┬───────────────────────────────────────────────┬───────────────────────────────┘
                  │ Internal Network / Socket                     │ Internal TCP 6379 (mTLS)
      [TRUST BOUNDARY 2: BUFFERING]                 [TRUST BOUNDARY 3: EPHEMERAL STORAGE]
                  ▼                                               ▼
┌──────────────────────────────────┐            ┌─────────────────────────────────────────────────┐
│ [INTERNAL COMPUTATION ZONE]      │            │ [EPHEMERAL CACHE ZONE]                          │
│ Worker Pods / Inference Engine   │◄──────────►│ Redis 7.2 Container                             │
│ • Silero VAD (ONNX)              │            │ • Redis ACL: Limited to LPUSH, LTRIM, EXPIRE,   │
│ • ResNet-18 Vocoder (ONNX)       │            │   LRANGE, DEL on vaani:audio:* keys             │
│ • Parselmouth Prosody Sandbox    │            │ • Max Memory: 512MB (allkeys-lru eviction)      │
│ • ECAPA-TDNN Embedding (ONNX)    │            │ • Zero persistence (appendonly no, save "")     │
└─────────────────┬────────────────┘            └─────────────────────────────────────────────────┘
                  │ TCP 5432 (mTLS + Scram-SHA-256)
      [TRUST BOUNDARY 4: PERSISTENCE & POLICY]
                  ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [SECURE PERSISTENCE ZONE]                                                                       │
│ PostgreSQL 16 + pgvector Cluster                                                                │
│ • Least-Privilege App Role (vaanishield_app: SELECT, INSERT, UPDATE only)                       │
│ • Row-Level Security (RLS) Enforced on all tables                                               │
│ • Column Encryption on sensitive metadata                                                       │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Attack Surfaces & Abuse Cases

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   ATTACK SURFACE AUDIT                                           │
├─────────────────────┬───────────────────────────┬────────────────────────────────────────────────┤
│ Attack Surface      │ Vulnerability Vector      │ Threat Consequence & Abuse Case                │
├─────────────────────┼───────────────────────────┼────────────────────────────────────────────────┤
│ WebSocket Ingress   │ Missing authentication /  │ Adversary connects to arbitrary session_id,    │
│ (/v1/stream/call)   │ unbounded binary payload  │ injects synthetic audio to trigger RED state   │
│                     │                           │ (Denial of Service) or injects white noise.    │
├─────────────────────┼───────────────────────────┼────────────────────────────────────────────────┤
│ Pre-Transaction API │ Unauthenticated HTTP POST │ Attacker directly queries or mimics gate       │
│ (/v1/transaction)   │ without request signature │ requests, brute-forcing approvals or bypassing │
│                     │ or anti-replay nonce      │ voice verification entirely.                   │
├─────────────────────┼───────────────────────────┼────────────────────────────────────────────────┤
│ Enrollment Endpoint │ Publicly exposed voice    │ Fraudster registers attacker's voiceprint as   │
│ (/v1/enroll)        │ enrollment without admin  │ the authorized customer (Identity Takeover),   │
│                     │ authentication or proof   │ locking legitimate customer out permanently.   │
├─────────────────────┼───────────────────────────┼────────────────────────────────────────────────┤
│ Native C-Bindings   │ Praat Parselmouth C++     │ Malformed PCM audio crafted with specific      │
│ (Audio DSP)         │ buffer overflow / memory  │ NaN/Inf floats triggers segfault or memory     │
│                     │ corruption vulnerabilities│ corruption in the underlying Praat engine.     │
├─────────────────────┼───────────────────────────┼────────────────────────────────────────────────┤
│ Ephemeral Redis     │ Unauthenticated Redis     │ Adversary accesses Redis, eavesdrops on active │
│ Ring Buffer         │ socket or weak network    │ audio frames, or modifies audio buffers in     │
│                     │ segmentation              │ flight to bypass anti-spoofing detectors.      │
├─────────────────────┼───────────────────────────┼────────────────────────────────────────────────┤
│ Database pgvector   │ SQL Injection / Over-     │ Attacker executes vector similarity inversion  │
│ Store               │ privileged DB connections │ or alters enrolled vector baselines.           │
└─────────────────────┴───────────────────────────┴────────────────────────────────────────────────┘
```

---

## 5. Comprehensive Threat Model & Attack Trees

### Attack Tree A: Real-Time Voice Cloning Impersonation
* **Attacker Profile**: Organized financial syndicate or advanced social engineering actor.
* **Prerequisites**: Harvested 5–30 seconds of target executive/customer voice from WhatsApp, social media, or past IVR calls; access to low-latency neural voice conversion (RVC) or zero-shot TTS model.
* **Attack Path**:
  ```
  [Harvest Reference Audio] ──► [Train/Finetune Voice Clone] ──► [Initiate Target Call via SIP Trunk]
                                                                               │
                                                                               ▼
  [Stream Cloned Audio into Channel] ◄─────────────────────────────────────────┘
         │
         ├── Evasion Attempt 1: Add low background noise to mask vocoder spectral cues
         └── Evasion Attempt 2: Manipulate pitch to mimic human inflection
  ```
* **Detection Opportunities**:
  1. Tier 1A Log-mel spectral analysis flags vocoder upsampling artifacts and phase discontinuities.
  2. Tier 1B Prosodic analysis detects abnormal jitter ($>3.0\%$), high shimmer ($>12\%$), and absence of natural respiration pauses ($<150\text{ ms}$).
  3. Tier 2 ECAPA-TDNN embedding diverges from enrolled voiceprint baseline ($\text{Cosine Sim} < 0.65$).
* **Prevention & Mitigation**: Multi-modal fusion prevents evasion of a single signal; asymmetric EMA triggers immediate escalation to **RED** ($R_{\text{EMA}} \ge 75.0$).
* **Residual Risk**: Zero-day diffusion vocoders with ultra-realistic phase modeling operating over high-fidelity channels. Mitigated by Tier 3 active challenge-response (**PITCH**).
* **Monitoring Signal**: Alert metric `vaani_synthetic_vocoder_detected_total` spiking; rapid transition to RED.

---

### Attack Tree B: Replay & Pre-Recorded Audio Injection
* **Attacker Profile**: Low-to-medium skill scammer or rogue insider with access to recorded call audio.
* **Prerequisites**: High-quality recording of a legitimate customer stating affirmative phrases (e.g., *"Yes, I approve the transfer of funds"*).
* **Attack Path**:
  ```
  [Acquire Legitimate Recording] ──► [Establish Active Call Session]
                                                 │
                                                 ▼
  [Play Pre-Recorded Audio Clip via Virtual Audio Cable / Soundboard]
         │
         ├── Acoustic Characteristic: Genuine biological human speech (passes Tier 1)
         └── Speaker Characteristic: Matches enrolled baseline (passes Tier 2)
  ```
* **Detection Opportunities**:
  1. Acoustic background continuity analysis detects sudden room-impulse response (RIR) shift and background noise floor steps.
  2. Static repetition: Repeated identical pitch trajectories across multiple session turns ($F_0$ correlation $>0.99$).
  3. Interactive failure: Attacker cannot dynamically answer unexpected conversational questions without audio cut-off.
* **Prevention & Mitigation**:
  1. **Acoustic Background Consistency Check**: Track ambient noise entropy across speaker transitions.
  2. **Active PITCH Challenge**: Force caller to utter an unpredictable, dynamically generated phonetic tongue-twister. Pre-recorded soundboards cannot respond.
* **Residual Risk**: Multi-clip concatenated soundboard matching expected dialogue flow. Mitigated by strict PITCH challenge time windows ($<2.0\text{ s}$).
* **Monitoring Signal**: Metric `vaani_replay_duplicate_f0_contour_total` incrementing.

---

### Attack Tree C: Audio Injection & Telephony Man-in-the-Middle (MitM)
* **Attacker Profile**: Telephony infrastructure intruder, rogue SIP trunk provider, or compromised PBX operator.
* **Prerequisites**: Position on the network path between caller and enterprise gateway; capability to modify RTP packets in transit.
* **Attack Path**:
  ```
  [Intercept Legit Call Stream] ──► [Strip Genuine Audio Packets] ──► [Inject Cloned Audio Packets]
                                                                               │
                                                                               ▼
  [VaaniShield Ingests Injected Audio as Genuine Stream] ◄─────────────────────┘
  ```
* **Detection Opportunities**:
  1. Sudden shift in codec metadata, packet arrival jitter, or RTP sequence anomalies.
  2. Abrupt discontinuity in speaker embedding trajectory mid-session ($\Delta \text{Sim} > 0.40$ between consecutive chunks).
* **Prevention & Mitigation**:
  1. Enforce SRTP (Secure Real-time Transport Protocol) with AES-128/256-GCM encryption on telephony ingress.
  2. Enforce mutual TLS (mTLS) on all WebSocket streaming connections between PBX gateways and VaaniShield.
  3. Continuous speaker embedding tracking: any sudden mid-call speaker distance jump triggers an automatic **AMBER** lock.
* **Residual Risk**: Compromise of the PBX media-forking daemon itself.
* **Monitoring Signal**: `vaani_speaker_embedding_drift_anomaly_total`.

---

### Attack Tree D: Enrollment Baseline Compromise & Identity Hijacking
* **Attacker Profile**: Corrupt bank insider, compromised registration operator, or external attacker exploiting an unsecured enrollment API.
* **Prerequisites**: Access to the `/v1/enroll` endpoint; target customer's identifier (`speaker_id`).
* **Attack Path**:
  ```
  [Target Executive/VIP Customer] ──► [Generate or Provide Attacker Voice Sample]
                                                    │
                                                    ▼
  [Submit POST /v1/enroll with Attacker Audio and Target Customer speaker_id]
         │
         ├── System Overwrites Existing Baseline Vector in enrolled_voiceprints
         └── Result: Attacker Voice is now the Legitimate Baseline!
  ```
* **Detection Opportunities**:
  1. Audit logging flags voiceprint replacement without secondary supervisor sign-off.
  2. Abrupt shift in vector embedding distance between old baseline and new baseline ($\text{Cosine Sim} < 0.70$).
* **Prevention & Mitigation**:
  1. **Multi-Party Authorization (Maker-Checker)**: Voiceprint enrollment and updates require dual-custody cryptographic approval.
  2. **Anti-Spoofing Gate on Enrollment Audio**: The `/v1/enroll` pipeline must run Tier 1 vocoder detection; synthetic audio submitted for enrollment is rejected with HTTP 422.
  3. **Immutable History**: Previous voiceprint versions are archived in `voiceprint_audit_log`; active voiceprints cannot be overwritten in place without administrative verification.
* **Residual Risk**: Coercion of both Maker and Checker administrators.
* **Monitoring Signal**: `vaani_voiceprint_updated_total` accompanied by high cosine displacement.

---

### Attack Tree E: Transaction Authorization Gate Bypass
* **Attacker Profile**: Adversary attempting to force authorization of a high-value fraudulent transaction despite active voice clone detection.
* **Prerequisites**: Capability to invoke banking core API or intercept communications between banking application and VaaniShield.
* **Attack Path**:
  ```
  [High-Risk Call Flags RED (Risk: 85/100)] ──► [Transaction Authorization Attempted]
                                                            │
                                                            ▼
  [Attempt Bypass Pathway]
         ├── Pathway 1: Query API with forged, non-existent session_id
         ├── Pathway 2: Race condition: Execute transaction before first 750ms chunk processes
         └── Pathway 3: Exploitation of Fail-Open error handling when VaaniShield returns 500
  ```
* **Detection Opportunities**:
  1. Gate queries referencing session IDs with no active audio frames or $<1.5\text{ s}$ history.
  2. High-value transaction authorization requested while session status is `CONNECTING` or unverified.
* **Prevention & Mitigation**:
  1. **Strict Fail-Secure / Fail-Closed Policy**: A non-existent session ID, unverified session, or system error defaults to `BLOCKED` (HTTP 403) or `PENDING_CHALLENGE` for amounts $>\text{₹}0$.
  2. **Mandatory Minimum Analysis Duration**: Gate rejects evaluations with HTTP 428 until at least 3 valid speech chunks ($>2.25\text{ s}$) have been processed.
  3. **Cryptographically Signed Verification Tokens**: The gate returns a signed JWT containing session hash, risk score, and timestamp, verifiable by core banking systems.
* **Residual Risk**: Compromise of core banking API keys that authorize payments out-of-band without invoking VaaniShield.
* **Monitoring Signal**: `vaani_transaction_gate_bypass_attempt_total`.

---

### Attack Tree F: Model Evasion, Extraction & Adversarial Perturbation
* **Attacker Profile**: Advanced persistent ML adversary targeting the ResNet-18 anti-spoofing neural network.
* **Prerequisites**: Black-box API query access; ability to measure fine-grained risk score variations.
* **Attack Path**:
  ```
  [Attacker Streams Probe Audio with Controlled Noise] ──► [Reads Returned Risk Scores via WebSocket]
                                                                       │
                                                                       ▼
  [Iterative Gradient Approximation / Boundary Search]
         │
         ├── Add imperceptible adversarial perturbation (FGSM / PGD in frequency domain)
         └── Objective: Craft synthetic voice that ResNet-18 classifies as organic human (<40.0)
  ```
* **Detection Opportunities**:
  1. Repeated calls exhibiting mathematically continuous acoustic drift or unnatural high-frequency micro-patterns.
  2. Discrepancy between neural score (low) and physical prosody (abnormal jitter/shimmer/HNR).
* **Prevention & Mitigation**:
  1. **Score Quantization & Noise Masking**: Public/client telemetry receives smoothed scores; raw unquantized model logits are never exposed.
  2. **Multi-Model Orthogonality**: ResNet-18 operates in the frequency domain; Parselmouth operates in the physical time-domain pitch period domain. An adversarial perturbation optimized against CNN spectrogram kernels fails against biomechanical point-process perturbation metrics.
  3. **Aggressive Rate Limiting**: Limit continuous evaluation sessions per IP and tenant.
* **Residual Risk**: Transferable universal adversarial perturbations trained on open-source ASVspoof models.
* **Monitoring Signal**: Anomaly alerts when acoustic and prosodic scores diverge by $>50$ points.

---

### Attack Tree G: Biometric Data Exfiltration & Privacy Leakage
* **Attacker Profile**: Untrusted insider, malicious tenant, or external hacker targeting stored biometric vectors.
* **Prerequisites**: Database read access or SQL injection vulnerability.
* **Attack Path**:
  ```
  [Gain Read Access to PostgreSQL] ──► [Dump enrolled_voiceprints Table]
                                                   │
                                                   ▼
  [Attempt to Reconstruct Human Speech from 192-dim Vector Embeddings]
  ```
* **Detection Opportunities**:
  1. Database connection anomalies; bulk table scan queries on `enrolled_voiceprints`.
  2. Exfiltration volume threshold exceeded on database egress.
* **Prevention & Mitigation**:
  1. **Mathematical Irreversibility**: ECAPA-TDNN embeddings are lossy mathematical projections representing vocal tract resonances. It is computationally impossible to invert a 192-dim normalized vector back into intelligible conversational speech or reconstruct spoken words.
  2. **Application-Layer Vector Salting**: Before inserting embeddings into `pgvector`, vectors are transformed via an enterprise-specific projection key held in external KMS. A stolen vector database is useless without the proprietary transformation key.
  3. **Zero Audio Persistence**: Confirmed by continuous automated disk audits.
* **Residual Risk**: Stolen salted vectors used for cross-session replay if the enterprise KMS key is compromised.
* **Monitoring Signal**: SIEM alert on bulk export queries on `enrolled_voiceprints`.

---

### Attack Tree H: Availability & Resource Denial of Service (DoS)
* **Attacker Profile**: Cybercriminals attempting to disable anti-fraud defenses during a coordinated attack wave.
* **Prerequisites**: Network access to public WebSocket and REST endpoints.
* **Attack Path**:
  ```
  [Open 10,000 Concurrent WebSocket Connections] ──► [Flood with Binary Garbage / Malformed PCM]
                                                                │
                                                                ▼
  [Exhaust Server Threadpool, Memory Buffers, and Redis Storage]
         │
         └── Consequence: Server Crashes ──► Fraudulent Wire Transfers Released Unchecked!
  ```
* **Detection Opportunities**:
  1. Rapid surge in active connection gauge `vaani_active_websocket_connections`.
  2. High rate of malformed frames discarded by VAD.
* **Prevention & Mitigation**:
  1. **Strict Connection & Frame Rate Limiting**: Per-IP connection limits enforced at ingress proxy (Envoy / WAF); per-session frame cap enforced in FastAPI ($20\text{ frames/sec}$).
  2. **Redis Memory Ceiling**: Hard cap at $512\text{ MB}$ with `allkeys-lru` eviction policy. Redis will drop old keys rather than crashing the operating system.
  3. **Fail-Secure Circuit Breaker**: If VaaniShield is unavailable, banking systems default to **HOLD / MANUAL ESCALATION** for high-value transactions, frustrating the attacker's objective.
* **Residual Risk**: Massive distributed volumetric DDoS saturating internet uplink bandwidth.
* **Monitoring Signal**: `vaani_active_websocket_connections` exceeding $80\%$ of configured maximum capacity.

---

## 6. Data-Flow Security & Voice Data Lifecycle

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             VOICE DATA CLASSIFICATION & LIFECYCLE                                │
├───────────────────┬──────────────┬───────────────┬─────────────────┬─────────────────────────────┤
│ Data Category     │ Lifespan     │ Storage Media │ Encryption      │ Disposal & Sanitization     │
├───────────────────┼──────────────┼───────────────┼─────────────────┼─────────────────────────────┤
│ In-Flight PCM     │ < 15 seconds │ Volatile RAM  │ TLS 1.3 in-     │ Automatically purged via    │
│ Audio Frames      │              │ (Redis Ring)  │ transit; none   │ Redis TTL (15s) and session │
│                   │              │               │ at rest (no disk│ disconnect hook.            │
├───────────────────┼──────────────┼───────────────┼─────────────────┼─────────────────────────────┤
│ Feature Tensors   │ < 100 ms     │ CPU Registers │ Ephemeral       │ Overwritten on next hop     │
│ (Mel Spectrogram) │              │ & Process RAM │ Process Memory  │ iteration; never persisted. │
├───────────────────┼──────────────┼───────────────┼─────────────────┼─────────────────────────────┤
│ Voiceprint Vector │ Indefinite   │ PostgreSQL 16 │ AES-256-GCM at  │ Hard delete on customer     │
│ (192-dim Float32) │ (until purge)│ (pgvector)    │ rest; salted via│ consent revocation via      │
│                   │              │               │ Enterprise KMS  │ DELETE /v1/voiceprint.      │
├───────────────────┼──────────────┼───────────────┼─────────────────┼─────────────────────────────┤
│ Chunk Telemetry   │ 90 Days      │ PostgreSQL 16 │ Column-level DB │ Automated partitioning with │
│ (F0, Jitter, Risk)│ (Rolling)    │ (chunk_table) │ encryption for  │ 90-day pg_partman drop.     │
│                   │              │               │ session ID link │ Zero raw audio contained.   │
├───────────────────┼──────────────┼───────────────┼─────────────────┼─────────────────────────────┤
│ Transaction Audit │ 7 Years      │ PostgreSQL 16 │ Immutable WORM  │ Retained for regulatory     │
│ Records           │ (Compliance) │ (eval_table)  │ storage (audit) │ banking audit compliance.   │
└───────────────────┴──────────────┴───────────────┴─────────────────┴─────────────────────────────┘
```

---

## 7. Network & Transport Security Controls

### 7.1 Transport Layer Security (TLS)
* **Protocol Enforcement**: TLS 1.3 strictly mandatory for all external connections; TLS 1.2 permitted only with secure cipher suites:
  * `TLS_AES_256_GCM_SHA384`
  * `TLS_CHACHA20_POLY1305_SHA256`
* **Plaintext Prohibition**: Unencrypted HTTP (`http://`) and unencrypted WebSockets (`ws://`) are strictly blocked in production. All HTTP requests automatically redirect with HTTP 301 to HTTPS with HSTS (`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`).

### 7.2 WebSocket Protocol Hardening
* **Origin Header Validation**: Incoming WebSocket handshakes must validate the `Origin` header against an explicit tenant whitelist. Wildcard CORS origins (`*`) are prohibited.
* **Maximum Message Size**: Maximum allowable WebSocket message size is capped at $4,096\text{ bytes}$ ($4\text{ KB}$), sufficient for $2,048$-byte audio frames while instantly dropping oversized malicious payloads.
* **Heartbeat & Zombie Connection Teardown**: Enforce ping/pong keepalives every 10 seconds. Terminate sockets silent for $>15\text{ seconds}$ to clear unmanaged buffers.

---

## 8. Authentication, Authorization & Session Security

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                ZERO-TRUST ACCESS CONTROL MATRIX                                  │
├─────────────────────────┬─────────────────────────┬──────────────────────┬───────────────────────┤
│ Endpoint Route          │ Authentication Standard │ Authorization Role   │ Attack Surface Defense│
├─────────────────────────┼─────────────────────────┼──────────────────────┼───────────────────────┤
│ WS /v1/stream/call/*    │ Ephemeral Session Token │ Authorized Ingestion │ Token bound to caller │
│                         │ (HMAC-SHA256 Signed)    │ Gateway / PBX Node   │ IP & Session ID.      │
├─────────────────────────┼─────────────────────────┼──────────────────────┼───────────────────────┤
│ POST /v1/transaction/*  │ Mutual TLS (mTLS) +     │ Core Banking Backend │ High-entropy API key; │
│                         │ Bearer API Key          │ Approver Service     │ Replay nonce check.   │
├─────────────────────────┼─────────────────────────┼──────────────────────┼───────────────────────┤
│ POST /v1/enroll         │ Dual-Auth Admin Token   │ Security Admin /     │ Maker-Checker dual    │
│                         │ (JWT with mTLS)         │ Enrollment Officer   │ signature required.   │
├─────────────────────────┼─────────────────────────┼──────────────────────┼───────────────────────┤
│ GET /health             │ None (Internal network) │ Public Liveness      │ Sanitized health info;│
│                         │                         │ Check (K8s Probe)    │ zero stack trace leak.│
└─────────────────────────┴─────────────────────────┴──────────────────────┴───────────────────────┘
```

### 8.1 Cryptographic Session Binding
To prevent Session Hijacking where an adversary attaches to an active audio stream:
1. Ingestion sessions are initialized via `POST /v1/session/create`, returning an ephemeral cryptographic token:
   $$\text{Session Token} = \text{HMAC-SHA256}(\text{Key}_{\text{secret}}, \text{session\_id} \parallel \text{client\_ip} \parallel \text{timestamp})$$
2. The WebSocket connection handshake must supply this token as a Bearer ticket in query parameters or headers.
3. The WebSocket handler verifies the signature and validates that the connecting IP matches the signed IP.

---

## 9. Application & Native DSP Sandboxing

### 9.1 Audio DSP Native Code Protection
Praat Parselmouth utilizes compiled C/C++ libraries to execute pitch point-process calculations. Native C libraries represent memory corruption vulnerabilities (buffer over-reads, heap overflows):
1. **Array Range Clamping**: Before passing audio arrays to Parselmouth, the Python runtime verifies array length ($\le 48,000\text{ samples}$), checks for `NaN` or `Inf` floating point values, and replaces non-finite numbers with zeroes.
2. **Execution Timeout**: Parselmouth execution is wrapped in an asynchronous executor with a strict $60\text{ ms}$ timeout. If execution hangs, the worker thread is terminated, a warning is logged, and the system falls back to pure Python/Scipy estimators.
3. **Container-Level Seccomp & AppArmor**: Containers enforce restrictive seccomp profiles blocking dangerous system calls (`ptrace`, `sys_admin`, `execveat`).

### 9.2 SQL Injection & Vector Injection Defense
* **Parameterized Queries**: All database queries use strictly parameterized positional bindings (`$1, $2, ...`) via `asyncpg`. String formatting or concatenation of SQL strings is forbidden.
* **Vector Normalization Validation**: Input embeddings are verified to ensure exact dimensions ($192\text{ floats}$) and validated for unit norm ($\|v\|_2 \approx 1.0 \pm 10^{-4}$) prior to SQL query execution.

---

## 10. AI/ML Model Security & Governance

### 10.1 Model Artifact Integrity Pinning
Model files loaded into memory must be verified against immutable cryptographic hashes:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 MODEL ARTIFACT INTEGRITY REGISTRY                                │
├─────────────────────┬──────────────────┬─────────────────────────────────────────────────────────┤
│ Model File          │ Architecture     │ Pinned SHA-256 Checksum                                 │
├─────────────────────┼──────────────────┼─────────────────────────────────────────────────────────┤
│ silero_vad.onnx     │ Silero VAD v4    │ e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b│
│ resnet18_vocoder.onn│ ResNet-18 INT8   │ a4b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7│
│ ecapa_tdnn_192.onnx │ ECAPA-TDNN INT8  │ 1234567890abcdef1234567890abcdef1234567890abcdef12345678│
└─────────────────────┴──────────────────┴─────────────────────────────────────────────────────────┘
```

#### Verification Enforcement at Runtime
```python
# Secure Model Loading Routine
import hashlib
import os

EXPECTED_HASHES = {
    "models/silero_vad.onnx": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b...",
    "models/resnet18_acoustic_quantized.onnx": "a4b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5...",
    "models/ecapa_tdnn_192.onnx": "1234567890abcdef1234567890abcdef...",
}

def verify_and_load_model(path: str) -> ort.InferenceSession:
    if not os.path.exists(path):
        raise SecurityException(f"Model file missing: {path}")
    
    sha256 = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            sha256.update(chunk)
    
    digest = sha256.hexdigest()
    if digest != EXPECTED_HASHES.get(path):
        raise SecurityException(f"Model integrity violation for {path}! Expected {EXPECTED_HASHES.get(path)}, got {digest}")
    
    return ort.InferenceSession(path, providers=["CPUExecutionProvider"])
```

### 10.2 Model Supply-Chain & Rollback
* **Model Provenance**: Models must be trained on audited datasets (e.g., ASVspoof 2021) with full provenance tracking in MLflow.
* **Signed Container Images**: Production Docker images containing model weights are signed using Cosign/Sigstore; deployment clusters reject unsigned container digests.
* **Instant Rollback Mechanism**: If distribution shift or an evasion attack wave is detected in production, a canary deployment switch triggers immediate rollback to a hardened fallback model version via environment flag (`ACTIVE_MODEL_PROFILE=baseline_v1`).

---

## 11. Infrastructure, Container & Secrets Security

### 11.1 Container Security Profile
* **Unprivileged Execution**: All processes run as dedicated non-root service account `vaani` (UID $10001$).
* **Read-Only Root Filesystem**: Root filesystem is mounted read-only (`read_only: true`). Temporary execution directories (`/tmp`) reside on constrained `tmpfs` mounts with `noexec,nosuid,nodev`.
* **Capability Dropping**: Drop all Linux kernel capabilities by default:
  ```yaml
  security_opt:
    - no-new-privileges:true
  cap_drop:
    - ALL
  ```

### 11.2 Redis Infrastructure Hardening
* **Access Control Lists (ACL)**: Default user disabled. Application connects as `vaani_app` restricted to specific key patterns:
  ```text
  user vaani_app on >StrongPassword ~vaani:audio:* ~vaani:meta:* +lpush +ltrim +lrange +del +expire
  ```
* **Dangerous Commands Disabled**: Rename or disable destructive commands:
  ```text
  rename-command FLUSHALL ""
  rename-command FLUSHDB ""
  rename-command CONFIG ""
  rename-command KEYS ""
  ```
* **Memory Isolation**: Maxmemory bounded at $512\text{ MB}$; strict volatile LRU policy prevents Out-Of-Memory (OOM) crashes.

### 11.3 PostgreSQL Security & Row-Level Security (RLS)
* **Principle of Least Privilege**: Application connects using dedicated non-owner role (`vaanishield_app`). It has no DDL permissions (`CREATE`, `DROP`, `ALTER`).
* **Row-Level Security Enforcement**:
  ```sql
  ALTER TABLE enrolled_voiceprints ENABLE ROW LEVEL SECURITY;
  ALTER TABLE chunk_telemetry ENABLE ROW LEVEL SECURITY;
  ALTER TABLE transaction_evaluations ENABLE ROW LEVEL SECURITY;

  -- Enforce tenant-level isolation
  CREATE POLICY tenant_isolation_policy ON enrolled_voiceprints
      FOR ALL
      TO vaanishield_app
      USING (metadata->>'tenant_id' = CURRENT_SETTING('app.current_tenant_id'));
  ```

---

## 12. Fail-Safe, Fail-Secure & Degraded Operation Protocols

When components fail, the system must enforce strict **Fail-Secure** policies to prevent fraudulent bypass:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                FAIL-SECURE OPERATION MATRIX                                      │
├───────────────────────┬────────────────────────────┬─────────────────────────────────────────────┤
│ Subsystem Failure     │ Technical Failure State    │ Deterministic Security System Posture       │
├───────────────────────┼────────────────────────────┼─────────────────────────────────────────────┤
│ ResNet ONNX Missing   │ Model session unavailable  │ FAIL-SECURE: Elevate default risk to AMBER  │
│                       │ or file corrupted          │ (50.0). Trigger mandatory PITCH challenge.  │
├───────────────────────┼────────────────────────────┼─────────────────────────────────────────────┤
│ Parselmouth Crash     │ Threadpool timeout (>60ms) │ Fall back to Scipy pitch estimator. Log     │
│                       │ or segmentation fault      │ security alert. Retain active EMA score.    │
├───────────────────────┼────────────────────────────┼─────────────────────────────────────────────┤
│ Redis Cluster Down    │ Socket timeout on LPUSH    │ Fall back to in-memory deque. If memory is  │
│                       │                            │ full, reject new streams with HTTP 503.     │
├───────────────────────┼────────────────────────────┼─────────────────────────────────────────────┤
│ PostgreSQL Down       │ DB connection pool failure │ Live streaming threat scoring CONTINUES in  │
│                       │                            │ memory. Transaction gate queries FAIL-CLOSED│
│                       │                            │ on high-value transfers (> ₹50,000).        │
├───────────────────────┼────────────────────────────┼─────────────────────────────────────────────┤
│ Missing Enrollment    │ Speaker ID has no baseline │ Tier 2 bypassed; evaluates Tier 1 + Tier 3. │
│                       │ record in database         │ Cannot assign GREEN; transaction defaults   │
│                       │                            │ to PENDING_CHALLENGE for high values.       │
├───────────────────────┼────────────────────────────┼─────────────────────────────────────────────┤
│ Corrupted / Noisy PCM │ VAD Speech Ratio < 0.15    │ Discard window. Transaction gate returns    │
│                       │ or non-speech noise        │ HTTP 428 Precondition Required (Hold).      │
└───────────────────────┴────────────────────────────┴─────────────────────────────────────────────┘
```

> **CRITICAL SECURITY DIRECTIVE**: In high-value transaction authorization workflows ($\ge \text{₹}10,000$), **FAIL-OPEN BEHAVIOR IS PROHIBITED**. If the system is uncertain or components fail, transactions must be frozen or held for out-of-band verification.

---

## 13. Auditability, Safe Logging & Security Monitoring

### 13.1 Safe Logging Rules
1. **Zero Raw Audio Logging**: Under no circumstances shall raw PCM audio, base64 chunks, spectrogram matrices, or WAV buffers be written to log files.
2. **PII Masking**: Customer phone numbers, account numbers, and VPAs must be masked in logs (e.g., `98****1234`, `cust****@oksbi`).
3. **Structured Format**: Logs must emit structured JSON via `structlog`, enabling automated ingestion by Splunk, Datadog, or ELK.

```json
{
  "timestamp": "2026-09-13T19:35:12.145Z",
  "level": "warn",
  "event": "Threat state escalated",
  "logger": "vaanishield.security",
  "session_id": "call-secops-842",
  "threat_level": "RED",
  "composite_risk_score": 82.4,
  "trigger_signal": "vocoder_spectral_artifact_high",
  "client_ip": "10.0.12.45"
}
```

### 13.2 High-Priority Security Telemetry Metrics

| Metric Name | Threshold Alarm | Incident Response Trigger |
| :--- | :--- | :--- |
| `vaani_red_threat_spikes_total` | $> 5$ in $60\text{ seconds}$ | Active voice impersonation campaign detected across tenant. |
| `vaani_model_integrity_failure_total`| $\ge 1$ event | Potential container tampering or model supply-chain attack. |
| `vaani_auth_gate_403_blocks_total` | $> 10$ in $5\text{ minutes}$ | Coordinated financial wire fraud attempt underway. |
| `vaani_redis_memory_eviction_spikes` | $> 100$ drops/sec | Denial of service attack or memory leak in audio stream buffering. |

---

## 14. Known Security Limitations & Technical Debt

1. **Current Prototype Authentication Deficit**: The reference repository (`Voice-Cloning-Prototype`) lacks authentication middleware on `/v1/stream/call` and `/v1/transaction/evaluate-authorization`. In Phase 1 MVP, this must be patched with static API key headers before exposing the service to public networks.
2. **Hardcoded Database Secrets in Compose**: The existing `docker-compose.yml` uses plaintext credentials (`POSTGRES_PASSWORD=vaanishield_secret`). Production deployments must inject secrets via Kubernetes Secrets or HashiCorp Vault.
3. **Mock Fallback Exposure**: In the prototype, missing model files cause `InferenceEngine` to fall back to random/synthetic outputs. In a production build, mock fallbacks must be completely disabled by compiler/environment flags (`ENABLE_MOCK_FALLBACKS=false`).
4. **Telephony Codec Asymmetry**: Standard telephone networks (AMR-NB) eliminate acoustic frequencies above $3.4\text{ kHz}$. Security models cannot guarantee the same detection accuracy on 8kHz audio as they do on 16kHz WebRTC streams. Active challenge-response (PITCH) is required to bridge this physical gap.

---

## 15. Security Checklists

### 15.1 Pre-Demo Security Checklist
- [ ] Ensure all mock flags and test scenario injectors are clearly visible and cannot be triggered anonymously.
- [ ] Confirm no production customer audio or live banking API keys are embedded in demo config files.
- [ ] Verify that `/v1/transaction/evaluate-authorization` returns HTTP 403 on RED state during live tests.
- [ ] Confirm that raw microphone audio captured by browser demo is purged immediately upon session reset.
- [ ] Verify that the demo web console displays clear probabilistic indicators rather than "100% verified" claims.

### 15.2 Pre-Release Production Security Checklist
- [ ] Replace all default passwords (`vaanishield_secret`, `changeme`) with high-entropy KMS-managed secrets.
- [ ] Enforce mTLS on all backend service-to-service communication (FastAPI ↔ Redis, FastAPI ↔ PostgreSQL).
- [ ] Disable all mock inference engines (`ENABLE_MOCK_FALLBACKS=false`); system must fail-secure if ONNX models are absent.
- [ ] Implement Row-Level Security (RLS) policies on all PostgreSQL tables for multi-tenant isolation.
- [ ] Perform static application security testing (SAST) and dynamic penetration testing (DAST) on WebSocket handlers.

### 15.3 Secrets & Cryptographic Key Checklist
- [ ] Rotate session signing HMAC keys every 30 days.
- [ ] Ensure database connection strings are injected via environment variables and excluded from git repositories.
- [ ] Verify that model file SHA-256 hashes are hardcoded and verified at application startup.
- [ ] Confirm that voiceprint embeddings are salted with an enterprise KMS key prior to vector indexing.

### 15.4 Dependency & Supply-Chain Checklist
- [ ] Run `pip-audit` or `safety check` on `backend/requirements.txt` to eliminate known CVEs.
- [ ] Run `npm audit` on `frontend/package.json` to verify JavaScript dependencies.
- [ ] Pin exact dependency versions in `requirements.txt` (avoid floating or unpinned packages).
- [ ] Verify that container base images (`python:3.11-slim`, `node:20-alpine`) are pulled from verified registries with digest pinning.

### 15.5 API & WebSocket Security Checklist
- [ ] Implement rate limiting on `/v1/stream/call/{session_id}` (max 20 frames/sec per connection).
- [ ] Validate `Origin` header on all incoming WebSocket connections against tenant whitelist.
- [ ] Cap maximum WebSocket binary message size at $4,096\text{ bytes}$.
- [ ] Ensure all REST endpoints require `X-API-Key` or Bearer JWT authorization headers.

### 15.6 Data Retention & Privacy Checklist
- [ ] Verify Redis audio keys enforce mandatory 15-second TTL (`EXPIRE 15`).
- [ ] Confirm WebSocket disconnection hook (`finally` block) triggers explicit key deletion (`DEL vaani:audio:{session_id}`).
- [ ] Verify that no `.wav`, `.pcm`, or `.mp3` files are written to host filesystem or container storage.
- [ ] Ensure `enrolled_voiceprints` stores only 192-dim derived float vectors, never raw audio.
- [ ] Verify that customer deletion requests (`DELETE /v1/voiceprint/{speaker_id}`) permanently remove vector rows.

### 15.7 Incident Response Playbook Checklist
- [ ] **SOP-01 (Active Spoofing Campaign)**: If `vaani_red_threat_spikes_total` exceeds 10 in 5 minutes, automatically notify Fraud Operations and elevate tenant policy to mandatory PITCH challenge for all transactions.
- [ ] **SOP-02 (Model Integrity Breach)**: If model SHA-256 verification fails on startup or runtime check, immediately halt pod initialization and alert SecOps.
- [ ] **SOP-03 (DoS / Resource Exhaustion)**: If Redis memory reaches $90\%$, engage automatic connection rate throttling at the perimeter reverse proxy.
- [ ] **SOP-04 (False Alarm Flapping)**: If genuine VIP customer is blocked by false positive, provide supervisor dual-authorization override mechanism while archiving chunk telemetry for offline model recalibration.

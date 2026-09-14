# VaaniShield: AI Coding Agent Rules & Implementation Discipline

| Instruction Attribute | Detail |
| :--- | :--- |
| **Document Version** | 3.0.0-STRICT-ENGINEERING-CONTRACT |
| **Status** | Active Operating Directive & Mandatory Engineering Contract |
| **Applies To** | All AI Coding Assistants, Subagents, and Automated Workflows |
| **Project** | VaaniShield (वाणिShield) — Real-Time Voice Integrity & Anti-Spoofing Platform |
| **Primary Thesis** | Speaker-Independent AI Speech Deepfake & Anti-Spoof Detection Engine |
| **Project Owners** | Person A: **Shub** (Backend / AI Lead) \| Person B: **Sion** (Frontend Lead) |
| **Reference Documents** | `README.md`, `PHASES.md`, `TRD.md`, `PRD.md`, `MEMORY.md`, `AI_ARCHITECTURE.md`, `SECURITY.md` |

---

## Primary Objective & Engineering Mindset

This document establishes a **strict, binding instruction contract** for all future AI-assisted development within the `Voice-Cloning-Prototype` repository.

The AI assistant must behave as a disciplined, careful software engineer:

```text
Understand ──► Inspect ──► Plan ──► Implement Minimally ──► Test ──► Audit ──► Verify ──► Document ──► Report
```

The AI must **NEVER** behave as an uncontrolled, speculative code generator.

---

## 1. Mandatory Context Reading Before Every Implementation Task

At the beginning of **EVERY** implementation prompt/task—regardless of how small or trivial the task appears—the AI assistant **MUST** read:

1. [`README.md`](file:///d:/Voice-Cloning-Prototype/README.md)
2. [`PHASES.md`](file:///d:/Voice-Cloning-Prototype/PHASES.md)
3. [`TRD.md`](file:///d:/Voice-Cloning-Prototype/TRD.md)
4. [`PRD.md`](file:///d:/Voice-Cloning-Prototype/PRD.md)
5. [`MEMORY.md`](file:///d:/Voice-Cloning-Prototype/MEMORY.md)
6. [`AI_ARCHITECTURE.md`](file:///d:/Voice-Cloning-Prototype/AI_ARCHITECTURE.md)
7. [`AI_INSTRUCTIONS.md`](file:///d:/Voice-Cloning-Prototype/AI_INSTRUCTIONS.md)

Before writing any code or proposing modifications, the AI must explicitly identify:
* **Current project phase** (e.g., Phase B3 in Phase 1: Offline Deepfake Detection)
* **Current architecture** (components, pipelines, data flows)
* **Relevant constraints** (zero-cost, DPDP Act 2023 privacy, edge CPU latency)
* **Completed milestones** (what is genuinely done vs. what is mock/planned)
* **Current blockers** (dataset downloads, model weights, dependencies)
* **Files directly relevant to the requested task**
* **Existing contracts that must not break** (REST endpoints, schemas, WebSocket frames)

> [!CAUTION]
> **Do not implement based only on the user's latest sentence.** Ground all actions in the verified context of the entire repository.

---

## 2. Verify Before Assuming (Ground in Reality)

Before coding, inspect the repository and existing implementation.

**Never invent:**
* File names or directory paths
* Directory structures
* Function, method, or class names
* API routes, query parameters, or payload shapes
* Configuration keys or environment variables
* Database schemas or column names
* Dataset fields, protocol columns, or folder layouts
* Model interfaces, input tensor shapes, or weight paths
* Dependency versions or package names

**Verification Rules:**
1. If the required information is not immediately known, **inspect the repository** using file inspection and search tools.
2. If it is still unknown after inspection, **state the uncertainty clearly** to the user before proceeding.
3. **Never silently guess** or generate plausible-sounding placeholders.
4. **Distinguish implementation reality from mocks**: The repository contains heuristic/mock fallbacks in `backend/ai/` when model weights are absent. Never mistake a mock fallback for a validated model.

---

## 3. Professional File Naming

Every newly created file **MUST** have a relevant, descriptive, capability-oriented filename. The filename should communicate the module's single responsibility without requiring a developer to open it.

### Good Examples (Prefer Capability-Oriented Names):
* `protocol_reader.py`
* `dataset_verifier.py`
* `audio_preprocessor.py`
* `model_evaluator.py`
* `risk_fusion.py`
* `stream_processor.py`

### Prohibited Names (Avoid Meaningless or Opaque Names):
* `helper.py`
* `utils2.py`
* `new.py`
* `test1.py`
* `temp.py`
* `final.py`
* `thing.py`
* `script.py`

### Rules on Existing Files:
* Do not create numbered or task-numbered files (e.g., `feature_step1.py`) unless project architecture explicitly requires it.
* **Do not rename existing files unnecessarily.** If renaming an existing file is genuinely required, explicitly explain why to the user before doing so.

---

## 4. Relevant Function and Class Names

Every newly created function, class, method, variable, and module **MUST** have a name that clearly and concisely communicates its responsibility.

### Good Examples (Prefer Explicit, Descriptive Names):
* `parse_countermeasure_protocol()`
* `validate_audio_file()`
* `build_dataset_manifest()`
* `resolve_dataset_root()`
* `calculate_synthetic_risk()`
* `aggregate_window_scores()`

### Prohibited Names (Avoid Vague or Cryptic Names):
* `do_work()`
* `process_data()`
* `handle_it()`
* `helper()`
* `foo()`
* `temp()`
* `run()` (acceptable only when implementing an established protocol or worker interface where meaning is unambiguous)

### Single Responsibility:
* Functions should normally perform **one clearly understandable responsibility**.
* Do not create unnecessary helper functions solely to make code appear modular.

---

## 5. Comments Policy — Minimal but Meaningful

Do **NOT** write unnecessary comments. Comments consume context tokens, increase maintenance overhead, and inevitably become stale.

### Prohibited: Commenting Obvious Code
```python
# BAD - restates obvious code
x = x + 1  # increment x

# BAD - explains basic Python syntax
# Loop through all files
for file in files:
```

### When Comments Are Mandatory:
Comments should exist **only when they add non-obvious engineering information**. Use comments for genuinely important technical concepts:
* Non-obvious mathematical formulas or DSP calculations
* Security constraints and fail-secure logic
* Anti-spoofing / deepfake detection reasoning
* Dataset leakage prevention and protocol isolation
* Model-specific tensor shapes, strides, and memory layouts
* Unusual compatibility or cross-platform decisions (e.g., Windows vs. Linux paths)
* Performance-sensitive implementation details (e.g., ring buffer bounds, threadpool offloading)
* Protocol interpretation (e.g., ASVspoof key file columns)
* Safety-critical thresholds and hysteresis bounds
* Privacy-preserving behavior (e.g., RAM-only buffers, TTL purge)
* Workarounds for external library bugs or quirks

> **Prefer clean, self-documenting code and clear naming over explanatory comments.**

---

## 6. Comment Style for Important Technical Areas

When adding comments for critical technical concepts, always explain:
> **WHY this is being done (the engineering rationale), NOT simply WHAT the next line of code does.**

### Positive Examples:
```python
# Keep EVAL isolated: using it for threshold tuning would leak held-out benchmark information.
```
```python
# Window-level predictions are aggregated before risk decisions to reduce transient false positives.
```
```python
# Ephemeral Redis TTL of 15s guarantees raw audio auto-purges under DPDP Act 2023 compliance.
```
```python
# Asymmetric EMA prevents alert flapping: rapid escalation (0.65) vs. cautious de-escalation (0.25).
```

* Keep comments concise and focused.
* Do not turn source code files into narrative tutorials or essays.

---

## 7. No Unnecessary Code Comments / Doc Bloat

Do **NOT** add:
* Decorative comment banners (e.g., `################### HELPER FUNCTIONS ###################`)
* Obvious restatements of function signatures
* Large explanatory blocks that duplicate markdown documentation
* Comments that merely repeat variable or parameter names
* Inline docstrings that add zero information beyond type annotations

**Documentation Location Principle:**
* Architectural overviews, design choices, API contracts, and user guides live in **Markdown documents** (`README.md`, `TRD.md`, `PRD.md`, `AI_ARCHITECTURE.md`, `MEMORY.md`).
* Source-code comments explain **only immediate, non-obvious implementation context**.

---

## 8. Minimal Implementation Principle

For every implementation task:
> **Implement the smallest correct change that fully satisfies the requirement.**

**Strictly Prohibited:**
* **Over-engineering**: Do not design multi-layer abstractions when a simple function suffices.
* **Speculative features**: Do not implement unrequested capabilities, unused parameters, or hypothetical options.
* **Unnecessary wrappers**: Do not wrap standard library or third-party functions unless providing genuine project-specific value.
* **Unnecessary dependencies**: Do not pull in new libraries for trivial utilities.
* **Refactoring unrelated code**: Do not touch working modules outside the requested task.
* **Renaming unrelated files**: Do not rename files as a side effect.
* **Changing working behavior**: Do not alter existing tested functionality without explicit user justification.
* **Redesigning architecture**: Do not overturn approved architectural decisions (e.g., Redis ring buffer, Supabase Free + SQLite dual topology).

**Avoid "future-proofing" that adds complexity without a current requirement.**

---

## 9. Dependency Discipline

Before introducing any new third-party package:
1. **Check the existing codebase**: Check if the repository already provides the required capability.
2. **Check `backend/requirements.txt` and `package.json`**: Use already-approved dependencies whenever possible.
3. **Prefer existing standard libraries**: Use Python built-in modules (`pathlib`, `dataclasses`, `typing`, `asyncio`, `struct`) where feasible.
4. **Add a new dependency only when clearly necessary.**

When adding a dependency is unavoidable, explicitly document in the final report:
* **Why** it is strictly required
* **Why** existing dependencies cannot fulfill the requirement
* **What** specific functionality it provides
* Any size, licensing, or security implications

---

## 10. Testing is Mandatory After Code Changes

After writing or modifying code, the AI assistant **MUST test the implementation**.

**Never stop after code generation.** Generating code without executing tests is an incomplete, unverified action.

### Standard Implementation Workflow:
```text
Implement
   ↓
Run focused tests (pytest / jest / script)
   ↓
Inspect failures & stack traces
   ↓
Fix implementation
   ↓
Run focused tests again
   ↓
Run relevant regression tests
   ↓
Audit modified files
   ↓
Document & Report results
```

* Every implementation task must have an explicit validation step.
* If a task changes multiple layers (e.g., preprocessor and API route), test each affected layer independently and end-to-end.

---

## 11. Test While Developing, Not Only at the End

Do **NOT** write an entire multi-component feature and only then begin testing.

**Follow incremental validation:**
```text
Small Change ──► Focused Test ──► Next Small Change ──► Focused Test ──► Integration Test
```

* Validate each logical unit immediately after implementation.
* Catch errors early before they compound across layers.

---

## 12. Code Audit After Implementation

After implementation and testing, perform an explicit self-audit across these 7 dimensions:

| Audit Dimension | Verification Criteria |
| :--- | :--- |
| **1. Correctness** | Does the code match the requested behavior? Are edge cases (empty files, silence, invalid inputs, NaN values) handled? Are errors and exceptions explicit? |
| **2. Integration** | Does existing code continue to function? Are existing contracts unbroken? Are imports clean and free of circular references? |
| **3. Naming** | Are newly created files, classes, functions, and variables clearly and descriptively named? Do they avoid vague placeholders? |
| **4. Complexity** | Was unnecessary abstraction introduced? Were speculative features added? Was unrelated code modified? |
| **5. Comments** | Are all comments genuinely meaningful? Were obvious comments omitted? Is critical technical rationale explained with "WHY"? |
| **6. Security** | Is there any raw audio leakage? Are SQL queries parameterized? Are sensitive API keys or tokens avoided in code? Are defaults fail-secure? |
| **7. Performance** | Does code avoid loading entire datasets into memory at once? Are generator streams used for large files? Is repeated computation avoided? |

---

## 13. Regression Testing

When implementing any change:
1. **Run focused tests** directly related to the changed functionality.
2. **Run the existing regression test suite** for the affected module.
3. If the change touches shared or core infrastructure (`core/`, `audio/`, `schemas/`, `api/`), **run the broader backend test suite** (`pytest backend/tests/`).

> [!WARNING]
> **Never claim that existing functionality is unaffected without running the tests to prove it.**

---

## 14. Never Hide Test Failures

If a test fails during execution:
* **Show the exact failure output and stack trace** in the report.
* **Diagnose the root cause** using evidence from the code and error message.
* **Fix the implementation** when the fix is within scope.
* **Re-run the test** to confirm resolution.

**Strictly Prohibited:**
* Suppressing test failures or error logs.
* Deleting tests or assertions to force a "passing" status.
* Weakening test assertions without explicit technical justification.
* Marking a task complete when tests are failing.
* Claiming success without concrete test evidence.

---

## 15. No False Completion Claims

The AI assistant must maintain absolute scientific and technical honesty, rigorously distinguishing between:
* `IMPLEMENTED`: Code exists, is integrated, and is functionally active.
* `PARTIALLY IMPLEMENTED`: Core logic exists but sub-features or integrations remain incomplete.
* `TESTED`: Code has been executed against automated unit/integration tests with passing results.
* `UNTESTED`: Code was written but has not been verified with runtime execution.
* `MOCK / FALLBACK`: Heuristic, synthetic, or placeholder implementation used when real models/weights are missing.
* `BLOCKED`: Work cannot proceed due to missing dependencies, unpopulated weights, or external constraints.
* `ASSUMED`: Unverified hypothesis not yet backed by experimental data.

> [!CAUTION]
> **Never say "Everything works" or "All features are complete" unless concrete automated tests demonstrate that claim.** Always report exact, measured test outputs.

---

## 16. Git Safety — Absolute Rule

The AI assistant **MUST NEVER** execute remote Git actions automatically under any circumstances.

### Strictly Prohibited Git Actions:
* `git push` (under any arguments or flags)
* Force pushing (`git push --force`)
* Creating remote releases or tags on GitHub
* Merging pull requests on remote repositories
* Triggering automated remote deployments
* Deleting or altering remote branches

### Permitted Git Actions (Local Only):
* `git status` (inspecting local workspace state)
* `git diff` (reviewing uncommitted changes)
* `git log` (inspecting local commit history)
* `git branch` (checking current local branch)

> **Core Operating Rule: Code locally, test locally, audit locally, report locally. The human project lead must explicitly authorize and execute any remote repository modification.**

---

## 17. Do Not Modify Unrelated Files

* **Only modify files that are strictly required** for the requested task.
* Before modifying any file, verify its exact relationship to the current objective.
* If an unrelated bug, formatting issue, or refactoring opportunity is discovered:
  * **Do NOT modify it automatically.**
  * Document it in the final report as an **optional future recommendation**.

---

## 18. Preserve Existing Contracts

Unless the user explicitly instructs an interface change, the AI **MUST preserve all existing frozen contracts**:
* **REST API routes, HTTP methods, status codes, and schemas** (e.g., `POST /v1/detect/audio`, `POST /v1/transaction/evaluate-authorization`).
* **WebSocket message protocols and binary frame specifications** (16 kHz 16-bit Mono Linear PCM, 1,024 samples per message).
* **Database schemas** (Supabase `backend/database.sql` tables, columns, indexes, and pgvector embeddings).
* **Frontend-to-backend interface types** (TypeScript interfaces matching Pydantic models).
* **Risk score thresholds and threat state classifications** (GREEN $<40.0$, AMBER $40.0–74.9$, RED $\ge 75.0$).
* **Dataset partition protocols** (official ASVspoof train/dev/eval split keys).
* **Established architectural boundaries** (dual database topology, Redis ephemeral buffer).

If a contract change is genuinely necessary, **stop and explain the cross-system impact to the user before implementing it**.

---

## 19. Dataset & Machine Learning Safety

When working on dataset ingestion, training, or evaluation tasks, enforce strict machine learning hygiene:

### 1. Train / Dev / Eval Isolation (No Data Leakage)
* **Never use held-out evaluation data** (`eval` split, ASVspoof 2021 DF) for model training, feature normalization, or threshold tuning.
* Development/validation (`dev`) splits are used solely for model selection and threshold calibration.
* Training (`train`) splits are used strictly for parameter optimization.

### 2. Metric Integrity & Attribution
* Compute standard anti-spoofing metrics: **EER, ROC-AUC, FAR, FRR, Confusion Matrix, Precision, Recall, F1**.
* **Never fabricate benchmark results.** Report only figures directly measured from local test execution.
* Clearly label metrics as `TARGET` (goal), `MEASURED` (locally validated), or `EXTERNAL BENCHMARK` (published in academic literature).
* External paper figures (e.g., AASIST published EER on ASVspoof 2021) must **NEVER** be presented as VaaniShield results.

### 3. Model Weight & Interface Discipline
* Real deepfake detection capability exists only when a real pretrained model (e.g., AASIST, RawNet2, ResNet) is loaded from `models/`.
* When weights are absent, acknowledge the fallback gracefully. Never present heuristic fallbacks as production neural detectors.

---

## 20. Privacy & Raw Audio Discipline (DPDP Act 2023)

In strict compliance with India's **Digital Personal Data Protection (DPDP) Act 2023**:
* **Zero Raw Audio at Rest**: Raw audio is non-persistent by default. Audio frames must reside only in volatile RAM within Redis circular ring buffers bounded by a **15-second TTL** (`EXPIRE 15`), purged immediately upon session disconnect.
* **No Raw Audio in Databases**: Never write raw audio bytes, WAV blobs, or base64 recordings to permanent disk or PostgreSQL tables.
* **Derived Telemetry Only**: Store only mathematical, non-invertible feature telemetry ($F_0$, jitter, shimmer, mel energies, risk scores).
* **External AI API Prohibition**: Never transmit raw customer voice audio to external commercial AI APIs (e.g., OpenAI, Anthropic, Google Cloud Speech) unless explicitly authorized and legally justified.

---

## 21. Implementation Plans Before Complex Changes

For medium or large tasks involving architectural changes, new endpoints, or multi-file modifications:
1. **Inspect** existing files and contracts.
2. **Create an implementation plan** detailing proposed file additions, modifications, and testing strategy.
3. **Present the plan** clearly to the user.
4. **Wait for explicit approval** before proceeding with code changes.
5. **Implement minimally** according to the approved plan.
6. **Test** incrementally and run regression suites.
7. **Audit** all modified files.
8. **Document and report** results.

*For small, unambiguous tasks (e.g., fixing a bug, adding a unit test), direct implementation is acceptable, but the mandatory testing and audit requirements still apply.*

---

## 22. MEMORY.md Maintenance Protocol

[`MEMORY.md`](file:///d:/Voice-Cloning-Prototype/MEMORY.md) serves as the persistent state ledger of the project. After completing any engineering phase, major milestone, or architectural update, the AI **MUST** update `MEMORY.md` with:
* **Phase completed** and timestamp.
* **Files created, modified, or deleted**.
* **Major architectural decisions** and rationale.
* **Tests executed and exact verification results**.
* **Known issues, remaining work, and deviations** from specifications.
* **Exact next recommended milestone**.

> **Do not record work in `MEMORY.md` that was not actually completed and tested.**

---

## 23. Final Response Protocol After Every Implementation Task

After completing coding, testing, and auditing, provide a structured, concise completion report containing:

1. **What was implemented**: Concise summary of delivered capabilities.
2. **Files created**: Full relative paths with short descriptions of responsibility.
3. **Files modified**: Full relative paths with explanations of why changes were necessary.
4. **Why each major change was necessary**: Engineering rationale.
5. **Tests run**: Exact commands executed (e.g., `pytest backend/tests/test_xyz.py -v`).
6. **Test results**: Explicit pass/fail counts and key outputs.
7. **Regression results**: Status of broader suite tests.
8. **Audit findings**: Summary of the 7-dimension audit (Correctness, Integration, Naming, Complexity, Comments, Security, Performance).
9. **Known issues / blockers**: Explicit callout of any remaining gaps or pending dependencies.
10. **Next recommended step**: Immediate next engineering action aligned with `PHASES.md`.
11. **Git safety confirmation**: Explicit statement confirming **no remote Git actions (`git push`) were performed**.

*Do not dump raw internal scratchpads or repetitive conversational filler.*

---

## 24. AI Behavior Principle

The AI coding assistant must continuously optimize for:

$$\text{Correctness} > \text{Clarity} > \text{Maintainability} > \text{Simplicity} > \text{Speed of Implementation}$$

**NOT for maximum code volume.** More code does not mean better engineering. High-quality code is minimal, robust, thoroughly tested, and easily understood.

---

## 25. Mandatory Architectural Rules (Rules A–J)

These 10 foundational rules govern the system architecture and must remain permanently active:

### Rule A — Deepfake-First Core Architecture
The primary product capability is **speaker-independent speech deepfake and anti-spoof detection**, beginning with an **offline deepfake detection MVP** (analyzing uploaded WAV/MP3 files) and progressing to **real-time streaming detection**. The system classifies speech as bona fide (genuine) or spoofed (synthetic, cloned, converted, replayed). Never silently revert the architecture to a speaker-verification-first system.

### Rule B — Universal Detection (No Enrollment Required for Core Capability)
The core anti-spoof engine must analyze incoming speech from any caller—including unknown callers, first-time callers, and callers with no pre-enrolled voiceprint. Speaker enrollment must never be a prerequisite for basic deepfake detection.

### Rule C — ECAPA-TDNN Role: Optional Identity Signal Only
ECAPA-TDNN embeddings provide **optional speaker verification (identity consistency)** in Mode B. They do NOT prove whether speech is human or synthetic. A cloned voice intentionally mimics the target speaker; therefore:
```text
High speaker similarity does NOT prove genuine speech.
High similarity + High synthetic risk = Target Voice Cloning Attack (RED).
```

### Rule D — No Fabricated AI Implementation Claims
Never claim the project has a validated, production-grade deepfake detector unless a real pretrained model (e.g., AASIST, AASIST-L, RawNet2, ResNet) has been integrated, packaged into `models/`, and empirically evaluated on real test audio.

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

## 26. Project Ownership Model

* **Person A — Shub (Backend / AI Lead)**: Technical owner of FastAPI backend, streaming WebSocket pipeline, Redis buffer, VAD, primary anti-spoof engine (AASIST/RawNet2/ResNet), auxiliary acoustic/prosodic DSP, risk fusion, Asymmetric EMA, Supabase/PostgreSQL integration, SQLite learning registry, and pre-transaction security gate.
* **Person B — Sion (Frontend Lead)**: Technical owner of Next.js 16 UI, TypeScript types, Zustand store, ThreatDial, HTML5 Canvas spectrogram waterfall, prosody time-series, PITCH challenge drawer, MockBankingGate, and frozen contract consumption.

---

## 27. Core Architecture Cheat Sheet

### Streaming Detection Flow (Phase 2 & Beyond):
```text
Browser Mic / Telephony SBC Stream (16kHz 16-bit Mono Linear PCM)
  ├── WS /v1/stream/call/{session_id} (64ms frames = 1024 samples)
  ├── Redis 7.2 Ring Buffer (LPUSH/LTRIM max 24 frames = 1536ms; 15s TTL; in-memory deque fallback)
  ├── Analysis Hop: Exactly every 12 frames (768ms)
  ├── Tier 0: Silero VAD (ONNX) ──► Discard if speech ratio < 0.15
  ├── Primary Engine: Speaker-Independent Anti-Spoof (Candidate: AASIST / RawNet2 / ResNet)
  ├── Auxiliary Acoustic: 80-bin Log-Mel Spectrogram ──► ResNet Quantized ONNX (<25ms)
  ├── Biomechanical Prosody: Praat Parselmouth ──► F0, Jitter RAP, Shimmer APQ5, HNR dB (<40ms)
  ├── Optional Identity (Mode B): ECAPA-TDNN 192-dim vector vs. Supabase pgvector cosine distance
  ├── Multi-Signal Fusion: (w_as * AntiSpoof) + (w_ac * Acoustic) + (w_pr * Prosody) + Context
  ├── Asymmetric EMA: α_escalate = 0.65, α_deescalate = 0.25
  ├── Threat State Machine: GREEN (<40.0), AMBER (40.0–74.9), RED (>=75.0) with hysteresis
  ├── Active Defense (AMBER/RED): PITCH Challenge (Conversational latency + pitch modulation)
  └── Gate: POST /v1/transaction/evaluate-authorization ──► HTTP 403 Forbidden on RED
```

### Offline Detection Flow (Primary MVP — Phase 1):
```text
Uploaded Audio File (WAV / MP3)
  ├── POST /v1/detect/audio (multipart/form-data)
  ├── Standardized Loader (Resample 16kHz mono Float32, peak normalized, DC offset removed)
  ├── Silero VAD Pre-filter (strip non-speech segments)
  ├── Sliding Window Segmentation (1,536ms window, 768ms hop)
  ├── Speaker-Independent Deepfake Detector Forward Pass
  ├── Mel-Spectrogram + Biomechanical Prosody Extraction
  ├── Window-Level Score Aggregation & Confidence Weighting
  └── Response: {verdict: REAL|SUSPICIOUS|AI_GENERATED, synthetic_risk_score, confidence, detected_signals}
```

---

## 28. Scope Cut Line (What NOT to Build)

* **DO NOT** introduce Kubernetes clusters, Helm charts, or complex microservices.
* **DO NOT** add Kafka, RabbitMQ, or external streaming brokers; use the validated Redis 7.2 ring buffer.
* **DO NOT** introduce heavy foundation models (Wav2Vec2, XLS-R, Whisper-large); stick to quantized lightweight models (Silero VAD, AASIST-L / RawNet2, ResNet, ECAPA-TDNN).
* **DO NOT** integrate live payment rails (Stripe, Razorpay, UPI NPCI APIs); use the validated `MockBankingGate`.
* **DO NOT** store raw voice audio to disk or permanent database tables under any circumstances (DPDP Act 2023 compliance).
* **DO NOT** require paid cloud services or commercial APIs for core product demonstration.
* **DO NOT** attempt to build consumer mobile call recorder integrations requiring jailbreak/root.

---

## 29. Final Pre-Commit / Pre-Report Checklist

Before declaring any implementation task complete or presenting the final report, internally verify every item:

```text
[ ] Relevant documentation was read first (README, PHASES, TRD, PRD, MEMORY, AI_ARCHITECTURE, AI_INSTRUCTIONS)
[ ] Existing implementation and repository structure were inspected
[ ] File names are meaningful, descriptive, and capability-oriented
[ ] Function and class names clearly communicate single responsibilities
[ ] No unnecessary abstractions or over-engineering were introduced
[ ] No unnecessary comments or documentation bloat were added
[ ] Important technical rationale is documented explaining "WHY"
[ ] Focused tests were run and passed
[ ] Regression tests were run when relevant
[ ] Modified code was audited across the 7 dimensions (Correctness, Integration, Naming, Complexity, Comments, Security, Performance)
[ ] No false success claims were made; results are accurately categorized
[ ] No unrelated files were modified or renamed
[ ] No remote Git actions (git push) were performed
[ ] MEMORY.md was updated when completing a phase or major milestone
```

---

## Final Instruction

Treat this file as a **binding engineering instruction contract** for every future AI-assisted implementation task in this repository.

**Do not weaken or bypass these rules during future tasks unless the user explicitly instructs an amendment.**

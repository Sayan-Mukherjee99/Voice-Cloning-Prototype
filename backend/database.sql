-- ============================================================
-- VaaniShield — PostgreSQL 16 Production Schema
-- Compliant with India's DPDP Act 2023
-- No raw audio bytes are stored at rest.
-- ============================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- ENUM Types
-- ============================================================

CREATE TYPE threat_level AS ENUM ('GREEN', 'AMBER', 'RED');
CREATE TYPE session_status AS ENUM ('ACTIVE', 'CLOSED', 'BLOCKED', 'TIMEOUT');
CREATE TYPE transaction_decision AS ENUM ('APPROVED', 'BLOCKED', 'PENDING_CHALLENGE');

-- ============================================================
-- Table: enrolled_voiceprints
-- Stores speaker baseline 192-dim ECAPA-TDNN embeddings.
-- NO raw audio is stored; only derived mathematical embeddings.
-- ============================================================

CREATE TABLE enrolled_voiceprints (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    speaker_id          TEXT NOT NULL,           -- e.g. customer mobile hash
    display_name        TEXT,                     -- optional label
    embedding           vector(192) NOT NULL,     -- ECAPA-TDNN 192-dim L2-normalised
    enrollment_quality  FLOAT4 NOT NULL DEFAULT 0.0,  -- 0.0–1.0 quality score
    enrollment_phrases  TEXT[],                   -- phonetic phrases used during enrolment
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    metadata            JSONB DEFAULT '{}'::jsonb,

    CONSTRAINT enrolled_voiceprints_speaker_unique UNIQUE (speaker_id)
);

-- IVFFlat index for sub-millisecond ANN search at scale
-- lists = sqrt(expected rows); adjust for production cardinality
CREATE INDEX idx_voiceprints_embedding_ivfflat
    ON enrolled_voiceprints
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX idx_voiceprints_speaker_id ON enrolled_voiceprints (speaker_id);
CREATE INDEX idx_voiceprints_active ON enrolled_voiceprints (is_active);

-- ============================================================
-- Table: call_sessions
-- Lifecycle tracking for every WebSocket streaming session.
-- ============================================================

CREATE TABLE call_sessions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id              TEXT NOT NULL UNIQUE,    -- matches WebSocket path param
    speaker_id              TEXT,                     -- FK reference (soft, for flexibility)
    status                  session_status NOT NULL DEFAULT 'ACTIVE',
    composite_risk_score    FLOAT4 NOT NULL DEFAULT 0.0,   -- 0–100 EMA-smoothed
    threat_level            threat_level NOT NULL DEFAULT 'GREEN',
    pitch_challenge_active  BOOLEAN NOT NULL DEFAULT FALSE,
    pitch_challenge_passed  BOOLEAN,
    carrier_codec           TEXT DEFAULT 'AMR-WB-16kHz-PCM',
    remote_ip               INET,
    user_agent              TEXT,
    started_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at                TIMESTAMPTZ,
    metadata                JSONB DEFAULT '{}'::jsonb,

    -- DPDP Act 2023: flag confirming no raw audio stored
    dpdp_audio_purged       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_call_sessions_session_id ON call_sessions (session_id);
CREATE INDEX idx_call_sessions_status ON call_sessions (status);
CREATE INDEX idx_call_sessions_threat ON call_sessions (threat_level);
CREATE INDEX idx_call_sessions_started ON call_sessions (started_at DESC);

-- ============================================================
-- Table: chunk_telemetry
-- Per-750ms-chunk telemetry. Used for audit trail and replay.
-- Raw audio bytes are NEVER stored here per DPDP Act 2023.
-- ============================================================

CREATE TABLE chunk_telemetry (
    id                      BIGSERIAL PRIMARY KEY,
    session_id              TEXT NOT NULL REFERENCES call_sessions(session_id) ON DELETE CASCADE,
    chunk_index             INTEGER NOT NULL,
    chunk_timestamp         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Tier 1 Acoustic Features
    tier1_risk_score        FLOAT4,                -- ResNet-18 ONNX output
    log_mel_mean            FLOAT4,                -- mean of 80-bin log-mel spectrogram
    log_mel_std             FLOAT4,

    -- Biomechanical Prosody (Parselmouth / Praat)
    f0_mean_hz              FLOAT4,                -- Fundamental frequency mean
    f0_std_hz               FLOAT4,                -- F0 standard deviation
    f0_variance             FLOAT4,                -- Pitch variance
    jitter_local            FLOAT4,                -- Relative local jitter (%)
    jitter_rap              FLOAT4,                -- Relative average perturbation
    shimmer_local           FLOAT4,                -- Local shimmer (dB)
    shimmer_apq5            FLOAT4,                -- Five-point APQ shimmer
    hnr_db                  FLOAT4,                -- Harmonics-to-noise ratio
    respiration_gap_ms      FLOAT4,                -- Detected respiration pause duration

    -- Tier 2 Speaker Embedding
    tier2_triggered         BOOLEAN NOT NULL DEFAULT FALSE,
    speaker_embedding       vector(192),            -- ECAPA-TDNN embedding (nullable)
    cosine_similarity       FLOAT4,                -- vs enrolled voiceprint
    tier2_risk_score        FLOAT4,

    -- EMA Composite
    ema_composite_score     FLOAT4 NOT NULL DEFAULT 0.0,
    ema_threat_level        threat_level NOT NULL DEFAULT 'GREEN',

    -- Latency Tracking
    tier1_latency_ms        FLOAT4,
    tier2_latency_ms        FLOAT4,
    total_latency_ms        FLOAT4,

    -- Silence / VAD
    vad_speech_ratio        FLOAT4,                -- 0.0–1.0, fraction of chunk with speech
    chunk_discarded_silence BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_chunk_telemetry_session ON chunk_telemetry (session_id, chunk_index);
CREATE INDEX idx_chunk_telemetry_timestamp ON chunk_telemetry (chunk_timestamp DESC);
CREATE INDEX idx_chunk_telemetry_risk ON chunk_telemetry (ema_composite_score DESC);
CREATE INDEX idx_chunk_telemetry_threat ON chunk_telemetry (ema_threat_level);

-- ============================================================
-- Table: transaction_evaluations
-- Audit log for every /v1/transaction/evaluate-authorization call.
-- ============================================================

CREATE TABLE transaction_evaluations (
    id                  BIGSERIAL PRIMARY KEY,
    session_id          TEXT NOT NULL REFERENCES call_sessions(session_id) ON DELETE SET NULL,
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
CREATE INDEX idx_txn_eval_time ON transaction_evaluations (evaluated_at DESC);
CREATE INDEX idx_txn_eval_decision ON transaction_evaluations (decision);

-- ============================================================
-- Trigger: auto-update updated_at on enrolled_voiceprints
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_voiceprints_updated_at
    BEFORE UPDATE ON enrolled_voiceprints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Trigger: auto-update last_activity_at on call_sessions
-- ============================================================

CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_session_activity
    BEFORE UPDATE ON call_sessions
    FOR EACH ROW EXECUTE FUNCTION update_session_activity();

-- ============================================================
-- View: active_threat_sessions
-- Convenience view for monitoring dashboards.
-- ============================================================

CREATE VIEW active_threat_sessions AS
SELECT
    cs.session_id,
    cs.speaker_id,
    cs.status,
    cs.composite_risk_score,
    cs.threat_level,
    cs.pitch_challenge_active,
    cs.started_at,
    cs.last_activity_at,
    EXTRACT(EPOCH FROM (NOW() - cs.started_at))::INTEGER AS session_duration_s,
    COUNT(ct.id) AS total_chunks_processed,
    AVG(ct.jitter_local) AS avg_jitter,
    AVG(ct.shimmer_local) AS avg_shimmer,
    AVG(ct.f0_mean_hz) AS avg_f0_hz
FROM call_sessions cs
LEFT JOIN chunk_telemetry ct ON ct.session_id = cs.session_id
WHERE cs.status = 'ACTIVE'
GROUP BY cs.session_id, cs.speaker_id, cs.status, cs.composite_risk_score,
         cs.threat_level, cs.pitch_challenge_active, cs.started_at, cs.last_activity_at;

COMMENT ON VIEW active_threat_sessions IS 'Live monitoring view for active WebSocket sessions with aggregated prosody metrics.';

-- ============================================================
-- Row-level security policies (DPDP Act 2023 compliance)
-- ============================================================

ALTER TABLE enrolled_voiceprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunk_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_evaluations ENABLE ROW LEVEL SECURITY;

-- Application role (used by FastAPI service user)
-- CREATE ROLE vaanishield_app LOGIN PASSWORD 'changeme_in_production';
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO vaanishield_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vaanishield_app;

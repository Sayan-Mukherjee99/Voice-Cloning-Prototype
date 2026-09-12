/**
 * VaaniShield — Zustand Telemetry Store
 * Central state management for real-time threat telemetry,
 * spectrogram data, prosody metrics, and transaction lock status.
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type ThreatLevel = "GREEN" | "AMBER" | "RED";
export type WsStatus = "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "ERROR";

export interface ProsodicDataPoint {
  t: number;        // timestamp (ms)
  f0: number;       // F0 mean Hz
  jitter: number;   // jitter %
  shimmer: number;  // shimmer %
  hnr: number;      // HNR dB
}

export interface TelemetrySnapshot {
  chunkIndex: number;
  riskScore: number;
  threatLevel: ThreatLevel;
  jitter: number;
  shimmer: number;
  f0Mean: number;
  f0Variance: number;
  hnrDb: number;
  vadSpeechRatio: number;
  tier2Triggered: boolean;
  cosineSimilarity: number | null;
  latencyMs: number;
  pitchChallenge: string | null;
  timestamp: number;
}

export interface TransactionState {
  locked: boolean;
  lockReason: string | null;
  lockedAt: number | null;
  amount: number;
  beneficiaryVpa: string;
  transactionRef: string;
  decision: "PENDING" | "APPROVED" | "BLOCKED";
}

// ─────────────────────────────────────────────
// Store Interface
// ─────────────────────────────────────────────

const PROSODY_HISTORY_LENGTH = 60;   // 60 data points = ~45s at 750ms hop
const SPECTROGRAM_BANDS = 80;
const SPECTROGRAM_COLS = 120;

export interface TelemetryStore {
  // Session
  sessionId: string;
  wsStatus: WsStatus;
  latencyMs: number;
  codecInfo: string;

  // Risk & Threat
  riskScore: number;
  threatLevel: ThreatLevel;
  previousThreatLevel: ThreatLevel;
  riskHistory: number[];               // rolling 60 values

  // Prosody time-series
  prosodyHistory: ProsodicDataPoint[];

  // Spectrogram
  spectrogramMatrix: number[][];       // [SPECTROGRAM_COLS][SPECTROGRAM_BANDS] — last N columns

  // PITCH Challenge
  pitchChallengeActive: boolean;
  pitchChallengeText: string | null;
  pitchChallengeStartedAt: number | null;

  // Transaction
  transaction: TransactionState;

  // Tier 2
  tier2Triggered: boolean;
  cosineSimilarity: number | null;

  // Latest snapshot (full)
  latestSnapshot: TelemetrySnapshot | null;

  // ── Actions ──────────────────────────────────
  setSessionId: (id: string) => void;
  setWsStatus: (status: WsStatus) => void;
  setCodecInfo: (info: string) => void;

  applyTelemetry: (snapshot: TelemetrySnapshot) => void;
  pushSpectrogramColumn: (frequencyBins: number[]) => void;

  lockTransaction: (reason: string) => void;
  unlockTransaction: () => void;
  setTransactionAmount: (amount: number, vpa: string) => void;
  resetSession: () => void;
}

// ─────────────────────────────────────────────
// Store Implementation
// ─────────────────────────────────────────────

const generateRef = () =>
  `TXN${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const initialTransaction: TransactionState = {
  locked: false,
  lockReason: null,
  lockedAt: null,
  amount: 150000,
  beneficiaryVpa: "xyz@oksbi",
  transactionRef: "TXN849204A9",
  decision: "PENDING",
};

export const useTelemetryStore = create<TelemetryStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // ── Initial State ────────────────────────
      sessionId: "",
      wsStatus: "DISCONNECTED",
      latencyMs: 0,
      codecInfo: "AMR-WB 16kHz PCM",

      riskScore: 0,
      threatLevel: "GREEN",
      previousThreatLevel: "GREEN",
      riskHistory: [],

      prosodyHistory: [],
      spectrogramMatrix: [],

      pitchChallengeActive: false,
      pitchChallengeText: null,
      pitchChallengeStartedAt: null,

      transaction: initialTransaction,

      tier2Triggered: false,
      cosineSimilarity: null,
      latestSnapshot: null,

      // ── Actions ──────────────────────────────

      setSessionId: (id) => set({ sessionId: id }),

      setWsStatus: (status) => set({ wsStatus: status }),

      setCodecInfo: (info) => set({ codecInfo: info }),

      applyTelemetry: (snapshot) => {
        const state = get();
        const prevLevel = state.threatLevel;
        const newLevel = snapshot.threatLevel;

        // Update rolling risk history
        const riskHistory = [...state.riskHistory, snapshot.riskScore].slice(-PROSODY_HISTORY_LENGTH);

        // Update prosody history
        const newPoint: ProsodicDataPoint = {
          t: snapshot.timestamp,
          f0: snapshot.f0Mean,
          jitter: snapshot.jitter,
          shimmer: snapshot.shimmer,
          hnr: snapshot.hnrDb,
        };
        const prosodyHistory = [...state.prosodyHistory, newPoint].slice(-PROSODY_HISTORY_LENGTH);

        // PITCH challenge management
        let pitchChallengeActive = state.pitchChallengeActive;
        let pitchChallengeText = state.pitchChallengeText;
        let pitchChallengeStartedAt = state.pitchChallengeStartedAt;

        if (snapshot.pitchChallenge && !pitchChallengeActive) {
          pitchChallengeActive = true;
          pitchChallengeText = snapshot.pitchChallenge;
          pitchChallengeStartedAt = Date.now();
        } else if (!snapshot.pitchChallenge && newLevel === "GREEN") {
          pitchChallengeActive = false;
        }

        // Auto-lock transaction on RED
        let transaction = state.transaction;
        if (newLevel === "RED" && !transaction.locked) {
          transaction = {
            ...transaction,
            locked: true,
            lockReason: `Transaction Frozen: High-Confidence Voice Clone Detected (Risk Score: ${snapshot.riskScore.toFixed(1)}/100)`,
            lockedAt: Date.now(),
            decision: "BLOCKED",
          };
        }

        set({
          riskScore: snapshot.riskScore,
          threatLevel: newLevel,
          previousThreatLevel: prevLevel,
          latencyMs: snapshot.latencyMs,
          riskHistory,
          prosodyHistory,
          pitchChallengeActive,
          pitchChallengeText,
          pitchChallengeStartedAt,
          tier2Triggered: snapshot.tier2Triggered,
          cosineSimilarity: snapshot.cosineSimilarity,
          latestSnapshot: snapshot,
          transaction,
        });
      },

      pushSpectrogramColumn: (frequencyBins) => {
        const state = get();
        // Normalize to 0-255 range
        const maxVal = Math.max(...frequencyBins, 1);
        const normalised = frequencyBins.map((v) => Math.min(255, Math.round((v / maxVal) * 255)));

        const updated = [...state.spectrogramMatrix, normalised].slice(-SPECTROGRAM_COLS);
        set({ spectrogramMatrix: updated });
      },

      lockTransaction: (reason) =>
        set((s) => ({
          transaction: {
            ...s.transaction,
            locked: true,
            lockReason: reason,
            lockedAt: Date.now(),
            decision: "BLOCKED",
          },
        })),

      unlockTransaction: () =>
        set((s) => ({
          transaction: {
            ...s.transaction,
            locked: false,
            lockReason: null,
            lockedAt: null,
            decision: "PENDING",
          },
        })),

      setTransactionAmount: (amount, vpa) =>
        set((s) => ({
          transaction: {
            ...s.transaction,
            amount,
            beneficiaryVpa: vpa,
            transactionRef: generateRef(),
          },
        })),

      resetSession: () =>
        set({
          riskScore: 0,
          threatLevel: "GREEN",
          previousThreatLevel: "GREEN",
          riskHistory: [],
          prosodyHistory: [],
          spectrogramMatrix: [],
          pitchChallengeActive: false,
          pitchChallengeText: null,
          pitchChallengeStartedAt: null,
          tier2Triggered: false,
          cosineSimilarity: null,
          latestSnapshot: null,
          transaction: { ...initialTransaction, transactionRef: generateRef() },
          latencyMs: 0,
        }),
    })),
    { name: "VaaniShield-Telemetry" }
  )
);

// ─────────────────────────────────────────────
// Derived selectors
// ─────────────────────────────────────────────

export const selectThreatColor = (level: ThreatLevel): string => {
  switch (level) {
    case "GREEN": return "#10B981";
    case "AMBER": return "#F59E0B";
    case "RED":   return "#EF4444";
  }
};

export const selectThreatBg = (level: ThreatLevel): string => {
  switch (level) {
    case "GREEN": return "rgba(16, 185, 129, 0.12)";
    case "AMBER": return "rgba(245, 158, 11, 0.12)";
    case "RED":   return "rgba(239, 68, 68, 0.12)";
  }
};

export const selectThreatGlow = (level: ThreatLevel): string => {
  switch (level) {
    case "GREEN": return "0 0 20px rgba(16, 185, 129, 0.4)";
    case "AMBER": return "0 0 20px rgba(245, 158, 11, 0.5)";
    case "RED":   return "0 0 30px rgba(239, 68, 68, 0.6)";
  }
};

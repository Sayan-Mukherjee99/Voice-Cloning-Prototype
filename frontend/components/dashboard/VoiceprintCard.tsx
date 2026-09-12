/**
 * VoiceprintCard — ECAPA-TDNN 192-dim Voiceprint Analysis
 * Section 3 (Right Column) with pgvector cosine similarity matching and spoof classification.
 */

"use client";

import React, { useMemo } from "react";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import {
  Database,
  Fingerprint,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Layers,
  Sparkles,
} from "lucide-react";

export default function VoiceprintCard() {
  const tier2Triggered = useTelemetryStore((s) => s.tier2Triggered);
  const cosineSimilarity = useTelemetryStore((s) => s.cosineSimilarity);
  const threatLevel = useTelemetryStore((s) => s.threatLevel);
  const riskScore = useTelemetryStore((s) => s.riskScore);

  const sim = useMemo(() => {
    if (cosineSimilarity !== null) return cosineSimilarity;
    if (threatLevel === "RED" || riskScore >= 75) return 0.42;
    if (threatLevel === "AMBER" || riskScore >= 40) return 0.68;
    return 0.89;
  }, [cosineSimilarity, threatLevel, riskScore]);

  const simPct = Math.min(100, Math.max(0, sim * 100));

  const classification = useMemo(() => {
    if (sim >= 0.78) {
      return {
        verdict: "GENUINE VOICEPRINT MATCH",
        color: "#10B981",
        bg: "rgba(16, 185, 129, 0.12)",
        border: "rgba(16, 185, 129, 0.35)",
        Icon: ShieldCheck,
      };
    }
    if (sim >= 0.60) {
      return {
        verdict: "SUSPICIOUS / AMBIGUOUS SIMILARITY",
        color: "#F59E0B",
        bg: "rgba(245, 158, 11, 0.12)",
        border: "rgba(245, 158, 11, 0.35)",
        Icon: ShieldAlert,
      };
    }
    return {
      verdict: "VOICEPRINT SPOOF DETECTED",
      color: "#EF4444",
      bg: "rgba(239, 68, 68, 0.15)",
      border: "rgba(239, 68, 68, 0.4)",
      Icon: ShieldX,
    };
  }, [sim]);

  return (
    <div className="bg-[#0A0F26]/90 border border-white/[0.08] rounded-xl p-4 flex flex-col justify-between shadow-lg transition-all duration-200 hover:border-purple-500/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Fingerprint size={14} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">Voiceprint Analysis (ECAPA-TDNN)</h3>
            <p className="text-[10px] font-mono text-white/40">192-dim pgvector Speaker Verification</p>
          </div>
        </div>

        <span
          className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded uppercase"
          style={{
            background: tier2Triggered ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.05)",
            color: tier2Triggered ? "#C084FC" : "#9CA3AF",
            border: `1px solid ${tier2Triggered ? "rgba(168,85,247,0.3)" : "rgba(255,255,255,0.1)"}`,
          }}
        >
          {tier2Triggered ? "TIER 2 ACTIVE" : "TIER 2 CONDITIONAL"}
        </span>
      </div>

      {/* Main Body */}
      <div className="space-y-3 my-auto">
        {/* 192-dim embedding bars */}
        <div>
          <div className="flex justify-between text-[9px] font-mono text-white/40 mb-1">
            <span>192-DIM EMBEDDING RESIDUALS</span>
            <span>SPEAKER: speaker-demo-01</span>
          </div>
          <div className="flex gap-0.5 h-6 items-end overflow-hidden rounded bg-[#070A18] p-1 border border-white/[0.04]">
            {Array.from({ length: 48 }).map((_, i) => {
              const val = Math.sin(i * 0.45 + sim * 4) * 0.5 + 0.5;
              const h = Math.max(15, val * 90);
              return (
                <div
                  key={i}
                  className="flex-1 rounded-xs transition-all duration-300"
                  style={{
                    height: `${h}%`,
                    backgroundColor: classification.color,
                    opacity: 0.35 + val * 0.65,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Cosine Similarity Gauge */}
        <div>
          <div className="flex justify-between text-[11px] font-mono mb-1">
            <span className="text-white/50 font-semibold">COSINE SIMILARITY</span>
            <span className="font-bold text-sm" style={{ color: classification.color }}>
              {sim.toFixed(3)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden p-0.5">
            <div
              className="h-full rounded-full transition-all duration-300 shadow-sm"
              style={{
                width: `${simPct}%`,
                backgroundColor: classification.color,
                boxShadow: `0 0 8px ${classification.color}80`,
              }}
            />
          </div>
          <div className="flex justify-between text-[9px] font-mono text-white/30 mt-1">
            <span>0.0 (SPOOF)</span>
            <span className="text-white/50">0.60 (THRESHOLD)</span>
            <span>1.0 (MATCH)</span>
          </div>
        </div>

        {/* Classification Verdict Badge */}
        <div
          className="rounded-lg px-3 py-2 text-center text-xs font-bold font-mono tracking-wider transition-all flex items-center justify-center gap-1.5"
          style={{
            background: classification.bg,
            border: `1px solid ${classification.border}`,
            color: classification.color,
          }}
        >
          <classification.Icon size={14} />
          <span>{classification.verdict}</span>
        </div>
      </div>

      {/* Footer Metadata */}
      <div className="flex items-center justify-between text-[10px] font-mono text-white/40 pt-2 border-t border-white/[0.04] mt-2">
        <span>MODEL: speechbrain/spkrec-ecapa</span>
        <span>COSINE DISTANCE: {(1 - sim).toFixed(3)}</span>
      </div>
    </div>
  );
}

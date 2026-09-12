/**
 * ThreatAnalysisView — Dedicated Threat Evidence & Detection Signals View
 * Micro-prosody anomalies, spectral artifacts, synthetic voice indicators, challenge response.
 */

"use client";

import React from "react";
import ThreatSignalList from "@/components/dashboard/ThreatSignalList";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import {
  ShieldAlert,
  AlertTriangle,
  Activity,
  Waves,
  Fingerprint,
  Zap,
} from "lucide-react";

export default function ThreatAnalysisView() {
  const threatLevel = useTelemetryStore((s) => s.threatLevel);
  const riskScore = useTelemetryStore((s) => s.riskScore);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="text-[10px] font-mono tracking-widest text-white/40 uppercase">
            SECURITY INTELLIGENCE & THREAT EVIDENCE
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
            Threat Analysis & Signals
          </h1>
        </div>
        <div
          className="text-xs font-mono font-bold px-3 py-1 rounded-full uppercase"
          style={{
            background:
              threatLevel === "RED"
                ? "rgba(239,68,68,0.15)"
                : threatLevel === "AMBER"
                ? "rgba(245,158,11,0.15)"
                : "rgba(16,185,129,0.15)",
            color:
              threatLevel === "RED"
                ? "#EF4444"
                : threatLevel === "AMBER"
                ? "#F59E0B"
                : "#10B981",
            border: `1px solid ${
              threatLevel === "RED"
                ? "rgba(239,68,68,0.3)"
                : threatLevel === "AMBER"
                ? "rgba(245,158,11,0.3)"
                : "rgba(16,185,129,0.3)"
            }`,
          }}
        >
          {threatLevel} · RISK {riskScore.toFixed(0)}/100
        </div>
      </div>

      {/* ThreatSignalList */}
      <div className="bg-[#0A0F26]/90 rounded-2xl p-5 border border-white/[0.08] shadow-lg">
        <ThreatSignalList />
      </div>

      {/* Threat Weight Matrix Breakdown */}
      <div className="bg-[#0A0F26]/90 rounded-2xl p-5 border border-white/[0.08] shadow-lg space-y-3">
        <div className="flex items-center gap-2 text-white">
          <ShieldAlert size={16} className="text-amber-400" />
          <h3 className="text-xs font-bold font-mono tracking-wide uppercase">
            Composite Threat Weight Matrix
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-[#070A18] border border-white/[0.04]">
            <span className="text-white/40 block text-[9px] mb-1">TIER 1 ACOUSTIC WEIGHT</span>
            <span className="text-base font-bold text-sky-400">40%</span>
            <p className="text-[10px] text-white/50 mt-1">
              F0 pitch contour standard deviation, local jitter, shimmer perturbation.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#070A18] border border-white/[0.04]">
            <span className="text-white/40 block text-[9px] mb-1">TIER 2 VOICEPRINT WEIGHT</span>
            <span className="text-base font-bold text-purple-400">40%</span>
            <p className="text-[10px] text-white/50 mt-1">
              ECAPA-TDNN 192-dim embedding cosine distance vs speaker baseline.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#070A18] border border-white/[0.04]">
            <span className="text-white/40 block text-[9px] mb-1">INTERACTIVE CHALLENGE WEIGHT</span>
            <span className="text-base font-bold text-amber-400">20%</span>
            <p className="text-[10px] text-white/50 mt-1">
              PITCH phonetic challenge recitation latency & vocal stability correlation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

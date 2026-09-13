"use client";

import React from "react";
import ThreatSignalList from "@/components/dashboard/ThreatSignalList";
import ChallengeResponseCard from "@/components/dashboard/ChallengeResponseCard";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import {
  Cpu,
} from "lucide-react";

/**
 * ThreatAnalysisView — Dedicated Threat Engine, Weight Matrix & PITCH Console (Dark SecOps Theme)
 */
export default function ThreatAnalysisView() {
  const threatLevel = useTelemetryStore((s) => s.threatLevel);
  const riskScore = useTelemetryStore((s) => s.riskScore);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-neutral-800/80">
        <div>
          <div className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">
            SECURITY INTELLIGENCE & THREAT EVIDENCE
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
            Threat Engine &amp; PITCH Console
          </h1>
        </div>
        <div
          className="text-xs font-mono font-bold px-3 py-1 rounded-full uppercase border"
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
            borderColor:
              threatLevel === "RED"
                ? "rgba(239,68,68,0.35)"
                : threatLevel === "AMBER"
                ? "rgba(245,158,11,0.35)"
                : "rgba(16,185,129,0.35)",
          }}
        >
          {threatLevel} · RISK {riskScore.toFixed(0)}/100
        </div>
      </div>

      {/* Grid: PITCH Prompt Console + Threat Weight Matrix Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PITCH Challenge Console */}
        <ChallengeResponseCard />

        {/* Threat Weight Matrix Breakdown */}
        <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl backdrop-blur-md p-5 shadow-2xl space-y-3">
          <div className="flex items-center gap-2 text-white pb-2 border-b border-neutral-800/80">
            <Cpu size={16} className="text-amber-400" />
            <h3 className="text-xs font-bold font-mono tracking-wide uppercase">
              Composite Threat Weight Matrix
            </h3>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400 text-[10px]">TIER 1 ACOUSTIC WEIGHT</span>
                <span className="text-base font-bold text-sky-400">40%</span>
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">
                F0 pitch contour standard deviation, local jitter, shimmer perturbation.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400 text-[10px]">TIER 2 VOICEPRINT WEIGHT</span>
                <span className="text-base font-bold text-purple-400">40%</span>
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">
                ECAPA-TDNN 192-dim embedding cosine distance vs speaker baseline.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400 text-[10px]">INTERACTIVE CHALLENGE WEIGHT</span>
                <span className="text-base font-bold text-amber-400">20%</span>
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">
                Phonetic timing latencies, co-articulation micro-transitions on randomized tongue twisters.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

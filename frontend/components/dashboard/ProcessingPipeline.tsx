/**
 * ProcessingPipeline — Multi-Tier Detection Engine Pipeline
 * Displays the 8 sequential stages from raw PCM ingestion to transaction authorization.
 */

"use client";

import React, { useMemo } from "react";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import {
  Mic,
  Sliders,
  Activity,
  BarChart3,
  Layers,
  Database,
  Cpu,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

interface PipelineStage {
  id: string;
  name: string;
  sub: string;
  latency: string;
  status: "active" | "standby" | "alert";
  icon: React.ElementType;
}

export default function ProcessingPipeline() {
  const latencyMs = useTelemetryStore((s) => s.latencyMs);
  const latestSnapshot = useTelemetryStore((s) => s.latestSnapshot);
  const tier2Triggered = useTelemetryStore((s) => s.tier2Triggered);
  const threatLevel = useTelemetryStore((s) => s.threatLevel);
  const riskScore = useTelemetryStore((s) => s.riskScore);

  const stages = useMemo<PipelineStage[]>(() => {
    const isRed = threatLevel === "RED" || riskScore >= 75;
    const isAmber = threatLevel === "AMBER" || riskScore >= 40;

    return [
      {
        id: "input",
        name: "Audio Ingestion",
        sub: "16kHz PCM Stream",
        latency: "1.2ms",
        status: "active",
        icon: Mic,
      },
      {
        id: "preprocess",
        name: "Preprocessing",
        sub: "512-Hop Window",
        latency: "2.8ms",
        status: "active",
        icon: Sliders,
      },
      {
        id: "vad",
        name: "Silero VAD",
        sub: "Voice Filter",
        latency: "6.5ms",
        status: "active",
        icon: Activity,
      },
      {
        id: "prosody",
        name: "Acoustic Prosody",
        sub: "Praat Micro-Perturb",
        latency: "14.2ms",
        status: isRed || isAmber ? "alert" : "active",
        icon: BarChart3,
      },
      {
        id: "embedding",
        name: "Voice Embedding",
        sub: "ResNet-18 / ECAPA",
        latency: "18.5ms",
        status: tier2Triggered ? (isRed ? "alert" : "active") : "standby",
        icon: Layers,
      },
      {
        id: "similarity",
        name: "pgvector Match",
        sub: "192-dim Cosine",
        latency: "8.4ms",
        status: tier2Triggered ? (isRed ? "alert" : "active") : "standby",
        icon: Database,
      },
      {
        id: "risk",
        name: "Temporal Risk Engine",
        sub: "Kalman + EMA",
        latency: "3.1ms",
        status: isRed ? "alert" : isAmber ? "alert" : "active",
        icon: Cpu,
      },
      {
        id: "decision",
        name: "Security Gate",
        sub: isRed ? "Hard Lock" : isAmber ? "Challenge" : "Cleared",
        latency: "<1ms",
        status: isRed ? "alert" : isAmber ? "alert" : "active",
        icon: isRed ? ShieldX : isAmber ? ShieldAlert : ShieldCheck,
      },
    ];
  }, [latencyMs, latestSnapshot, tier2Triggered, threatLevel, riskScore]);

  const statusColors = {
    active: { bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.3)", text: "text-emerald-400", dot: "bg-emerald-400" },
    standby: { bg: "rgba(255, 255, 255, 0.03)", border: "rgba(255, 255, 255, 0.08)", text: "text-white/40", dot: "bg-neutral-600" },
    alert: { bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.35)", text: "text-amber-400", dot: "bg-amber-400 animate-pulse" },
  };

  return (
    <div className="bg-[#0A0F26]/90 border border-white/[0.08] rounded-xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          <h3 className="text-xs font-mono font-bold tracking-wider text-white uppercase">
            Section 5 · Real-time Processing Pipeline
          </h3>
        </div>
        <span className="text-[10px] font-mono text-white/40">
          Deterministic Fast-Edge SLA (&lt;80ms End-to-End)
        </span>
      </div>

      {/* Responsive Stages Flow */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {stages.map((st, i) => {
          const cfg = statusColors[st.status];
          const StageIcon = st.icon;

          return (
            <div
              key={st.id}
              className="rounded-lg p-2.5 flex flex-col justify-between transition-all duration-200 relative group"
              style={{
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
              }}
            >
              {/* Top Row */}
              <div className="flex items-center justify-between text-[9px] font-mono mb-1">
                <span className="text-white/30">0{i + 1}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              </div>

              {/* Icon & Title */}
              <div className="my-1">
                <StageIcon size={14} className={`${cfg.text} mb-1`} />
                <h4 className="text-[11px] font-bold text-white leading-tight">{st.name}</h4>
                <p className="text-[9px] font-mono text-white/40 leading-tight truncate">{st.sub}</p>
              </div>

              {/* Latency */}
              <div className="text-[9px] font-mono text-white/40 pt-1 border-t border-white/[0.04] mt-1 flex justify-between">
                <span>LATENCY</span>
                <span className={`${cfg.text} font-semibold`}>{st.latency}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

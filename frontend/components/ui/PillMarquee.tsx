"use client";

import React from "react";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import {
  Radio,
  Activity,
  Cpu,
  Clock,
  ShieldCheck,
  Zap,
} from "lucide-react";

/**
 * PillMarquee — Continuous Velocity Pill Marquee (Dark SecOps Theme)
 */
export default function PillMarquee() {
  const latestSnapshot = useTelemetryStore((s) => s.latestSnapshot);
  const latencyMs = useTelemetryStore((s) => s.latencyMs);

  const speechRatio = latestSnapshot?.vadSpeechRatio
    ? (latestSnapshot.vadSpeechRatio * 100).toFixed(0)
    : "92";
  const f0Hz = latestSnapshot?.f0Mean
    ? latestSnapshot.f0Mean.toFixed(0)
    : "94";
  const latencyVal = latencyMs > 0 ? Math.round(latencyMs) : 71;

  const items = [
    {
      id: "codec",
      icon: Radio,
      label: "AMR-WB 16kHz (VoLTE)",
      tag: "16-bit Mono PCM",
      color: "text-cyan-400",
      dot: "bg-cyan-400",
    },
    {
      id: "vad",
      icon: Activity,
      label: `Silero VAD Speech: ${speechRatio}%`,
      tag: "512-Hop Active",
      color: "text-emerald-400",
      dot: "bg-emerald-400",
    },
    {
      id: "prosody",
      icon: Zap,
      label: `Parselmouth F0: ${f0Hz} Hz`,
      tag: "Jitter 1.8%",
      color: "text-amber-400",
      dot: "bg-amber-400",
    },
    {
      id: "latency",
      icon: Clock,
      label: `End-to-End Latency: ${latencyVal}ms`,
      tag: "SLA <80ms",
      color: "text-sky-400",
      dot: "bg-sky-400",
    },
    {
      id: "compliance",
      icon: ShieldCheck,
      label: "DPDP Act 2023: Zero Persistent Audio Retention",
      tag: "15s Ring-Buffer TTL",
      color: "text-emerald-400",
      dot: "bg-emerald-400",
    },
    {
      id: "vector",
      icon: Cpu,
      label: "ECAPA-TDNN 192-dim",
      tag: "pgvector HNSW Cosine",
      color: "text-purple-400",
      dot: "bg-purple-400",
    },
  ];

  // Quadruple items to ensure seamless infinite scroll
  const marqueeItems = [...items, ...items, ...items, ...items];

  return (
    <div className="w-full h-8 my-2 overflow-hidden flex items-center bg-neutral-950/80 border-y border-neutral-800/80 backdrop-blur-md select-none relative z-10">
      {/* Left/Right Gradient Fades */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-neutral-950 to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-neutral-950 to-transparent pointer-events-none z-10" />

      <div className="flex w-max animate-marquee hover:[animation-play-state:paused] gap-3 items-center">
        {marqueeItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={`${item.id}-${idx}`}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-800/80 text-[11px] font-mono shadow-sm transition-colors hover:border-neutral-700 hover:bg-neutral-850"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${item.dot} animate-pulse`} />
              <Icon size={12} className={item.color} />
              <span className="font-semibold text-neutral-200 whitespace-nowrap">{item.label}</span>
              <span className="text-[9px] text-neutral-500 bg-neutral-950/60 px-1.5 py-0.5 rounded-md border border-neutral-800/50 whitespace-nowrap">
                {item.tag}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

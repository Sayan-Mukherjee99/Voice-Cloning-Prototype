/**
 * VoiceprintView — Dedicated ECAPA-TDNN Speaker Verification View
 * 192-dim pgvector embedding visualization, cosine similarity, and spoof detection.
 */

"use client";

import React from "react";
import VoiceprintCard from "@/components/dashboard/VoiceprintCard";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import {
  Fingerprint,
  Database,
  ShieldCheck,
  Layers,
  Lock,
  Sparkles,
} from "lucide-react";

export default function VoiceprintView() {
  const sessionId = useTelemetryStore((s) => s.sessionId);
  const cosineSimilarity = useTelemetryStore((s) => s.cosineSimilarity);
  const tier2Triggered = useTelemetryStore((s) => s.tier2Triggered);
  const threatLevel = useTelemetryStore((s) => s.threatLevel);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="text-[10px] font-mono tracking-widest text-white/40 uppercase">
            SPEAKER BIOMETRICS & NEURAL EMBEDDINGS
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
            Voiceprint Verification (ECAPA-TDNN)
          </h1>
        </div>
        <div className="text-xs font-mono px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
          192-dim pgvector · SpeechBrain Core
        </div>
      </div>

      {/* Main Voiceprint Card */}
      <VoiceprintCard />

      {/* Deep Speaker Profile & Enrollment Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Enrolled Profile */}
        <div className="bg-[#0A0F26]/90 rounded-2xl p-5 border border-white/[0.08] shadow-lg space-y-3">
          <div className="flex items-center gap-2 text-white">
            <Fingerprint size={16} className="text-cyan-400" />
            <h3 className="text-xs font-bold font-mono tracking-wide uppercase">
              Enrolled Speaker Profile
            </h3>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-2 rounded bg-[#070A18] border border-white/[0.04]">
              <span className="text-white/40">SPEAKER ID:</span>
              <span className="text-cyan-300 font-bold">speaker-demo-01</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-[#070A18] border border-white/[0.04]">
              <span className="text-white/40">VECTOR STORAGE:</span>
              <span className="text-white/80">PostgreSQL pgvector (HNSW Index)</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-[#070A18] border border-white/[0.04]">
              <span className="text-white/40">SIMILARITY THRESHOLD:</span>
              <span className="text-amber-400 font-bold">0.60 Cosine</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-[#070A18] border border-white/[0.04]">
              <span className="text-white/40">CALIBRATION STATE:</span>
              <span className="text-emerald-400 font-bold">100% Calibrated</span>
            </div>
          </div>
        </div>

        {/* Card 2: Neural Model Architecture */}
        <div className="bg-[#0A0F26]/90 rounded-2xl p-5 border border-white/[0.08] shadow-lg space-y-3">
          <div className="flex items-center gap-2 text-white">
            <Database size={16} className="text-purple-400" />
            <h3 className="text-xs font-bold font-mono tracking-wide uppercase">
              ECAPA-TDNN Architecture
            </h3>
          </div>

          <div className="space-y-2 text-xs font-mono text-white/70">
            <p className="text-[11px] leading-relaxed text-white/60">
              ECAPA-TDNN emphasizes channel attention, propagation, and aggregation on time-delay neural architectures. It extracts robust 192-dimensional speaker embeddings invariant to room acoustics.
            </p>
            <div className="flex justify-between p-2 rounded bg-[#070A18] border border-white/[0.04] text-[10px]">
              <span className="text-white/40">INFERENCE SLA:</span>
              <span className="text-cyan-300 font-bold">&lt; 25ms on Edge GPU/CPU</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

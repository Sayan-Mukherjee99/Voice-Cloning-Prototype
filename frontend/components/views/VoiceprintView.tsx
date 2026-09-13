"use client";

import React from "react";
import VoiceprintCard from "@/components/dashboard/VoiceprintCard";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import {
  Fingerprint,
  Database,
} from "lucide-react";

/**
 * VoiceprintView — Dedicated ECAPA-TDNN Speaker Verification View (Dark SecOps Theme)
 */
export default function VoiceprintView() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-neutral-800/80">
        <div>
          <div className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">
            SPEAKER BIOMETRICS & NEURAL EMBEDDINGS
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
            Voiceprint Verification (ECAPA-TDNN)
          </h1>
        </div>
        <div className="text-xs font-mono px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">
          192-dim pgvector · SpeechBrain Core
        </div>
      </div>

      {/* Main Voiceprint Card */}
      <VoiceprintCard />

      {/* Deep Speaker Profile & Enrollment Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Enrolled Profile */}
        <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl backdrop-blur-md p-5 shadow-2xl space-y-3">
          <div className="flex items-center gap-2 text-white pb-2 border-b border-neutral-800/80">
            <Fingerprint size={16} className="text-cyan-400" />
            <h3 className="text-xs font-bold font-mono tracking-wide uppercase">
              Enrolled Speaker Profile
            </h3>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
              <span className="text-neutral-400">SPEAKER ID:</span>
              <span className="text-cyan-300 font-bold">speaker-demo-01</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
              <span className="text-neutral-400">VECTOR STORAGE:</span>
              <span className="text-neutral-200">PostgreSQL pgvector (HNSW Index)</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
              <span className="text-neutral-400">SIMILARITY THRESHOLD:</span>
              <span className="text-amber-400 font-bold">0.60 Cosine</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
              <span className="text-neutral-400">CALIBRATION STATE:</span>
              <span className="text-emerald-400 font-bold">100% Calibrated</span>
            </div>
          </div>
        </div>

        {/* Card 2: Neural Model Architecture */}
        <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl backdrop-blur-md p-5 shadow-2xl space-y-3">
          <div className="flex items-center gap-2 text-white pb-2 border-b border-neutral-800/80">
            <Database size={16} className="text-purple-400" />
            <h3 className="text-xs font-bold font-mono tracking-wide uppercase">
              ECAPA-TDNN Architecture
            </h3>
          </div>

          <div className="space-y-2 text-xs font-mono text-neutral-300">
            <p className="text-[11px] leading-relaxed text-neutral-400">
              ECAPA-TDNN emphasizes channel attention, propagation, and aggregation on time-delay neural architectures. It extracts robust 192-dimensional speaker embeddings invariant to room acoustics.
            </p>
            <div className="flex justify-between p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80 text-[10px]">
              <span className="text-neutral-400">INFERENCE SLA:</span>
              <span className="text-cyan-300 font-bold">&lt; 25ms on Edge GPU/CPU</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

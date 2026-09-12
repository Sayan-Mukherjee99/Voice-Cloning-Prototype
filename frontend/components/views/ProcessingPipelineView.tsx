/**
 * ProcessingPipelineView — Dedicated 8-Stage Detection Pipeline View
 * Full visual flow from Audio Ingestion to Pre-Transaction Security Gate with SLAs.
 */

"use client";

import React from "react";
import ProcessingPipeline from "@/components/dashboard/ProcessingPipeline";
import { Cpu, Zap, Clock, ShieldCheck, Database, Layers } from "lucide-react";

export default function ProcessingPipelineView() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="text-[10px] font-mono tracking-widest text-white/40 uppercase">
            MULTI-TIER DETECTION ARCHITECTURE
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
            Real-Time Processing Pipeline
          </h1>
        </div>
        <div className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Deterministic Fast-Edge SLA (&lt;80ms)
        </div>
      </div>

      {/* Main Pipeline Component */}
      <ProcessingPipeline />

      {/* Deep Pipeline Architecture Specs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
        <div className="bg-[#0A0F26]/90 p-5 rounded-2xl border border-white/[0.08] shadow-lg space-y-2">
          <div className="flex items-center gap-2 text-white">
            <Zap size={14} className="text-cyan-400" />
            <h4 className="font-bold uppercase tracking-wide">Tier 1: Deterministic Fast-Edge</h4>
          </div>
          <p className="text-white/60 text-[11px] leading-relaxed">
            Evaluates 512-sample hops in &lt; 35ms. Extracts fundamental frequency (F0), standard deviation, local jitter (RAP), and shimmer (local) via Praat C++ bindings. Computes Silero VAD probability in real-time.
          </p>
        </div>

        <div className="bg-[#0A0F26]/90 p-5 rounded-2xl border border-white/[0.08] shadow-lg space-y-2">
          <div className="flex items-center gap-2 text-white">
            <Database size={14} className="text-purple-400" />
            <h4 className="font-bold uppercase tracking-wide">Tier 2: Conditional Neural Verification</h4>
          </div>
          <p className="text-white/60 text-[11px] leading-relaxed">
            Dispatches only if Tier 1 risk score &gt; 45. Ingests concatenated 1.5s speech frames into ECAPA-TDNN ONNX runtime to extract 192-dimensional unit embeddings and perform cosine match against enrolled pgvector vectors.
          </p>
        </div>
      </div>
    </div>
  );
}

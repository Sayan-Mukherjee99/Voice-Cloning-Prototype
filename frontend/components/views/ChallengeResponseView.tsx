/**
 * ChallengeResponseView — Dedicated PITCH Interactive Challenge-Response View
 * Active tongue-twister recitation console with real-time vocal stability & pitch tracking.
 */

"use client";

import React from "react";
import ChallengeResponseCard from "@/components/dashboard/ChallengeResponseCard";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import { Zap, Mic, ShieldAlert, Sparkles, Activity } from "lucide-react";

export default function ChallengeResponseView() {
  const threatLevel = useTelemetryStore((s) => s.threatLevel);
  const pitchChallengeActive = useTelemetryStore((s) => s.pitchChallengeActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="text-[10px] font-mono tracking-widest text-white/40 uppercase">
            ACTIVE LIVENESS & PHONETIC AUTHENTICATION
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
            PITCH Challenge Console
          </h1>
        </div>
        <div className="text-xs font-mono px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
          Phonetic Interactive Challenge-Response
        </div>
      </div>

      {/* Main Challenge Card */}
      <ChallengeResponseCard />

      {/* Explanatory Protocol Specs */}
      <div className="bg-[#0A0F26]/90 p-5 rounded-2xl border border-white/[0.08] shadow-lg space-y-3">
        <div className="flex items-center gap-2 text-white">
          <Zap size={16} className="text-amber-400" />
          <h3 className="text-xs font-bold font-mono tracking-wide uppercase">
            PITCH Biometric Protocol (ISO/IEC 30107-3 Liveness)
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono text-white/70">
          <div className="p-3 rounded-xl bg-[#070A18] border border-white/[0.04]">
            <span className="text-white/40 block text-[9px] mb-1">01. DYNAMIC PHONETIC PROMPTS</span>
            <p className="text-[10px] text-white/50">
              Randomizes phonetic tongue-twisters to eliminate replay attacks and prerecorded audio injections.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-[#070A18] border border-white/[0.04]">
            <span className="text-white/40 block text-[9px] mb-1">02. VOCAL TRACT MICRO-STABILITY</span>
            <p className="text-[10px] text-white/50">
              Monitors sub-glottal resonance and fundamental pitch variation during live articulation.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-[#070A18] border border-white/[0.04]">
            <span className="text-white/40 block text-[9px] mb-1">03. TIME-TO-SPEECH (TTS) RESISTANCE</span>
            <p className="text-[10px] text-white/50">
              Measures response latency (&lt;1.5s) to defeat voice-cloning text-to-speech generative pipelines.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

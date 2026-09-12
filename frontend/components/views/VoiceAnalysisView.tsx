/**
 * VoiceAnalysisView — Dedicated Audio Analysis & Biomechanical Micro-Prosody
 * Spectrogram, Praat acoustic waveforms, MetricStrip, and formant parameters.
 */

"use client";

import React, { useState } from "react";
import SpectrogramCanvas from "@/components/SpectrogramCanvas";
import ProsodyChart from "@/components/ProsodyChart";
import MetricStrip from "@/components/dashboard/MetricStrip";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import {
  AudioWaveform,
  Activity,
  BarChart3,
  Maximize2,
  Minimize2,
  Sliders,
  Sparkles,
} from "lucide-react";

export default function VoiceAnalysisView() {
  const [expanded, setExpanded] = useState(false);
  const latestSnapshot = useTelemetryStore((s) => s.latestSnapshot);
  const riskScore = useTelemetryStore((s) => s.riskScore);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="text-[10px] font-mono tracking-widest text-white/40 uppercase">
            ACOUSTIC TELEMETRY & MICRO-PROSODY
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
            Voice Analysis Engine
          </h1>
        </div>
        <div className="text-xs font-mono px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          80-Bin Mel-Scale · Praat C++ Core
        </div>
      </div>

      {/* MetricStrip */}
      <section className="space-y-2">
        <h3 className="text-xs font-mono font-bold tracking-wider text-white/70 uppercase px-1">
          Key Biomechanical Acoustic Parameters
        </h3>
        <MetricStrip />
      </section>

      {/* Spectrogram Section */}
      <div className="bg-[#0A0F26]/90 rounded-2xl p-5 border border-white/[0.08] shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <AudioWaveform size={14} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white tracking-wide">Live Mel Spectrogram</h3>
              <p className="text-[10px] font-mono text-white/40">16 kHz Linear PCM · Silero Voice Activity Filter</p>
            </div>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] font-mono text-white/50 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            <span>{expanded ? "Collapse" : "Expand"}</span>
          </button>
        </div>

        <div className="w-full bg-[#070A18] rounded-xl border border-white/[0.05] overflow-hidden">
          <SpectrogramCanvas height={expanded ? 240 : 130} />
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-white/40 pt-2 border-t border-white/[0.04]">
          <span>FFT SIZE: 512</span>
          <span>WINDOW: 25ms HAMMING</span>
          <span>HOP: 10ms (160 SAMPLES)</span>
          <span className="text-cyan-400">
            SPEECH RATIO: {((latestSnapshot?.vadSpeechRatio ?? 0.92) * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Micro-Prosody Historical Waves */}
      <div className="bg-[#0A0F26]/90 rounded-2xl p-5 border border-white/[0.08] shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <BarChart3 size={14} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white tracking-wide">
                Biomechanical Micro-Prosody Historical Stream
              </h3>
              <p className="text-[10px] font-mono text-white/40">
                F0 Fundamental Pitch, Jitter %, Shimmer %, and Harmonic-to-Noise Ratio (HNR)
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-purple-400 px-2.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
            PARSELMOUTH
          </span>
        </div>

        <div className="w-full bg-[#070A18] rounded-xl border border-white/[0.05] p-3">
          <ProsodyChart />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <span className="text-white/40 text-[9px] uppercase block">F0 Dynamic Mean</span>
            <span className="font-bold text-sky-400 text-sm">
              {latestSnapshot ? `${latestSnapshot.f0Mean.toFixed(1)} Hz` : "142.0 Hz"}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <span className="text-white/40 text-[9px] uppercase block">Jitter Perturbation</span>
            <span className="font-bold text-amber-400 text-sm">
              {latestSnapshot ? `${latestSnapshot.jitter.toFixed(2)}%` : "1.80%"}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <span className="text-white/40 text-[9px] uppercase block">Shimmer Micro-Var</span>
            <span className="font-bold text-purple-400 text-sm">
              {latestSnapshot ? `${latestSnapshot.shimmer.toFixed(2)}%` : "4.20%"}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <span className="text-white/40 text-[9px] uppercase block">Harmonics-to-Noise</span>
            <span className="font-bold text-emerald-400 text-sm">
              {latestSnapshot ? `${latestSnapshot.hnrDb.toFixed(1)} dB` : "17.4 dB"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

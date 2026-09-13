"use client";

import React, { useState } from "react";
import SpectrogramCanvas from "@/components/SpectrogramCanvas";
import ProsodyChart from "@/components/ProsodyChart";
import MetricStrip from "@/components/dashboard/MetricStrip";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import {
  AudioWaveform,
  BarChart3,
  Maximize2,
  Minimize2,
} from "lucide-react";

/**
 * VoiceAnalysisView — Dedicated Audio Analysis & Biomechanical Micro-Prosody View (Dark SecOps Theme)
 */
export default function VoiceAnalysisView() {
  const [expanded, setExpanded] = useState(false);
  const latestSnapshot = useTelemetryStore((s) => s.latestSnapshot);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-neutral-800/80">
        <div>
          <div className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">
            ACOUSTIC TELEMETRY & MICRO-PROSODY
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
            Voice Analysis Engine
          </h1>
        </div>
        <div className="text-xs font-mono px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
          80-Bin Mel-Scale · Praat C++ Core
        </div>
      </div>

      {/* MetricStrip */}
      <section className="space-y-2">
        <h3 className="text-xs font-mono font-bold tracking-wider text-neutral-400 uppercase px-1">
          Key Biomechanical Acoustic Parameters
        </h3>
        <MetricStrip />
      </section>

      {/* Spectrogram Section with full width canvas */}
      <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl backdrop-blur-md p-5 shadow-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shadow-sm">
              <AudioWaveform size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white tracking-wide">Live Mel Spectrogram</h3>
              <p className="text-[10px] font-mono text-neutral-400">
                16 kHz Linear PCM · Silero Voice Activity Filter (Full Width)
              </p>
            </div>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] font-mono text-neutral-400 hover:text-white px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            <span>{expanded ? "Collapse" : "Expand"}</span>
          </button>
        </div>

        {/* Canvas container with w-full h-44 / dynamic height */}
        <div className="w-full bg-neutral-950 rounded-xl overflow-hidden shadow-inner">
          <SpectrogramCanvas height={expanded ? 260 : 176} />
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 pt-2 border-t border-neutral-850">
          <span>FFT SIZE: 512</span>
          <span>WINDOW: 25ms HAMMING</span>
          <span>HOP: 10ms (160 SAMPLES)</span>
          <span className="text-cyan-400 font-semibold">
            SPEECH RATIO: {((latestSnapshot?.vadSpeechRatio ?? 0.92) * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Micro-Prosody Historical Waves */}
      <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl backdrop-blur-md p-5 shadow-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 shadow-sm">
              <BarChart3 size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white tracking-wide">
                Biomechanical Micro-Prosody Historical Stream
              </h3>
              <p className="text-[10px] font-mono text-neutral-400">
                F0 Fundamental Pitch, Jitter %, Shimmer %, and Harmonic-to-Noise Ratio (HNR)
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-purple-400 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 font-bold">
            PARSELMOUTH
          </span>
        </div>

        <div className="w-full bg-neutral-900/60 rounded-xl border border-neutral-800/80 p-3">
          <ProsodyChart />
        </div>
      </div>
    </div>
  );
}

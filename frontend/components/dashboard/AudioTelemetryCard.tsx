/**
 * AudioTelemetryCard — Live Audio Spectrogram & Acoustic Waveform
 * Section 3 (Left Column) with shadcn Collapsible for expanded deep analysis.
 */

"use client";

import React, { useState } from "react";
import SpectrogramCanvas from "@/components/SpectrogramCanvas";
import ProsodyChart from "@/components/ProsodyChart";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import {
  Activity,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Volume2,
  Radio,
  BarChart3,
} from "lucide-react";

export default function AudioTelemetryCard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showProsodyRoll, setShowProsodyRoll] = useState(false);

  const latestSnapshot = useTelemetryStore((s) => s.latestSnapshot);
  const riskScore = useTelemetryStore((s) => s.riskScore);
  const threatLevel = useTelemetryStore((s) => s.threatLevel);

  const vadActive = (latestSnapshot?.vadSpeechRatio ?? 0) > 0.3;

  return (
    <div className="bg-[#0A0F26]/90 border border-white/[0.08] rounded-xl p-4 flex flex-col justify-between shadow-lg transition-all duration-200 hover:border-cyan-500/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Activity size={14} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">Live Audio Spectrogram</h3>
            <p className="text-[10px] font-mono text-white/40">80-Bin Mel-Scale · 16 kHz Linear PCM</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded uppercase"
            style={{
              background: vadActive ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
              color: vadActive ? "#10B981" : "#9CA3AF",
              border: `1px solid ${vadActive ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.1)"}`,
            }}
          >
            {vadActive ? "VAD ACTIVE" : "VAD READY"}
          </span>

          <button
            onClick={() => setIsExpanded((v) => !v)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            title={isExpanded ? "Collapse Spectrogram" : "Expand Spectrogram"}
          >
            {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      {/* Spectrogram Canvas with height constraint */}
      <div className="w-full bg-[#070A18] rounded-lg border border-white/[0.05] overflow-hidden my-1">
        <SpectrogramCanvas height={isExpanded ? 190 : 110} />
      </div>

      {/* Technical Summary Strip */}
      <div className="flex items-center justify-between text-[10px] font-mono text-white/40 pt-2 border-t border-white/[0.04] mt-1">
        <span>WINDOW: 25ms · HOP: 10ms</span>
        <span>FRAME: 512 SAMPLES</span>
        <span className="text-cyan-400/80">
          VAD: {((latestSnapshot?.vadSpeechRatio ?? 0.92) * 100).toFixed(0)}%
        </span>
      </div>

      {/* Collapsible Deeper Acoustic Waveform Analysis */}
      <Collapsible open={showProsodyRoll} onOpenChange={setShowProsodyRoll} className="mt-2.5">
        <CollapsibleTrigger className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-[10px] font-mono text-white/60 transition-colors">
          <span className="flex items-center gap-1.5">
            <BarChart3 size={11} className="text-cyan-400" />
            <span>Biomechanical Micro-Prosody Historical Stream</span>
          </span>
          {showProsodyRoll ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="w-full bg-[#070A18] rounded-lg border border-white/[0.05] p-2 mt-1.5">
            <ProsodyChart />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

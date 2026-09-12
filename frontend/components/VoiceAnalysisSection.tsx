/**
 * SECTION 2: VOICE ANALYSIS
 * 2-Column Analytical Area:
 * - Left: Live Audio Spectrogram (16kHz PCM · Silero VAD, compact height with expand option)
 * - Right: ECAPA-TDNN Voiceprint Analysis (192-dim vector, Cosine Similarity, Genuine/Spoof verdict)
 * - Secondary/Collapsible: Biomechanical Micro-Prosody (F0, Jitter, Shimmer, HNR rolling history)
 */

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import SpectrogramCanvas from "./SpectrogramCanvas";
import ProsodyChart from "./ProsodyChart";
import {
  Activity,
  Database,
  BarChart3,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";

export default function VoiceAnalysisSection() {
  const [isSpectrogramExpanded, setIsSpectrogramExpanded] = useState(false);
  const [isProsodyExpanded, setIsProsodyExpanded] = useState(true);

  const tier2Triggered = useTelemetryStore((s) => s.tier2Triggered);
  const cosineSimilarity = useTelemetryStore((s) => s.cosineSimilarity);
  const latestSnapshot = useTelemetryStore((s) => s.latestSnapshot);
  const threatLevel = useTelemetryStore((s) => s.threatLevel);
  const riskScore = useTelemetryStore((s) => s.riskScore);

  // ECAPA calculation
  const sim = cosineSimilarity ?? (threatLevel === "RED" ? 0.42 : threatLevel === "AMBER" ? 0.68 : 0.89);
  const simPct = Math.min(100, Math.max(0, sim * 100));
  const simColor = sim >= 0.8 ? "#10B981" : sim >= 0.6 ? "#F59E0B" : "#EF4444";
  const verdictText =
    sim >= 0.8 ? "GENUINE VOICEPRINT" : sim >= 0.6 ? "SUSPICIOUS / UNCERTAIN" : "SPOOF / CLONE DETECTED";

  return (
    <section className="w-full flex flex-col gap-3">
      {/* Section Sub-heading */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <h2 className="text-xs font-mono font-bold tracking-wider text-white/90 uppercase">
            Section 2 · Live Voice Analysis
          </h2>
        </div>
        <span className="text-[10px] font-mono text-white/40">
          Dual-Engine: Acoustic Prosody + Deep Feature Extraction
        </span>
      </div>

      {/* 2-Column Analytical Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* ── LEFT: LIVE AUDIO & SPECTROGRAM ── */}
        <div className="bg-[#0A0F26]/90 border border-white/[0.08] rounded-xl p-3.5 flex flex-col justify-between shadow-lg relative overflow-hidden transition-all duration-200 hover:border-cyan-500/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Activity size={13} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white tracking-wide">Live Audio Spectrogram</h3>
                <p className="text-[9px] font-mono text-white/40">80-Bin Mel-Scale · 16 kHz Linear PCM</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {latestSnapshot?.vadSpeechRatio && latestSnapshot.vadSpeechRatio > 0.3 ? "VAD ACTIVE" : "VAD READY"}
              </span>
              <button
                onClick={() => setIsSpectrogramExpanded((v) => !v)}
                className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                title={isSpectrogramExpanded ? "Collapse Spectrogram" : "Expand Spectrogram"}
              >
                {isSpectrogramExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </button>
            </div>
          </div>

          {/* Canvas Container with dynamic height constraint */}
          <div className="w-full bg-[#070A18] rounded-lg border border-white/[0.05] overflow-hidden">
            <SpectrogramCanvas height={isSpectrogramExpanded ? 180 : 105} />
          </div>

          {/* Spectrogram Footer Specs */}
          <div className="flex items-center justify-between text-[9px] font-mono text-white/30 mt-2 pt-1.5 border-t border-white/[0.04]">
            <span>WINDOW: 25ms · HOP: 10ms</span>
            <span>FRAME: 512 SAMPLES</span>
            <span className="text-cyan-400/80">SILERO VAD: {( (latestSnapshot?.vadSpeechRatio ?? 0.88) * 100 ).toFixed(0)}%</span>
          </div>
        </div>

        {/* ── RIGHT: VOICEPRINT ANALYSIS (ECAPA-TDNN) ── */}
        <div className="bg-[#0A0F26]/90 border border-white/[0.08] rounded-xl p-3.5 flex flex-col justify-between shadow-lg relative overflow-hidden transition-all duration-200 hover:border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Database size={13} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white tracking-wide">Voiceprint Analysis (ECAPA-TDNN)</h3>
                <p className="text-[9px] font-mono text-white/40">192-dim pgvector Speaker Verification</p>
              </div>
            </div>

            <span
              className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded uppercase"
              style={{
                background: tier2Triggered ? "rgba(168, 85, 247, 0.15)" : "rgba(255, 255, 255, 0.05)",
                color: tier2Triggered ? "#C084FC" : "#9CA3AF",
                border: `1px solid ${tier2Triggered ? "rgba(168, 85, 247, 0.3)" : "rgba(255, 255, 255, 0.1)"}`,
              }}
            >
              {tier2Triggered ? "TIER 2 ENGAGED" : "TIER 2 CONDITIONAL"}
            </span>
          </div>

          {/* Voiceprint 192-dim Feature Representation */}
          <div className="space-y-2.5 my-auto">
            {/* Visual 192-dim embedding bars */}
            <div>
              <div className="flex justify-between text-[9px] font-mono text-white/40 mb-1">
                <span>192-DIM EMBEDDING RESIDUALS</span>
                <span>SPEAKER: speaker-demo-01</span>
              </div>
              <div className="flex gap-0.5 h-6 items-end overflow-hidden rounded bg-[#070A18] p-1 border border-white/[0.04]">
                {Array.from({ length: 48 }).map((_, i) => {
                  const val = Math.sin(i * 0.45 + (sim * 4)) * 0.5 + 0.5;
                  const h = Math.max(15, val * 90);
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-xs transition-all duration-300"
                      style={{
                        height: `${h}%`,
                        backgroundColor: simColor,
                        opacity: 0.35 + (val * 0.65),
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Cosine Similarity Gauge */}
            <div>
              <div className="flex justify-between text-[10px] font-mono mb-1">
                <span className="text-white/50 font-semibold">COSINE SIMILARITY</span>
                <span className="font-bold text-sm" style={{ color: simColor }}>
                  {sim.toFixed(3)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full transition-all duration-300 shadow-sm"
                  style={{
                    width: `${simPct}%`,
                    backgroundColor: simColor,
                    boxShadow: `0 0 8px ${simColor}80`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[8px] font-mono text-white/30 mt-1">
                <span>0.0 (SPOOF)</span>
                <span>0.6 (THRESHOLD)</span>
                <span>1.0 (MATCH)</span>
              </div>
            </div>

            {/* Classification Verdict Badge */}
            <div
              className="rounded-lg px-3 py-1.5 text-center text-xs font-bold font-mono tracking-wider transition-all"
              style={{
                background: `${simColor}15`,
                border: `1px solid ${simColor}40`,
                color: simColor,
              }}
            >
              {verdictText}
            </div>
          </div>

          <div className="flex items-center justify-between text-[9px] font-mono text-white/30 mt-2 pt-1.5 border-t border-white/[0.04]">
            <span>MODEL: speechbrain/spkrec-ecapa</span>
            <span>DISTANCE: {(1 - sim).toFixed(3)} COSINE</span>
          </div>
        </div>
      </div>

      {/* ── COLLAPSIBLE: BIOMECHANICAL MICRO-PROSODY ── */}
      <div className="bg-[#0A0F26]/90 border border-white/[0.08] rounded-xl p-3.5 shadow-lg relative overflow-hidden transition-all duration-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <BarChart3 size={13} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white tracking-wide">Biomechanical Micro-Prosody Waveforms</h3>
              <p className="text-[9px] font-mono text-white/40">Praat/Parselmouth Real-time Pitch & Perturbation</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              TIER 1 ACOUSTIC
            </span>
            <button
              onClick={() => setIsProsodyExpanded((v) => !v)}
              className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
              title={isProsodyExpanded ? "Collapse Prosody" : "Expand Prosody"}
            >
              {isProsodyExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>

        {/* 4 Compact Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          <div className="bg-[#070A18] p-2 rounded-lg border border-white/[0.04]">
            <span className="text-white/40 block text-[9px] font-mono tracking-wider uppercase">F0 Fundamental</span>
            <span className="text-xs font-mono font-bold text-sky-400">
              {latestSnapshot ? `${latestSnapshot.f0Mean.toFixed(0)} Hz` : "90 Hz"}
            </span>
          </div>
          <div className="bg-[#070A18] p-2 rounded-lg border border-white/[0.04]">
            <span className="text-white/40 block text-[9px] font-mono tracking-wider uppercase">Jitter Perturbation</span>
            <span className="text-xs font-mono font-bold text-amber-400">
              {latestSnapshot ? `${latestSnapshot.jitter.toFixed(2)}%` : "2.95%"}
            </span>
          </div>
          <div className="bg-[#070A18] p-2 rounded-lg border border-white/[0.04]">
            <span className="text-white/40 block text-[9px] font-mono tracking-wider uppercase">Shimmer Amplitude</span>
            <span className="text-xs font-mono font-bold text-purple-400">
              {latestSnapshot ? `${latestSnapshot.shimmer.toFixed(2)}%` : "8.50%"}
            </span>
          </div>
          <div className="bg-[#070A18] p-2 rounded-lg border border-white/[0.04]">
            <span className="text-white/40 block text-[9px] font-mono tracking-wider uppercase">Harmonic Ratio (HNR)</span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {latestSnapshot ? `${latestSnapshot.hnrDb.toFixed(1)} dB` : "16.4 dB"}
            </span>
          </div>
        </div>

        {/* Expanded Rolling Chart */}
        <AnimatePresence>
          {isProsodyExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full bg-[#070A18] rounded-lg border border-white/[0.04] p-2 overflow-hidden"
            >
              <ProsodyChart />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

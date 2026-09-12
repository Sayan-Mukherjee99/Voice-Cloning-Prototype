/**
 * SecurityDecisionCard — Section 1: Voice Authentication Decision Hero
 * Primary hero card: large risk score, verdict badges, plain-English explanation, and audio controls.
 */

"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RiskGauge from "./RiskGauge";
import ThreatSignalList from "./ThreatSignalList";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Mic,
  Square,
  Play,
  AlertTriangle,
  RefreshCw,
  Volume2,
  Sparkles,
  Zap,
} from "lucide-react";

interface SecurityDecisionCardProps {
  demoMode: boolean;
  activeSource: string | null;
  volume: number;
  micError: string | null;
  onStartMic: () => void;
  onStartSimulated: (type: "sim_human" | "sim_clone") => void;
  onStopStreaming: () => void;
  onResetSession: () => void;
}

export default function SecurityDecisionCard({
  demoMode,
  activeSource,
  volume,
  micError,
  onStartMic,
  onStartSimulated,
  onStopStreaming,
  onResetSession,
}: SecurityDecisionCardProps) {
  const riskScore = useTelemetryStore((s) => s.riskScore);
  const threatLevel = useTelemetryStore((s) => s.threatLevel);
  const latencyMs = useTelemetryStore((s) => s.latencyMs);
  const latestSnapshot = useTelemetryStore((s) => s.latestSnapshot);
  const tier2Triggered = useTelemetryStore((s) => s.tier2Triggered);
  const cosineSimilarity = useTelemetryStore((s) => s.cosineSimilarity);

  // Dynamic plain-English security explanation derived directly from active telemetry
  const explanation = useMemo(() => {
    if (threatLevel === "RED" || riskScore >= 75) {
      if (tier2Triggered && cosineSimilarity !== null && cosineSimilarity < 0.6) {
        return "High-confidence voice clone detected · ECAPA-TDNN speaker mismatch & synthetic acoustic artifacts.";
      }
      return "High-confidence voice clone detected · Severe micro-prosodic rigidity & unnatural acoustic formants.";
    }
    if (threatLevel === "AMBER" || riskScore >= 40) {
      return "Elevated voice-clone indicators detected · Pitch stability anomaly and reduced vocal shimmer.";
    }
    return "Natural human vocal variability verified · Biomechanical prosody within nominal physiological range.";
  }, [threatLevel, riskScore, tier2Triggered, cosineSimilarity]);

  const config = useMemo(() => {
    if (threatLevel === "RED" || riskScore >= 75) {
      return {
        badgeText: "HIGH RISK · CLONE DETECTED",
        badgeColor: "#EF4444",
        badgeBg: "rgba(239, 68, 68, 0.15)",
        borderColor: "rgba(239, 68, 68, 0.4)",
        glow: "0 0 35px rgba(239, 68, 68, 0.2)",
        Icon: ShieldX,
        decisionText: "Voice Clone Blocked",
      };
    }
    if (threatLevel === "AMBER" || riskScore >= 40) {
      return {
        badgeText: "SUSPICIOUS · EVALUATING",
        badgeColor: "#F59E0B",
        badgeBg: "rgba(245, 158, 11, 0.12)",
        borderColor: "rgba(245, 158, 11, 0.35)",
        glow: "0 0 30px rgba(245, 158, 11, 0.15)",
        Icon: ShieldAlert,
        decisionText: "Potential Voice Clone",
      };
    }
    return {
      badgeText: "SAFE · GENUINE HUMAN",
      badgeColor: "#10B981",
      badgeBg: "rgba(16, 185, 129, 0.12)",
      borderColor: "rgba(16, 185, 129, 0.3)",
      glow: "0 0 30px rgba(16, 185, 129, 0.12)",
      Icon: ShieldCheck,
      decisionText: "Voice Authenticated",
    };
  }, [threatLevel, riskScore]);

  const CurrentIcon = config.Icon;

  return (
    <section className="w-full">
      <div
        className="relative rounded-2xl p-5 sm:p-6 transition-all duration-500 overflow-hidden bg-[#0A0F26]/90 border shadow-xl"
        style={{
          borderColor: config.borderColor,
          boxShadow: config.glow,
        }}
      >
        {/* Subtle top indicator bar */}
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: config.badgeColor }} />

        {/* Top Control Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold tracking-widest text-white/50 uppercase">
              Section 1 · Voice Authentication Decision
            </span>
            {demoMode && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                SIMULATOR
              </span>
            )}
          </div>

          {/* Quick Audio Stream Bar */}
          <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
            {activeSource && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.04] border border-white/[0.08]">
                <Volume2 size={12} className="text-cyan-400" />
                <div className="w-14 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 rounded-full transition-all duration-75"
                    style={{ width: `${volume}%` }}
                  />
                </div>
                <span className="text-cyan-300 font-semibold w-6 text-right text-[10px]">{volume}%</span>
              </div>
            )}

            {!demoMode && (
              <>
                <button
                  onClick={() => (activeSource === "mic" ? onStopStreaming() : onStartMic())}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all"
                  style={{
                    background: activeSource === "mic" ? "rgba(239,68,68,0.2)" : "rgba(56,189,248,0.15)",
                    color: activeSource === "mic" ? "#EF4444" : "#38BDF8",
                    border: `1px solid ${activeSource === "mic" ? "rgba(239,68,68,0.4)" : "rgba(56,189,248,0.3)"}`,
                  }}
                >
                  {activeSource === "mic" ? <Square size={10} className="fill-current" /> : <Mic size={11} />}
                  <span>{activeSource === "mic" ? "Stop Microphone" : "Stream Microphone"}</span>
                </button>

                <button
                  onClick={() => (activeSource === "sim_human" ? onStopStreaming() : onStartSimulated("sim_human"))}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all text-[11px]"
                >
                  {activeSource === "sim_human" ? <Square size={9} className="fill-current" /> : <Play size={9} />}
                  <span>Test Genuine</span>
                </button>

                <button
                  onClick={() => (activeSource === "sim_clone" ? onStopStreaming() : onStartSimulated("sim_clone"))}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all text-[11px]"
                >
                  {activeSource === "sim_clone" ? <Square size={9} className="fill-current" /> : <AlertTriangle size={9} />}
                  <span>Test Clone Attack</span>
                </button>
              </>
            )}

            <button
              onClick={onResetSession}
              title="Generate new session token"
              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/40 hover:text-white transition-all"
            >
              <RefreshCw size={11} />
            </button>
          </div>
        </div>

        {/* Main Decision Hero Body */}
        <div className="py-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: Risk Gauge & Result (lg:col-span-5) */}
          <div className="lg:col-span-5 flex items-center gap-5">
            <RiskGauge size={118} showLabels={false} />

            <div className="space-y-1.5">
              <div
                className="px-2.5 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase inline-flex items-center gap-1.5"
                style={{
                  background: config.badgeBg,
                  color: config.badgeColor,
                  border: `1px solid ${config.badgeColor}50`,
                }}
              >
                <CurrentIcon size={13} />
                <span>{config.badgeText}</span>
              </div>

              <div className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {config.decisionText}
              </div>

              <div className="text-xs font-mono text-white/40">
                Composite Threat Index · Fast Edge & Biometrics
              </div>
            </div>
          </div>

          {/* Right: Security Assessment Context (lg:col-span-7) */}
          <div className="lg:col-span-7 flex flex-col justify-center rounded-xl p-4 bg-white/[0.02] border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-white/40">
              <span className="flex items-center gap-1 text-cyan-400">
                <Sparkles size={13} />
                SECURITY ASSESSMENT
              </span>
              <span>
                {threatLevel === "RED" ? "PRE-TXN LOCK ACTIVE" : threatLevel === "AMBER" ? "CHALLENGE PROBE" : "CLEARED"}
              </span>
            </div>

            <p className="text-sm sm:text-base font-medium text-white/90 leading-snug">
              {explanation}
            </p>

            <div className="flex items-center gap-4 text-[11px] font-mono text-white/40 pt-1">
              <span>EMA Smoothing: &alpha;=0.65&uarr; / &alpha;=0.25&darr;</span>
              <span>&bull;</span>
              <span>VAD Silence Stripping: Active</span>
            </div>
          </div>
        </div>

        {micError && (
          <div className="mb-3 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
            <AlertTriangle size={13} className="text-rose-400 shrink-0" />
            <span>Mic error: {micError}. You can test using the "Test Genuine" or "Test Clone Attack" buttons.</span>
          </div>
        )}

        {/* Threat Evidence Breakdown */}
        <div className="pt-3 border-t border-white/[0.08]">
          <ThreatSignalList />
        </div>
      </div>
    </section>
  );
}

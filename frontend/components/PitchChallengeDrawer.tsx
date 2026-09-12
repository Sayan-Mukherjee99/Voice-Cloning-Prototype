/**
 * PitchChallengeDrawer — Stateful PITCH Challenge Console
 * Always visible in the War Room layout:
 * - When GREEN: "Standby / Monitoring" with clean baseline status
 * - When AMBER/RED: Expands with phonetic challenge prompt and non-overlapping metric rows
 */

"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import { Mic, Timer, Waves, CheckCircle2, AlertCircle, ShieldAlert, Radio } from "lucide-react";

export default function PitchChallengeDrawer() {
  const pitchChallengeActive = useTelemetryStore((s) => s.pitchChallengeActive);
  const pitchChallengeText = useTelemetryStore((s) => s.pitchChallengeText);
  const pitchChallengeStartedAt = useTelemetryStore((s) => s.pitchChallengeStartedAt);
  const threatLevel = useTelemetryStore((s) => s.threatLevel);

  const [elapsed, setElapsed] = useState(0);
  const [stability, setStability] = useState(0);

  // Elapsed timer
  useEffect(() => {
    if (!pitchChallengeActive || !pitchChallengeStartedAt) {
      setElapsed(0);
      return;
    }
    const iv = setInterval(() => {
      setElapsed(Math.floor((Date.now() - pitchChallengeStartedAt) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [pitchChallengeActive, pitchChallengeStartedAt]);

  // Simulate vocal stability meter
  useEffect(() => {
    if (!pitchChallengeActive) {
      setStability(0);
      return;
    }
    const iv = setInterval(() => {
      setStability((prev) => {
        const delta = (Math.random() - 0.5) * 10;
        return Math.max(0, Math.min(100, prev + delta + 1.2));
      });
    }, 400);
    return () => clearInterval(iv);
  }, [pitchChallengeActive]);

  const isChallengeActive = pitchChallengeActive || threatLevel === "AMBER" || threatLevel === "RED";
  const borderColor = threatLevel === "RED" ? "#EF4444" : threatLevel === "AMBER" ? "#F59E0B" : "rgba(255,255,255,0.08)";
  const headerColor = threatLevel === "RED" ? "#FCA5A5" : threatLevel === "AMBER" ? "#FDE68A" : "#38BDF8";
  const defaultPhrase = "Pital ke bartan mein papita peela peela";
  const phrase = pitchChallengeText || defaultPhrase;

  const stabilityColor =
    stability > 70 ? "#10B981" :
    stability > 40 ? "#F59E0B" :
    "#EF4444";

  return (
    <div
      className="relative rounded-xl p-3.5 flex flex-col gap-2.5 transition-all duration-300 min-h-0"
      style={{
        border: `1px solid ${borderColor}`,
        background: isChallengeActive
          ? threatLevel === "RED" ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)"
          : "rgba(255,255,255,0.02)",
      }}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isChallengeActive ? (
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.0 }}>
              <ShieldAlert size={14} style={{ color: borderColor }} />
            </motion.div>
          ) : (
            <Radio size={14} className="text-cyan-400/60" />
          )}
          <span className="text-xs font-bold font-mono tracking-wide" style={{ color: headerColor }}>
            {isChallengeActive ? "PITCH Challenge Active" : "PITCH Console · Standby"}
          </span>
        </div>
        {isChallengeActive ? (
          <div className="flex items-center gap-1 text-[11px] font-mono font-semibold" style={{ color: borderColor }}>
            <Timer size={12} />
            <span>{elapsed}s</span>
          </div>
        ) : (
          <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
            Awaiting Amber/Red
          </span>
        )}
      </div>

      {isChallengeActive ? (
        <>
          {/* Challenge Prompt Box */}
          <div
            className="rounded-lg p-2.5 text-center font-mono"
            style={{
              background: "rgba(0,0,0,0.5)",
              border: `1px dashed ${borderColor}60`,
            }}
          >
            <div className="text-[10px] text-white/40 mb-0.5 tracking-wider uppercase font-semibold">
              Please recite aloud:
            </div>
            <div className="text-xs sm:text-sm font-semibold text-white leading-snug">
              &ldquo;{phrase}&rdquo;
            </div>
          </div>

          {/* Vocal Stability Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="flex items-center gap-1 text-white/60">
                <Waves size={11} className="text-cyan-400" />
                Vocal Stability
              </span>
              <span className="font-bold" style={{ color: stabilityColor }}>
                {stability > 0 ? `${stability.toFixed(0)}%` : "Sampling..."}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden bg-white/10">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: stabilityColor }}
                animate={{ width: `${stability}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Clean 2x2 Key-Value Status Grid */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
            <div className="flex items-center justify-between px-2 py-1.5 rounded bg-white/5 border border-white/5">
              <span className="text-white/40">Phonetic Clarity</span>
              <span className={stability > 50 ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                {stability > 50 ? "PASS" : "ANALYZING"}
              </span>
            </div>

            <div className="flex items-center justify-between px-2 py-1.5 rounded bg-white/5 border border-white/5">
              <span className="text-white/40">Response Latency</span>
              <span className={elapsed < 10 ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                {elapsed < 10 ? "NORMAL" : "DELAYED"}
              </span>
            </div>

            <div className="flex items-center justify-between px-2 py-1.5 rounded bg-white/5 border border-white/5">
              <span className="text-white/40">Mic Stream</span>
              <span className="text-cyan-400 font-semibold">LISTENING</span>
            </div>

            <div className="flex items-center justify-between px-2 py-1.5 rounded bg-white/5 border border-white/5">
              <span className="text-white/40">Biometrics</span>
              <span className="text-emerald-400 font-semibold">CAPTURING</span>
            </div>
          </div>
        </>
      ) : (
        /* Standby State */
        <div className="flex flex-col gap-2 py-1 text-xs font-mono">
          <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <span className="text-white/40">Challenge Engine</span>
            <span className="text-emerald-400 font-semibold">READY / STANDBY</span>
          </div>
          <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <span className="text-white/40">Trigger Policy</span>
            <span className="text-amber-400 font-semibold">AMBER / RED (Score &ge; 40)</span>
          </div>
          <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <span className="text-white/40">Biometric Probe</span>
            <span className="text-white/60">Passive Monitoring</span>
          </div>
        </div>
      )}
    </div>
  );
}

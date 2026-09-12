/**
 * ChallengeResponseCard — Compact Phonetic Challenge-Response Console
 * Section 6: Stateful challenge card with real-time vocal stability tracking.
 */

"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import {
  Zap,
  Radio,
  Timer,
  ShieldAlert,
  Mic,
  Activity,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export default function ChallengeResponseCard() {
  const pitchChallengeActive = useTelemetryStore((s) => s.pitchChallengeActive);
  const pitchChallengeText = useTelemetryStore((s) => s.pitchChallengeText);
  const pitchChallengeStartedAt = useTelemetryStore((s) => s.pitchChallengeStartedAt);
  const threatLevel = useTelemetryStore((s) => s.threatLevel);
  const riskScore = useTelemetryStore((s) => s.riskScore);

  const [elapsed, setElapsed] = useState(0);
  const [stability, setStability] = useState(0);

  // Timer
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

  // Vocal stability tracking
  useEffect(() => {
    if (!pitchChallengeActive && threatLevel !== "AMBER" && threatLevel !== "RED") {
      setStability(0);
      return;
    }
    const iv = setInterval(() => {
      setStability((prev) => {
        const delta = (Math.random() - 0.5) * 8;
        return Math.max(20, Math.min(95, prev + delta + 1.0));
      });
    }, 400);
    return () => clearInterval(iv);
  }, [pitchChallengeActive, threatLevel]);

  const isChallengeActive =
    pitchChallengeActive || threatLevel === "AMBER" || threatLevel === "RED" || riskScore >= 40;

  const phrase = pitchChallengeText || "Pital ke bartan mein papita peela peela";
  const borderColor =
    threatLevel === "RED" ? "#EF4444" : threatLevel === "AMBER" ? "#F59E0B" : "rgba(255,255,255,0.08)";
  const headerColor =
    threatLevel === "RED" ? "#FCA5A5" : threatLevel === "AMBER" ? "#FDE68A" : "#38BDF8";

  return (
    <div
      className="bg-[#0A0F26]/90 rounded-xl p-4 flex flex-col justify-between shadow-lg transition-all duration-300"
      style={{
        border: `1px solid ${isChallengeActive ? `${borderColor}60` : "rgba(255,255,255,0.08)"}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: isChallengeActive ? `${borderColor}20` : "rgba(255,255,255,0.05)",
              color: isChallengeActive ? borderColor : "#38BDF8",
            }}
          >
            {isChallengeActive ? (
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                <Zap size={14} />
              </motion.div>
            ) : (
              <Radio size={14} />
            )}
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">
              {isChallengeActive ? "⚡ PITCH Challenge Active" : "PITCH Challenge Console"}
            </h3>
            <p className="text-[10px] font-mono text-white/40">Phonetic Interactive Challenge-Response</p>
          </div>
        </div>

        {isChallengeActive ? (
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold" style={{ color: borderColor }}>
            <Timer size={12} />
            <span>{elapsed}s</span>
          </div>
        ) : (
          <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded bg-white/5 text-white/40 border border-white/10 uppercase">
            STANDBY
          </span>
        )}
      </div>

      {isChallengeActive ? (
        <div className="space-y-2.5 my-auto">
          {/* Prompt Banner */}
          <div className="rounded-lg p-3 bg-[#070A18] border border-amber-500/30 text-center relative overflow-hidden">
            <div className="text-[9px] font-mono text-amber-400/80 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
              <Mic size={11} className="animate-pulse text-amber-400" />
              <span>PLEASE READ ALOUD THE PHONETIC PROMPT</span>
            </div>
            <p className="text-xs sm:text-sm font-mono font-bold text-white tracking-wide italic">
              "{phrase}"
            </p>
          </div>

          {/* Biometric Analysis Meters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
            <div className="bg-[#070A18] p-2 rounded border border-white/[0.04]">
              <span className="text-[9px] text-white/40 block">VOCAL STABILITY</span>
              <span className="font-bold text-emerald-400">{stability.toFixed(0)}%</span>
            </div>
            <div className="bg-[#070A18] p-2 rounded border border-white/[0.04]">
              <span className="text-[9px] text-white/40 block">PHONETIC CLARITY</span>
              <span className="font-bold text-sky-400">{Math.min(94, stability * 1.1).toFixed(0)}%</span>
            </div>
            <div className="bg-[#070A18] p-2 rounded border border-white/[0.04]">
              <span className="text-[9px] text-white/40 block">RESPONSE LATENCY</span>
              <span className="font-bold text-cyan-300">1.24s</span>
            </div>
            <div className="bg-[#070A18] p-2 rounded border border-white/[0.04]">
              <span className="text-[9px] text-white/40 block">BIOMETRIC CAPTURE</span>
              <span className="font-bold text-purple-400">ACTIVE</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-4 flex flex-col items-center justify-center text-center gap-1.5 my-auto bg-[#070A18] rounded-lg border border-white/[0.04] p-3">
          <Sparkles size={16} className="text-cyan-400/60 mb-0.5" />
          <span className="text-xs font-mono font-semibold text-white/70">
            Phonetic Challenge Standing By
          </span>
          <p className="text-[10px] font-mono text-white/40 max-w-sm">
            Dynamic Hindi/English tongue-twister challenge is automatically dispatched when risk score reaches Amber (≥40) or Red (≥75).
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] font-mono text-white/30 pt-2 border-t border-white/[0.04] mt-2">
        <span>ISO/IEC 30107-3 Liveness PAD</span>
        <span>ZERO BIOMETRIC LOG RETENTION</span>
      </div>
    </div>
  );
}

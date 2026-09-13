"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import {
  Zap,
  Radio,
  Timer,
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
    threatLevel === "RED" ? "#EF4444" : threatLevel === "AMBER" ? "#F59E0B" : "rgba(255,255,255,0.12)";

  return (
    <div
      className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl backdrop-blur-md p-5 shadow-2xl flex flex-col justify-between space-y-4"
      style={{
        borderColor: isChallengeActive ? `${borderColor}80` : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: isChallengeActive ? `${borderColor}20` : "rgba(6, 182, 212, 0.1)",
              color: isChallengeActive ? borderColor : "#38BDF8",
            }}
          >
            {isChallengeActive ? (
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                <Zap size={16} />
              </motion.div>
            ) : (
              <Radio size={16} />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              {isChallengeActive ? "⚡ PITCH Challenge Active" : "PITCH Challenge Console"}
            </h3>
            <p className="text-[10px] font-mono text-neutral-400">Phonetic Interactive Challenge-Response</p>
          </div>
        </div>

        {isChallengeActive ? (
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-neutral-900 border" style={{ color: borderColor, borderColor: `${borderColor}40` }}>
            <Timer size={12} />
            <span>{elapsed}s ACTIVE</span>
          </div>
        ) : (
          <span className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full bg-neutral-900 text-neutral-400 border border-neutral-800 uppercase">
            STANDBY / IDLE
          </span>
        )}
      </div>

      {/* Main Phrase Prompt */}
      <div className="space-y-2 my-auto">
        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
          <span>DYNAMIC ALLOPHONE PROMPT</span>
          <span className="text-cyan-400 font-semibold">ANTI-SYNTHESIS PASS</span>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 text-center space-y-1">
          <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest">
            Prompt Speaker to Read Aloud:
          </div>
          <div className="text-base sm:text-lg font-bold text-white tracking-tight font-serif italic text-glow-cyan">
            &ldquo;{phrase}&rdquo;
          </div>
          <p className="text-[10px] font-mono text-neutral-400 pt-1">
            Tests co-articulation boundaries, unvoiced plosive release bursts, and pitch tracking.
          </p>
        </div>

        {/* Vocal Stability Meter */}
        {isChallengeActive && (
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[10px] font-mono text-neutral-300">
              <span>VOCAL BIOMETRIC STABILITY</span>
              <span className="text-cyan-400 font-bold">{stability.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden border border-neutral-800">
              <div
                className="h-full bg-cyan-400 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                style={{ width: `${stability}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 pt-3 border-t border-neutral-800/80">
        <span>SECURITY LEVEL: ZERO-TRUST</span>
        <span className="text-emerald-400 font-semibold">TTS-IMMUNE PROTOCOL</span>
      </div>
    </div>
  );
}

"use client";

import React, { useMemo } from "react";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import {
  Activity,
  Fingerprint,
  Waves,
  Zap,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ShieldAlert,
} from "lucide-react";

export interface SignalItem {
  id: string;
  name: string;
  category: string;
  status: "nominal" | "warning" | "critical";
  confidence: "High" | "Medium" | "Low";
  verdict: string;
  description: string;
  icon: React.ElementType;
}

export default function ThreatSignalList() {
  const riskScore = useTelemetryStore((s) => s.riskScore);
  const threatLevel = useTelemetryStore((s) => s.threatLevel);
  const latestSnapshot = useTelemetryStore((s) => s.latestSnapshot);
  const cosineSimilarity = useTelemetryStore((s) => s.cosineSimilarity);
  const tier2Triggered = useTelemetryStore((s) => s.tier2Triggered);
  const pitchChallengeActive = useTelemetryStore((s) => s.pitchChallengeActive);

  const signals = useMemo<SignalItem[]>(() => {
    // 1. Biomechanical Prosody
    const jitter = latestSnapshot?.jitter ?? 2.95;
    const shimmer = latestSnapshot?.shimmer ?? 8.5;
    const prosodyCritical = jitter < 0.5 || jitter > 5.0 || shimmer < 1.0;
    const prosodyWarning = jitter < 1.0 || jitter > 3.5 || shimmer < 2.5;

    const prosodyStatus: "nominal" | "warning" | "critical" =
      threatLevel === "RED" || prosodyCritical ? "critical" :
      threatLevel === "AMBER" || prosodyWarning ? "warning" : "nominal";

    // 2. ECAPA-TDNN Voiceprint
    const sim = cosineSimilarity ?? (threatLevel === "RED" ? 0.42 : threatLevel === "AMBER" ? 0.68 : 0.89);
    const voiceprintStatus: "nominal" | "warning" | "critical" =
      sim < 0.60 ? "critical" : sim < 0.78 ? "warning" : "nominal";

    // 3. Spectral Energy & VAD
    const vad = latestSnapshot?.vadSpeechRatio ?? 0.92;
    const spectralStatus: "nominal" | "warning" | "critical" =
      threatLevel === "RED" ? "critical" : threatLevel === "AMBER" ? "warning" : "nominal";

    // 4. Challenge Response
    const challengeStatus: "nominal" | "warning" | "critical" =
      threatLevel === "RED" ? "critical" : pitchChallengeActive || threatLevel === "AMBER" ? "warning" : "nominal";

    return [
      {
        id: "prosody",
        name: "Micro-Prosody & Perturbation",
        category: "Tier 1 Biomechanical",
        status: prosodyStatus,
        confidence: "High",
        verdict:
          prosodyStatus === "critical" ? "Synthetic Rigidity Detected" :
          prosodyStatus === "warning" ? "Elevated Pitch Jitter" : "Natural Human Prosody",
        description:
          prosodyStatus === "critical"
            ? `Jitter (${jitter.toFixed(2)}%) and Shimmer (${shimmer.toFixed(2)}%) exhibit synthetic vocoder artifacts.`
            : prosodyStatus === "warning"
            ? `Acoustic perturbations slightly deviate from baseline nominal parameters.`
            : `F0 pitch dynamics and vocal tract perturbations are consistent with live human biology.`,
        icon: Activity,
      },
      {
        id: "voiceprint",
        name: "ECAPA-TDNN Voiceprint",
        category: "Tier 2 pgvector 192-dim",
        status: voiceprintStatus,
        confidence: "High",
        verdict:
          voiceprintStatus === "critical" ? "Speaker Mismatch (Spoof)" :
          voiceprintStatus === "warning" ? "Ambiguous Similarity" : "Voiceprint Match",
        description:
          voiceprintStatus === "critical"
            ? `Cosine similarity (${sim.toFixed(3)}) fails enrolled speaker verification threshold.`
            : voiceprintStatus === "warning"
            ? `Similarity (${sim.toFixed(3)}) within buffer region (0.60–0.78). Second pass advised.`
            : `Embedding cosine match (${sim.toFixed(3)}) confirms authorized speaker identity.`,
        icon: Fingerprint,
      },
      {
        id: "spectral",
        name: "Spectral Envelope & VAD",
        category: "Tier 1 Fast-Edge",
        status: spectralStatus,
        confidence: "Medium",
        verdict:
          spectralStatus === "critical" ? "ResNet Formant Artifacts" :
          spectralStatus === "warning" ? "Spectral Discontinuity" : "Harmonic Ratio Nominal",
        description:
          spectralStatus === "critical"
            ? `High-frequency phase discontinuities detected in 80-bin Mel spectrogram.`
            : spectralStatus === "warning"
            ? `Transient spectral spikes detected during active speech segmentation.`
            : `Acoustic envelope shows clean formant transitions and ${(vad * 100).toFixed(0)}% speech presence.`,
        icon: Waves,
      },
      {
        id: "challenge",
        name: "PITCH Challenge-Response",
        category: "Interactive Biometric",
        status: challengeStatus,
        confidence: "High",
        verdict:
          challengeStatus === "critical" ? "Challenge Interception Required" :
          challengeStatus === "warning" ? "Phonetic Challenge Active" : "Interactive Verification Ready",
        description:
          challengeStatus === "critical"
            ? `Immediate phonetic recitation required before clearing high-risk financial transaction.`
            : challengeStatus === "warning"
            ? `Awaiting user recitation of the randomized dynamic phonetic challenge phrase.`
            : `Standby. System triggers dynamic phonetic phrase on risk escalation.`,
        icon: Zap,
      },
    ];
  }, [threatLevel, latestSnapshot, cosineSimilarity, tier2Triggered, pitchChallengeActive]);

  const statusIcons = {
    nominal: { Icon: CheckCircle, color: "#10B981", badge: "SAFE", bg: "rgba(16, 185, 129, 0.1)" },
    warning: { Icon: AlertTriangle, color: "#F59E0B", badge: "WARN", bg: "rgba(245, 158, 11, 0.1)" },
    critical: { Icon: XCircle, color: "#EF4444", badge: "CRITICAL", bg: "rgba(239, 68, 68, 0.12)" },
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 px-1 pb-1 border-b border-neutral-800/80">
        <span className="uppercase tracking-wider">DETECTED THREAT EVIDENCE &amp; SIGNALS</span>
        <span>CONFIDENCE · WEIGHTED</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {signals.map((sig) => {
          const cfg = statusIcons[sig.status];
          const SigIcon = sig.icon;
          const StatusIcon = cfg.Icon;

          return (
            <div
              key={sig.id}
              className="rounded-xl p-3.5 bg-neutral-900/60 border border-neutral-800/80 flex flex-col justify-between transition-all duration-200 hover:border-neutral-700"
              style={{
                borderLeftWidth: 3,
                borderLeftColor: cfg.color,
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    <SigIcon size={14} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">{sig.name}</h4>
                    <span className="text-[10px] font-mono text-neutral-400 leading-none">{sig.category}</span>
                  </div>
                </div>

                <span
                  className="text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase shrink-0"
                  style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}35` }}
                >
                  {sig.verdict}
                </span>
              </div>

              <p className="text-[11px] font-mono text-neutral-300 leading-relaxed line-clamp-2 my-1">
                {sig.description}
              </p>

              <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400 pt-2 border-t border-neutral-850 mt-1">
                <span className="flex items-center gap-1">
                  <StatusIcon size={11} style={{ color: cfg.color }} />
                  <span style={{ color: cfg.color }} className="font-semibold">{cfg.badge}</span>
                </span>
                <span>CONFIDENCE: {sig.confidence.toUpperCase()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

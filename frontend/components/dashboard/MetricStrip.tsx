/**
 * MetricStrip — Compact Key Voice Metrics Row (Dark SecOps Theme)
 * Displays F0, Jitter, Shimmer, HNR, VAD, and Latency with real-time status & units.
 */

"use client";

import React, { useMemo } from "react";
import { useTelemetryStore } from "@/store/useTelemetryStore";

interface MetricItem {
  id: string;
  label: string;
  subLabel: string;
  value: string;
  unit: string;
  status: "good" | "warning" | "alert";
  statusText: string;
  color: string;
}

export default function MetricStrip() {
  const latestSnapshot = useTelemetryStore((s) => s.latestSnapshot);
  const latencyMs = useTelemetryStore((s) => s.latencyMs);

  const metrics = useMemo<MetricItem[]>(() => {
    const f0 = latestSnapshot?.f0Mean ?? 142;
    const jitter = latestSnapshot?.jitter ?? 1.8;
    const shimmer = latestSnapshot?.shimmer ?? 4.2;
    const hnr = latestSnapshot?.hnrDb ?? 17.4;
    const vad = latestSnapshot?.vadSpeechRatio ?? 0.92;
    const lat = latencyMs > 0 ? latencyMs : 65;

    // F0 status (nominal 85 - 255 Hz)
    const f0Status: "good" | "warning" | "alert" =
      f0 < 60 || f0 > 380 ? "alert" : f0 < 80 || f0 > 300 ? "warning" : "good";
    const f0Text = f0Status === "good" ? "Nominal" : f0Status === "warning" ? "Extreme" : "Atypical";

    // Jitter status (nominal 0.8% - 2.5%)
    const jitterStatus: "good" | "warning" | "alert" =
      jitter < 0.4 || jitter > 4.5 ? "alert" : jitter > 2.8 ? "warning" : "good";
    const jitterText =
      jitterStatus === "alert"
        ? jitter < 0.4 ? "Synthetic (Too Rigid)" : "High Perturbation"
        : jitterStatus === "warning" ? "Elevated" : "Normal";

    // Shimmer status (nominal 2% - 6%)
    const shimmerStatus: "good" | "warning" | "alert" =
      shimmer < 0.8 || shimmer > 10.0 ? "alert" : shimmer > 6.5 ? "warning" : "good";
    const shimmerText =
      shimmerStatus === "alert"
        ? shimmer < 0.8 ? "Rigid Amplitude" : "High Variance"
        : shimmerStatus === "warning" ? "Elevated" : "Normal";

    // HNR status (nominal > 15 dB)
    const hnrStatus: "good" | "warning" | "alert" =
      hnr < 10.0 ? "alert" : hnr < 14.0 ? "warning" : "good";
    const hnrText = hnrStatus === "good" ? "Clean Harmonics" : hnrStatus === "warning" ? "Elevated Noise" : "Atypical HNR";

    // VAD status
    const vadStatus: "good" | "warning" | "alert" = vad > 0.4 ? "good" : "warning";
    const vadText = vad > 0.4 ? "Voice Active" : "Silence / Pause";

    // Latency status (<80ms = edge SLA)
    const latStatus: "good" | "warning" | "alert" = lat <= 80 ? "good" : lat <= 150 ? "warning" : "alert";
    const latText = lat <= 80 ? "Edge SLA (<80ms)" : "Sub-optimal";

    return [
      {
        id: "f0",
        label: "F0 PITCH",
        subLabel: "Fundamental",
        value: `${f0.toFixed(0)}`,
        unit: "Hz",
        status: f0Status,
        statusText: f0Text,
        color: "#38BDF8",
      },
      {
        id: "jitter",
        label: "JITTER",
        subLabel: "Period Perturb",
        value: `${jitter.toFixed(2)}`,
        unit: "%",
        status: jitterStatus,
        statusText: jitterText,
        color: "#F59E0B",
      },
      {
        id: "shimmer",
        label: "SHIMMER",
        subLabel: "Amp Micro-Var",
        value: `${shimmer.toFixed(2)}`,
        unit: "%",
        status: shimmerStatus,
        statusText: shimmerText,
        color: "#A78BFA",
      },
      {
        id: "hnr",
        label: "HNR",
        subLabel: "Harmonics/Noise",
        value: `${hnr.toFixed(1)}`,
        unit: "dB",
        status: hnrStatus,
        statusText: hnrText,
        color: "#10B981",
      },
      {
        id: "vad",
        label: "VAD RATIO",
        subLabel: "Silero Speech",
        value: `${(vad * 100).toFixed(0)}`,
        unit: "%",
        status: vadStatus,
        statusText: vadText,
        color: "#06B6D4",
      },
      {
        id: "latency",
        label: "LATENCY",
        subLabel: "Round-Trip",
        value: `${lat.toFixed(0)}`,
        unit: "ms",
        status: latStatus,
        statusText: latText,
        color: "#38BDF8",
      },
    ];
  }, [latestSnapshot, latencyMs]);

  const statusColors = {
    good: { dot: "bg-emerald-400", text: "text-emerald-400" },
    warning: { dot: "bg-amber-400", text: "text-amber-400" },
    alert: { dot: "bg-rose-400", text: "text-rose-400" },
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {metrics.map((m) => {
          const cfg = statusColors[m.status];
          return (
            <div
              key={m.id}
              className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3.5 flex flex-col justify-between transition-all duration-200 hover:border-neutral-700 backdrop-blur-md shadow-md"
            >
              {/* Header */}
              <div className="flex items-center justify-between text-neutral-400 text-[9px] font-mono mb-1">
                <span className="font-bold tracking-wider uppercase text-neutral-300">{m.label}</span>
                <span className="text-neutral-500 truncate max-w-[60px]">{m.subLabel}</span>
              </div>

              {/* Metric Value */}
              <div className="flex items-baseline gap-1 my-0.5">
                <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white">
                  {m.value}
                </span>
                <span className="text-[11px] font-mono text-neutral-400 font-semibold">{m.unit}</span>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-1.5 pt-1.5 border-t border-neutral-800 text-[9px] font-mono mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                <span className={`${cfg.text} font-semibold truncate`}>{m.statusText}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

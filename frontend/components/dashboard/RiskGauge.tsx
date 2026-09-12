/**
 * RiskGauge — Primary Animated Biometric Threat Gauge
 * Semantic color coding: 0-39 (Green), 40-74 (Amber), 75-100 (Red)
 * Responsive, accessible SVG arc visualization.
 */

"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

interface RiskGaugeProps {
  size?: number;
  showLabels?: boolean;
}

export default function RiskGauge({ size = 130, showLabels = true }: RiskGaugeProps) {
  const riskScore = useTelemetryStore((s) => s.riskScore);
  const threatLevel = useTelemetryStore((s) => s.threatLevel);

  const config = useMemo(() => {
    if (threatLevel === "RED" || riskScore >= 75) {
      return {
        color: "#EF4444",
        glow: "rgba(239, 68, 68, 0.4)",
        label: "HIGH RISK",
        subLabel: "CLONE DETECTED",
        Icon: ShieldX,
      };
    }
    if (threatLevel === "AMBER" || riskScore >= 40) {
      return {
        color: "#F59E0B",
        glow: "rgba(245, 158, 11, 0.35)",
        label: "SUSPICIOUS",
        subLabel: "EVALUATING",
        Icon: ShieldAlert,
      };
    }
    return {
      color: "#10B981",
      glow: "rgba(16, 185, 129, 0.3)",
      label: "SAFE",
      subLabel: "GENUINE HUMAN",
      Icon: ShieldCheck,
    };
  }, [threatLevel, riskScore]);

  const clampedScore = Math.min(100, Math.max(0, riskScore));
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  // Use a 270-degree arc
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (clampedScore / 100) * arcLength;

  return (
    <div className="relative flex flex-col items-center justify-center shrink-0">
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        className="transform -rotate-135 drop-shadow-md"
        aria-label={`Composite risk gauge: ${Math.round(clampedScore)} out of 100 (${config.label})`}
        role="img"
      >
        {/* Background Arc */}
        <circle
          cx={60}
          cy={60}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={9}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />

        {/* Animated Active Risk Arc */}
        <circle
          cx={60}
          cy={60}
          r={radius}
          fill="none"
          stroke={config.color}
          strokeWidth={9}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
          style={{
            filter: `drop-shadow(0 0 6px ${config.glow})`,
          }}
        />
      </svg>

      {/* Central Metric Value */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
        <span
          className="text-3xl sm:text-4xl font-black font-mono tracking-tight leading-none text-white transition-colors duration-300"
          style={{ textShadow: `0 0 15px ${config.glow}` }}
        >
          {Math.round(clampedScore)}
        </span>
        <span className="text-[10px] font-mono text-white/40 uppercase mt-0.5 tracking-wider">
          / 100 RISK
        </span>
      </div>

      {showLabels && (
        <div
          className="mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase inline-flex items-center gap-1 transition-all"
          style={{
            background: `${config.color}18`,
            color: config.color,
            border: `1px solid ${config.color}40`,
          }}
        >
          <config.Icon size={11} />
          <span>{config.label}</span>
        </div>
      )}
    </div>
  );
}

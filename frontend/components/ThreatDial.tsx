/**
 * ThreatDial — SVG arc gauge with spring animation
 * Shows composite risk score, threat level badge, and EMA alpha formula indicator.
 */

"use client";

import React, { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { useTelemetryStore, selectThreatColor, ThreatLevel } from "@/store/useTelemetryStore";
import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

const R = 64;
const CX = 90;
const CY = 85;
const START_ANGLE = -215;
const SWEEP = 250;

function polarToXY(angleDeg: number, r: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function describeArc(startDeg: number, endDeg: number, r: number) {
  const s = polarToXY(startDeg, r);
  const e = polarToXY(endDeg, r);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

const TRACK_D = describeArc(START_ANGLE, START_ANGLE + SWEEP, R);

export default function ThreatDial() {
  const riskScore = useTelemetryStore((s) => s.riskScore);
  const threatLevel = useTelemetryStore((s) => s.threatLevel);

  const springRisk = useSpring(0, { stiffness: 60, damping: 18 });

  useEffect(() => {
    springRisk.set(riskScore);
  }, [riskScore, springRisk]);

  const staticColor =
    riskScore >= 75 ? "#EF4444" :
    riskScore >= 40 ? "#F59E0B" :
    "#10B981";

  const arcD = useTransform(springRisk, (v) => {
    const endAngle = START_ANGLE + (Math.max(0, Math.min(100, v)) / 100) * SWEEP;
    if (v <= 0) return `M ${polarToXY(START_ANGLE, R).x} ${polarToXY(START_ANGLE, R).y}`;
    return describeArc(START_ANGLE, endAngle, R);
  });

  const arcColor = useTransform(springRisk, (v) => {
    if (v >= 75) return "#EF4444";
    if (v >= 40) return "#F59E0B";
    return "#10B981";
  });

  const needleAngle = useTransform(
    springRisk,
    (v) => START_ANGLE + (Math.max(0, Math.min(100, v)) / 100) * SWEEP - 90
  );

  const levelConfig: Record<ThreatLevel, { label: string; Icon: React.ElementType; pulse: boolean }> = {
    GREEN: { label: "NOMINAL · SAFE", Icon: ShieldCheck, pulse: false },
    AMBER: { label: "SUSPICIOUS · EVAL", Icon: ShieldAlert, pulse: true },
    RED:   { label: "CRITICAL · SPOOF", Icon: ShieldX, pulse: true },
  };

  const { label, Icon, pulse } = levelConfig[threatLevel];
  const color = selectThreatColor(threatLevel);

  return (
    <div className="flex flex-col items-center justify-center gap-2 select-none w-full min-h-0">
      {/* SVG Arc Gauge */}
      <div className="relative flex justify-center">
        <svg
          width={180}
          height={140}
          viewBox="0 0 180 145"
          className="overflow-visible"
        >
          {/* Background track */}
          <path
            d={TRACK_D}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={9}
            strokeLinecap="round"
          />

          {/* Active arc */}
          <motion.path
            d={arcD}
            fill="none"
            stroke={arcColor}
            strokeWidth={9}
            strokeLinecap="round"
          />

          {/* Needle */}
          <motion.line
            x1={CX} y1={CY}
            x2={CX} y2={CY - R + 4}
            stroke={staticColor}
            strokeWidth={2}
            strokeLinecap="round"
            style={{ transformOrigin: `${CX}px ${CY}px`, rotate: needleAngle }}
          />

          {/* Center Hub */}
          <circle cx={CX} cy={CY} r={4} fill={staticColor} />
          <circle cx={CX} cy={CY} r={2} fill="#0A0F23" />

          {/* Risk Score */}
          <text x={CX} y={CY + 30} textAnchor="middle" fill="white" fontSize={24} fontWeight={800} fontFamily="monospace">
            {Math.round(riskScore)}
          </text>
          <text x={CX} y={CY + 42} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize={9} fontFamily="monospace">
            / 100 RISK
          </text>
        </svg>
      </div>

      {/* Threat Status Badge */}
      <motion.div
        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase"
        style={{
          borderColor: color,
          backgroundColor: `${color}18`,
          border: `1px solid ${color}50`,
          color,
        }}
        animate={pulse ? { opacity: [1, 0.6, 1] } : { opacity: 1 }}
        transition={pulse ? { repeat: Infinity, duration: 1.2 } : {}}
      >
        <Icon size={13} />
        <span>{label}</span>
      </motion.div>

      {/* EMA Formula Indicator */}
      <div className="text-[10px] font-mono text-white/40 flex items-center gap-2">
        <span>EMA Smoothing:</span>
        <span className="text-cyan-400 font-semibold">&alpha;=0.65&uarr;</span>
        <span className="text-purple-400 font-semibold">&alpha;=0.25&darr;</span>
      </div>
    </div>
  );
}

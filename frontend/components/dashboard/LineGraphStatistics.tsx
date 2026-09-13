"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import {
  TrendingUp,
  Activity,
  AlertTriangle,
  ShieldX,
  Radio,
  Clock,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";

/**
 * LineGraphStatistics — 21st.dev inspired Line Graph Statistics Component
 * https://21st.dev/community/components?q=graph&preview=%2F%40ravikatiyar162%2Fcomponents%2Fline-graph-statistics
 *
 * Real-time 60-sample Threat Trajectory Visualizer with dynamic threshold guidelines:
 * - Risk = 40 (Verify - Amber dashed guide line)
 * - Risk = 75 (Block - Crimson dashed guide line)
 * - Interactive hover cursor tooltip and rolling min/max/average statistics
 */

export default function LineGraphStatistics() {
  const riskHistory = useTelemetryStore((s) => s.riskHistory);
  const riskScore = useTelemetryStore((s) => s.riskScore);
  const threatLevel = useTelemetryStore((s) => s.threatLevel);

  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  // ResizeObserver for responsive graph width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Compute rolling window data (ensure 60 samples for smooth rendering)
  const data = useMemo(() => {
    if (!riskHistory || riskHistory.length === 0) {
      return Array.from({ length: 60 }, () => 10);
    }
    if (riskHistory.length < 60) {
      const pad = Array(60 - riskHistory.length).fill(riskHistory[0] ?? 10);
      return [...pad, ...riskHistory];
    }
    return riskHistory.slice(-60);
  }, [riskHistory]);

  // Statistics summaries
  const stats = useMemo(() => {
    const current = riskScore;
    const max = Math.max(...data, 0);
    const min = Math.min(...data, 100);
    const sum = data.reduce((acc, v) => acc + v, 0);
    const avg = sum / (data.length || 1);

    return {
      current: Math.round(current),
      peak: Math.round(max),
      min: Math.round(min),
      avg: Math.round(avg),
    };
  }, [data, riskScore]);

  // Graph coordinate helpers
  const W = containerWidth || 800;
  const H = 220;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 28;
  const graphW = Math.max(10, W - padLeft - padRight);
  const graphH = H - padTop - padBottom;

  const getX = (index: number) => padLeft + (index / (data.length - 1 || 1)) * graphW;
  const getY = (val: number) => padTop + graphH - (Math.max(0, Math.min(100, val)) / 100) * graphH;

  const y40 = getY(40);
  const y75 = getY(75);

  // Smooth Bezier path string
  const linePath = useMemo(() => {
    if (data.length < 2) return "";
    let d = `M ${getX(0)} ${getY(data[0])}`;
    for (let i = 0; i < data.length - 1; i++) {
      const x0 = getX(i);
      const y0 = getY(data[i]);
      const x1 = getX(i + 1);
      const y1 = getY(data[i + 1]);
      const mx = (x0 + x1) / 2;
      d += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
    }
    return d;
  }, [data, W]);

  // Closed area path for gradient fill
  const areaPath = useMemo(() => {
    if (!linePath) return "";
    return `${linePath} L ${getX(data.length - 1)} ${H - padBottom} L ${getX(0)} ${H - padBottom} Z`;
  }, [linePath, data.length, H, padBottom]);

  // Active theme color based on risk
  const themeColor =
    riskScore >= 75
      ? "#EF4444"
      : riskScore >= 40
      ? "#F59E0B"
      : "#10B981";

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - padLeft;
    const clampedX = Math.max(0, Math.min(graphW, mouseX));
    const idx = Math.round((clampedX / graphW) * (data.length - 1));
    setHoverIndex(idx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const hoveredVal = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div
      ref={containerRef}
      className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl backdrop-blur-md p-5 shadow-2xl space-y-4"
    >
      {/* Header & Rolling Statistics Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800/80">
        <div>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: `${themeColor}15`, color: themeColor }}
            >
              <TrendingUp size={15} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Live Threat Trajectory &amp; Risk Trajectory
              </h2>
              <p className="text-[10px] font-mono text-neutral-400">
                Rolling 60-Chunk Temporal Smoothing · Asymmetric EMA Alpha
              </p>
            </div>
          </div>
        </div>

        {/* Live Indicator & Badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] font-mono">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
            <span className="text-neutral-400">LIVE FEED</span>
          </div>

          <div
            className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase border"
            style={{
              background: `${themeColor}15`,
              color: themeColor,
              borderColor: `${themeColor}40`,
            }}
          >
            {threatLevel} · {Math.round(riskScore)}/100
          </div>
        </div>
      </div>

      {/* 4 Summary Stat Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
        <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
            Current Risk
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl sm:text-2xl font-black" style={{ color: themeColor }}>
              {stats.current}
            </span>
            <span className="text-xs text-neutral-400">/100</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
            Peak Risk (60s)
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span
              className="text-xl sm:text-2xl font-black"
              style={{ color: stats.peak >= 75 ? "#EF4444" : stats.peak >= 40 ? "#F59E0B" : "#10B981" }}
            >
              {stats.peak}
            </span>
            <span className="text-xs text-neutral-400">max</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
            Average EMA
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl sm:text-2xl font-black text-sky-400">
              {stats.avg}
            </span>
            <span className="text-xs text-neutral-400">score</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
            Decision State
          </span>
          <div className="flex items-center gap-1.5 mt-1 text-xs font-bold truncate" style={{ color: themeColor }}>
            {riskScore >= 75 ? (
              <>
                <ShieldX size={14} className="shrink-0" />
                <span>HARD BLOCK</span>
              </>
            ) : riskScore >= 40 ? (
              <>
                <AlertTriangle size={14} className="shrink-0" />
                <span>CHALLENGE</span>
              </>
            ) : (
              <>
                <ShieldCheck size={14} className="shrink-0" />
                <span>NOMINAL PASS</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SVG Line Graph Container */}
      <div className="relative w-full h-[220px] bg-neutral-900/40 rounded-xl border border-neutral-800/80 overflow-hidden select-none">
        <svg
          width="100%"
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="overflow-visible cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="statsRiskGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={themeColor} stopOpacity={0.35} />
              <stop offset="60%" stopColor={themeColor} stopOpacity={0.08} />
              <stop offset="100%" stopColor={themeColor} stopOpacity={0.0} />
            </linearGradient>

            <filter id="statsGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid lines at 25, 50, 75, 100 */}
          {[0, 25, 50, 75, 100].map((v) => {
            const y = getY(v);
            return (
              <g key={v}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={W - padRight}
                  y2={y}
                  stroke="rgba(255,255,255,0.04)"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="rgba(255,255,255,0.3)"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {v}
                </text>
              </g>
            );
          })}

          {/* Dynamic Threshold Guideline: Risk = 75 (Block) */}
          <line
            x1={padLeft}
            y1={y75}
            x2={W - padRight}
            y2={y75}
            stroke="#EF4444"
            strokeWidth="1.2"
            strokeDasharray="4 4"
            strokeOpacity="0.75"
          />
          <rect
            x={padLeft + 6}
            y={y75 - 16}
            width="120"
            height="14"
            rx="3"
            fill="rgba(239, 68, 68, 0.15)"
            stroke="rgba(239, 68, 68, 0.4)"
          />
          <text
            x={padLeft + 10}
            y={y75 - 6}
            fill="#FCA5A5"
            fontSize="8.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            75 · HARD BLOCK INTERCEPT
          </text>

          {/* Dynamic Threshold Guideline: Risk = 40 (Verify) */}
          <line
            x1={padLeft}
            y1={y40}
            x2={W - padRight}
            y2={y40}
            stroke="#F59E0B"
            strokeWidth="1.2"
            strokeDasharray="4 4"
            strokeOpacity="0.75"
          />
          <rect
            x={padLeft + 6}
            y={y40 - 16}
            width="128"
            height="14"
            rx="3"
            fill="rgba(245, 158, 11, 0.15)"
            stroke="rgba(245, 158, 11, 0.4)"
          />
          <text
            x={padLeft + 10}
            y={y40 - 6}
            fill="#FDE68A"
            fontSize="8.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            40 · VERIFY THRESHOLD (PITCH)
          </text>

          {/* Filled Area Gradient */}
          <path d={areaPath} fill="url(#statsRiskGradient)" />

          {/* Main Glowing Bezier Line */}
          <path
            d={linePath}
            fill="none"
            stroke={themeColor}
            strokeWidth="2.2"
            filter="url(#statsGlow)"
          />

          {/* Time axis labels */}
          <text
            x={padLeft}
            y={H - 8}
            fill="rgba(255,255,255,0.3)"
            fontSize="9"
            fontFamily="monospace"
          >
            -60s
          </text>
          <text
            x={padLeft + graphW / 2}
            y={H - 8}
            textAnchor="middle"
            fill="rgba(255,255,255,0.3)"
            fontSize="9"
            fontFamily="monospace"
          >
            -30s
          </text>
          <text
            x={W - padRight}
            y={H - 8}
            textAnchor="end"
            fill="rgba(255,255,255,0.3)"
            fontSize="9"
            fontFamily="monospace"
          >
            Now (0s)
          </text>

          {/* Hover Crosshair & Data Node Tooltip */}
          {hoverIndex !== null && hoveredVal !== null && (
            <g>
              {/* Vertical guideline */}
              <line
                x1={getX(hoverIndex)}
                y1={padTop}
                x2={getX(hoverIndex)}
                y2={H - padBottom}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />

              {/* Glowing Node Circle */}
              <circle
                cx={getX(hoverIndex)}
                cy={getY(hoveredVal)}
                r="5"
                fill={themeColor}
                stroke="#0D1023"
                strokeWidth="2"
                filter="url(#statsGlow)"
              />
            </g>
          )}
        </svg>

        {/* Hover Tooltip Overlay Box */}
        {hoverIndex !== null && hoveredVal !== null && (
          <div
            className="absolute pointer-events-none z-20 px-2.5 py-1.5 rounded-lg bg-neutral-950/95 border border-neutral-700 shadow-xl text-xs font-mono"
            style={{
              left: `${Math.min(W - 140, Math.max(padLeft, getX(hoverIndex) - 50))}px`,
              top: `${Math.max(10, getY(hoveredVal) - 48)}px`,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-400 text-[9px]">T -{60 - hoverIndex}s</span>
              <span
                className="font-bold text-[11px]"
                style={{
                  color: hoveredVal >= 75 ? "#EF4444" : hoveredVal >= 40 ? "#F59E0B" : "#10B981",
                }}
              >
                {Math.round(hoveredVal)} / 100
              </span>
            </div>
            <div className="text-[9px] text-neutral-400">
              {hoveredVal >= 75 ? "HARD BLOCK" : hoveredVal >= 40 ? "VERIFY" : "NOMINAL"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

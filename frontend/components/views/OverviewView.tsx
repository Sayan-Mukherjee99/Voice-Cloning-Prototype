"use client";

import React, { useMemo, useRef, useEffect, useState } from "react";
import { useTelemetryStore } from "@/store/useTelemetryStore";

interface OverviewViewProps {
  onNavigate?: (tab: string) => void;
  setActiveTab?: (tab: string) => void;
}

export default function OverviewView({ onNavigate, setActiveTab: setActiveTabProp }: OverviewViewProps) {
  const setActiveTab = onNavigate || setActiveTabProp;
  const sessionId        = useTelemetryStore((s) => s.sessionId);
  const riskScore        = useTelemetryStore((s) => s.riskScore);
  const threatLevel      = useTelemetryStore((s) => s.threatLevel);
  const riskHistory      = useTelemetryStore((s) => s.riskHistory);
  const latencyMs        = useTelemetryStore((s) => s.latencyMs);
  const cosineSimilarity = useTelemetryStore((s) => s.cosineSimilarity);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

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

  const voiceMatchScore = useMemo(() => {
    if (cosineSimilarity !== null) return `${(cosineSimilarity * 100).toFixed(1)}%`;
    if (threatLevel === "RED" || riskScore >= 75) return "42.0%";
    if (threatLevel === "AMBER" || riskScore >= 40) return "68.5%";
    return "96.4%";
  }, [cosineSimilarity, threatLevel, riskScore]);

  const latency = latencyMs > 0 ? `${Math.round(latencyMs)}ms` : "53ms";
  const displaySessionId = sessionId || "call-demo";
  const threatColor = threatLevel === "RED" ? "#EF4444" : threatLevel === "AMBER" ? "#F59E0B" : "#10B981";

  // Data calculation for SVG chart
  const data = useMemo(() => {
    if (!riskHistory || riskHistory.length === 0) {
      return Array.from({ length: 60 }, () => 12);
    }
    if (riskHistory.length < 60) {
      const pad = Array(60 - riskHistory.length).fill(riskHistory[0] ?? 12);
      return [...pad, ...riskHistory];
    }
    return riskHistory.slice(-60);
  }, [riskHistory]);

  const W = Math.max(300, containerWidth);
  const H = 208; // h-52
  const padLeft = 36;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 24;
  const graphW = Math.max(10, W - padLeft - padRight);
  const graphH = H - padTop - padBottom;

  const getX = (index: number) => padLeft + (index / (data.length - 1 || 1)) * graphW;
  const getY = (val: number) => padTop + graphH - (Math.max(0, Math.min(100, val)) / 100) * graphH;

  const y40 = getY(40);
  const y75 = getY(75);

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

  const areaPath = useMemo(() => {
    if (!linePath) return "";
    return `${linePath} L ${getX(data.length - 1)} ${H - padBottom} L ${getX(0)} ${H - padBottom} Z`;
  }, [linePath, data.length, H, padBottom]);

  return (
    <div className="min-h-screen w-full bg-[#08080a] text-neutral-100 flex flex-col p-6 md:p-8 space-y-8">
      {/* 1. Header Bar */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between pb-4 border-b border-neutral-800/80">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-wider text-neutral-200">VAANISHIELD // WAR ROOM ({displaySessionId})</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            ONLINE // 16kHz PCM
          </span>
        </div>
        <span className="text-xs font-mono font-semibold" style={{ color: threatColor }}>
          {threatLevel} RISK ({Math.round(riskScore || 30)}/100)
        </span>
      </header>

      {/* 2. Hero Headline Section */}
      <section className="w-full max-w-4xl mx-auto text-center pt-4 pb-2 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-800 bg-neutral-900/80 text-neutral-300 text-xs font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          VaaniShield AI // Real-Time Biometric Interceptor
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
          Detect Synthetic Voices Before They Move Money
        </h1>
        <p className="text-neutral-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
          Zero-trust voice verification and neural voiceprint matching engineered to protect high-value banking transactions against real-time deepfake clones.
        </p>

        {/* Buttons: Isolated flex row with generous margin */}
        <div className="flex items-center justify-center gap-3 pt-3">
          <button 
            type="button"
            onClick={() => typeof setActiveTab === "function" && setActiveTab("voice-analysis")}
            className="px-5 py-2.5 bg-neutral-100 hover:bg-white text-neutral-950 font-semibold text-xs rounded-xl transition shadow-lg cursor-pointer"
          >
            View Live Threat Stream →
          </button>
          <button 
            type="button"
            onClick={() => typeof setActiveTab === "function" && setActiveTab("transactions")}
            className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 font-semibold text-xs rounded-xl transition cursor-pointer"
          >
            Inspect Transaction Interceptor
          </button>
        </div>
      </section>

      {/* 3. 4 Metric Cards: Standalone Grid */}
      <section className="w-full max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-mono text-neutral-400 uppercase block">Voice Match</span>
            <span className="text-xl font-bold font-mono text-neutral-100 mt-1 block">{voiceMatchScore || "96.4%"}</span>
            <span className="text-[10px] font-mono text-neutral-500 mt-0.5 block">ECAPA-TDNN</span>
          </div>
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-mono text-neutral-400 uppercase block">Composite Risk</span>
            <span className="text-xl font-bold font-mono mt-1 block" style={{ color: threatColor }}>
              {Math.round(riskScore || 30)}/100
            </span>
            <span className="text-[10px] font-mono text-neutral-500 mt-0.5 block">
              {threatLevel === "RED" ? "Critical Risk" : threatLevel === "AMBER" ? "Elevated Risk" : "Nominal Index"}
            </span>
          </div>
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-mono text-neutral-400 uppercase block">Pipeline Latency</span>
            <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">{latency || "73ms"}</span>
            <span className="text-[10px] font-mono text-neutral-500 mt-0.5 block">Sub-80ms SLA</span>
          </div>
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-mono text-neutral-400 uppercase block">Authorization Gate</span>
            <span className="text-xl font-bold font-mono mt-1 block" style={{ color: threatColor }}>
              {threatLevel === "RED" ? "BLOCKED" : threatLevel === "AMBER" ? "CHALLENGE" : "PASSED"}
            </span>
            <span className="text-[10px] font-mono text-neutral-500 mt-0.5 block">Pre-Tx Intercept</span>
          </div>
        </div>
      </section>

      {/* 4. Telemetry Chart Preview Card */}
      <section className="w-full max-w-5xl mx-auto">
        <div className="bg-neutral-950/80 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: threatColor }} />
              <span className="text-xs font-mono font-semibold text-neutral-200">Live Risk Telemetry (Rolling 60 Samples)</span>
            </div>
            <button 
              type="button"
              onClick={() => typeof setActiveTab === "function" && setActiveTab("voiceprint")}
              className="text-xs font-mono text-neutral-400 hover:text-white transition cursor-pointer"
            >
              View Voiceprint →
            </button>
          </div>

          {/* Dedicated Chart Canvas/SVG Container */}
          <div ref={containerRef} className="w-full h-52 relative overflow-hidden rounded-xl bg-neutral-900/30 border border-neutral-800/50 flex items-center justify-center">
            <svg
              width="100%"
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className="overflow-visible"
            >
              <defs>
                <linearGradient id="darkRiskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
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

              {/* Threshold Lines */}
              <line
                x1={padLeft}
                y1={y75}
                x2={W - padRight}
                y2={y75}
                stroke="#EF4444"
                strokeWidth="1.2"
                strokeDasharray="4 3"
                strokeOpacity="0.8"
              />
              <text
                x={padLeft + 6}
                y={y75 - 4}
                fill="#FCA5A5"
                fontSize="8"
                fontFamily="monospace"
                fontWeight="bold"
              >
                75 · BLOCK THRESHOLD
              </text>

              <line
                x1={padLeft}
                y1={y40}
                x2={W - padRight}
                y2={y40}
                stroke="#F59E0B"
                strokeWidth="1.2"
                strokeDasharray="4 3"
                strokeOpacity="0.8"
              />
              <text
                x={padLeft + 6}
                y={y40 - 4}
                fill="#FDE68A"
                fontSize="8"
                fontFamily="monospace"
                fontWeight="bold"
              >
                40 · VERIFY CHALLENGE
              </text>

              {/* Shaded Area and Curve */}
              <path d={areaPath} fill="url(#darkRiskGrad)" />
              <path
                d={linePath}
                fill="none"
                stroke={threatColor}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* 4 Bottom Navigation Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
            <button 
              type="button"
              onClick={() => typeof setActiveTab === "function" && setActiveTab("voice-analysis")}
              className="p-3.5 bg-neutral-900/50 hover:bg-neutral-800/70 border border-neutral-800 rounded-xl text-left transition cursor-pointer group"
            >
              <span className="text-xs font-semibold text-neutral-200 group-hover:text-cyan-400 block">Voice Analysis</span>
              <span className="text-[10px] text-neutral-500 block mt-0.5">80-Bin Spectrogram & F0</span>
            </button>
            <button 
              type="button"
              onClick={() => typeof setActiveTab === "function" && setActiveTab("voiceprint")}
              className="p-3.5 bg-neutral-900/50 hover:bg-neutral-800/70 border border-neutral-800 rounded-xl text-left transition cursor-pointer group"
            >
              <span className="text-xs font-semibold text-neutral-200 group-hover:text-cyan-400 block">Voiceprint</span>
              <span className="text-[10px] text-neutral-500 block mt-0.5">ECAPA-TDNN 192-dim</span>
            </button>
            <button 
              type="button"
              onClick={() => typeof setActiveTab === "function" && setActiveTab("threat-analysis")}
              className="p-3.5 bg-neutral-900/50 hover:bg-neutral-800/70 border border-neutral-800 rounded-xl text-left transition cursor-pointer group"
            >
              <span className="text-xs font-semibold text-neutral-200 group-hover:text-cyan-400 block">Threat Engine</span>
              <span className="text-[10px] text-neutral-500 block mt-0.5">Weight Matrix & PITCH</span>
            </button>
            <button 
              type="button"
              onClick={() => typeof setActiveTab === "function" && setActiveTab("transactions")}
              className="p-3.5 bg-neutral-900/50 hover:bg-neutral-800/70 border border-neutral-800 rounded-xl text-left transition cursor-pointer group"
            >
              <span className="text-xs font-semibold text-neutral-200 group-hover:text-cyan-400 block">Transactions</span>
              <span className="text-[10px] text-neutral-500 block mt-0.5">UPI Wire Fraud Gate</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

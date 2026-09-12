/**
 * NavBar — Minimal, professional cybersecurity header
 * Clean branding, session metadata, real-time connection badge, and audio format.
 */

"use client";

import React from "react";
import { useTelemetryStore, WsStatus } from "@/store/useTelemetryStore";
import { Shield, Wifi, WifiOff, Clock, Radio, Eye } from "lucide-react";

const WS_CONFIG: Record<WsStatus, { color: string; label: string; dotClass: string }> = {
  CONNECTED:    { color: "#10B981", label: "SYSTEM LIVE",  dotClass: "bg-emerald-400 animate-pulse" },
  CONNECTING:   { color: "#F59E0B", label: "CONNECTING",   dotClass: "bg-amber-400 animate-ping" },
  DISCONNECTED: { color: "#6B7280", label: "OFFLINE",      dotClass: "bg-neutral-500" },
  ERROR:        { color: "#EF4444", label: "WS ERROR",     dotClass: "bg-rose-500 animate-pulse" },
};

export default function NavBar({
  demoMode,
  onToggleDemo,
}: {
  demoMode: boolean;
  onToggleDemo: () => void;
}) {
  const sessionId = useTelemetryStore((s) => s.sessionId);
  const wsStatus = useTelemetryStore((s) => s.wsStatus);
  const latencyMs = useTelemetryStore((s) => s.latencyMs);
  const codecInfo = useTelemetryStore((s) => s.codecInfo);
  const threatLevel = useTelemetryStore((s) => s.threatLevel);

  const statusCfg = WS_CONFIG[wsStatus];

  return (
    <header className="w-full bg-[#080B1A]/95 border-b border-white/[0.08] px-4 sm:px-6 py-3 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Brand & Product identity */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <Shield size={17} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-wider text-white">
                VAANI<span className="text-cyan-400">SHIELD</span>
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                SOC v1.0
              </span>
            </div>
            <p className="text-[10px] text-white/40 font-mono tracking-wide hidden sm:block">
              AI Voice Clone Detection & Financial Fraud Prevention
            </p>
          </div>
        </div>

        {/* Center: Session token & Mode Switch */}
        <div className="flex items-center gap-2">
          {/* Mode Pill */}
          <button
            onClick={onToggleDemo}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold transition-all border shadow-sm"
            style={{
              background: demoMode ? "rgba(56,189,248,0.12)" : "rgba(16,185,129,0.15)",
              color: demoMode ? "#38BDF8" : "#10B981",
              borderColor: demoMode ? "rgba(56,189,248,0.3)" : "rgba(16,185,129,0.4)",
            }}
            title="Click to toggle between Demo Simulator and Live WebSocket Streaming"
          >
            {demoMode ? <Eye size={12} /> : <Radio size={12} className="animate-pulse" />}
            <span>{demoMode ? "SIMULATOR MODE" : "LIVE MODE"}</span>
          </button>

          {/* Session Token */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px] font-mono text-white/50">
            <span className="text-white/30">SESSION:</span>
            <span className="text-cyan-300 font-semibold truncate max-w-[120px]">
              {sessionId ? sessionId.toUpperCase() : "STANDBY"}
            </span>
          </div>
        </div>

        {/* Right: Telemetry Health Indicators */}
        <div className="flex items-center gap-3 text-xs font-mono">
          {/* Latency Meter */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.03] border border-white/[0.06] text-white/60">
            <Clock size={12} className={latencyMs < 80 ? "text-emerald-400" : "text-amber-400"} />
            <span>{latencyMs > 0 ? `${latencyMs.toFixed(0)} ms` : "—"}</span>
          </div>

          {/* Codec */}
          <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded bg-white/[0.03] border border-white/[0.06] text-white/40 text-[11px]">
            <span>16kHz PCM</span>
          </div>

          {/* WebSocket Status */}
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold tracking-wider text-[10px]"
            style={{
              background: `${statusCfg.color}15`,
              color: statusCfg.color,
              border: `1px solid ${statusCfg.color}40`,
            }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} />
            <span>{statusCfg.label}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

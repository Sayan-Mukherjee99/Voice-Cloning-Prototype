/**
 * GradientBorderNav — Uilora Sketchy Navigation for VaaniShield
 * 
 * Design Features (Uilora Sketchy Nav concept):
 * - Floating dark cybernetic glass pill container with subtle organic hand-drawn sketch border
 * - Animated hand-drawn SVG scribble / highlighter underlines that smoothly transition between active routes
 * - Clean layout: Brand on left, horizontal navigation in center, LIVE/SIMULATOR status on right
 * - "More" dropdown containing: Audio Telemetry, Processing Pipeline, Challenge Response, System Status, Settings
 * - NO desktop hamburger — full horizontal bar on desktop/tablet (>=768px)
 * - Mobile hamburger drawer only below desktop width (<768px)
 * - Preserves all live Zustand telemetry, WebSocket stream triggers, audio controls, and modal dialogs
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import {
  Shield,
  LayoutDashboard,
  AudioWaveform,
  Fingerprint,
  ShieldAlert,
  Sliders,
  Cpu,
  Zap,
  CreditCard,
  Settings,
  Activity,
  ChevronDown,
  Menu,
  X,
  Radio,
  Eye,
  Mic,
  Square,
  Volume2,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

export type NavTabId =
  | "overview"
  | "voice-analysis"
  | "voiceprint"
  | "threat-analysis"
  | "audio-telemetry"
  | "processing-pipeline"
  | "challenge-response"
  | "transactions";

interface SketchyNavProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  demoMode: boolean;
  onToggleDemo: () => void;
  activeSource: string | null;
  volume: number;
  micError: string | null;
  onStartMic: () => void;
  onStartSimulated: (type: "sim_human" | "sim_clone") => void;
  onStopStreaming: () => void;
  onResetSession: () => void;
}

const PRIMARY_LINKS: { id: NavTabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "voice-analysis", label: "Voice Analysis", icon: AudioWaveform },
  { id: "voiceprint", label: "Voiceprint", icon: Fingerprint },
  { id: "threat-analysis", label: "Threat Analysis", icon: ShieldAlert },
  { id: "transactions", label: "Transactions", icon: CreditCard },
];

const MORE_TECHNICAL_LINKS: { id: NavTabId; label: string; sub: string; icon: React.ElementType }[] = [
  { id: "audio-telemetry", label: "Audio Telemetry", sub: "16kHz PCM & Ingestion metrics", icon: Sliders },
  { id: "processing-pipeline", label: "Processing Pipeline", sub: "8-stage acoustic SLAs", icon: Cpu },
  { id: "challenge-response", label: "Challenge Response", sub: "PITCH phonetic liveness console", icon: Zap },
];

/**
 * Uilora Sketchy Scribble & Highlighter Underline
 * Creates an organic, hand-drawn highlighter stroke and pencil sketch line beneath the active tab
 */
function SketchyActiveIndicator({ color = "#38BDF8" }: { color?: string }) {
  return (
    <motion.div
      layoutId="sketchy-active-indicator"
      className="absolute inset-0 -z-10 pointer-events-none"
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
    >
      <svg
        className="w-full h-full overflow-visible"
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
      >
        {/* Soft Organic Highlighter Background Fill */}
        <motion.path
          d="M 2,20 C 25,14 75,14 98,20 C 75,26 25,26 2,20 Z"
          fill={color}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.16 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />

        {/* Primary Hand-Drawn Underline Stroke */}
        <motion.path
          d="M 2,36 C 20,38 48,34 72,37 C 84,38.5 94,36.5 99,35"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.32, ease: "easeOut" }}
        />

        {/* Secondary Organic Accent Scribble */}
        <motion.path
          d="M 6,38 C 30,40 68,36 94,39"
          fill="none"
          stroke={color}
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.38, delay: 0.05, ease: "easeOut" }}
        />
      </svg>
    </motion.div>
  );
}

export default function GradientBorderNav({
  activeTab,
  onSelectTab,
  demoMode,
  onToggleDemo,
  activeSource,
  volume,
  micError,
  onStartMic,
  onStartSimulated,
  onStopStreaming,
  onResetSession,
}: SketchyNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [streamMenuOpen, setStreamMenuOpen] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const moreRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<HTMLDivElement | null>(null);

  const sessionId = useTelemetryStore((s) => s.sessionId);
  const wsStatus = useTelemetryStore((s) => s.wsStatus);
  const latencyMs = useTelemetryStore((s) => s.latencyMs);
  const threatLevel = useTelemetryStore((s) => s.threatLevel);
  const riskScore = useTelemetryStore((s) => s.riskScore);

  const isRed = threatLevel === "RED" || riskScore >= 75;
  const isAmber = threatLevel === "AMBER" || (riskScore >= 40 && riskScore < 75);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
      if (streamRef.current && !streamRef.current.contains(e.target as Node)) {
        setStreamMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Adaptive cyber theme color
  const themeColor = isRed ? "#EF4444" : isAmber ? "#F59E0B" : "#38BDF8";

  // Connection badge properties
  const connState = demoMode
    ? { label: "SIMULATOR", sub: "ACTIVE", color: "#38BDF8", dot: "bg-sky-400" }
    : wsStatus === "CONNECTED"
    ? { label: "LIVE", sub: "CONNECTED", color: "#10B981", dot: "bg-emerald-400 shadow-[0_0_8px_#10B981]" }
    : wsStatus === "CONNECTING"
    ? { label: "CONNECTING", sub: "SYNCING", color: "#F59E0B", dot: "bg-amber-400 animate-ping" }
    : { label: "OFFLINE", sub: "DISCONNECTED", color: "#EF4444", dot: "bg-rose-500" };

  const isMoreActive = ["audio-telemetry", "processing-pipeline", "challenge-response"].includes(activeTab);

  const handleTabClick = (tab: NavTabId) => {
    onSelectTab(tab);
    setMoreOpen(false);
    setMobileOpen(false);
  };

  return (
    <>
      {/* ── STICKY FLOATING SKETCHY NAVIGATION BAR ── */}
      <header className="sticky top-3 z-50 w-full px-3 sm:px-6 pointer-events-none">
        <div className="max-w-6xl mx-auto flex items-center justify-center">
          {/* ── MAIN FLOATING SKETCH CONTAINER ── */}
          <nav
            aria-label="Main Navigation"
            className="relative w-full rounded-2xl bg-[#07091E]/90 backdrop-blur-xl px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_20px_rgba(6,182,212,0.1)] pointer-events-auto border border-white/[0.08] transition-all duration-300"
          >
            {/* ── SUBTLE ORGANIC SKETCH BORDER (HAND-DRAWN SVG CONTOUR) ── */}
            <svg
              className="absolute inset-0 -z-10 w-full h-full overflow-visible pointer-events-none"
              preserveAspectRatio="none"
              viewBox="0 0 600 60"
            >
              {/* Organic Perimeter Sketch Line 1 */}
              <path
                d="M 12,4 Q 300,1 588,5 Q 598,30 590,56 Q 300,59 10,55 Q 2,30 12,4"
                fill="none"
                stroke={themeColor}
                strokeWidth="1.2"
                strokeDasharray="8 4"
                opacity="0.3"
              />
              {/* Organic Perimeter Sketch Line 2 (Subtle Offset) */}
              <path
                d="M 8,7 Q 300,5 592,7 Q 596,30 588,53 Q 300,55 14,53 Q 4,30 8,7"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
              />
            </svg>

            {/* ── LEFT: BRAND / LOGO ── */}
            <button
              onClick={() => handleTabClick("overview")}
              className="flex items-center gap-2.5 text-left focus:outline-none group shrink-0"
              title="VaaniShield AI Voice Security"
            >
              <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-all">
                <ShieldCheck size={18} className="text-white" />
                {/* Micro Live Dot */}
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-[#07091E] animate-pulse" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-black tracking-wider text-white">
                    VAANI<span className="text-cyan-400">SHIELD</span>
                  </span>
                </div>
                <span className="text-[8px] font-mono tracking-widest text-cyan-200/50 uppercase leading-none hidden sm:inline">
                  AI VOICE SECURITY
                </span>
              </div>
            </button>

            {/* ── CENTER: DESKTOP SKETCHY NAVIGATION LINKS (NO HAMBURGER ON DESKTOP) ── */}
            <div className="nav-desktop-links items-center gap-1 lg:gap-1.5">
              {PRIMARY_LINKS.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`relative px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all duration-200 flex items-center gap-1.5 group ${
                      isActive
                        ? "text-cyan-200 font-bold drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]"
                        : "text-white/65 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    {/* Active Sketchy Scribble Indicator */}
                    {isActive && <SketchyActiveIndicator color={themeColor} />}

                    <Icon
                      size={13}
                      className={`relative z-10 transition-colors ${
                        isActive ? "text-cyan-300" : "text-white/40 group-hover:text-white/80"
                      }`}
                    />
                    <span className="relative z-10 whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}

              {/* ── "MORE" DROPDOWN MENU (5 ITEMS REQUIRED) ── */}
              <div className="relative" ref={moreRef}>
                <button
                  onClick={() => setMoreOpen((prev) => !prev)}
                  className={`relative px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all duration-200 flex items-center gap-1 group ${
                    isMoreActive
                      ? "text-cyan-200 font-bold drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]"
                      : "text-white/65 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  {isMoreActive && <SketchyActiveIndicator color={themeColor} />}
                  <span className="relative z-10">More</span>
                  <ChevronDown
                    size={12}
                    className={`relative z-10 transition-transform duration-200 text-white/50 group-hover:text-white ${
                      moreOpen ? "rotate-180 text-cyan-300" : ""
                    }`}
                  />
                </button>

                {/* More Dropdown Panel */}
                <AnimatePresence>
                  {moreOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full mt-2.5 right-0 lg:left-0 w-72 bg-[#070B1F]/95 border border-cyan-500/25 rounded-2xl p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_20px_rgba(6,182,212,0.15)] backdrop-blur-2xl z-50 space-y-1"
                    >
                      <div className="px-3 py-1.5 text-[9px] font-mono tracking-widest text-cyan-300/60 uppercase border-b border-white/[0.06] mb-1">
                        Extended Diagnostics & Tools
                      </div>

                      {/* 1. Audio Telemetry */}
                      {/* 2. Processing Pipeline */}
                      {/* 3. Challenge Response */}
                      {MORE_TECHNICAL_LINKS.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleTabClick(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${
                              isActive
                                ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 font-bold"
                                : "text-white/70 hover:text-white hover:bg-white/[0.05]"
                            }`}
                          >
                            <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
                              <Icon size={14} className={isActive ? "text-cyan-400" : "text-white/50"} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-mono font-medium truncate">{item.label}</div>
                              <div className="text-[9px] font-mono text-white/40 truncate">{item.sub}</div>
                            </div>
                          </button>
                        );
                      })}

                      {/* 4. System Status */}
                      {/* 5. Settings */}
                      <div className="pt-1.5 border-t border-white/[0.06] space-y-1">
                        <button
                          onClick={() => {
                            setMoreOpen(false);
                            setShowStatusModal(true);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                              <Activity size={14} className="text-emerald-400" />
                            </div>
                            <div className="text-left">
                              <div className="text-xs font-medium">System Status</div>
                              <div className="text-[9px] text-white/40">Zero-Trust Mesh & Edge Health</div>
                            </div>
                          </div>
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        </button>

                        <button
                          onClick={() => {
                            setMoreOpen(false);
                            setShowSettingsModal(true);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                              <Settings size={14} className="text-cyan-400" />
                            </div>
                            <div className="text-left">
                              <div className="text-xs font-medium">Settings</div>
                              <div className="text-[9px] text-white/40">Thresholds & Security Policy</div>
                            </div>
                          </div>
                          <span className="text-[9px] text-cyan-400/60 font-mono">v2.4</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ── RIGHT: LIVE / SIMULATOR STATUS & AUDIO CONTROLS ── */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Mode & Audio Stream Controller Dropdown */}
              <div className="relative" ref={streamRef}>
                <button
                  onClick={() => setStreamMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border shadow-sm group hover:brightness-110"
                  style={{
                    background: `${connState.color}18`,
                    color: connState.color,
                    borderColor: `${connState.color}45`,
                  }}
                  title="Toggle Mode & Audio Controls"
                >
                  <span className={`w-2 h-2 rounded-full ${connState.dot}`} />
                  <span className="tracking-wide">{connState.label}</span>
                  <ChevronDown
                    size={11}
                    className={`transition-transform duration-200 ${streamMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Audio & Session Popover */}
                <AnimatePresence>
                  {streamMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full mt-2.5 right-0 w-72 bg-[#070B1F]/95 border border-cyan-500/30 rounded-2xl p-3 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_20px_rgba(6,182,212,0.15)] backdrop-blur-2xl z-50 space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-white/50 pb-1.5 border-b border-white/[0.08]">
                        <span className="text-cyan-300 font-semibold">STREAM & SIMULATOR</span>
                        <span>{latencyMs > 0 ? `${latencyMs.toFixed(0)}ms SLA` : "<80ms SLA"}</span>
                      </div>

                      {/* Mode Toggle Button */}
                      <button
                        onClick={onToggleDemo}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-mono font-bold flex items-center justify-between transition-all border ${
                          demoMode
                            ? "bg-sky-500/20 text-sky-300 border-sky-500/50 hover:bg-sky-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {demoMode ? <Eye size={14} /> : <Radio size={14} className="animate-pulse" />}
                          <span>{demoMode ? "Mode: Simulator" : "Mode: Live Stream"}</span>
                        </div>
                        <span className="text-[10px] uppercase underline text-white/80">Switch</span>
                      </button>

                      {/* Live Audio Ingestion Controls */}
                      {!demoMode && (
                        <div className="space-y-2 pt-1">
                          <button
                            onClick={() => (activeSource === "mic" ? onStopStreaming() : onStartMic())}
                            className={`w-full py-2 px-3 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all ${
                              activeSource === "mic"
                                ? "bg-rose-500/25 text-rose-300 border border-rose-500/50 animate-pulse"
                                : "bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 hover:bg-cyan-500/30"
                            }`}
                          >
                            {activeSource === "mic" ? <Square size={12} className="fill-current" /> : <Mic size={13} />}
                            <span>{activeSource === "mic" ? "Stop Microphone Stream" : "Start Live Microphone"}</span>
                          </button>

                          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                            <button
                              onClick={() => (activeSource === "sim_human" ? onStopStreaming() : onStartSimulated("sim_human"))}
                              className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-semibold"
                            >
                              Test Human Voice
                            </button>
                            <button
                              onClick={() => (activeSource === "sim_clone" ? onStopStreaming() : onStartSimulated("sim_clone"))}
                              className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-semibold"
                            >
                              Test AI Clone
                            </button>
                          </div>

                          {activeSource && (
                            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono">
                              <Volume2 size={12} className="text-cyan-400" />
                              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-emerald-400 to-rose-400 rounded-full transition-all duration-75"
                                  style={{ width: `${volume}%` }}
                                />
                              </div>
                              <span className="text-cyan-300 font-bold">{volume}%</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Session Info & Reset */}
                      <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[9px] font-mono text-white/40">
                        <span>SESSION: {sessionId ? sessionId.slice(0, 12) : "STANDBY"}</span>
                        <button
                          onClick={onResetSession}
                          className="hover:text-cyan-300 flex items-center gap-1 transition-colors"
                          title="Generate new session key"
                        >
                          <RefreshCw size={10} />
                          <span>RESET</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── MOBILE ONLY: HAMBURGER BUTTON (<768px ONLY) ── */}
              <button
                onClick={() => setMobileOpen((prev) => !prev)}
                className="nav-mobile-btn p-2 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white/80 hover:text-white hover:bg-white/10 focus:outline-none"
                aria-label="Toggle Navigation Drawer"
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* ── MOBILE NAVIGATION DRAWER (<768px ONLY) ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="fixed inset-0 bg-[#06091F]/98 backdrop-blur-2xl z-[100] md:hidden flex flex-col justify-between p-6 overflow-y-auto"
            onClick={() => setMobileOpen(false)}
          >
            <div className="space-y-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.1]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-md">
                    <ShieldCheck size={18} />
                  </div>
                  <span className="font-extrabold tracking-wider text-sm text-white">
                    VAANI<span className="text-cyan-400">SHIELD</span>
                  </span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/15"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="space-y-1.5 text-xs font-mono">
                <div className="text-[10px] text-cyan-300/60 uppercase tracking-widest px-2 py-1">
                  Primary Views
                </div>
                {PRIMARY_LINKS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all ${
                        isActive
                          ? "bg-cyan-500/25 text-cyan-200 font-bold border border-cyan-500/50"
                          : "text-white/70 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon size={16} className={isActive ? "text-cyan-400" : "text-white/40"} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}

                <div className="text-[10px] text-cyan-300/60 uppercase tracking-widest px-2 pt-3 pb-1">
                  Extended Diagnostics
                </div>
                {MORE_TECHNICAL_LINKS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                        isActive
                          ? "bg-cyan-500/25 text-cyan-200 font-bold border border-cyan-500/50"
                          : "text-white/70 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon size={16} className={isActive ? "text-cyan-400" : "text-white/40"} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/[0.1]" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-white/50">Current Risk Index:</span>
                <span className="font-bold text-cyan-300">
                  {riskScore.toFixed(0)} / 100 ({threatLevel})
                </span>
              </div>
              <button
                onClick={() => {
                  onToggleDemo();
                  setMobileOpen(false);
                }}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold border border-white/10"
              >
                Toggle Mode (Current: {demoMode ? "SIMULATOR" : "LIVE"})
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SYSTEM STATUS MODAL ── */}
      {showStatusModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowStatusModal(false)}
        >
          <div
            className="bg-[#0A0F26] border border-cyan-500/30 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Activity size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">System Status & Edge Mesh</h3>
                  <p className="text-[10px] font-mono text-white/40">VaaniShield Zero-Trust Ingestion</p>
                </div>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#070A18] border border-white/[0.06] flex justify-between items-center">
                <span className="text-white/60">Edge Ingestion Gateway:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE (16kHz PCM)
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#070A18] border border-white/[0.06] flex justify-between items-center">
                <span className="text-white/60">Praat Acoustic Engine:</span>
                <span className="text-emerald-400 font-bold">ACTIVE (0.8ms hop)</span>
              </div>
              <div className="p-3 rounded-xl bg-[#070A18] border border-white/[0.06] flex justify-between items-center">
                <span className="text-white/60">ECAPA-TDNN ONNX Runtime:</span>
                <span className="text-emerald-400 font-bold">READY (192-dim pgvector)</span>
              </div>
              <div className="p-3 rounded-xl bg-[#070A18] border border-white/[0.06] flex justify-between items-center">
                <span className="text-white/60">DPDP Compliance Mode:</span>
                <span className="text-cyan-300 font-bold">ZERO EDGE RETENTION</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-mono font-bold text-white transition-colors"
              >
                Close Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SETTINGS MODAL ── */}
      {showSettingsModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            className="bg-[#0A0F26] border border-white/[0.12] rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Settings size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Platform Security Policy</h3>
                  <p className="text-[10px] font-mono text-white/40">Thresholds & Risk Configuration</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-mono">
              <div className="space-y-1.5">
                <div className="flex justify-between text-white/70">
                  <span>Amber Risk Threshold (Verification Required)</span>
                  <span className="text-amber-400 font-bold">40 / 100</span>
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: "40%" }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-white/70">
                  <span>Red Risk Threshold (Hard Block Interceptor)</span>
                  <span className="text-rose-400 font-bold">75 / 100</span>
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: "75%" }} />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-white/70 leading-relaxed">
                Biometric sensitivity presets are dynamically optimized for high-frequency banking environments to eliminate false positives.
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-mono font-bold text-white transition-colors shadow-lg shadow-cyan-600/30"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

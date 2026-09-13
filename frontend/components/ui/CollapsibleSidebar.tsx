"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import {
  LayoutDashboard,
  AudioWaveform,
  Fingerprint,
  ShieldAlert,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Shield,
  Mic,
  MicOff,
  RefreshCw,
  Play,
  Activity,
  Zap,
  Menu,
  X,
} from "lucide-react";

export type NavTabId =
  | "overview"
  | "voice-analysis"
  | "voiceprint"
  | "threat-analysis"
  | "transactions";

interface CollapsibleSidebarProps {
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

const NAV_ITEMS: {
  id: NavTabId;
  label: string;
  subLabel: string;
  icon: React.ElementType;
}[] = [
  {
    id: "overview",
    label: "Overview",
    subLabel: "Home telemetry & risk chart",
    icon: LayoutDashboard,
  },
  {
    id: "voice-analysis",
    label: "Voice Analysis",
    subLabel: "Spectrogram & micro-prosody",
    icon: AudioWaveform,
  },
  {
    id: "voiceprint",
    label: "Voiceprint",
    subLabel: "ECAPA-TDNN 192-dim match",
    icon: Fingerprint,
  },
  {
    id: "threat-analysis",
    label: "Threat Engine",
    subLabel: "Weight matrix & PITCH prompt",
    icon: ShieldAlert,
  },
  {
    id: "transactions",
    label: "Transactions",
    subLabel: "SBI YONO UPI Gate & audit log",
    icon: CreditCard,
  },
];

export default function CollapsibleSidebar({
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
}: CollapsibleSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sessionId = useTelemetryStore((s) => s.sessionId);
  const threatLevel = useTelemetryStore((s) => s.threatLevel);
  const latencyMs = useTelemetryStore((s) => s.latencyMs);

  const threatBadgeBg =
    threatLevel === "RED"
      ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
      : threatLevel === "AMBER"
      ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
      : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400";

  return (
    <>
      {/* Mobile Menu Button (Fixed Top-Left for mobile viewports) */}
      <div className="lg:hidden fixed top-3 left-3 z-50">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-white shadow-xl backdrop-blur-md cursor-pointer"
          aria-label="Toggle Navigation Menu"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen z-40 flex flex-col bg-neutral-950/90 border-r border-neutral-800/80 backdrop-blur-xl transition-all duration-300 ease-in-out shadow-2xl ${
          collapsed ? "w-20" : "w-64"
        } ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header / Brand Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-800/80 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Shield size={18} />
            </div>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col min-w-0"
              >
                <div className="flex items-center gap-1">
                  <span className="font-black text-sm tracking-wider text-white">VAANI</span>
                  <span className="font-bold text-xs font-mono text-cyan-400">SHIELD</span>
                </div>
                <span className="text-[9px] font-mono text-neutral-400 tracking-wider">
                  AI VOICE INTELLIGENCE
                </span>
              </motion.div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Live Status Pill (When Expanded) */}
        {!collapsed && (
          <div className="px-4 py-2.5 border-b border-neutral-800/60 bg-neutral-900/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                  ENGINE ONLINE
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${threatBadgeBg}`}>
                  {threatLevel}
                </span>
                <span className="text-[10px] font-mono text-sky-400">
                  {latencyMs > 0 ? `${Math.round(latencyMs)}ms` : "68ms"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-none">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group relative cursor-pointer ${
                  isActive
                    ? "bg-neutral-900 border border-neutral-700/80 text-white shadow-lg"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50 border border-transparent"
                }`}
                title={collapsed ? item.label : undefined}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <motion.div
                    layoutId="sidebarActiveIndicator"
                    className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                  />
                )}

                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                      : "bg-neutral-900/80 text-neutral-400 group-hover:text-white border border-neutral-800/80"
                  }`}
                >
                  <Icon size={16} />
                </div>

                {!collapsed && (
                  <div className="flex flex-col min-w-0 flex-1">
                    <span
                      className={`text-xs font-semibold truncate ${
                        isActive ? "text-white" : "text-neutral-300 group-hover:text-white"
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400 truncate">
                      {item.subLabel}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Audio Input / Live Mic Controller */}
        <div className="px-3 py-3 border-t border-neutral-800/80 bg-neutral-950/60">
          {!collapsed ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                <span className="uppercase tracking-wider flex items-center gap-1.5 font-semibold text-neutral-300">
                  <Activity size={11} className="text-cyan-400" /> Audio Stream
                </span>
                <span className="text-neutral-400">{activeSource ? "Streaming" : "Idle"}</span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-1.5">
                {activeSource === "microphone" ? (
                  <button
                    onClick={onStopStreaming}
                    className="col-span-2 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-xs font-mono font-semibold transition-colors cursor-pointer"
                  >
                    <MicOff size={13} />
                    <span>Mute Mic</span>
                  </button>
                ) : (
                  <button
                    onClick={onStartMic}
                    className="col-span-2 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold transition-colors cursor-pointer"
                  >
                    <Mic size={13} />
                    <span>Live Mic Input</span>
                  </button>
                )}

                <button
                  onClick={() => onStartSimulated("sim_human")}
                  className="flex items-center justify-center gap-1 py-1 px-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono transition-colors cursor-pointer"
                  title="Inject verified authentic human speech"
                >
                  <Play size={10} />
                  <span>Human Test</span>
                </button>

                <button
                  onClick={() => onStartSimulated("sim_clone")}
                  className="flex items-center justify-center gap-1 py-1 px-1.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-[10px] font-mono transition-colors cursor-pointer"
                  title="Inject synthetic voice clone attack"
                >
                  <ShieldAlert size={10} />
                  <span>Clone Attack</span>
                </button>
              </div>

              {/* Volume Meter if active */}
              {activeSource && (
                <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden border border-neutral-800">
                  <div
                    className="h-full bg-cyan-400 rounded-full transition-all duration-75"
                    style={{ width: `${Math.min(100, volume * 350)}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={activeSource ? onStopStreaming : onStartMic}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                  activeSource
                    ? "bg-red-500/20 border border-red-500/40 text-red-400"
                    : "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25"
                }`}
                title={activeSource ? "Stop microphone" : "Start live microphone"}
              >
                {activeSource ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            </div>
          )}
        </div>

        {/* Bottom: Simulator Mode Toggle Pill & Session Info */}
        <div className="p-3 border-t border-neutral-800/80 bg-neutral-950">
          {!collapsed ? (
            <div className="space-y-2.5">
              {/* Simulator Mode Pill */}
              <div className="p-2 rounded-xl bg-neutral-900/80 border border-neutral-800/90 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${demoMode ? "bg-amber-400 animate-pulse" : "bg-cyan-400"}`} />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-neutral-200">
                      {demoMode ? "Simulator Active" : "Live Edge Mode"}
                    </span>
                    <span className="text-[9px] font-mono text-neutral-400">
                      {demoMode ? "Scripted attack cycle" : "Real-time stream"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={onToggleDemo}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    demoMode
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                      : "bg-neutral-800 text-neutral-400 border border-neutral-700 hover:text-white"
                  }`}
                >
                  {demoMode ? "ON" : "OFF"}
                </button>
              </div>

              {/* Session ID & Reset */}
              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 px-1">
                <span className="truncate max-w-[120px]" title={sessionId}>
                  {sessionId.slice(0, 14)}…
                </span>
                <button
                  onClick={onResetSession}
                  className="inline-flex items-center gap-1 text-neutral-400 hover:text-cyan-400 transition-colors cursor-pointer"
                  title="Reset session telemetry"
                >
                  <RefreshCw size={11} />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={onToggleDemo}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  demoMode
                    ? "bg-amber-500/20 border border-amber-500/40 text-amber-300"
                    : "bg-neutral-900 border border-neutral-800 text-neutral-400"
                }`}
                title={demoMode ? "Simulator Mode: ON" : "Simulator Mode: OFF"}
              >
                <Zap size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

/**
 * AppSidebar — Professional Cybersecurity Left Navigation Sidebar
 * Responsive: Collapsible on Desktop (w-64 / w-20), Sheet/Drawer on Mobile.
 * Preserves continuous background audio streaming and WebSocket connections.
 */

"use client";

import React, { useState } from "react";
import { useTelemetryStore, WsStatus } from "@/store/useTelemetryStore";
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
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Radio,
  Eye,
  Mic,
  Square,
  Play,
  AlertTriangle,
  RefreshCw,
  Volume2,
  Lock,
  Clock,
  Wifi,
  Activity,
} from "lucide-react";

export type ActiveNavTab =
  | "overview"
  | "voice-analysis"
  | "voiceprint"
  | "threat-analysis"
  | "audio-telemetry"
  | "processing-pipeline"
  | "challenge-response"
  | "transactions"
  | "settings";

interface AppSidebarProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
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

const ANALYSIS_NAV: { id: ActiveNavTab; label: string; icon: React.ElementType }[] = [
  { id: "voice-analysis", label: "Voice Analysis", icon: AudioWaveform },
  { id: "voiceprint", label: "Voiceprint (ECAPA)", icon: Fingerprint },
  { id: "threat-analysis", label: "Threat Analysis", icon: ShieldAlert },
  { id: "audio-telemetry", label: "Audio Telemetry", icon: Sliders },
  { id: "processing-pipeline", label: "Processing Pipeline", icon: Cpu },
  { id: "challenge-response", label: "Challenge Response", icon: Zap },
];

const SECURITY_NAV: { id: ActiveNavTab; label: string; icon: React.ElementType }[] = [
  { id: "transactions", label: "Transactions", icon: CreditCard },
];

export default function AppSidebar({
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
}: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const sessionId = useTelemetryStore((s) => s.sessionId);
  const wsStatus = useTelemetryStore((s) => s.wsStatus);
  const latencyMs = useTelemetryStore((s) => s.latencyMs);
  const threatLevel = useTelemetryStore((s) => s.threatLevel);
  const riskScore = useTelemetryStore((s) => s.riskScore);

  const threatColor =
    threatLevel === "RED" ? "#EF4444" : threatLevel === "AMBER" ? "#F59E0B" : "#10B981";

  const handleTabClick = (tab: ActiveNavTab) => {
    onSelectTab(tab);
    setMobileOpen(false);
  };

  const renderNavButton = (id: ActiveNavTab, label: string, Icon: React.ElementType) => {
    const isActive = activeTab === id;
    return (
      <button
        key={id}
        onClick={() => handleTabClick(id)}
        className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
          isActive
            ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10 font-bold"
            : "text-white/60 hover:text-white hover:bg-white/[0.04] border border-transparent"
        } ${collapsed ? "lg:justify-center lg:px-2" : ""}`}
        title={label}
      >
        <Icon size={15} className={isActive ? "text-cyan-400 shrink-0" : "text-white/40 shrink-0"} />
        {!collapsed && <span className="truncate">{label}</span>}
      </button>
    );
  };

  return (
    <>
      {/* ── Mobile Top Header Bar ──────────────── */}
      <div className="lg:hidden w-full bg-[#080B1A] border-b border-white/[0.08] px-4 py-3 flex items-center justify-between z-30 sticky top-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md">
            <Shield size={15} />
          </div>
          <span className="font-extrabold tracking-wider text-sm text-white">
            VAANI<span className="text-cyan-400">SHIELD</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: threatColor }}
            title={`Threat: ${threatLevel}`}
          />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* ── Mobile Drawer Backdrop ───────────── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar Container (Desktop Persistent + Mobile Drawer) ── */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 flex flex-col justify-between bg-[#060816] border-r border-white/[0.08] transition-all duration-300 ${
          collapsed ? "lg:w-20" : "lg:w-64"
        } ${
          mobileOpen ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Top: Logo & Nav Items */}
        <div className="overflow-y-auto overflow-x-hidden flex-1">
          <div className="p-4 border-b border-white/[0.08] flex items-center justify-between sticky top-0 bg-[#060816] z-10">
            <div className={`flex items-center gap-3 overflow-hidden ${collapsed ? "lg:justify-center w-full" : ""}`}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                <Shield size={17} className="text-white" />
              </div>
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="text-sm font-black tracking-wider text-white">
                    VAANI<span className="text-cyan-400">SHIELD</span>
                  </span>
                  <span className="text-[9px] font-mono text-white/40 tracking-widest uppercase">
                    AI Voice Security
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white transition-colors"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>

          {/* Navigation Items List */}
          <nav className="p-2 space-y-3">
            {/* Overview / Home */}
            <div className="space-y-0.5">
              {renderNavButton("overview", "Overview", LayoutDashboard)}
            </div>

            {/* Analysis Section */}
            <div className="space-y-0.5">
              {!collapsed && (
                <div className="px-3 pt-2 pb-1 text-[9px] font-mono tracking-widest text-white/30 uppercase">
                  ANALYSIS
                </div>
              )}
              {ANALYSIS_NAV.map((item) => renderNavButton(item.id, item.label, item.icon))}
            </div>

            {/* Security Section */}
            <div className="space-y-0.5">
              {!collapsed && (
                <div className="px-3 pt-2 pb-1 text-[9px] font-mono tracking-widest text-white/30 uppercase">
                  SECURITY
                </div>
              )}
              {SECURITY_NAV.map((item) => renderNavButton(item.id, item.label, item.icon))}
            </div>

            {/* System Section */}
            <div className="space-y-0.5">
              {!collapsed && (
                <div className="px-3 pt-2 pb-1 text-[9px] font-mono tracking-widest text-white/30 uppercase">
                  SYSTEM
                </div>
              )}
              <button
                onClick={() => setShowStatusModal(true)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-mono text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors ${
                  collapsed ? "lg:justify-center" : ""
                }`}
                title="System Status & Health Check"
              >
                <div className="flex items-center gap-2.5">
                  <Activity size={15} className="text-emerald-400 shrink-0" />
                  {!collapsed && <span>System Status</span>}
                </div>
                {!collapsed && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setShowSettingsModal(true)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-mono text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors ${
                  collapsed ? "lg:justify-center" : ""
                }`}
                title="Platform Settings & Thresholds"
              >
                <div className="flex items-center gap-2.5">
                  <Settings size={15} className="text-cyan-400 shrink-0" />
                  {!collapsed && <span>Settings</span>}
                </div>
                {!collapsed && (
                  <span className="text-[9px] font-mono text-white/30">v2.4.0</span>
                )}
              </button>
            </div>
          </nav>
        </div>

        {/* Middle/Bottom: Audio Streaming Controls Strip */}
        <div className="p-3 border-t border-white/[0.08] space-y-2 bg-[#040612]">
          {/* Mode Pill Toggle */}
          <button
            onClick={onToggleDemo}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all border ${
              demoMode
                ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                : "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
            } ${collapsed ? "lg:justify-center" : ""}`}
            title="Toggle between Simulator and Live WebSocket Streaming"
          >
            <div className="flex items-center gap-1.5 truncate">
              {demoMode ? <Eye size={12} /> : <Radio size={12} className="animate-pulse" />}
              {!collapsed && <span>{demoMode ? "MODE: SIMULATOR" : "MODE: LIVE STREAM"}</span>}
            </div>
          </button>

          {/* Live Audio Controls (When Expanded & in LIVE mode) */}
          {!collapsed && !demoMode && (
            <div className="space-y-1.5 pt-1">
              {/* Mic Stream Button */}
              <button
                onClick={() => (activeSource === "mic" ? onStopStreaming() : onStartMic())}
                className={`w-full py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeSource === "mic"
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse"
                    : "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25"
                }`}
              >
                {activeSource === "mic" ? <Square size={10} className="fill-current" /> : <Mic size={11} />}
                <span>{activeSource === "mic" ? "Stop Live Mic" : "Start Live Mic"}</span>
              </button>

              {/* Injections */}
              <div className="grid grid-cols-2 gap-1 text-[9px] font-mono">
                <button
                  onClick={() => (activeSource === "sim_human" ? onStopStreaming() : onStartSimulated("sim_human"))}
                  className="p-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 truncate"
                >
                  Test Human
                </button>
                <button
                  onClick={() => (activeSource === "sim_clone" ? onStopStreaming() : onStartSimulated("sim_clone"))}
                  className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 truncate"
                >
                  Test Clone
                </button>
              </div>

              {/* Volume VU */}
              {activeSource && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/[0.03] border border-white/[0.06] text-[10px] font-mono">
                  <Volume2 size={11} className="text-cyan-400" />
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-rose-400 rounded-full transition-all duration-75"
                      style={{ width: `${volume}%` }}
                    />
                  </div>
                  <span className="text-cyan-300 text-[9px]">{volume}%</span>
                </div>
              )}
            </div>
          )}

          {/* Bottom System Status & Settings Action Bar */}
          <div className="pt-2 border-t border-white/[0.06] space-y-1">
            <button
              onClick={() => setShowStatusModal(true)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors ${
                collapsed ? "lg:justify-center" : ""
              }`}
              title="System Status & Health Check"
            >
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-emerald-400" />
                {!collapsed && <span>System Status</span>}
              </div>
              {!collapsed && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors ${
                collapsed ? "lg:justify-center" : ""
              }`}
              title="Platform Settings & Thresholds"
            >
              <div className="flex items-center gap-2">
                <Settings size={14} className="text-cyan-400" />
                {!collapsed && <span>Settings</span>}
              </div>
              {!collapsed && (
                <span className="text-[9px] font-mono text-white/30">v2.4.0</span>
              )}
            </button>
          </div>

          {/* System Status Summary */}
          {!collapsed && (
            <div className="pt-2 border-t border-white/[0.06] text-[10px] font-mono text-white/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: threatColor }}
                  />
                  <span>RISK: {riskScore.toFixed(0)}/100</span>
                </span>
                <span className={wsStatus === "CONNECTED" ? "text-emerald-400" : "text-amber-400"}>
                  {wsStatus}
                </span>
              </div>
              <div className="flex items-center justify-between text-[9px] text-white/30">
                <span>LATENCY: {latencyMs > 0 ? `${latencyMs.toFixed(0)}ms` : "<80ms"}</span>
                <button
                  onClick={onResetSession}
                  className="hover:text-white flex items-center gap-0.5"
                  title="Generate new session token"
                >
                  <RefreshCw size={9} />
                  <span>RESET</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── System Status Modal ── */}
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
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Activity size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">System Status & Edge Health</h3>
                  <p className="text-[10px] font-mono text-white/40">VaaniShield Zero-Trust Mesh</p>
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
              <div className="p-2.5 rounded-xl bg-[#070A18] border border-white/[0.04] flex justify-between items-center">
                <span className="text-white/60">Edge Ingestion Gateway:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  ONLINE (16kHz PCM)
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#070A18] border border-white/[0.04] flex justify-between items-center">
                <span className="text-white/60">Praat Acoustic Engine:</span>
                <span className="text-emerald-400 font-bold">ACTIVE (0.8ms hop)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#070A18] border border-white/[0.04] flex justify-between items-center">
                <span className="text-white/60">ECAPA-TDNN ONNX Runtime:</span>
                <span className="text-emerald-400 font-bold">READY (192-dim pgvector)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#070A18] border border-white/[0.04] flex justify-between items-center">
                <span className="text-white/60">DPDP Compliance Mode:</span>
                <span className="text-cyan-300 font-bold">ZERO EDGE RETENTION</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#070A18] border border-white/[0.04] flex justify-between items-center">
                <span className="text-white/60">Active Session ID:</span>
                <span className="text-white/80 font-mono text-[10px]">{sessionId}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-mono font-bold text-white transition-colors"
              >
                Close Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings Modal ── */}
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
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Settings size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Platform Security Settings</h3>
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

            <div className="space-y-3 text-xs font-mono">
              <div className="space-y-1">
                <div className="flex justify-between text-white/70">
                  <span>Amber Risk Threshold (Verification Required)</span>
                  <span className="text-amber-400 font-bold">40 / 100</span>
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: "40%" }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-white/70">
                  <span>Red Risk Threshold (Hard Block Interceptor)</span>
                  <span className="text-rose-400 font-bold">75 / 100</span>
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: "75%" }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-white/70">
                  <span>ECAPA-TDNN Cosine Match Threshold</span>
                  <span className="text-purple-400 font-bold">0.60 Cosine</span>
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: "60%" }} />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-[11px] text-white/60 leading-relaxed">
                Biometric sensitivity presets are dynamically optimized for high-frequency banking environments to eliminate false positives under Indian accented English & Hindi.
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-mono font-bold text-white transition-colors"
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

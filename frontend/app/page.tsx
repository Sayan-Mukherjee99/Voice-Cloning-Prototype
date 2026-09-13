/**
 * VaaniShield — Production AI Voice Security & Anti-Spoofing Platform
 * Top Navigation with 21st.dev Limelight Navbar
 * https://21st.dev/@jahed/components/limelight-nav
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import GridBlurBg from "@/components/ui/GridBlurBg";
import LimelightNavbar from "@/components/navigation/LimelightNavbar";
import PillMarquee from "@/components/ui/PillMarquee";
import OverviewView from "@/components/views/OverviewView";
import VoiceAnalysisView from "@/components/views/VoiceAnalysisView";
import VoiceprintView from "@/components/views/VoiceprintView";
import ThreatAnalysisView from "@/components/views/ThreatAnalysisView";
import TransactionsView from "@/components/views/TransactionsView";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import { useSimulator } from "@/hooks/useSimulator";
import { useVaaniShieldWs } from "@/hooks/useVaaniShieldWs";
import { useAudioStreamer } from "@/hooks/useAudioStreamer";
import {
  Mic,
  MicOff,
  Play,
  ShieldAlert,
  Zap,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";

export type NavTabId =
  | "overview"
  | "voice-analysis"
  | "voiceprint"
  | "threat-analysis"
  | "transactions";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<NavTabId>("overview");
  const [demoMode, setDemoMode] = useState(true);
  const [sessionId, setSessionId] = useState("call-secops-842");
  const [speakerId] = useState("speaker-demo-01");

  const setStoreSessionId = useTelemetryStore((s) => s.setSessionId);
  const threatLevel = useTelemetryStore((s) => s.threatLevel);
  const riskScore = useTelemetryStore((s) => s.riskScore);
  const latencyMs = useTelemetryStore((s) => s.latencyMs);

  // Generate dynamic session ID on client mount to avoid SSR mismatch
  useEffect(() => {
    setSessionId(`call-${Math.random().toString(36).slice(2, 9)}`);
  }, []);

  useEffect(() => {
    setStoreSessionId(sessionId);
  }, [sessionId, setStoreSessionId]);

  // Persistent Simulator loop active when demoMode is true
  useSimulator(demoMode);

  // Persistent live WebSocket stream handler active when in live mode
  const { sendPcmFrame, isConnected, reconnect } = useVaaniShieldWs(sessionId, speakerId, !demoMode);

  // Web Audio API continuous capture & 16kHz PCM downsampler
  const {
    activeSource,
    volume,
    error: micError,
    startMicStreaming,
    startSimulatedStream,
    stopStreaming,
  } = useAudioStreamer({
    onFrame: sendPcmFrame,
  });

  // Stop active microphone if toggled into simulator mode
  useEffect(() => {
    if (demoMode && activeSource) {
      stopStreaming();
    }
  }, [demoMode, activeSource, stopStreaming]);

  const handleResetSession = useCallback(() => {
    const newId = `call-${Math.random().toString(36).slice(2, 9)}`;
    setSessionId(newId);
    if (!demoMode) {
      reconnect();
    }
  }, [demoMode, reconnect]);

  const threatColor =
    threatLevel === "RED"
      ? "#EF4444"
      : threatLevel === "AMBER"
      ? "#F59E0B"
      : "#10B981";

  return (
    <div className="min-h-screen w-full bg-[#08080a] text-neutral-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden relative">
      {/* ── 1. 21st.dev Ambient Gradient Blur & Grid Background Overlay ── */}
      <GridBlurBg className="fixed inset-0 -z-10 pointer-events-none opacity-40" />

      {/* ── 2. Limelight Top Floating Navbar ── */}
      <LimelightNavbar activeTab={activeTab} setActiveTab={(tab) => setActiveTab(tab as NavTabId)} />

      {/* ── 3. Continuous Velocity Live Status Pill Marquee ── */}
      <div className="w-full max-w-6xl mx-auto px-4 mt-2">
        <PillMarquee />
      </div>

      {/* ── 4. Quick Control Action Toolbar ── */}
      <div className="w-full max-w-5xl mx-auto px-4 my-2">
        <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl p-2.5 shadow-md flex flex-wrap items-center justify-between gap-2.5 backdrop-blur-md">
          {/* Audio Input Controls */}
          <div className="flex items-center gap-2">
            {activeSource === "mic" ? (
              <button
                onClick={stopStreaming}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-xs font-mono font-semibold transition cursor-pointer"
              >
                <MicOff size={13} />
                <span>Mute Mic</span>
              </button>
            ) : (
              <button
                onClick={startMicStreaming}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold transition cursor-pointer"
              >
                <Mic size={13} />
                <span>Live Mic</span>
              </button>
            )}

            <button
              onClick={() => startSimulatedStream("sim_human")}
              className="flex items-center gap-1 py-1.5 px-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-mono transition cursor-pointer"
              title="Inject verified authentic human speech"
            >
              <Play size={11} />
              <span>Human Test</span>
            </button>

            <button
              onClick={() => startSimulatedStream("sim_clone")}
              className="flex items-center gap-1 py-1.5 px-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-mono transition cursor-pointer"
              title="Inject synthetic voice clone attack"
            >
              <ShieldAlert size={11} />
              <span>Clone Attack</span>
            </button>
          </div>

          {/* Simulator Mode & Session Reset */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${demoMode ? "bg-amber-400 animate-pulse" : "bg-cyan-400"}`} />
              <span className="text-neutral-300">{demoMode ? "Simulator" : "Live Edge"}</span>
              <button
                onClick={() => setDemoMode((d) => !d)}
                className={`ml-1 px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  demoMode
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "bg-neutral-800 text-neutral-400 border border-neutral-700 hover:text-white"
                }`}
              >
                {demoMode ? "ON" : "OFF"}
              </button>
            </div>

            <button
              onClick={handleResetSession}
              className="flex items-center gap-1 text-xs font-mono text-neutral-400 hover:text-cyan-400 transition cursor-pointer px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-800"
              title="Reset session telemetry"
            >
              <RefreshCw size={12} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Application Content ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Secondary Breadcrumb on non-overview views */}
        {activeTab !== "overview" && (
          <div className="mb-5 flex items-center justify-between gap-2 pb-3 border-b border-neutral-800/80">
            <button
              onClick={() => setActiveTab("overview")}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-200 transition-colors py-1.5 px-3 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 cursor-pointer shadow-sm"
            >
              <ArrowLeft size={13} />
              <span>← Back to Overview</span>
            </button>
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest hidden sm:inline">
              Deep Biometric &amp; Fraud Telemetry
            </span>
          </div>
        )}

        {/* Active View */}
        {activeTab === "overview" && (
          <OverviewView onNavigate={(tab) => setActiveTab(tab as NavTabId)} />
        )}
        {activeTab === "voice-analysis" && <VoiceAnalysisView />}
        {activeTab === "voiceprint" && <VoiceprintView />}
        {activeTab === "threat-analysis" && <ThreatAnalysisView />}
        {activeTab === "transactions" && <TransactionsView />}
      </main>

      {/* ── Footer ── */}
      <footer className="w-full border-t border-neutral-800/80 bg-neutral-950/80 py-4 px-6 text-center text-[10px] font-mono text-neutral-400 shrink-0 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>VAANISHIELD ENTERPRISE · AI VOICE SECURITY &amp; TRANSACTION PROTECTION</span>
          <span>DPDP ACT 2023 · ZERO BIOMETRIC RETENTION AT EDGE</span>
        </div>
      </footer>
    </div>
  );
}

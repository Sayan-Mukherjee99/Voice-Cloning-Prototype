/**
 * VaaniShield — Professional AI Voice Security Platform
 *
 * Architecture:
 * - Primary Navigation: Uilora-inspired Floating Gradient Border Nav
 * - Landing Page: Aceternity-inspired Hero with Flickering Lights / Biometric Grid
 * - Full-width responsive container (no sidebar overlapping the hero)
 * - Dedicated analytical views for deep telemetry without cluttering the landing decision
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import GradientBorderNav, { NavTabId } from "@/components/ui/GradientBorderNav";
import OverviewView from "@/components/views/OverviewView";
import VoiceAnalysisView from "@/components/views/VoiceAnalysisView";
import VoiceprintView from "@/components/views/VoiceprintView";
import ThreatAnalysisView from "@/components/views/ThreatAnalysisView";
import AudioTelemetryView from "@/components/views/AudioTelemetryView";
import ProcessingPipelineView from "@/components/views/ProcessingPipelineView";
import ChallengeResponseView from "@/components/views/ChallengeResponseView";
import TransactionsView from "@/components/views/TransactionsView";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import { useSimulator } from "@/hooks/useSimulator";
import { useVaaniShieldWs } from "@/hooks/useVaaniShieldWs";
import { useAudioStreamer } from "@/hooks/useAudioStreamer";
import { ArrowLeft, LayoutDashboard } from "lucide-react";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<NavTabId>("overview");
  const [demoMode, setDemoMode] = useState(true);
  const [sessionId, setSessionId] = useState(() => `call-${Math.random().toString(36).slice(2, 9)}`);
  const [speakerId] = useState("speaker-demo-01");

  const setStoreSessionId = useTelemetryStore((s) => s.setSessionId);

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

  return (
    <div className="min-h-screen w-full bg-[#040614] text-white flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden">
      {/* ── Uilora Floating Gradient Border Primary Navigation ── */}
      <GradientBorderNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        demoMode={demoMode}
        onToggleDemo={() => setDemoMode((d) => !d)}
        activeSource={activeSource}
        volume={volume}
        micError={micError}
        onStartMic={startMicStreaming}
        onStartSimulated={startSimulatedStream}
        onStopStreaming={stopStreaming}
        onResetSession={handleResetSession}
      />

      {/* ── Main Application Content Shell ── */}
      <div className="flex-1 flex flex-col min-w-0 w-full pt-3">
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Secondary Breadcrumbs on Detailed Pages */}
          {activeTab !== "overview" && (
            <div className="mb-4 flex items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
              <button
                onClick={() => setActiveTab("overview")}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-200 transition-colors py-1 px-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08]"
              >
                <ArrowLeft size={13} />
                <span>← Back to Security Decision Overview</span>
              </button>
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest hidden sm:inline">
                Deep Telemetry & Biometrics Mode
              </span>
            </div>
          )}

          {/* Views */}
          {activeTab === "overview" && (
            <OverviewView onNavigate={(tab) => setActiveTab(tab as NavTabId)} />
          )}
          {activeTab === "voice-analysis" && <VoiceAnalysisView />}
          {activeTab === "voiceprint" && <VoiceprintView />}
          {activeTab === "threat-analysis" && <ThreatAnalysisView />}
          {activeTab === "audio-telemetry" && <AudioTelemetryView />}
          {activeTab === "processing-pipeline" && <ProcessingPipelineView />}
          {activeTab === "challenge-response" && <ChallengeResponseView />}
          {activeTab === "transactions" && <TransactionsView />}
        </main>

        {/* ── Footer ── */}
        <footer className="w-full border-t border-white/[0.06] bg-[#03050F] py-4 px-6 text-center text-[10px] font-mono text-white/30 shrink-0 mt-auto">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <span>VAANISHIELD ENTERPRISE · AI VOICE SECURITY & TRANSACTION PROTECTION</span>
            <span>DPDP ACT 2023 · ZERO BIOMETRIC RETENTION AT EDGE</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

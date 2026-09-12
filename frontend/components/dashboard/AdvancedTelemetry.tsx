/**
 * AdvancedTelemetry — Collapsible Raw Telemetry & Diagnostic Console
 * Section 8: Deep engineering telemetry using shadcn Collapsible.
 */

"use client";

import React, { useState } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import {
  Cpu,
  ChevronDown,
  ChevronUp,
  Server,
  Wifi,
  Database,
  Lock,
  Layers,
  Terminal,
  Activity,
} from "lucide-react";

export default function AdvancedTelemetry() {
  const [isOpen, setIsOpen] = useState(false);

  const sessionId = useTelemetryStore((s) => s.sessionId);
  const wsStatus = useTelemetryStore((s) => s.wsStatus);
  const latencyMs = useTelemetryStore((s) => s.latencyMs);
  const latestSnapshot = useTelemetryStore((s) => s.latestSnapshot);
  const tier2Triggered = useTelemetryStore((s) => s.tier2Triggered);
  const riskScore = useTelemetryStore((s) => s.riskScore);

  return (
    <div className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <CollapsibleTrigger className="w-full flex items-center justify-between p-3 rounded-xl bg-[#0A0F26]/70 hover:bg-[#0A0F26] border border-white/[0.08] transition-all text-xs font-mono text-white/60 hover:text-white">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-cyan-400" />
            <span className="font-bold tracking-wider text-white/90">
              ADVANCED TELEMETRY & DIAGNOSTICS
            </span>
            <span className="text-[10px] text-white/40 hidden sm:inline">
              (WebSocket, Onnx Models, DPDP Act Compliance)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 text-white/40 border border-white/10">
              {isOpen ? "COLLAPSE" : "EXPAND TELEMETRY"}
            </span>
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="bg-[#070A18] rounded-xl border border-white/[0.06] p-4 mt-2 space-y-4 text-xs font-mono">
            {/* Grid 1: System Ingestion & WebSocket Specs */}
            <div>
              <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Wifi size={12} />
                <span>Audio Streaming & Ingestion Metrics</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-white/40 block text-[9px]">SESSION TOKEN</span>
                  <span className="font-bold text-cyan-300 truncate block">
                    {sessionId || "call-standby"}
                  </span>
                </div>
                <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-white/40 block text-[9px]">WEBSOCKET STATUS</span>
                  <span
                    className={`font-bold ${
                      wsStatus === "CONNECTED" ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {wsStatus}
                  </span>
                </div>
                <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-white/40 block text-[9px]">AUDIO CODEC & RATE</span>
                  <span className="font-bold text-white/80">16kHz 16-bit Linear PCM</span>
                </div>
                <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-white/40 block text-[9px]">INGESTION HOP</span>
                  <span className="font-bold text-white/80">512 Samples (32ms hop)</span>
                </div>
              </div>
            </div>

            {/* Grid 2: AI & Acoustic Models */}
            <div>
              <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Database size={12} />
                <span>Active Neural & Biomechanical Models</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-white/40 text-[9px]">TIER 1 ACOUSTIC ENGINE</span>
                    <span className="text-[9px] text-emerald-400 font-bold">READY</span>
                  </div>
                  <div className="font-bold text-white">Praat / Parselmouth C++ Core</div>
                  <div className="text-[9px] text-white/40">F0 AC, PointProcess Jitter & Shimmer</div>
                </div>

                <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-white/40 text-[9px]">SILERO VAD</span>
                    <span className="text-[9px] text-emerald-400 font-bold">ACTIVE</span>
                  </div>
                  <div className="font-bold text-white">Silero ONNX v4</div>
                  <div className="text-[9px] text-white/40">Speech probability threshold = 0.50</div>
                </div>

                <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-white/40 text-[9px]">TIER 2 VOICEPRINT MODEL</span>
                    <span className={`text-[9px] font-bold ${tier2Triggered ? "text-purple-400" : "text-neutral-500"}`}>
                      {tier2Triggered ? "INFERENCE" : "STANDBY"}
                    </span>
                  </div>
                  <div className="font-bold text-white">ECAPA-TDNN 192-dim pgvector</div>
                  <div className="text-[9px] text-white/40">Cosine threshold = 0.60</div>
                </div>
              </div>
            </div>

            {/* Grid 3: Compliance & Privacy */}
            <div className="p-3 rounded-lg bg-cyan-500/[0.03] border border-cyan-500/20 text-white/70 space-y-1">
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-[11px]">
                <Lock size={12} />
                <span>Regulatory & Security Compliance</span>
              </div>
              <p className="text-[10px] text-white/50 leading-relaxed">
                VaaniShield complies with the <strong>Digital Personal Data Protection (DPDP) Act 2023</strong> and the <strong>RBI Master Direction on Digital Payment Security</strong>. Audio PCM streams are evaluated in volatile RAM with zero persistent raw recording at the edge.
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

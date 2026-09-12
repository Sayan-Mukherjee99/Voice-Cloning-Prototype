/**
 * SimulatorHook — demo-mode telemetry simulator for UI development
 * when the backend is not running. Feeds realistic synthetic data
 * including threat escalation cycles.
 */

"use client";

import { useEffect, useRef } from "react";
import { useTelemetryStore, TelemetrySnapshot, ThreatLevel } from "@/store/useTelemetryStore";

const PITCH_CHALLENGES = [
  "Kachha Papad, Pakka Papad, Kachha Papad, Pakka Papad",
  "Pital ke bartan mein papita peela peela",
  "Oonth uncha, unth ki peeth unchi, unchi peeth unth ki",
];

// Scenario script: each step defines target risk over N ticks
const SCENARIO: { targetRisk: number; ticks: number }[] = [
  { targetRisk: 12, ticks: 8 },
  { targetRisk: 25, ticks: 5 },
  { targetRisk: 55, ticks: 6 },   // escalation to AMBER
  { targetRisk: 82, ticks: 8 },   // escalation to RED → lock
  { targetRisk: 45, ticks: 6 },   // partial de-escalation
  { targetRisk: 18, ticks: 8 },   // de-escalation to GREEN
];

export function useSimulator(enabled: boolean) {
  const applyTelemetry = useTelemetryStore((s) => s.applyTelemetry);
  const pushSpectrogramColumn = useTelemetryStore((s) => s.pushSpectrogramColumn);
  const setWsStatus = useTelemetryStore((s) => s.setWsStatus);
  const setSessionId = useTelemetryStore((s) => s.setSessionId);
  const resetSession = useTelemetryStore((s) => s.resetSession);

  const chunkRef = useRef(0);
  const scenarioIdxRef = useRef(0);
  const tickInStepRef = useRef(0);
  const currentRiskRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    resetSession();
    const demoSessionId = `DEMO-${Date.now().toString(36).toUpperCase()}`;
    setSessionId(demoSessionId);

    // Small delay to simulate "connecting"
    setWsStatus("CONNECTING");
    const connectTimer = setTimeout(() => setWsStatus("CONNECTED"), 800);

    intervalRef.current = setInterval(() => {
      const step = SCENARIO[scenarioIdxRef.current % SCENARIO.length];
      const alpha = 0.3; // lerp speed
      currentRiskRef.current = currentRiskRef.current * (1 - alpha) + step.targetRisk * alpha;
      const risk = currentRiskRef.current + (Math.random() - 0.5) * 8;
      const clampedRisk = Math.max(0, Math.min(100, risk));

      const f0 = 120 + Math.sin(chunkRef.current * 0.3) * 30 + (Math.random() - 0.5) * 10;
      const jitter = 0.5 + (clampedRisk / 100) * 4.5 + Math.random() * 0.5;
      const shimmer = 2 + (clampedRisk / 100) * 12 + Math.random();
      const hnr = Math.max(0, 28 - (clampedRisk / 100) * 22 + (Math.random() - 0.5) * 3);

      const level: ThreatLevel =
        clampedRisk >= 75 ? "RED" :
        clampedRisk >= 40 ? "AMBER" :
        "GREEN";

      const snapshot: TelemetrySnapshot = {
        chunkIndex: ++chunkRef.current,
        riskScore: clampedRisk,
        threatLevel: level,
        jitter,
        shimmer,
        f0Mean: f0,
        f0Variance: 15 + (clampedRisk / 100) * 40,
        hnrDb: hnr,
        vadSpeechRatio: 0.7 + Math.random() * 0.25,
        tier2Triggered: clampedRisk > 45,
        cosineSimilarity: clampedRisk > 45 ? 0.85 - (clampedRisk / 100) * 0.5 : null,
        latencyMs: 45 + Math.random() * 30,
        pitchChallenge: level !== "GREEN"
          ? PITCH_CHALLENGES[chunkRef.current % PITCH_CHALLENGES.length]
          : null,
        timestamp: Date.now(),
      };

      applyTelemetry(snapshot);

      // Synthetic spectrogram column
      const col = Array.from({ length: 80 }, (_, i) => {
        const freq = i / 80;
        const base = clampedRisk * 1.2 * Math.exp(-Math.pow(freq - 0.25, 2) / 0.04);
        const harm = 60 * Math.exp(-Math.pow(freq - 0.5, 2) / 0.02);
        const noise = Math.random() * 15;
        return Math.min(255, base + harm + noise);
      });
      pushSpectrogramColumn(col);

      // Advance scenario step
      tickInStepRef.current++;
      if (tickInStepRef.current >= step.ticks) {
        tickInStepRef.current = 0;
        scenarioIdxRef.current = (scenarioIdxRef.current + 1) % SCENARIO.length;
      }
    }, 750); // 750ms hop matches backend

    return () => {
      clearTimeout(connectTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setWsStatus("DISCONNECTED");
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}

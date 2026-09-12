/**
 * WebSocket Hook — manages connection lifecycle, transmits binary PCM audio frames,
 * and dispatches incoming telemetry JSON to the Zustand store.
 */

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useTelemetryStore, TelemetrySnapshot, ThreatLevel } from "@/store/useTelemetryStore";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";
const RECONNECT_DELAY_MS = 3000;

interface RawTelemetryMessage {
  type: string;
  session_id: string;
  chunk_index: number;
  risk_score: number;
  threat_level: string;
  jitter: number;
  shimmer: number;
  f0_mean: number;
  f0_variance: number;
  hnr_db: number;
  vad_speech_ratio: number;
  tier2_triggered: boolean;
  cosine_similarity: number | null;
  latency_ms: number;
  pitch_challenge: string | null;
  timestamp_ms: number;
}

export function useVaaniShieldWs(sessionId: string, speakerId?: string, enabled = true) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const [isConnected, setIsConnected] = useState(false);

  const setWsStatus = useTelemetryStore((s) => s.setWsStatus);
  const applyTelemetry = useTelemetryStore((s) => s.applyTelemetry);
  const pushSpectrogramColumn = useTelemetryStore((s) => s.pushSpectrogramColumn);
  const setSessionId = useTelemetryStore((s) => s.setSessionId);

  const connect = useCallback(() => {
    if (!sessionId || !mountedRef.current || !enabled) return;

    // Clean up previous socket if any
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    const params = speakerId ? `?speaker_id=${encodeURIComponent(speakerId)}` : "";
    const url = `${WS_BASE}/v1/stream/call/${sessionId}${params}`;

    setWsStatus("CONNECTING");
    setIsConnected(false);

    try {
      const ws = new WebSocket(url);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setWsStatus("CONNECTED");
        setIsConnected(true);
        setSessionId(sessionId);
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const raw: RawTelemetryMessage = JSON.parse(event.data as string);
          if (raw.type !== "telemetry") return;

          const snapshot: TelemetrySnapshot = {
            chunkIndex: raw.chunk_index,
            riskScore: raw.risk_score,
            threatLevel: raw.threat_level as ThreatLevel,
            jitter: raw.jitter,
            shimmer: raw.shimmer,
            f0Mean: raw.f0_mean,
            f0Variance: raw.f0_variance,
            hnrDb: raw.hnr_db,
            vadSpeechRatio: raw.vad_speech_ratio,
            tier2Triggered: raw.tier2_triggered,
            cosineSimilarity: raw.cosine_similarity,
            latencyMs: raw.latency_ms,
            pitchChallenge: raw.pitch_challenge,
            timestamp: raw.timestamp_ms,
          };

          applyTelemetry(snapshot);

          // Generate synthetic/correlated spectrogram column from risk + jitter
          const bands = 80;
          const col = Array.from({ length: bands }, (_, i) => {
            const freq = i / bands;
            const base = raw.risk_score * 1.5 * Math.exp(-Math.pow(freq - 0.3, 2) / 0.05);
            const noise = Math.random() * 20;
            return Math.min(255, base + noise);
          });
          pushSpectrogramColumn(col);
        } catch {
          // Non-JSON frame (binary audio echo) — ignore
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setWsStatus("DISCONNECTED");
        setIsConnected(false);
        // Auto-reconnect if enabled
        if (enabled) {
          reconnectRef.current = setTimeout(() => {
            if (mountedRef.current && enabled) connect();
          }, RECONNECT_DELAY_MS);
        }
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setWsStatus("ERROR");
        setIsConnected(false);
      };
    } catch {
      if (mountedRef.current) {
        setWsStatus("ERROR");
        setIsConnected(false);
      }
    }
  }, [sessionId, speakerId, enabled, setWsStatus, setSessionId, applyTelemetry, pushSpectrogramColumn]);

  const sendPcmFrame = useCallback((frame: ArrayBuffer | Uint8Array | Int16Array) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      if (frame instanceof ArrayBuffer) {
        wsRef.current.send(frame);
      } else {
        wsRef.current.send(frame.buffer);
      }
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled && sessionId) {
      connect();
    } else {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setWsStatus("DISCONNECTED");
      setIsConnected(false);
    }

    return () => {
      mountedRef.current = false;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, enabled, sessionId, setWsStatus]);

  return { wsRef, sendPcmFrame, isConnected, reconnect: connect };
}

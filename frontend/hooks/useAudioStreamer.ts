/**
 * useAudioStreamer — Captures real microphone audio or generates calibrated test PCM streams,
 * formats into 16kHz 16-bit Mono Linear PCM frames (1024 samples/frame),
 * and streams them directly to the backend WebSocket pipeline.
 */

"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export type AudioStreamSource = "mic" | "sim_human" | "sim_clone";

interface UseAudioStreamerOptions {
  onFrame: (pcmBuffer: ArrayBuffer) => void;
  onVolumeChange?: (volume: number) => void;
}

export function useAudioStreamer({ onFrame, onVolumeChange }: UseAudioStreamerOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeSource, setActiveSource] = useState<AudioStreamSource | null>(null);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onFrameRef = useRef(onFrame);
  const onVolumeChangeRef = useRef(onVolumeChange);

  useEffect(() => {
    onFrameRef.current = onFrame;
    onVolumeChangeRef.current = onVolumeChange;
  }, [onFrame, onVolumeChange]);

  const stopStreaming = useCallback(() => {
    // Stop synthetic interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Disconnect microphone & Web Audio nodes
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {
        // ignore
      }
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {
        // ignore
      }
      audioCtxRef.current = null;
    }

    setIsStreaming(false);
    setActiveSource(null);
    setVolume(0);
    onVolumeChangeRef.current?.(0);
  }, []);

  const startMicStreaming = useCallback(async () => {
    stopStreaming();
    setError(null);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access is not supported by your browser");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass({ sampleRate: 16000 });
      audioCtxRef.current = ctx;

      const sourceNode = ctx.createMediaStreamSource(stream);
      // ScriptProcessorNode with bufferSize = 1024 (matching backend frame_size: 1024)
      const processor = ctx.createScriptProcessor(1024, 1, 1);
      processorRef.current = processor;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      sourceNode.connect(analyser);
      analyser.connect(processor);
      processor.connect(ctx.destination);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);

        // Convert Float32 [-1.0, 1.0] to Int16 [-32768, 32767]
        let sumSquares = 0;
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          sumSquares += s * s;
        }

        // Calculate RMS volume level (0 - 100)
        const rms = Math.sqrt(sumSquares / inputData.length);
        const currentVol = Math.min(100, Math.round(rms * 250));
        setVolume(currentVol);
        onVolumeChangeRef.current?.(currentVol);

        // Transmit frame to backend WebSocket
        onFrameRef.current(pcm16.buffer);
      };

      setIsStreaming(true);
      setActiveSource("mic");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to access microphone";
      setError(msg);
      stopStreaming();
    }
  }, [stopStreaming]);

  const startSimulatedStream = useCallback(
    (type: "sim_human" | "sim_clone") => {
      stopStreaming();
      setError(null);
      setIsStreaming(true);
      setActiveSource(type);

      const frameSize = 1024;
      const sampleRate = 16000;
      let phase = 0;
      let t = 0;

      // 1024 samples at 16kHz is 64ms
      const intervalMs = 64;

      intervalRef.current = setInterval(() => {
        const pcm16 = new Int16Array(frameSize);
        t += 0.064;

        // Base frequency (Human ~120-180Hz with natural drift, Clone with unnatural rigidity/harmonics)
        const baseFreq =
          type === "sim_human"
            ? 140 + Math.sin(t * 1.5) * 15 + (Math.random() - 0.5) * 6
            : 185 + (Math.random() - 0.5) * 0.5; // unnatural monotonic pitch for clone

        let sumSquares = 0;
        for (let i = 0; i < frameSize; i++) {
          const dt = 1 / sampleRate;
          phase += 2 * Math.PI * baseFreq * dt;

          let sample = 0;
          if (type === "sim_human") {
            // Natural human speech: rich formants + respiratory micro-pause
            const pauseMod = Math.sin(t * 0.8) > 0.7 ? 0.05 : 1.0;
            sample =
              (Math.sin(phase) * 0.6 +
                Math.sin(phase * 2) * 0.25 +
                Math.sin(phase * 3) * 0.12 +
                (Math.random() - 0.5) * 0.03) *
              0.7 *
              pauseMod;
          } else {
            // Synthetic clone: robotic harmonic distortion, phase discontinuity, high-freq buzz
            sample =
              (Math.sin(phase) * 0.5 +
                Math.sin(phase * 2.05) * 0.35 +
                Math.sin(phase * 4.1) * 0.2 +
                (Math.random() - 0.5) * 0.08) *
              0.8;
          }

          const clamped = Math.max(-1, Math.min(1, sample));
          pcm16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
          sumSquares += clamped * clamped;
        }

        const rms = Math.sqrt(sumSquares / frameSize);
        const currentVol = Math.min(100, Math.round(rms * 220));
        setVolume(currentVol);
        onVolumeChangeRef.current?.(currentVol);

        onFrameRef.current(pcm16.buffer);
      }, intervalMs);
    },
    [stopStreaming]
  );

  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, [stopStreaming]);

  return {
    isStreaming,
    activeSource,
    volume,
    error,
    startMicStreaming,
    startSimulatedStream,
    stopStreaming,
  };
}

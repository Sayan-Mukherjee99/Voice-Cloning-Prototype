/**
 * SpectrogramCanvas — 60fps HTML5 Canvas spectrogram + waveform renderer
 * Constrained height and container-aware sizing for the SOC War Room layout.
 */

"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useTelemetryStore } from "@/store/useTelemetryStore";

// ─────────────────────────────────────────────
// Colour map: dark-navy → cyan → white (viridis-inspired)
// ─────────────────────────────────────────────

const COLORMAP: [number, number, number][] = [
  [8, 12, 30],       // 0   – deep navy
  [12, 30, 80],      // 32  – dark blue
  [0, 80, 140],      // 64  – ocean blue
  [0, 140, 160],     // 96  – teal
  [0, 200, 200],     // 128 – cyan
  [80, 240, 200],    // 160 – cyan-green
  [200, 240, 120],   // 192 – yellow-green
  [255, 220, 60],    // 224 – gold
  [255, 255, 255],   // 255 – white
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function valueToRGB(val: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(255, val));
  const idx = (clamped / 255) * (COLORMAP.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(COLORMAP.length - 1, lo + 1);
  const t = idx - lo;
  return [
    Math.round(lerp(COLORMAP[lo][0], COLORMAP[hi][0], t)),
    Math.round(lerp(COLORMAP[lo][1], COLORMAP[hi][1], t)),
    Math.round(lerp(COLORMAP[lo][2], COLORMAP[hi][2], t)),
  ];
}

interface SpectrogramCanvasProps {
  height?: number;
}

export default function SpectrogramCanvas({ height = 110 }: SpectrogramCanvasProps) {
  const spectrogramMatrix = useTelemetryStore((s) => s.spectrogramMatrix);
  const riskScore = useTelemetryStore((s) => s.riskScore);
  const threatLevel = useTelemetryStore((s) => s.threatLevel);

  const spectroRef = useRef<HTMLCanvasElement>(null);
  const waveRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const matrixRef = useRef(spectrogramMatrix);
  const riskRef = useRef(riskScore);

  useEffect(() => { matrixRef.current = spectrogramMatrix; }, [spectrogramMatrix]);
  useEffect(() => { riskRef.current = riskScore; }, [riskScore]);

  // ── Spectrogram renderer ───────────────────
  const drawSpectrogram = useCallback(() => {
    const canvas = spectroRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const matrix = matrixRef.current;

    if (matrix.length === 0) {
      ctx.fillStyle = "#080C1E";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(0,200,255,0.05)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 24) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 18) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      return;
    }

    const colW = Math.max(1, W / 120);
    const binH = H / 80;

    matrix.forEach((col, colIdx) => {
      const x = colIdx * colW;
      col.forEach((val, binIdx) => {
        const [r, g, b] = valueToRGB(val);
        const y = H - (binIdx + 1) * binH;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, colW + 0.5, binH + 0.5);
      });
    });

    // Frequency grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 0.5;
    [0.25, 0.5, 0.75].forEach((frac) => {
      const y = H * frac;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    });

    // Frequency labels
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "8px monospace";
    ctx.fillText("8kHz", 4, 10);
    ctx.fillText("4kHz", 4, H * 0.5 + 4);
    ctx.fillText("0Hz", 4, H - 3);
  }, []);

  // ── Waveform renderer ──────────────────────
  const drawWaveform = useCallback(() => {
    const canvas = waveRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    const risk = riskRef.current;
    const color =
      risk >= 75 ? "#EF4444" :
      risk >= 40 ? "#F59E0B" :
      "#10B981";

    const t = Date.now() / 1000;
    const amplitude = (10 + risk * 0.25) * (H / 50);
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    for (let x = 0; x < W; x++) {
      const phase = (x / W) * Math.PI * 8;
      const y = H / 2
        + Math.sin(phase + t * 2.5) * amplitude * 0.5
        + Math.sin(phase * 1.7 + t * 1.8) * amplitude * 0.3
        + Math.sin(phase * 3.1 + t * 3.2) * amplitude * 0.15
        + (Math.random() - 0.5) * amplitude * 0.08;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Centre line
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 0.5;
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
  }, []);

  const animate = useCallback(() => {
    drawSpectrogram();
    drawWaveform();
    rafRef.current = requestAnimationFrame(animate);
  }, [drawSpectrogram, drawWaveform]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth;
      if (spectroRef.current) {
        spectroRef.current.width = w;
        spectroRef.current.height = height;
      }
      if (waveRef.current) {
        waveRef.current.width = w;
        waveRef.current.height = 42;
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [height]);

  const borderColor =
    threatLevel === "RED" ? "rgba(239,68,68,0.4)" :
    threatLevel === "AMBER" ? "rgba(245,158,11,0.3)" :
    "rgba(0,200,255,0.15)";

  return (
    <div ref={containerRef} className="flex flex-col gap-1.5 w-full min-h-0">
      {/* Spectrogram */}
      <div
        className="relative overflow-hidden rounded-lg min-h-0"
        style={{ border: `1px solid ${borderColor}`, background: "#080C1E" }}
      >
        <canvas
          ref={spectroRef}
          width={700}
          height={height}
          style={{ display: "block", width: "100%", height: `${height}px` }}
        />
        {/* Scan line overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)",
          }}
        />
        <div className="absolute top-1.5 right-2 text-[9px] font-mono text-cyan-400/60 tracking-wider">
          MEL SPECTROGRAM · 80 BINS · 16kHz
        </div>
      </div>

      {/* Waveform */}
      <div
        className="relative overflow-hidden rounded-lg min-h-0"
        style={{ border: `1px solid ${borderColor}`, background: "#05081A" }}
      >
        <canvas
          ref={waveRef}
          width={700}
          height={42}
          style={{ display: "block", width: "100%", height: "42px" }}
        />
        <div className="absolute top-1 right-2 text-[9px] font-mono text-cyan-400/50 tracking-wider">
          PCM WAVEFORM
        </div>
      </div>
    </div>
  );
}

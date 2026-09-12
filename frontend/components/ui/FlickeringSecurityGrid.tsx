/**
 * FlickeringSecurityGrid — Custom Aceternity-inspired Biometric & Security Node Mesh
 * 
 * Reinterprets the flickering lights concept for an AI cybersecurity & fintech platform:
 * - 3D Perspective technical grid with soft depth falloff
 * - Biometric analysis / security nodes at grid intersections
 * - Organic, staggered flickering & signal pulses responding in REAL-TIME to risk level
 * - Cyan/Electric Blue (Nominal) -> Amber (Elevated) -> Red/Orange (Critical Threat)
 * - Highly optimized canvas with requestAnimationFrame, visibility auto-pause, and reduced motion
 */

"use client";

import React, { useEffect, useRef } from "react";

interface FlickeringSecurityGridProps {
  riskScore: number;
  threatLevel: "GREEN" | "AMBER" | "RED";
  className?: string;
}

interface GridNode {
  x: number;
  y: number;
  baseOpacity: number;
  currentOpacity: number;
  targetOpacity: number;
  flickerSpeed: number;
  phase: number;
  size: number;
  isSpecial: boolean;
  pulseTimer: number;
}

export default function FlickeringSecurityGrid({
  riskScore,
  threatLevel,
  className = "",
}: FlickeringSecurityGridProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Determine dynamic RGB color based on threat state
  const isRed = threatLevel === "RED" || riskScore >= 75;
  const isAmber = threatLevel === "AMBER" || (riskScore >= 40 && riskScore < 75);

  const primaryColor = isRed
    ? { r: 239, g: 68, b: 68 } // Crimson Red
    : isAmber
    ? { r: 245, g: 158, b: 11 } // Amber Gold
    : { r: 56, g: 189, b: 248 }; // Cyan / Sky Blue

  const secondaryColor = isRed
    ? { r: 249, g: 115, b: 22 } // Orange
    : isAmber
    ? { r: 251, g: 191, b: 36 } // Yellow
    : { r: 99, g: 102, b: 241 }; // Indigo

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.offsetWidth * window.devicePixelRatio || 800);
    let height = (canvas.height = canvas.offsetHeight * window.devicePixelRatio || 400);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth * window.devicePixelRatio || 800;
      height = canvas.height = canvas.offsetHeight * window.devicePixelRatio || 400;
      initGrid();
    };

    window.addEventListener("resize", handleResize);

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Grid config
    const cols = 28;
    const rows = 14;
    let nodes: GridNode[] = [];

    const initGrid = () => {
      nodes = [];
      const colStep = width / (cols + 1);
      const rowStep = height / (rows + 1);

      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
          const x = c * colStep;
          const y = r * rowStep;
          const isSpecial = Math.random() < 0.15;
          const baseOpacity = isSpecial ? 0.4 + Math.random() * 0.4 : 0.08 + Math.random() * 0.18;

          nodes.push({
            x,
            y,
            baseOpacity,
            currentOpacity: baseOpacity,
            targetOpacity: baseOpacity,
            flickerSpeed: 0.015 + Math.random() * 0.04,
            phase: Math.random() * Math.PI * 2,
            size: isSpecial ? 1.8 * window.devicePixelRatio : 1.0 * window.devicePixelRatio,
            isSpecial,
            pulseTimer: Math.random() * 200,
          });
        }
      }
    };

    initGrid();

    let time = 0;
    let isVisible = true;

    const onVisibilityChange = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const render = () => {
      if (!isVisible) {
        animFrameIdRef.current = requestAnimationFrame(render);
        return;
      }

      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Subtle Perspective Grid Lines
      ctx.lineWidth = 0.5 * window.devicePixelRatio;

      // Horizontal lines with center depth falloff
      const rowStep = height / (rows + 1);
      for (let r = 1; r <= rows; r++) {
        const y = r * rowStep;
        const normY = (y / height - 0.5) * 2;
        const alpha = Math.max(0.02, 0.07 * (1 - Math.abs(normY) * 0.6));

        ctx.strokeStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Vertical lines
      const colStep = width / (cols + 1);
      for (let c = 1; c <= cols; c++) {
        const x = c * colStep;
        const normX = (x / width - 0.5) * 2;
        const alpha = Math.max(0.02, 0.06 * (1 - Math.abs(normX) * 0.7));

        ctx.strokeStyle = `rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // 2. Draw Flickering Security Nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        if (!prefersReducedMotion) {
          node.phase += node.flickerSpeed * (isRed ? 2.2 : isAmber ? 1.5 : 1.0);
          const flicker = Math.sin(node.phase) * 0.5 + 0.5;

          // Occasional random signal spike
          node.pulseTimer--;
          if (node.pulseTimer <= 0) {
            node.targetOpacity = Math.min(1.0, node.baseOpacity + 0.5);
            node.pulseTimer = 80 + Math.random() * 250;
          } else {
            node.targetOpacity = node.baseOpacity * (0.6 + flicker * 0.8);
          }

          node.currentOpacity += (node.targetOpacity - node.currentOpacity) * 0.08;
        }

        const opacity = Math.min(1, Math.max(0.04, node.currentOpacity));

        // Node Glow for special/active nodes
        if (node.isSpecial && opacity > 0.3) {
          const glowSize = node.size * (isRed ? 5 : isAmber ? 4 : 3.5);
          const radGrad = ctx.createRadialGradient(
            node.x,
            node.y,
            0,
            node.x,
            node.y,
            glowSize
          );
          radGrad.addColorStop(
            0,
            `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${opacity * 0.4})`
          );
          radGrad.addColorStop(
            1,
            `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0)`
          );
          ctx.fillStyle = radGrad;
          ctx.beginPath();
          ctx.arc(node.x, node.y, glowSize, 0, Math.PI * 2);
          ctx.fill();
        }

        // Core Node Dot
        ctx.fillStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${opacity})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Central Radial Vignette Mask (darkens edges smoothly to blend with page)
      const vignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        height * 0.15,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.65
      );
      vignette.addColorStop(0, "rgba(6, 8, 22, 0)");
      vignette.addColorStop(0.65, "rgba(6, 8, 22, 0.4)");
      vignette.addColorStop(1, "rgba(6, 8, 22, 0.95)");

      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      if (!prefersReducedMotion) {
        animFrameIdRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [primaryColor.r, primaryColor.g, primaryColor.b, secondaryColor.r, secondaryColor.g, secondaryColor.b, isRed, isAmber, riskScore]);

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        aria-hidden="true"
      />
    </div>
  );
}

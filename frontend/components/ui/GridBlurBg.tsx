"use client";

import React, { useMemo } from "react";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import { motion, AnimatePresence } from "framer-motion";

/**
 * GridBlurBg — 21st.dev Dynamic Threat-Themed Ambient Background (Dark SecOps Theme)
 * https://21st.dev/@meghtrix/components/gradient-blur-bg/grid-blur-top
 */
export default function GridBlurBg({ className = "" }: { className?: string }) {
  const threatLevel = useTelemetryStore((s) => s.threatLevel);
  const riskScore = useTelemetryStore((s) => s.riskScore);

  const isRed = threatLevel === "RED" || riskScore >= 75;
  const isAmber = !isRed && (threatLevel === "AMBER" || riskScore >= 40);

  // Dynamic radiant color palettes based on active security threat level
  const themeConfig = useMemo(() => {
    if (isRed) {
      return {
        id: "red",
        topPrimary: "from-red-600/35 via-rose-600/20 to-transparent",
        leftGlow: "bg-red-500/25",
        rightGlow: "bg-rose-700/20",
        gridLineColor: "rgba(239, 68, 68, 0.08)",
        ambientPulse: true,
      };
    }
    if (isAmber) {
      return {
        id: "amber",
        topPrimary: "from-amber-500/30 via-orange-600/18 to-transparent",
        leftGlow: "bg-amber-500/20",
        rightGlow: "bg-orange-600/15",
        gridLineColor: "rgba(245, 158, 11, 0.08)",
        ambientPulse: false,
      };
    }
    return {
      id: "green",
      topPrimary: "from-cyan-500/25 via-indigo-600/15 to-transparent",
      leftGlow: "bg-emerald-500/15",
      rightGlow: "bg-purple-600/15",
      gridLineColor: "rgba(6, 182, 212, 0.06)",
      ambientPulse: false,
    };
  }, [isRed, isAmber]);

  return (
    <div
      className={`fixed inset-0 -z-10 pointer-events-none opacity-40 overflow-hidden transition-all duration-700 ease-in-out ${className}`}
      aria-hidden="true"
    >
      {/* Top Ambient Radiant Glow Layers */}
      <AnimatePresence mode="wait">
        <motion.div
          key={themeConfig.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          {/* Main Top Center Beam */}
          <div
            className={`absolute -top-32 left-1/2 -translate-x-1/2 w-[1100px] h-[500px] rounded-full bg-gradient-to-b ${themeConfig.topPrimary} blur-[140px] transform-gpu ${
              themeConfig.ambientPulse ? "animate-pulse" : ""
            }`}
          />

          {/* Left Wing Ambient Light */}
          <div
            className={`absolute -top-40 left-1/4 w-[650px] h-[380px] rounded-full ${themeConfig.leftGlow} blur-[130px] transform-gpu`}
          />

          {/* Right Wing Ambient Light */}
          <div
            className={`absolute -top-40 right-1/4 w-[650px] h-[380px] rounded-full ${themeConfig.rightGlow} blur-[130px] transform-gpu`}
          />
        </motion.div>
      </AnimatePresence>

      {/* Grid Pattern Overlay with Radial Gradient Mask */}
      <div
        className="absolute inset-0 w-full h-full transition-all duration-700"
        style={{
          backgroundImage: `
            linear-gradient(to right, ${themeConfig.gridLineColor} 1px, transparent 1px),
            linear-gradient(to bottom, ${themeConfig.gridLineColor} 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 90% 70% at 50% 0%, #000 35%, transparent 95%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 50% 0%, #000 35%, transparent 95%)",
        }}
      />

      {/* Vignette Depth Gradient */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          background: "radial-gradient(circle at 50% 10%, transparent 0%, rgba(4, 6, 20, 0.75) 100%)",
        }}
      />
    </div>
  );
}

"use client";

import React from "react";
import { motion } from "framer-motion";
import { Lock, CheckCircle2, ShieldAlert, ArrowRight, Loader2, IndianRupee } from "lucide-react";

/**
 * MetalButton — 21st.dev inspired Tactical Specular Metallic Action Gate Button
 * https://21st.dev/@arihantcodes_1f7b8c4d/components/metal-button
 *
 * Primary biometric authorization trigger for wire transfer / UPI clearance.
 * High-specular beveling, metallic brushed surface, perimeter chamfer, and interactive press states.
 * - riskScore < 75: Emerald/Silver metallic tone
 * - riskScore >= 75: Disabled Crimson metallic tone (Locked)
 */

interface MetalButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  isLocked?: boolean;
  loading?: boolean;
  amountText?: string;
  label?: string;
  className?: string;
}

export default function MetalButton({
  onClick,
  disabled = false,
  isLocked = false,
  loading = false,
  amountText = "₹1,50,000",
  label,
  className = "",
}: MetalButtonProps) {
  const isBlocked = isLocked || disabled;

  // Custom or dynamic label
  const defaultLabel = isBlocked
    ? "Interception Active: Wire Transfer Locked"
    : `Approve ${amountText} Wire Transfer`;

  const buttonText = label || defaultLabel;

  return (
    <div className={`relative group w-full ${className}`}>
      {/* Outer Glow & Ambient Reflection */}
      <div
        className={`absolute -inset-1 rounded-2xl blur-md opacity-40 transition duration-500 group-hover:opacity-75 ${
          isBlocked
            ? "bg-gradient-to-r from-red-600 via-rose-600 to-amber-700"
            : "bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500"
        }`}
      />

      {/* Main Metallic Button Body */}
      <motion.button
        whileHover={!isBlocked && !loading ? { scale: 1.01, y: -1 } : {}}
        whileTap={!isBlocked && !loading ? { scale: 0.985, y: 1 } : {}}
        disabled={isBlocked || loading}
        onClick={onClick}
        className={`relative w-full overflow-hidden rounded-xl py-4 px-6 font-mono font-bold transition-all duration-300 flex items-center justify-center gap-3 select-none text-sm sm:text-base tracking-wide ${
          isBlocked
            ? "cursor-not-allowed opacity-90 shadow-[0_4px_24px_rgba(239,68,68,0.25)]"
            : "cursor-pointer shadow-[0_8px_32px_rgba(16,185,129,0.3)] hover:shadow-[0_12px_40px_rgba(16,185,129,0.45)] active:shadow-[0_2px_12px_rgba(16,185,129,0.2)]"
        }`}
        style={{
          background: isBlocked
            ? "linear-gradient(180deg, #3A1015 0%, #1F080A 50%, #140405 100%)"
            : "linear-gradient(180deg, #103B2B 0%, #08241A 50%, #03140E 100%)",
          border: isBlocked
            ? "1px solid rgba(239, 68, 68, 0.45)"
            : "1px solid rgba(52, 211, 153, 0.45)",
          boxShadow: isBlocked
            ? "inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -2px 4px rgba(0,0,0,0.6)"
            : "inset 0 1px 1px rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.6)",
        }}
      >
        {/* Specular Highlight Strip at the Top Edge */}
        <div
          className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none"
          style={{
            background: isBlocked
              ? "linear-gradient(90deg, transparent 0%, rgba(255,160,160,0.6) 50%, transparent 100%)"
              : "linear-gradient(90deg, transparent 0%, rgba(200,255,230,0.8) 50%, transparent 100%)",
          }}
        />

        {/* Diagonal Brushed Metallic Texture / Reflection Sheen */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30 group-hover:opacity-45 transition-opacity"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              rgba(255, 255, 255, 0.03) 10px,
              rgba(255, 255, 255, 0.03) 20px
            )`,
          }}
        />

        {/* Dynamic Light Sweep on Hover */}
        {!isBlocked && (
          <div
            className="absolute inset-0 pointer-events-none -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
            }}
          />
        )}

        {/* Icon & Label Content */}
        <div className="relative z-10 flex items-center justify-center gap-2.5">
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin text-emerald-300" />
              <span className="text-emerald-200">Evaluating Zero-Trust Gate…</span>
            </>
          ) : isBlocked ? (
            <>
              <div className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                <Lock size={13} />
              </div>
              <span className="text-red-300 tracking-wide">{buttonText}</span>
            </>
          ) : (
            <>
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                <CheckCircle2 size={14} />
              </div>
              <span className="text-emerald-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {buttonText}
              </span>
              <ArrowRight size={16} className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </div>
      </motion.button>
    </div>
  );
}

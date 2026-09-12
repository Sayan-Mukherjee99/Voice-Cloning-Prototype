/**
 * TransactionSecurityCard — Final Financial Transaction Security Gate
 * Section 7: Live UPI/Wire transfer authorization with deterministic blocking on risk >= 75.
 */

"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import {
  Building2,
  IndianRupee,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Lock,
  Unlock,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Send,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

function PinDot({ filled }: { filled: boolean }) {
  return (
    <motion.div
      className="w-2.5 h-2.5 rounded-full border-2"
      animate={{
        backgroundColor: filled ? "#38BDF8" : "transparent",
        borderColor: filled ? "#38BDF8" : "rgba(255,255,255,0.3)",
        scale: filled ? 1.15 : 1,
      }}
      transition={{ duration: 0.15 }}
    />
  );
}

export default function TransactionSecurityCard() {
  const transaction = useTelemetryStore((s) => s.transaction);
  const riskScore = useTelemetryStore((s) => s.riskScore);
  const threatLevel = useTelemetryStore((s) => s.threatLevel);
  const sessionId = useTelemetryStore((s) => s.sessionId);
  const lockTransaction = useTelemetryStore((s) => s.lockTransaction);
  const unlockTransaction = useTelemetryStore((s) => s.unlockTransaction);

  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isRed = threatLevel === "RED" || riskScore >= 75;
  const isLocked = transaction.locked || isRed;
  const isAmber = threatLevel === "AMBER" || (riskScore >= 40 && riskScore < 75);

  const handleAuthorizeClick = useCallback(() => {
    if (isLocked) return;
    setShowPin(true);
    setErrorMessage(null);
  }, [isLocked]);

  const handlePinDigit = useCallback(
    (digit: string) => {
      if (pin.length >= 6) return;
      const newPin = pin + digit;
      setPin(newPin);

      if (newPin.length === 6) {
        setApproving(true);
        setErrorMessage(null);

        setTimeout(async () => {
          try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
            const res = await fetch(`${apiUrl}/v1/transaction/evaluate-authorization`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                session_id: sessionId || "demo-session",
                amount_inr: transaction.amount || 25000,
                beneficiary_vpa: transaction.beneficiaryVpa || "xyz@oksbi",
              }),
            });

            if (!res.ok) {
              const err = await res.json();
              const reason =
                err.detail?.reason ??
                `Transaction blocked: Risk score (${riskScore.toFixed(1)}/100) exceeds threshold.`;
              lockTransaction(reason);
              setErrorMessage(reason);
              setShowPin(false);
              setPin("");
            } else {
              setApproved(true);
              setShowPin(false);
              setPin("");
            }
          } catch {
            if (riskScore >= 75) {
              const reason = `Transaction Frozen: High-confidence voice clone detected (${riskScore.toFixed(0)}/100).`;
              lockTransaction(reason);
              setErrorMessage(reason);
            } else {
              setApproved(true);
            }
            setShowPin(false);
            setPin("");
          } finally {
            setApproving(false);
          }
        }, 500);
      }
    },
    [pin, sessionId, transaction.amount, transaction.beneficiaryVpa, riskScore, lockTransaction]
  );

  const handlePinDelete = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const handleReset = useCallback(() => {
    unlockTransaction();
    setApproved(false);
    setShowPin(false);
    setPin("");
    setErrorMessage(null);
  }, [unlockTransaction]);

  const decisionConfig = isRed
    ? {
        title: "🚨 TRANSACTION BLOCKED",
        statusBadge: "HARD LOCKED",
        reason:
          transaction.lockReason ||
          "Synthetic voice indicators exceed security threshold (Risk ≥ 75).",
        color: "#EF4444",
        bg: "rgba(239, 68, 68, 0.12)",
        border: "rgba(239, 68, 68, 0.4)",
        Icon: ShieldX,
      }
    : isAmber
    ? {
        title: "⚠ ADDITIONAL VERIFICATION REQUIRED",
        statusBadge: "CHALLENGE PENDING",
        reason: "Elevated risk score · PITCH phonetic challenge required before settlement.",
        color: "#F59E0B",
        bg: "rgba(245, 158, 11, 0.12)",
        border: "rgba(245, 158, 11, 0.35)",
        Icon: ShieldAlert,
      }
    : {
        title: "✓ TRANSACTION APPROVED",
        statusBadge: "CLEARED",
        reason: "Biometric prosody & voiceprint match nominal verified parameters.",
        color: "#10B981",
        bg: "rgba(16, 185, 129, 0.12)",
        border: "rgba(16, 185, 129, 0.35)",
        Icon: ShieldCheck,
      };

  return (
    <div
      className="bg-[#0A0F26]/90 rounded-xl p-4 flex flex-col justify-between shadow-xl transition-all duration-300"
      style={{
        border: `1px solid ${decisionConfig.border}`,
        boxShadow: isRed ? "0 0 25px rgba(239, 68, 68, 0.15)" : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-cyan-400">
            <Building2 size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">SBI YONO · UPI Transaction Gate</h3>
            <p className="text-[10px] font-mono text-white/40">Pre-Transaction Zero-Trust Interceptor</p>
          </div>
        </div>

        <div
          className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full uppercase flex items-center gap-1.5"
          style={{
            background: decisionConfig.bg,
            color: decisionConfig.color,
            border: `1px solid ${decisionConfig.border}`,
          }}
        >
          <decisionConfig.Icon size={12} />
          <span>{decisionConfig.statusBadge}</span>
        </div>
      </div>

      {/* Transaction Metadata */}
      <div className="grid grid-cols-3 gap-2.5 my-3.5">
        <div className="bg-[#070A18] p-3 rounded-lg border border-white/[0.04]">
          <span className="text-[9px] font-mono text-white/40 uppercase block mb-0.5">Amount</span>
          <span className="text-base sm:text-lg font-bold font-mono text-white flex items-center">
            <IndianRupee size={15} className="text-cyan-400" />
            {(transaction.amount || 25000).toLocaleString("en-IN")}
          </span>
        </div>

        <div className="bg-[#070A18] p-3 rounded-lg border border-white/[0.04]">
          <span className="text-[9px] font-mono text-white/40 uppercase block mb-0.5">Beneficiary</span>
          <span className="text-xs sm:text-sm font-bold font-mono text-cyan-300 truncate block">
            {transaction.beneficiaryVpa || "xyz@oksbi"}
          </span>
        </div>

        <div className="bg-[#070A18] p-3 rounded-lg border border-white/[0.04]">
          <span className="text-[9px] font-mono text-white/40 uppercase block mb-0.5">Risk Score</span>
          <span className="text-base sm:text-lg font-bold font-mono" style={{ color: decisionConfig.color }}>
            {riskScore.toFixed(0)} <span className="text-xs text-white/40">/ 100</span>
          </span>
        </div>
      </div>

      {/* Decision Banner */}
      <div
        className="rounded-lg p-3 my-1 flex flex-col gap-1 transition-all"
        style={{
          background: decisionConfig.bg,
          border: `1px solid ${decisionConfig.border}`,
        }}
      >
        <div className="flex items-center gap-2">
          <decisionConfig.Icon size={15} style={{ color: decisionConfig.color }} />
          <span className="text-xs font-bold font-mono tracking-wider" style={{ color: decisionConfig.color }}>
            {decisionConfig.title}
          </span>
        </div>
        <p className="text-[11px] font-mono text-white/70 leading-tight pl-6">
          {decisionConfig.reason}
        </p>
      </div>

      {/* Actions / PIN Form */}
      <div className="mt-3 pt-3 border-t border-white/[0.06]">
        {approved ? (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-mono font-semibold">
              <CheckCircle2 size={15} className="text-emerald-400" />
              <span>Payment Dispatched & Authorized</span>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 hover:text-emerald-200 px-2 py-1 rounded bg-white/5 hover:bg-white/10"
            >
              <RotateCcw size={10} />
              <span>Reset Demo</span>
            </button>
          </div>
        ) : isRed ? (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30">
            <div className="flex items-center gap-2 text-rose-300 text-xs font-mono">
              <ShieldX size={15} className="text-rose-400 shrink-0" />
              <span className="font-semibold">Transaction Frozen: Synthetic Voice Detected</span>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-[10px] font-mono text-rose-300 hover:text-white px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 transition-colors"
            >
              <Unlock size={11} />
              <span>Override / Unlock</span>
            </button>
          </div>
        ) : showPin ? (
          <div className="flex flex-col items-center gap-2.5 bg-[#070A18] p-3 rounded-lg border border-white/[0.05]">
            <div className="flex items-center justify-between w-full text-xs font-mono text-white/60">
              <span>ENTER 6-DIGIT UPI PIN</span>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <PinDot key={i} filled={i < pin.length} />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 w-full max-w-xs">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "Cancel", "0", "Del"].map((key) => (
                <button
                  key={key}
                  disabled={approving}
                  onClick={() => {
                    if (key === "Cancel") setShowPin(false);
                    else if (key === "Del") handlePinDelete();
                    else handlePinDigit(key);
                  }}
                  className="py-1.5 rounded bg-white/5 hover:bg-white/10 active:bg-cyan-500/20 text-xs font-mono font-bold text-white transition-all disabled:opacity-50"
                >
                  {key}
                </button>
              ))}
            </div>

            {approving && (
              <div className="flex items-center gap-2 text-[11px] font-mono text-cyan-400 mt-1">
                <Loader2 size={12} className="animate-spin" />
                <span>Evaluating Pre-Transaction Security Gate...</span>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={handleAuthorizeClick}
            disabled={isLocked}
            className="w-full py-2.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-lg"
            style={{
              background: isLocked
                ? "rgba(239, 68, 68, 0.15)"
                : "linear-gradient(135deg, #0284C7, #0369A1)",
              color: isLocked ? "#EF4444" : "#FFFFFF",
              border: `1px solid ${isLocked ? "rgba(239,68,68,0.4)" : "#38BDF8"}`,
              cursor: isLocked ? "not-allowed" : "pointer",
            }}
          >
            {isLocked ? (
              <>
                <Lock size={13} />
                <span>Transfer Blocked by VaaniShield</span>
              </>
            ) : (
              <>
                <Send size={13} />
                <span>Authorize Transfer (UPI PIN)</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

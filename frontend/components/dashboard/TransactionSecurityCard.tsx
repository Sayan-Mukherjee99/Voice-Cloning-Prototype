"use client";

import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import MetalButton from "@/components/ui/MetalButton";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import {
  Building2,
  IndianRupee,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Unlock,
  CheckCircle2,
  Loader2,
  RotateCcw,
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
                amount_inr: transaction.amount || 150000,
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
            // Local fallback simulation
            if (riskScore >= 75) {
              const reason = `Transaction blocked: Risk score (${riskScore.toFixed(1)}/100) exceeds threshold.`;
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
        }, 800);
      }
    },
    [pin, sessionId, transaction.amount, transaction.beneficiaryVpa, riskScore, lockTransaction]
  );

  const handlePinDelete = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const handleReset = useCallback(() => {
    setApproved(false);
    setShowPin(false);
    setPin("");
    setErrorMessage(null);
    unlockTransaction();
  }, [unlockTransaction]);

  const decisionConfig = isRed
    ? {
        title: "🚨 TRANSACTION HARD BLOCKED",
        statusBadge: "HARD BLOCKED",
        reason:
          errorMessage ||
          "Generative voice cloning attack signature detected. Authorization locked.",
        color: "#EF4444",
        bg: "rgba(239, 68, 68, 0.12)",
        border: "rgba(239, 68, 68, 0.35)",
        Icon: ShieldX,
      }
    : isAmber
    ? {
        title: "⚠️ SUSPICIOUS VOICE: VERIFICATION REQUIRED",
        statusBadge: "CHALLENGE REQUIRED",
        reason: "Prosodic anomalies detected. Phonetic PITCH challenge must be recited.",
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
      className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl backdrop-blur-md p-5 shadow-2xl flex flex-col justify-between space-y-4"
      style={{
        boxShadow: isRed ? "0 0 35px rgba(239, 68, 68, 0.18)" : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Building2 size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">SBI YONO · UPI Transaction Gate</h3>
            <p className="text-[10px] font-mono text-neutral-400">Pre-Transaction Zero-Trust Interceptor</p>
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
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-neutral-900/60 p-3 rounded-xl border border-neutral-800/80">
          <span className="text-[9px] font-mono text-neutral-400 uppercase block mb-0.5">Amount</span>
          <span className="text-base sm:text-lg font-bold font-mono text-white flex items-center">
            <IndianRupee size={15} className="text-cyan-400" />
            {(transaction.amount || 150000).toLocaleString("en-IN")}
          </span>
        </div>

        <div className="bg-neutral-900/60 p-3 rounded-xl border border-neutral-800/80">
          <span className="text-[9px] font-mono text-neutral-400 uppercase block mb-0.5">Beneficiary</span>
          <span className="text-xs sm:text-sm font-bold font-mono text-cyan-300 truncate block">
            {transaction.beneficiaryVpa || "unknown@axisbank"}
          </span>
        </div>

        <div className="bg-neutral-900/60 p-3 rounded-xl border border-neutral-800/80">
          <span className="text-[9px] font-mono text-neutral-400 uppercase block mb-0.5">Risk Score</span>
          <span className="text-base sm:text-lg font-bold font-mono" style={{ color: decisionConfig.color }}>
            {riskScore.toFixed(0)} <span className="text-xs text-neutral-400">/ 100</span>
          </span>
        </div>
      </div>

      {/* Decision Banner */}
      <div
        className="rounded-xl p-3.5 flex flex-col gap-1 transition-all"
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
        <p className="text-[11px] font-mono text-neutral-300 leading-tight pl-6">
          {decisionConfig.reason}
        </p>
      </div>

      {/* Actions / 21st.dev Metal Button Gate */}
      <div className="pt-2">
        {approved ? (
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-mono font-semibold">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>Payment Dispatched &amp; Authorized (₹{(transaction.amount || 150000).toLocaleString("en-IN")})</span>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 hover:text-white px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 transition-colors cursor-pointer"
            >
              <RotateCcw size={11} />
              <span>Reset</span>
            </button>
          </div>
        ) : isRed ? (
          <div className="space-y-3">
            <MetalButton
              disabled={true}
              isLocked={true}
              amountText={`₹${(transaction.amount || 150000).toLocaleString("en-IN")}`}
            />
            <div className="flex justify-end">
              <button
                onClick={handleReset}
                className="flex items-center gap-1 text-[10px] font-mono text-rose-400 hover:text-rose-200 transition-colors px-2 py-1 rounded bg-neutral-900 border border-neutral-800 cursor-pointer"
              >
                <Unlock size={11} />
                <span>Override / Reset Gate</span>
              </button>
            </div>
          </div>
        ) : showPin ? (
          <div className="flex flex-col items-center gap-2.5 bg-neutral-900/60 p-4 rounded-xl border border-neutral-800/80">
            <div className="flex items-center justify-between w-full text-xs font-mono text-neutral-400">
              <span>ENTER 6-DIGIT UPI PIN</span>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <PinDot key={i} filled={i < pin.length} />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 w-full max-w-xs pt-1">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "Cancel", "0", "Del"].map((key) => (
                <button
                  key={key}
                  disabled={approving}
                  onClick={() => {
                    if (key === "Cancel") setShowPin(false);
                    else if (key === "Del") handlePinDelete();
                    else handlePinDigit(key);
                  }}
                  className="py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 active:bg-cyan-500/20 text-xs font-mono font-bold text-white transition-all disabled:opacity-50 border border-neutral-800 cursor-pointer"
                >
                  {key}
                </button>
              ))}
            </div>

            {approving && (
              <div className="flex items-center gap-2 text-[11px] font-mono text-cyan-400 mt-1">
                <Loader2 size={13} className="animate-spin" />
                <span>Evaluating Pre-Transaction Security Gate...</span>
              </div>
            )}
          </div>
        ) : (
          <MetalButton
            onClick={handleAuthorizeClick}
            disabled={isLocked}
            isLocked={isLocked}
            loading={approving}
            amountText={`₹${(transaction.amount || 150000).toLocaleString("en-IN")}`}
          />
        )}
      </div>
    </div>
  );
}

/**
 * MockBankingGate — Mobile UPI / Banking Wire Transfer Gate
 * Clean inline layout with automatic RED lock enforcement, PIN pad, and demo reset.
 */

"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import {
  ShieldX,
  ShieldCheck,
  IndianRupee,
  Lock,
  Building2,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Send,
  AlertTriangle,
} from "lucide-react";

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function PinDot({ filled }: { filled: boolean }) {
  return (
    <motion.div
      className="w-2.5 h-2.5 rounded-full border-2"
      animate={{
        backgroundColor: filled ? "#38BDF8" : "transparent",
        borderColor: filled ? "#38BDF8" : "rgba(255,255,255,0.3)",
        scale: filled ? 1.1 : 1,
      }}
      transition={{ duration: 0.15 }}
    />
  );
}

export default function MockBankingGate() {
  const transaction = useTelemetryStore((s) => s.transaction);
  const riskScore = useTelemetryStore((s) => s.riskScore);
  const threatLevel = useTelemetryStore((s) => s.threatLevel);
  const lockTransaction = useTelemetryStore((s) => s.lockTransaction);
  const unlockTransaction = useTelemetryStore((s) => s.unlockTransaction);

  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);

  const isRed = threatLevel === "RED" || riskScore >= 75;
  const isLocked = transaction.locked || isRed;
  const isAmber = threatLevel === "AMBER";

  const handleApproveClick = useCallback(() => {
    if (isLocked) return;
    setShowPin(true);
  }, [isLocked]);

  const handlePinDigit = useCallback(
    (digit: string) => {
      if (pin.length >= 6) return;
      const newPin = pin + digit;
      setPin(newPin);

      if (newPin.length === 6) {
        setApproving(true);
        setTimeout(async () => {
          try {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/v1/transaction/evaluate-authorization`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  session_id: useTelemetryStore.getState().sessionId || "demo-session",
                  amount_inr: transaction.amount,
                  beneficiary_vpa: transaction.beneficiaryVpa,
                }),
              }
            );
            if (!res.ok) {
              const err = await res.json();
              lockTransaction(err.detail?.reason ?? "Transaction blocked by VaaniShield");
            } else {
              setApproved(true);
            }
          } catch {
            if (riskScore >= 75) {
              lockTransaction(
                `Transaction Frozen: Voice Clone Detected (Risk Score: ${riskScore.toFixed(1)}/100)`
              );
            } else {
              setApproved(true);
            }
          } finally {
            setApproving(false);
            setPin("");
            setShowPin(false);
          }
        }, 1200);
      }
    },
    [pin, lockTransaction, riskScore, transaction]
  );

  const handlePinDelete = useCallback(() => {
    setPin((p) => p.slice(0, -1));
  }, []);

  const resetAll = useCallback(() => {
    unlockTransaction();
    setApproved(false);
    setShowPin(false);
    setPin("");
    setApproving(false);
  }, [unlockTransaction]);

  const PIN_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div className="relative rounded-2xl p-4 flex flex-col gap-3 min-h-0 bg-[#0B1026]/90 border border-white/10 shadow-lg">
      {/* Mobile Bank Card Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow">
            <Building2 size={15} className="text-white" />
          </div>
          <div>
            <div className="text-xs font-bold text-white tracking-wide">SBI YONO Payment</div>
            <div className="text-[9px] text-white/40 font-mono">UPI Instant Transfer</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold"
          style={{
            background: isLocked ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
            color: isLocked ? "#EF4444" : "#10B981",
            border: `1px solid ${isLocked ? "rgba(239,68,68,0.4)" : "rgba(16,185,129,0.4)"}`,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {isLocked ? "BLOCKED" : "READY"}
        </div>
      </div>

      {/* Transaction Details Box */}
      <div className="rounded-xl p-3 bg-white/[0.03] border border-white/[0.06] space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Transfer Amount</span>
          <div className="flex items-baseline gap-0.5">
            <IndianRupee size={15} className="text-white/60" />
            <span className="text-2xl font-black text-white tracking-tight">
              {transaction.amount.toLocaleString("en-IN")}
            </span>
            <span className="text-[10px] text-white/40 font-mono ml-0.5">INR</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5 text-[11px] font-mono">
          <div>
            <div className="text-white/30 text-[9px]">BENEFICIARY</div>
            <div className="text-cyan-400 font-semibold truncate">{transaction.beneficiaryVpa}</div>
          </div>
          <div>
            <div className="text-white/30 text-[9px]">REF ID</div>
            <div className="text-white/70 font-semibold truncate">{transaction.transactionRef}</div>
          </div>
        </div>
      </div>

      {/* Dynamic State: Approved / Locked / PIN Pad / Default */}
      <AnimatePresence mode="wait">
        {approved && !isLocked ? (
          /* Approved Success State */
          <motion.div
            key="approved"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl p-3 text-center bg-emerald-500/10 border border-emerald-500/30 space-y-2"
          >
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-xs font-bold font-mono">
              <CheckCircle2 size={16} />
              Transfer Authorized
            </div>
            <p className="text-[11px] font-mono text-white/60">
              {formatINR(transaction.amount)} sent to {transaction.beneficiaryVpa}
            </p>
            <button
              onClick={resetAll}
              className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 hover:text-emerald-300 underline pt-1"
            >
              <RotateCcw size={10} />
              Reset Demo Transaction
            </button>
          </motion.div>
        ) : isLocked ? (
          /* Locked / High Risk Spoof State */
          <motion.div
            key="locked"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl p-3 bg-rose-500/10 border border-rose-500/40 text-center space-y-2"
          >
            <div className="flex items-center justify-center gap-1.5 text-rose-400 text-xs font-bold font-mono uppercase tracking-wide">
              <ShieldX size={16} className="text-rose-500" />
              Transaction Frozen
            </div>
            <p className="text-[11px] font-mono text-rose-300/90 leading-snug">
              High-Confidence Voice Clone Detected (Risk: {riskScore.toFixed(1)}/100). Pre-transaction gate blocked transfer.
            </p>
            <button
              onClick={resetAll}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-[10px] font-mono text-rose-300 transition-all font-semibold"
            >
              <RotateCcw size={11} />
              Unlock Demo & Reset Gate
            </button>
          </motion.div>
        ) : showPin ? (
          /* PIN Input State */
          <motion.div
            key="pin"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between text-[11px] font-mono text-white/50 px-1">
              <span>ENTER 6-DIGIT UPI PIN</span>
              <button
                onClick={() => { setShowPin(false); setPin(""); }}
                className="text-white/40 hover:text-white text-[10px] underline"
              >
                Cancel
              </button>
            </div>

            <div className="flex justify-center gap-2.5 py-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <PinDot key={i} filled={i < pin.length} />
              ))}
            </div>

            {approving ? (
              <div className="flex items-center justify-center gap-2 py-3 text-xs font-mono text-cyan-400">
                <Loader2 size={16} className="animate-spin" />
                <span>Evaluating VaaniShield Biometric Auth…</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 pt-1">
                {PIN_KEYS.map((key, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (key === "⌫") handlePinDelete();
                      else if (key !== "") handlePinDigit(key);
                    }}
                    disabled={key === ""}
                    className="h-8 rounded-lg text-xs font-semibold font-mono bg-white/5 hover:bg-white/10 active:bg-cyan-500/20 text-white transition-all disabled:opacity-0"
                  >
                    {key}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          /* Default CTA Button */
          <motion.button
            key="cta"
            onClick={handleApproveClick}
            disabled={isLocked}
            className="w-full rounded-xl py-3 px-4 font-bold text-xs font-mono flex items-center justify-center gap-2 transition-all shadow-md bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:brightness-110 active:scale-[0.99]"
          >
            <Send size={14} />
            <span>Approve Transfer & Enter UPI PIN</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[9px] font-mono text-white/30 pt-1 border-t border-white/5">
        <span className="flex items-center gap-1">
          <ShieldCheck size={10} className="text-emerald-400" />
          Deterministic Fraud Gate
        </span>
        <span>DPDP Act 2023</span>
      </div>
    </div>
  );
}

/**
 * TransactionsView — Dedicated Financial Transaction Protection & Pre-Transaction Interceptor
 * Live SBI YONO UPI Wire Transfer gate, PIN authorization pad, and transaction audit log.
 */

"use client";

import React from "react";
import TransactionSecurityCard from "@/components/dashboard/TransactionSecurityCard";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import {
  CreditCard,
  Building2,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Lock,
  IndianRupee,
  Clock,
} from "lucide-react";

export default function TransactionsView() {
  const transaction = useTelemetryStore((s) => s.transaction);
  const riskScore = useTelemetryStore((s) => s.riskScore);
  const threatLevel = useTelemetryStore((s) => s.threatLevel);

  const isRed = threatLevel === "RED" || riskScore >= 75;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="text-[10px] font-mono tracking-widest text-white/40 uppercase">
            FINANCIAL TRANSACTION FRAUD INTERCEPTION
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
            Transaction Security Gate
          </h1>
        </div>
        <div
          className="text-xs font-mono font-bold px-3 py-1 rounded-full uppercase"
          style={{
            background: isRed ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
            color: isRed ? "#EF4444" : "#10B981",
            border: `1px solid ${isRed ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
          }}
        >
          {isRed ? "🚨 HARD BLOCKED" : "✓ GATE CLEARED"}
        </div>
      </div>

      {/* Main Transaction Card */}
      <TransactionSecurityCard />

      {/* Transaction Audit Log */}
      <div className="bg-[#0A0F26]/90 p-5 rounded-2xl border border-white/[0.08] shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Building2 size={16} className="text-cyan-400" />
            <h3 className="text-xs font-bold font-mono tracking-wide uppercase">
              Recent UPI & Wire Transfer Interception Log
            </h3>
          </div>
          <span className="text-[10px] font-mono text-white/40">
            RBI Cybersecurity Framework Compliant
          </span>
        </div>

        <div className="space-y-2 text-xs font-mono">
          <div className="p-3 rounded-xl bg-[#070A18] border border-white/[0.04] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isRed ? "bg-rose-500" : "bg-emerald-500"}`} />
              <span className="font-bold text-white">₹25,000 INR → {transaction.beneficiaryVpa || "xyz@oksbi"}</span>
            </div>
            <div className="flex items-center gap-4 text-white/50 text-[11px]">
              <span>Risk: {riskScore.toFixed(0)}/100</span>
              <span className={isRed ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                {isRed ? "BLOCKED" : "APPROVED"}
              </span>
              <span className="text-white/30">Just Now</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#070A18] border border-white/[0.04] flex flex-wrap items-center justify-between gap-2 opacity-60">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-bold text-white">₹15,000 INR → merchant@okhdfc</span>
            </div>
            <div className="flex items-center gap-4 text-white/50 text-[11px]">
              <span>Risk: 12/100</span>
              <span className="text-emerald-400 font-bold">APPROVED</span>
              <span className="text-white/30">2m ago</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#070A18] border border-white/[0.04] flex flex-wrap items-center justify-between gap-2 opacity-40">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="font-bold text-white">₹1,50,000 INR → unknown@axisbank</span>
            </div>
            <div className="flex items-center gap-4 text-white/50 text-[11px]">
              <span>Risk: 91/100</span>
              <span className="text-rose-400 font-bold">BLOCKED</span>
              <span className="text-white/30">15m ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

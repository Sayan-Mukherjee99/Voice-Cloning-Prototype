"use client";

import React from "react";
import TransactionSecurityCard from "@/components/dashboard/TransactionSecurityCard";
import { useTelemetryStore } from "@/store/useTelemetryStore";
import {
  Building2,
} from "lucide-react";

/**
 * TransactionsView — Financial Transaction Protection & Pre-Transaction Interceptor (Dark SecOps Theme)
 */
export default function TransactionsView() {
  const transaction = useTelemetryStore((s) => s.transaction);
  const riskScore = useTelemetryStore((s) => s.riskScore);
  const threatLevel = useTelemetryStore((s) => s.threatLevel);

  const isRed = threatLevel === "RED" || riskScore >= 75;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-neutral-800/80">
        <div>
          <div className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">
            FINANCIAL TRANSACTION FRAUD INTERCEPTION
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
            Transaction Security Gate
          </h1>
        </div>
        <div
          className="text-xs font-mono font-bold px-3 py-1 rounded-full uppercase border"
          style={{
            background: isRed ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
            color: isRed ? "#EF4444" : "#10B981",
            borderColor: isRed ? "rgba(239,68,68,0.35)" : "rgba(16,185,129,0.35)",
          }}
        >
          {isRed ? "🚨 HARD BLOCKED" : "✓ GATE CLEARED"}
        </div>
      </div>

      {/* Main Transaction Card */}
      <TransactionSecurityCard />

      {/* Transaction Audit Log */}
      <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl backdrop-blur-md p-5 shadow-2xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
          <div className="flex items-center gap-2 text-white">
            <Building2 size={16} className="text-cyan-400" />
            <h3 className="text-xs font-bold font-mono tracking-wide uppercase">
              Recent UPI &amp; Wire Transfer Interception Log
            </h3>
          </div>
          <span className="text-[10px] font-mono text-neutral-400">
            RBI Cybersecurity Framework Compliant
          </span>
        </div>

        <div className="space-y-2 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isRed ? "bg-rose-500" : "bg-emerald-500"}`} />
              <span className="font-bold text-white">
                ₹{(transaction.amount || 150000).toLocaleString("en-IN")} INR → {transaction.beneficiaryVpa || "unknown@axisbank"}
              </span>
            </div>
            <div className="flex items-center gap-4 text-neutral-400 text-[11px]">
              <span>Risk: {riskScore.toFixed(0)}/100</span>
              <span className={isRed ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                {isRed ? "BLOCKED" : "APPROVED"}
              </span>
              <span className="text-neutral-400">Just Now</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex flex-wrap items-center justify-between gap-2 opacity-75">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-bold text-white">₹15,000 INR → merchant@okhdfc</span>
            </div>
            <div className="flex items-center gap-4 text-neutral-400 text-[11px]">
              <span>Risk: 12/100</span>
              <span className="text-emerald-400 font-bold">APPROVED</span>
              <span className="text-neutral-400">2m ago</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex flex-wrap items-center justify-between gap-2 opacity-50">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="font-bold text-white">₹2,50,000 INR → crypto_swap@paytm</span>
            </div>
            <div className="flex items-center gap-4 text-neutral-400 text-[11px]">
              <span>Risk: 88/100</span>
              <span className="text-rose-400 font-bold">BLOCKED</span>
              <span className="text-neutral-400">5m ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

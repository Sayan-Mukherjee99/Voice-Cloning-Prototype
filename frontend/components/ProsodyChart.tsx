/**
 * ProsodyChart — Real-time rolling line chart for F0, jitter, shimmer, HNR
 * Built with Recharts with fixed height constraints and non-overlapping pinned metrics header.
 */

"use client";

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { useTelemetryStore } from "@/store/useTelemetryStore";

export default function ProsodyChart() {
  const prosodyHistory = useTelemetryStore((s) => s.prosodyHistory);

  const data = useMemo(
    () =>
      prosodyHistory.map((p, i) => ({
        idx: i,
        f0: p.f0,
        jitter: p.jitter,
        shimmer: p.shimmer,
        hnr: p.hnr,
      })),
    [prosodyHistory]
  );

  return (
    <div className="w-full h-[140px] relative min-h-0">
      {data.length === 0 ? (
        <div className="flex h-full items-center justify-center text-xs font-mono text-white/25 tracking-widest">
          AWAITING AUDIO STREAM…
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 6, bottom: -4, left: -22 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="idx"
              tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 8, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
            />
            {/* F0 axis (left) */}
            <YAxis
              yAxisId="f0"
              orientation="left"
              domain={[60, 400]}
              tick={{ fill: "#38BDF8", fontSize: 8, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
              width={26}
            />
            {/* Percentage axis (right) */}
            <YAxis
              yAxisId="pct"
              orientation="right"
              domain={[0, 8]}
              tick={{ fill: "#F59E0B", fontSize: 8, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
              width={22}
            />
            <YAxis yAxisId="hnr" orientation="right" domain={[0, 40]} hide />

            <Line
              yAxisId="f0"
              type="monotone"
              dataKey="f0"
              stroke="#38BDF8"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="jitter"
              stroke="#F59E0B"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="shimmer"
              stroke="#A78BFA"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              yAxisId="hnr"
              type="monotone"
              dataKey="hnr"
              stroke="#34D399"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

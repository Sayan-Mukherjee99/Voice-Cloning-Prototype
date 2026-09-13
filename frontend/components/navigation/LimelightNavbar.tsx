"use client";
import React from "react";

interface LimelightNavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "voice-analysis", label: "Voice Analysis" },
  { id: "voiceprint", label: "Voiceprint" },
  { id: "threat-analysis", label: "Threat Analysis" },
  { id: "transactions", label: "Transactions" },
];

export function LimelightNavbar({ activeTab, setActiveTab }: LimelightNavbarProps) {
  return (
    <header className="sticky top-4 z-50 w-full max-w-4xl mx-auto px-4">
      <div className="relative flex items-center justify-between px-4 py-2.5 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 backdrop-blur-xl shadow-2xl">
        {/* Brand */}
        <div className="flex items-center gap-2 pr-4 border-r border-neutral-800/80">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-wider text-neutral-200">VAANISHIELD</span>
        </div>

        {/* Limelight Floating Nav Items */}
        <nav className="relative flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative px-3.5 py-1.5 text-xs font-mono transition-colors duration-200 rounded-lg cursor-pointer ${
                  isActive ? "text-white font-semibold" : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {/* Active Limelight Glow & Spotlight */}
                {isActive && (
                  <>
                    <span className="absolute inset-0 rounded-lg bg-neutral-800/70 border border-neutral-700/60 -z-10 shadow-inner" />
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-[2px] bg-emerald-400 rounded-full shadow-[0_0_8px_#34d399]" />
                  </>
                )}
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Live Session Pill */}
        <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-neutral-800/80">
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
            16kHz PCM
          </span>
        </div>
      </div>
    </header>
  );
}

export default LimelightNavbar;

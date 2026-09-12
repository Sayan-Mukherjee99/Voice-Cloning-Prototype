import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./store/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "ui-monospace", "monospace"],
      },

      colors: {
        // Base
        "vs-bg": "#070818",
        "vs-card": "rgba(10,15,35,0.75)",

        // Threat palette
        "vs-green":  "#10B981",
        "vs-amber":  "#F59E0B",
        "vs-red":    "#EF4444",
        "vs-cyan":   "#06B6D4",
        "vs-violet": "#7C3AED",
        "vs-blue":   "#1D4ED8",
        "vs-indigo": "#4F46E5",

        // Text hierarchy
        "vs-text-primary":   "rgba(255,255,255,1.0)",
        "vs-text-secondary": "rgba(255,255,255,0.6)",
        "vs-text-muted":     "rgba(255,255,255,0.3)",
        "vs-text-faint":     "rgba(255,255,255,0.15)",

        // Border
        "vs-border":       "rgba(255,255,255,0.07)",
        "vs-border-hover": "rgba(255,255,255,0.12)",
      },

      backgroundImage: {
        "gradient-brand":       "linear-gradient(135deg, #1D4ED8, #7C3AED)",
        "gradient-brand-h":     "linear-gradient(90deg, #1D4ED8, #7C3AED)",
        "gradient-threat-red":  "linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.05))",
        "gradient-threat-amber":"linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05))",
        "gradient-threat-green":"linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.04))",
        "grid-bg": `
          linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
        `,
      },

      boxShadow: {
        "glow-green":  "0 0 20px rgba(16, 185, 129, 0.4)",
        "glow-amber":  "0 0 20px rgba(245, 158, 11, 0.5)",
        "glow-red":    "0 0 30px rgba(239, 68, 68, 0.6)",
        "glow-cyan":   "0 0 20px rgba(6, 182, 212, 0.3)",
        "glow-blue":   "0 0 20px rgba(29, 78, 216, 0.4)",
        "card":        "0 4px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)",
        "inner-top":   "inset 0 1px 0 rgba(255,255,255,0.08)",
      },

      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
        "4xl": "24px",
      },

      animation: {
        "shimmer-slide": "shimmer-slide 3s infinite",
        "pulse-red":     "pulse-red-anim 1.5s ease-in-out infinite",
        "gradient-shift":"gradient-shift 4s linear infinite",
        "blink":         "blink 1s step-end infinite",
        "scan-down":     "scan-down 4s linear infinite",
        "float":         "float 6s ease-in-out infinite",
      },

      keyframes: {
        "shimmer-slide": {
          "0%":   { left: "-100%" },
          "100%": { left: "100%" },
        },
        "pulse-red-anim": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(239,68,68,0.3)" },
          "50%":      { boxShadow: "0 0 40px rgba(239,68,68,0.7)" },
        },
        "gradient-shift": {
          "0%":   { backgroundPosition: "0% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        "blink": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0" },
        },
        "scan-down": {
          "0%":   { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-8px)" },
        },
      },

      transitionDuration: {
        "400": "400ms",
        "600": "600ms",
        "800": "800ms",
      },
    },
  },
  plugins: [],
};

export default config;

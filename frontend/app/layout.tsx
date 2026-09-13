import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VaaniShield — AI Voice Clone Detection & Fraud Prevention",
  description:
    "Real-time AI voice cloning detection and deterministic financial fraud prevention. " +
    "Powered by Silero VAD, ONNX ResNet-18, ECAPA-TDNN, and Parselmouth prosody analysis. " +
    "India DPDP Act 2023 compliant.",
  keywords: [
    "voice clone detection",
    "AI fraud prevention",
    "UPI security",
    "ECAPA-TDNN",
    "Parselmouth",
    "voice biometrics",
    "DPDP Act 2023",
    "VaaniShield",
  ],
  authors: [{ name: "VaaniShield" }],
  robots: "noindex, nofollow", // SecOps dashboard — not for public indexing
};

export const viewport: Viewport = {
  themeColor: "#08080a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`} suppressHydrationWarning>
      <body className="min-h-screen bg-[#08080a] text-neutral-100 antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}

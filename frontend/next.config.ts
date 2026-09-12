import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Strict mode for catching subtle React bugs
  reactStrictMode: true,

  // Disable X-Powered-By header for security
  poweredByHeader: false,

  // Turbopack (Next.js 16 default) — empty config silences the missing-config warning
  turbopack: {},

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
        ],
      },
    ];
  },

  // Allow microphone access for audio capture
  async rewrites() {
    return [
      {
        // Proxy API calls to backend during development
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/:path*`,
      },
    ];
  },

  // Environment variables exposed to client
  env: {
    NEXT_PUBLIC_APP_VERSION: "1.0.0",
  },
};

export default nextConfig;

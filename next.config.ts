import type { NextConfig } from "next";

// Standalone is for Hostinger/self-host only.
// On Vercel it can break Edge middleware (MIDDLEWARE_INVOCATION_FAILED).
const isVercel = Boolean(process.env.VERCEL);

const nextConfig: NextConfig = {
  ...(!isVercel ? { output: "standalone" as const } : {}),
  experimental: {
    cpus: 1,
    staticGenerationMaxConcurrency: 1,
  },
};

export default nextConfig;

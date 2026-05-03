import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true
  },
  outputFileTracingRoot: process.cwd(),
  typedRoutes: true
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/badge": ["./assets/**"],
  },
};

export default nextConfig;

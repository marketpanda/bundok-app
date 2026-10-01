import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  experimental: {
    // Keep static generation within the memory available on local/CI builders.
    cpus: 2,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

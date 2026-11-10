import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Allow live preview proxy hosts (e2b / mobile LAN testing on phones)
  allowedDevOrigins: ["*.e2b.app", "localhost", "127.0.0.1"],
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/node_modules/**", "**/.git/**", "**/data/db.json"],
      };
    }
    return config;
  },
};

export default nextConfig;

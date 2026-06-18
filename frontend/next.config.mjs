import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(frontendDir, "..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: repoRoot,
  experimental: {
    webpackBuildWorker: false
  },
  webpack: (config, { isServer }) => {
    if (isServer && config.output) {
      config.output.chunkFilename = "chunks/[name].js";
    }

    return config;
  }
};

export default nextConfig;

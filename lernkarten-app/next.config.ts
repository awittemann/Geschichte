import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Erzeugt `.next/standalone/server.js` mit minimalem Runtime-Bundle für Docker.
  output: 'standalone',
};

export default nextConfig;

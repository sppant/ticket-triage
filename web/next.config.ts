import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The repo root has its own lockfile; pin Turbopack's root to this app.
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;

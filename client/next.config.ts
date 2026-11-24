import type { NextConfig } from 'next';

const API_URL = process.env.API_URL || 'http://localhost:4000';

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  // Proxy API calls through the Next.js origin so the auth cookie is first-party
  // in every environment (local, preview and production).
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;

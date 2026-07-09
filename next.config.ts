import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Image optimization
  images: {
    remotePatterns: [],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  // Ensure server-side filesystem access works
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;

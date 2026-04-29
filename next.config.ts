import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable gzip + brotli compression for all responses
  compress: true,

  images: {
    // Serve WebP (and AVIF where supported) automatically
    formats: ['image/avif', 'image/webp'],
    // Responsive breakpoints matching our layout
    deviceSizes: [375, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 64, 96, 128, 160, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  // Cache static assets for one year
  async headers() {
    return [
      {
        source: '/(.*)\\.(mp4|webm)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Accept-Ranges', value: 'bytes' },
        ],
      },
      {
        source: '/(.*)\\.(jpg|jpeg|png|webp|avif|svg|gif)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;

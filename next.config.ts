import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Packages that must run as external Node.js modules (not bundled).
  // Keeps each serverless function lean.
  serverExternalPackages: [
    'pdf-lib',
    'qrcode',
    'sharp',
    '@google-analytics/data',   // pulls in @grpc — keep isolated to analytics route
    'google-gax',
    '@grpc/grpc-js',
    '@grpc/proto-loader',
  ],

  // Strip files from the output file trace that Vercel would otherwise
  // bundle into every serverless function.
  outputFileTracingExcludes: {
    // Applied to ALL routes
    '*': [
      // macOS-specific native binaries — Vercel runs on Linux, these are dead weight
      'node_modules/@img/sharp-darwin-x64/**',
      'node_modules/@img/sharp-libvips-darwin-x64/**',
      'node_modules/lightningcss-darwin-x64/**',
      // Windows-specific binaries
      'node_modules/@img/sharp-win32-x64/**',
      'node_modules/lightningcss-win32-x64-msvc/**',
      // Dev / build tools — never needed at runtime
      'node_modules/typescript/**',
      'node_modules/@swc/**',
      'node_modules/@typescript-eslint/**',
      'node_modules/eslint/**',
      'node_modules/eslint-plugin-react-hooks/**',
      'node_modules/eslint-plugin-react/**',
      'node_modules/eslint-config-next/**',
      // Source maps from dependencies (no runtime value)
      'node_modules/**/*.map',
      // Test infra
      'node_modules/jest*/**',
      'node_modules/@jest/**',
    ],
  },

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
      {
        protocol: 'https',
        hostname: 'vjgwzhinjfvlspdcpukl.supabase.co',
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

import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

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
      // ─── public/ assets ──────────────────────────────────────────────────
      // Public files are served by the CDN/static layer, NOT by serverless
      // functions. readFileSync calls with dynamic paths cause the tracer to
      // include the entire public/ directory (~200 MB of images/videos).
      // We re-include only the specific logo files needed by PDF routes below.
      'public/**',
      // ─── macOS / Windows native binaries ─────────────────────────────────
      // Vercel runs on Linux — macOS binaries are dead weight.
      'node_modules/@img/sharp-darwin-x64/**',
      'node_modules/@img/sharp-libvips-darwin-x64/**',
      'node_modules/lightningcss-darwin-x64/**',
      'node_modules/@img/sharp-win32-x64/**',
      'node_modules/lightningcss-win32-x64-msvc/**',
      // ─── Dev / build tools ───────────────────────────────────────────────
      // Never needed at runtime on Vercel.
      'node_modules/typescript/**',
      // @swc/core and its platform binaries are the compiler — dev only.
      // @swc/helpers is a RUNTIME dep injected into compiled output — must NOT be excluded.
      'node_modules/@swc/core/**',
      'node_modules/@swc/core-darwin-x64/**',
      'node_modules/@swc/counter/**',
      'node_modules/@swc/types/**',
      'node_modules/@typescript-eslint/**',
      'node_modules/eslint/**',
      'node_modules/eslint-plugin-react-hooks/**',
      'node_modules/eslint-plugin-react/**',
      'node_modules/eslint-config-next/**',
      // Source maps inside node_modules have no runtime value
      'node_modules/**/*.map',
      // Test infra
      'node_modules/jest*/**',
      'node_modules/@jest/**',
    ],
  },

  // Re-include only the specific public/ files that server-side PDF
  // generation needs at runtime via readFileSync.
  outputFileTracingIncludes: {
    '/api/quotes/pdf':  ['./public/logobianco.png'],
    '/api/quotes/send': ['./public/logobianco.png'],
    '/api/member/tickets/[ticketId]/pdf': ['./public/logobianco.png'],
  },

  // Enable gzip + brotli compression for all responses
  compress: true,

  images: {
    // Disable Vercel's image optimization service to avoid quota exhaustion (402 errors).
    // Images are served directly at their original size/format.
    // Re-enable (set to false) if the Vercel plan is upgraded to Pro or higher.
    unoptimized: true,
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

  // Wine Party / Wine Lounge / Winery Visits are now merged into the single
  // "/events" hub page (anchored sections) instead of three standalone pages.
  async redirects() {
    return [
      { source: '/experiences/wine-party',    destination: '/events#party',  permanent: true },
      { source: '/experiences/wine-lounge',   destination: '/events#lounge', permanent: true },
      { source: '/experiences/winery-visits', destination: '/events#visits', permanent: true },
      { source: '/events/wine-party',         destination: '/events#party',  permanent: true },
    ];
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

export default withNextIntl(nextConfig);

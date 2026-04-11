import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

/**
 * next-pwa only runs when:
 * - `next build` / `next start` (production), or
 * - `npm run dev:pwa` (sets NEXT_PWA_DEV_MODE=1 + webpack; Turbopack cannot use this plugin).
 * Plain `npm run dev` stays on Turbopack and does not register a service worker.
 */
const pwaEnabled =
  process.env.NODE_ENV === "production" || process.env.NEXT_PWA_DEV_MODE === "1";

const withPWA = withPWAInit({
  dest: "public",
  disable: !pwaEnabled,
  register: true,
  scope: "/",
  /** Avoid extra SW navigations that can surface Workbox `no-response` on dynamic routes. */
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  /** Merge with plugin defaults instead of replacing runtimeCaching entirely. */
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [
      {
        /** Network-only for HTML navigations — avoids NetworkFirst empty-cache `no-response` when offline or network fails. */
        urlPattern: ({ request }) => request.mode === "navigate",
        handler: "NetworkOnly",
      },
    ],
  },
});

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  async redirects() {
    return [{ source: "/manifest.json", destination: "/manifest.webmanifest", permanent: false }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Accept-CH", value: "Sec-CH-Prefers-Color-Scheme" }],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default pwaEnabled ? withPWA(nextConfig) : nextConfig;

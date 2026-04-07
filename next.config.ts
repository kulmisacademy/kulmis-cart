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
});

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
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

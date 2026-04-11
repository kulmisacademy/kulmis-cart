import "server-only";

import { headers } from "next/headers";
import { getSiteUrl } from "@/lib/site";

function isVercelPreviewHost(host: string): boolean {
  const h = host.toLowerCase();
  return h.endsWith(".vercel.app");
}

/**
 * Hostname for UI (e.g. globe next to store profile). Prefer `NEXT_PUBLIC_BASE_URL`, then the
 * incoming request host when it is not a `*.vercel.app` preview URL (so custom domains like
 * laas24.com show correctly even if env was not set). Falls back to `getSiteUrl()` (VERCEL_URL).
 */
export async function getSiteHostnameForDisplay(): Promise<string> {
  const explicit =
    process.env.NEXT_PUBLIC_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    try {
      const u = new URL(explicit.startsWith("http") ? explicit : `https://${explicit}`);
      return u.hostname;
    } catch {
      /* fall through */
    }
  }

  const h = await headers();
  const raw = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const host = raw.split(",")[0]?.trim() ?? "";
  if (host && !isVercelPreviewHost(host)) {
    return host;
  }

  try {
    return new URL(getSiteUrl()).hostname;
  } catch {
    return "localhost";
  }
}

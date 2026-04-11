import { publicStoreHref } from "@/lib/store-public-path";

function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Base URL for SSR, WhatsApp text, and metadata (no hardcoded domain).
 *
 * Priority: `NEXT_PUBLIC_BASE_URL` → `NEXT_PUBLIC_APP_URL` (legacy) → `VERCEL_URL` → localhost.
 */
export function getSiteUrl(): string {
  if (typeof process === "undefined") return "http://localhost:3000";

  const explicit =
    process.env.NEXT_PUBLIC_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return trimTrailingSlash(explicit);

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    if (vercel.startsWith("http://") || vercel.startsWith("https://")) return trimTrailingSlash(vercel);
    return `https://${trimTrailingSlash(vercel)}`;
  }

  return "http://localhost:3000";
}

/**
 * Absolute URL for “Copy link” / share. Uses `getSiteUrl()` (`NEXT_PUBLIC_BASE_URL`) so production
 * links stay on https://laas24.com instead of the preview Vercel hostname.
 */
export function resolveUrlForBrowserClipboard(url: string): string {
  const base = getSiteUrl().replace(/\/$/, "");
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const u = new URL(trimmed);
      return `${base}${u.pathname}${u.search}${u.hash}`;
    } catch {
      return trimmed;
    }
  }
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}

export function productUrl(productId: string): string {
  return `${getSiteUrl()}/products/${productId}`;
}

/** Absolute URL for the public store profile (`/store/{name}-{vendorId}`). */
export function storeUrl(displayName: string, vendorId: string): string {
  return `${getSiteUrl()}${publicStoreHref(displayName, vendorId)}`;
}

/** Public order summary link (checkout id). */
export function orderUrl(checkoutId: string): string {
  return `${getSiteUrl()}/orders/${checkoutId}`;
}

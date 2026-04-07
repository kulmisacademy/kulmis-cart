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
 * Client-only: normalize any href to the tab’s origin so “Copy link” matches localhost vs production.
 */
export function resolveUrlForBrowserClipboard(url: string): string {
  if (typeof window === "undefined") return url;
  try {
    const u = new URL(url, window.location.origin);
    return `${window.location.origin}${u.pathname}${u.search}${u.hash}`;
  } catch {
    return url.startsWith("/") ? `${window.location.origin}${url}` : url;
  }
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

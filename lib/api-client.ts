/**
 * LAAS24 API client — Vercel UI calls Render (or same-origin Next `/api/*`).
 *
 * Set `NEXT_PUBLIC_API_URL=https://api.laas24.com` (no trailing slash) so all
 * `apiFetch("/api/...")` requests hit the external API. Unset = relative URLs (dev / single deploy).
 */

function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Browser + server: public API origin. Empty = same-origin `/api/*` (Next Route Handlers).
 */
export function getPublicApiBaseUrl(): string {
  if (typeof process === "undefined") return "";
  return trimTrailingSlash(process.env.NEXT_PUBLIC_API_URL?.trim() || "");
}

/**
 * Full URL for HTTP calls. Use `/api/...` for existing Next routes or `/v1/...` after Express migration.
 *
 * @example
 * apiUrl("/api/customer/me")
 * apiUrl("/v1/products")
 */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = getPublicApiBaseUrl();
  if (!base) return p;
  return `${base}${p}`;
}

/**
 * `fetch` wrapper for the LAAS24 HTTP API.
 *
 * Defaults to `credentials: "include"` in the browser so HttpOnly session cookies
 * are sent (same origin or once cookies are scoped to parent domain, e.g. `.laas24.com`).
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const isBrowser = typeof window !== "undefined";
  const merged: RequestInit = {
    ...init,
    credentials: init?.credentials ?? (isBrowser ? "include" : "same-origin"),
  };
  return fetch(apiUrl(path), merged);
}

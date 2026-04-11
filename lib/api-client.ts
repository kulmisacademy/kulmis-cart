/**
 * LAAS24 API client — Vercel UI calls Railway (or same-origin Next `/api/*`).
 *
 * Set `NEXT_PUBLIC_API_URL` (no trailing slash) so most `apiFetch("/api/...")` requests hit the backend.
 *
 * **Customer session** routes always stay same-origin: login sets an HttpOnly cookie on the storefront
 * host; if login went to `NEXT_PUBLIC_API_URL`, the cookie would be for the backend domain and
 * Vercel-only handlers (e.g. `POST /api/chat/thread`) would return 401.
 *
 * **`/api/marketplace/*`** stays same-origin so public catalog helpers (e.g. cart product-id sync) hit
 * Next Route Handlers instead of Railway — avoids CORS when the storefront is on a custom domain
 * (`https://laas24.com`) and `NEXT_PUBLIC_API_URL` points at Railway.
 *
 * **`/api/vendor/*`**, **`/api/admin/*`**, **`/api/auth/*`**, **`/api/chat/*`**, **`/api/notifications/*`**:
 * same pattern — session cookies and CORS-safe fetches must target the Next origin, not Railway.
 *
 * **`/api/ai/*`**, **`/api/ads/*`**: vendor session + browser `fetch` require same origin (cookies; Railway has no CORS for `laas24.com`).
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

function pathWithoutQuery(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const q = p.indexOf("?");
  return q === -1 ? p : p.slice(0, q);
}

/** Must use the Next origin so session cookies match Route Handlers and CORS succeeds on custom domain. */
function isSameOriginApiPath(path: string): boolean {
  const p = pathWithoutQuery(path);
  if (p.startsWith("/api/customer/")) return true;
  if (p.startsWith("/api/vendor/")) return true;
  if (p.startsWith("/api/admin/")) return true;
  if (p.startsWith("/api/auth/")) return true;
  if (p.startsWith("/api/chat/")) return true;
  if (p === "/api/notifications" || p.startsWith("/api/notifications/")) return true;
  if (p.startsWith("/api/marketplace/")) return true;
  if (p.startsWith("/api/ai/")) return true;
  if (p.startsWith("/api/ads/")) return true;
  return false;
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
  if (isSameOriginApiPath(p)) return p;
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

/** @deprecated Same as `apiFetch` — `apiUrl` keeps customer + chat/thread on the Next origin. */
export async function apiFetchSameOrigin(path: string, init?: RequestInit): Promise<Response> {
  return apiFetch(path, init);
}

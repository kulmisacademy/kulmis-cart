/** Avoid open redirects: only same-origin relative paths. */
export function sanitizeNextPath(path: string | null | undefined, fallback = "/account"): string {
  if (!path || typeof path !== "string") return fallback;
  const t = path.trim();
  if (!t.startsWith("/") || t.startsWith("//") || t.includes("://")) return fallback;
  return t;
}

/**
 * After vendor (store) login: `?next=/` is common from generic links, but `/` is the marketing home —
 * sellers should land on the vendor dashboard unless they asked for a specific path.
 */
export function vendorPostLoginPath(path: string | null | undefined): string {
  const s = sanitizeNextPath(path, "/vendor");
  if (s === "/") return "/vendor";
  return s;
}

/**
 * After customer login: generic `?next=/` should land on account, not the marketing home.
 */
export function customerPostLoginPath(path: string | null | undefined): string {
  const s = sanitizeNextPath(path, "/account");
  if (s === "/") return "/account";
  return s;
}

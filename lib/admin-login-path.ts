import "server-only";

/** Single path segment (no slashes). Public admin sign-in lives at `/${segment}` only — not at `/admin/login`. */
export function getAdminLoginPathSegment(): string {
  const raw = process.env.ADMIN_LOGIN_PATH ?? process.env.NEXT_PUBLIC_ADMIN_LOGIN_PATH ?? "secure-admin-portal-9x7a";
  return raw.replace(/^\/+|\/+$/g, "") || "secure-admin-portal-9x7a";
}

/** Use for `redirect()` from server (e.g. unauthenticated admin shell). */
export function getAdminLoginUrl(): string {
  return `/${getAdminLoginPathSegment()}`;
}

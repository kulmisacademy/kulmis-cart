import "server-only";

/** Optional legacy secret URL segment; middleware may still rewrite `/${segment}` → `/admin/login`. */
export function getAdminLoginPathSegment(): string {
  const raw = process.env.ADMIN_LOGIN_PATH ?? process.env.NEXT_PUBLIC_ADMIN_LOGIN_PATH ?? "secure-admin-portal-9x7a";
  return raw.replace(/^\/+|\/+$/g, "") || "secure-admin-portal-9x7a";
}

/** Public admin sign-in URL. */
export function getAdminLoginUrl(): string {
  return "/admin/login";
}

/** Optional: legacy secret first segment for middleware rewrite (see `ADMIN_LOGIN_PATH`). */
export function getAdminLoginPathSegmentPublic(): string {
  const raw = process.env.NEXT_PUBLIC_ADMIN_LOGIN_PATH ?? "secure-admin-portal-9x7a";
  return raw.replace(/^\/+|\/+$/g, "") || "secure-admin-portal-9x7a";
}

export function getAdminLoginUrlPublic(): string {
  return "/admin/login";
}

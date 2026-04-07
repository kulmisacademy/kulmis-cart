/**
 * Whether to set the `Secure` flag on httpOnly session cookies.
 * Using `NODE_ENV === "production"` alone breaks logins over plain HTTP (e.g. `next start`
 * on http://localhost:3000): the browser ignores Secure cookies on non-HTTPS connections.
 * Set `SESSION_COOKIE_SECURE=false` to force insecure cookies (e.g. legacy HTTP deploys).
 * Set `SESSION_COOKIE_SECURE=true` to always use Secure (strict HTTPS behind proxies).
 */
export function sessionCookieSecure(request?: Request): boolean {
  const o = process.env.SESSION_COOKIE_SECURE?.trim().toLowerCase();
  if (o === "false" || o === "0" || o === "no") return false;
  if (o === "true" || o === "1" || o === "yes") return true;

  if (request) {
    const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    if (forwarded === "https") return true;
    if (forwarded === "http") return false;
    try {
      const { protocol } = new URL(request.url);
      if (protocol === "https:") return true;
      if (protocol === "http:") return false;
    } catch {
      /* ignore */
    }
    // Request present but scheme unknown — prefer non-Secure so login works on plain HTTP
    // (Secure cookies are dropped on http:// and cause a redirect loop to /login).
    return false;
  }

  return process.env.NODE_ENV === "production";
}

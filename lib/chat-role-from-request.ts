/**
 * When the browser has both customer and vendor session cookies, infer which dashboard
 * initiated the request. Used only as a fallback when the client did not send an explicit role.
 */
export function isVendorAreaReferer(request: Request): boolean {
  const r = request.headers.get("referer");
  if (!r) return false;
  try {
    return new URL(r).pathname.includes("/vendor");
  } catch {
    return false;
  }
}

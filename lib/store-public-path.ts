/**
 * Canonical public store URLs: `/store/{slugifiedName}-{vendorUuid}`.
 * Vendor IDs are UUIDs (with hyphens); the ID is parsed from the end of the segment.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** URL-safe slug from store display name (not necessarily the internal storeSlug). */
export function slugifyStoreNameForPublicPath(input: string): string {
  const s = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return s || "store";
}

/** Path segment only (no leading slash). */
export function buildPublicStorePathSegment(displayName: string, vendorId: string): string {
  return `${slugifyStoreNameForPublicPath(displayName)}-${vendorId.toLowerCase()}`;
}

export function publicStoreHref(displayName: string, vendorId: string): string {
  return `/store/${buildPublicStorePathSegment(displayName, vendorId)}`;
}

/**
 * Extract vendor UUID from a public route segment, or null if the segment is a legacy plain storeSlug.
 */
export function parseVendorIdFromPublicStoreParam(param: string): string | null {
  const t = param.trim();
  if (UUID_RE.test(t)) return t.toLowerCase();
  const m = t.match(/^(.+)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  return m ? m[2]!.toLowerCase() : null;
}

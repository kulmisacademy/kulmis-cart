/** Accepts https URLs, same-site paths (e.g. `/uploads/ads/…`), or inline `data:image/…` previews. */
export function safeAdImageUrl(s: string | null | undefined): string | null {
  if (!s?.trim()) return null;
  const t = s.trim();
  if (t.startsWith("/") && !t.startsWith("//")) {
    if (t.includes("..")) return null;
    return t;
  }
  if (t.startsWith("data:image/") && t.length < 2_500_000) {
    return t;
  }
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:" ? t : null;
  } catch {
    return null;
  }
}

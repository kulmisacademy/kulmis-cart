/** Accepts https URLs or same-site paths (e.g. `/uploads/ads/…`). */
export function safeAdImageUrl(s: string | null | undefined): string | null {
  if (!s?.trim()) return null;
  const t = s.trim();
  if (t.startsWith("/") && !t.startsWith("//")) {
    if (t.includes("..")) return null;
    return t;
  }
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:" ? t : null;
  } catch {
    return null;
  }
}

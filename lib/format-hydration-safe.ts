/**
 * Deterministic `en-US` + UTC formatting so server-rendered HTML matches the browser on hydration.
 * Avoids React error #418 when `toLocaleString()` without a fixed locale differs between Node and the client.
 */

export function formatDateTimeEnUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Short date+time (replaces `toLocaleString(undefined, { dateStyle, timeStyle })`). */
export function formatDateTimeShortEnUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    timeZone: "UTC",
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatNumberEn(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-US");
}

/**
 * Resolve whether `<html>` should have `dark` before hydration.
 * Uses theme cookie + Client Hints (`Sec-CH-Prefers-Color-Scheme`) for `system`.
 */
export function shouldApplyDarkClass(
  themeCookie: string | undefined,
  prefersColorScheme: string | null,
): boolean {
  if (themeCookie === "dark") return true;
  if (themeCookie === "light") return false;
  const ch = prefersColorScheme?.toLowerCase() ?? "";
  if (ch === "dark") return true;
  if (ch === "light") return false;
  return false;
}

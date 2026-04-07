/** Unified auth entry (customer + store / vendor). */
export const AUTH_PATH = "/auth";

const STORAGE_TAB_KEY = "kulmis_auth_tab";

export type AuthTab = "customer" | "store";
export type AuthMode = "login" | "register";

export function authUrl(opts: {
  tab?: AuthTab;
  mode?: AuthMode;
  next?: string | null;
}): string {
  const p = new URLSearchParams();
  if (opts.tab === "store") p.set("tab", "store");
  if (opts.mode === "register") p.set("mode", "register");
  if (opts.next?.trim() && opts.next.startsWith("/") && !opts.next.startsWith("//")) {
    p.set("next", opts.next.trim());
  }
  const q = p.toString();
  return q ? `${AUTH_PATH}?${q}` : AUTH_PATH;
}

export function rememberAuthTab(tab: AuthTab): void {
  try {
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_TAB_KEY, tab);
  } catch {
    /* ignore */
  }
}

export function readStoredAuthTab(): AuthTab | null {
  try {
    if (typeof window === "undefined") return null;
    const s = localStorage.getItem(STORAGE_TAB_KEY);
    return s === "store" || s === "customer" ? s : null;
  } catch {
    return null;
  }
}

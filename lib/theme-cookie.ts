import { THEME_STORAGE_KEY } from "@/lib/theme-constants";

/** 1 year — mirror theme preference for SSR (same key as localStorage). */
const MAX_AGE_SEC = 31536000;

export function buildThemeCookieValue(mode: string): string {
  return `${THEME_STORAGE_KEY}=${encodeURIComponent(mode)}; Path=/; Max-Age=${MAX_AGE_SEC}; SameSite=Lax`;
}

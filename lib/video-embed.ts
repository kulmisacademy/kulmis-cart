/**
 * Parse vendor product video: uploaded data URLs, YouTube/Vimeo iframe, or HTTPS direct file.
 */

/** ~48MB base64 ceiling — keeps vendor JSON payloads bounded. */
export const MAX_PRODUCT_VIDEO_DATA_URL_LENGTH = 65_000_000;

export type ProductVideoPresentation =
  | { mode: "iframe"; src: string; title: string }
  | { mode: "video"; src: string };

function safeUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u;
  } catch {
    return null;
  }
}

function parseYouTubeVideoId(u: URL): string | null {
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "youtu.be") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    return id && /^[\w-]{6,}$/.test(id) ? id : null;
  }
  if (
    host === "youtube.com" ||
    host === "youtube-nocookie.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com"
  ) {
    if (u.pathname.startsWith("/embed/")) {
      const id = u.pathname.slice(7).split("/")[0];
      return id && /^[\w-]{6,}$/.test(id) ? id : null;
    }
    if (u.pathname.startsWith("/shorts/")) {
      const id = u.pathname.slice(8).split("/")[0];
      return id && /^[\w-]{6,}$/.test(id) ? id : null;
    }
    if (u.pathname.startsWith("/live/")) {
      const id = u.pathname.slice(6).split("/")[0];
      return id && /^[\w-]{6,}$/.test(id) ? id : null;
    }
    const v = u.searchParams.get("v");
    if (v && /^[\w-]{6,}$/.test(v)) return v;
  }
  return null;
}

function parseVimeoVideoId(u: URL): string | null {
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "player.vimeo.com" && u.pathname.startsWith("/video/")) {
    const id = u.pathname.slice(7).split("/")[0];
    return id && /^\d+$/.test(id) ? id : null;
  }
  if (host === "vimeo.com") {
    const parts = u.pathname.split("/").filter(Boolean);
    const id = parts[0];
    return id && /^\d+$/.test(id) ? id : null;
  }
  return null;
}

const DIRECT_VIDEO_EXT = /\.(mp4|webm|ogg|mov)(\?|#|$)/i;

/** Build embed or direct video source for the product page. */
export function getProductVideoPresentation(url: string | undefined | null): ProductVideoPresentation | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("data:video/")) {
    if (trimmed.length > MAX_PRODUCT_VIDEO_DATA_URL_LENGTH) return null;
    return { mode: "video", src: trimmed };
  }
  const u = safeUrl(trimmed);
  if (!u) return null;

  const yt = parseYouTubeVideoId(u);
  if (yt) {
    return {
      mode: "iframe",
      src: `https://www.youtube-nocookie.com/embed/${yt}`,
      title: "YouTube product video",
    };
  }

  const vm = parseVimeoVideoId(u);
  if (vm) {
    return {
      mode: "iframe",
      src: `https://player.vimeo.com/video/${vm}`,
      title: "Vimeo product video",
    };
  }

  if (u.protocol === "https:") {
    if (DIRECT_VIDEO_EXT.test(u.pathname) || DIRECT_VIDEO_EXT.test(u.href)) {
      return { mode: "video", src: trimmed };
    }
    const last = u.pathname.split("/").pop() ?? "";
    if (/\.(mp4|webm|ogg|mov)$/i.test(last)) {
      return { mode: "video", src: trimmed };
    }
  }

  return null;
}

/** Empty OK; uploaded data URL, legacy YouTube/Vimeo/HTTPS file, or invalid. */
export function isValidProductVideoUrl(raw: string): boolean {
  const s = raw.trim();
  if (!s) return true;
  if (s.startsWith("data:video/")) {
    return s.length <= MAX_PRODUCT_VIDEO_DATA_URL_LENGTH;
  }
  return getProductVideoPresentation(s) != null;
}

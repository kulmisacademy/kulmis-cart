"use client";

import { MAX_PRODUCT_VIDEO_DATA_URL_LENGTH } from "@/lib/video-embed";

/** Max playback length checked in the browser (metadata). */
export const VENDOR_PRODUCT_VIDEO_MAX_SECONDS = 60;

/** Raw file size limit before base64 (keeps saves reasonable). */
export const VENDOR_PRODUCT_VIDEO_MAX_BYTES = 45 * 1024 * 1024;

function revokeIfNeeded(url: string, revoked: { current: boolean }) {
  if (revoked.current) return;
  revoked.current = true;
  URL.revokeObjectURL(url);
}

/**
 * Read a single product video file as a data URL after validating type, size, and duration.
 */
export async function readVendorProductVideoFile(file: File): Promise<string> {
  if (!file.type.startsWith("video/")) {
    throw new Error("VIDEO_TYPE");
  }
  if (file.size > VENDOR_PRODUCT_VIDEO_MAX_BYTES) {
    throw new Error("VIDEO_SIZE");
  }

  const objectUrl = URL.createObjectURL(file);
  const revoked = { current: false };

  try {
    await new Promise<void>((resolve, reject) => {
      const el = document.createElement("video");
      el.muted = true;
      el.playsInline = true;
      el.preload = "metadata";

      el.onloadedmetadata = () => {
        const d = el.duration;
        revokeIfNeeded(objectUrl, revoked);
        el.removeAttribute("src");
        el.load();

        if (!Number.isFinite(d) || d <= 0) {
          reject(new Error("VIDEO_METADATA"));
          return;
        }
        if (d > VENDOR_PRODUCT_VIDEO_MAX_SECONDS + 0.35) {
          reject(new Error("VIDEO_DURATION"));
          return;
        }
        resolve();
      };

      el.onerror = () => {
        revokeIfNeeded(objectUrl, revoked);
        el.removeAttribute("src");
        reject(new Error("VIDEO_LOAD"));
      };

      el.src = objectUrl;
    });
  } catch (e) {
    revokeIfNeeded(objectUrl, revoked);
    throw e;
  }

  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = typeof r.result === "string" ? r.result : "";
      if (!s.startsWith("data:video/")) {
        reject(new Error("VIDEO_READ"));
        return;
      }
      if (s.length > MAX_PRODUCT_VIDEO_DATA_URL_LENGTH) {
        reject(new Error("VIDEO_SIZE"));
        return;
      }
      resolve(s);
    };
    r.onerror = () => reject(new Error("VIDEO_READ"));
    r.readAsDataURL(file);
  });
}

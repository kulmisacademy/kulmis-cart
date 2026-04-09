import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

/** Raw file size cap when embedding as `data:image/...;base64` (Vercel has no persistent disk). */
export const MAX_AD_IMAGE_DATA_URL_BYTES = 900 * 1024;

/**
 * Vercel and similar serverless hosts have read-only / ephemeral filesystem — files written to
 * `public/uploads` are not reliably served. Use inline data URLs for uploads there.
 */
export function shouldEmbedAdImageAsDataUrl(): boolean {
  return process.env.VERCEL === "1" || process.env.ADS_IMAGE_DATA_URL === "1";
}

export async function persistAdUploadedImage(
  buf: Buffer,
  mime: string,
  ext: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (shouldEmbedAdImageAsDataUrl()) {
    if (buf.length > MAX_AD_IMAGE_DATA_URL_BYTES) {
      return {
        ok: false,
        error: `In production, use an image under ${Math.floor(MAX_AD_IMAGE_DATA_URL_BYTES / 1024)}KB, or paste a direct https://… image URL (hosting on Vercel cannot store large files on disk).`,
      };
    }
    const b64 = buf.toString("base64");
    return { ok: true, url: `data:${mime};base64,${b64}` };
  }

  try {
    const name = `${randomUUID()}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", "ads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), buf);
    return { ok: true, url: `/uploads/ads/${name}` };
  } catch (e) {
    console.error("persistAdUploadedImage disk:", e);
    return {
      ok: false,
      error: "Could not save the file. Try a smaller image or paste an https:// image URL.",
    };
  }
}

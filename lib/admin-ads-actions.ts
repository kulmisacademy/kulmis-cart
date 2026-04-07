"use server";

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  createAd,
  deleteAd,
  getAnalyticsAll,
  listAllAds,
  updateAd,
  type AdInput,
  type AdType,
  type PageTarget,
} from "@/lib/ads-db";
import { safeAdImageUrl } from "@/lib/ads-image-url";
import { getAdminSessionCookieName, verifyAdminSession } from "@/lib/admin-session";

export type AdminAdListItem = {
  id: string;
  title: string;
  type: "banner" | "popup" | "text";
  imageUrl: string | null;
  description: string | null;
  link: string | null;
  regionTarget: string | null;
  pageTarget: "home" | "products" | "store";
  isActive: boolean;
  maxViewsPerUser: number | null;
  popupDelayMs: number;
  views: number;
  clicks: number;
  ctr: number;
};

async function requireAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return Boolean(verifyAdminSession(cookieStore.get(getAdminSessionCookieName())?.value));
}

async function listPayload(): Promise<AdminAdListItem[]> {
  const [rows, analytics] = await Promise.all([listAllAds(), getAnalyticsAll()]);
  return rows.map((a) => {
    const s = analytics.get(a.id) ?? { views: 0, clicks: 0 };
    const ctr = s.views > 0 ? (s.clicks / s.views) * 100 : 0;
    return {
      id: a.id,
      title: a.title,
      type: a.type,
      imageUrl: a.imageUrl,
      description: a.description,
      link: a.link,
      regionTarget: a.regionTarget,
      pageTarget: a.pageTarget,
      isActive: a.isActive,
      maxViewsPerUser: a.maxViewsPerUser,
      popupDelayMs: a.popupDelayMs,
      views: s.views,
      clicks: s.clicks,
      ctr,
    };
  });
}

export async function refreshAdminAdsListAction(): Promise<
  { ok: true; ads: AdminAdListItem[] } | { ok: false; error: string }
> {
  if (!(await requireAdminSession())) {
    return { ok: false, error: "Unauthorized — sign in at /admin/login" };
  }
  try {
    const ads = await listPayload();
    return { ok: true, ads };
  } catch (e) {
    console.error("refreshAdminAdsListAction:", e);
    return { ok: false, error: "Database unavailable" };
  }
}

const createSchema = z.object({
  title: z.string().min(1),
  type: z.enum(["banner", "popup", "text"]),
  imageUrl: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  link: z.string().optional().nullable(),
  regionTarget: z.string().optional().nullable(),
  pageTarget: z.enum(["home", "products", "store"]),
  isActive: z.boolean().optional(),
  maxViewsPerUser: z.number().int().min(0).nullable().optional(),
  popupDelayMs: z.number().int().min(0).optional(),
});

function safeHttpUrl(s: string | null | undefined): string | null {
  if (!s?.trim()) return null;
  try {
    const u = new URL(s.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? s.trim() : null;
  } catch {
    return null;
  }
}

export async function createAdminAdAction(
  raw: z.infer<typeof createSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await requireAdminSession())) {
    return { ok: false, error: "Unauthorized — sign in at /admin/login" };
  }
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid payload" };
  }
  const d = parsed.data;
  const imageUrl = safeAdImageUrl(d.imageUrl ?? null);
  const link = safeHttpUrl(d.link ?? null);
  if (d.imageUrl?.trim() && !imageUrl) {
    return { ok: false, error: "Invalid image URL" };
  }
  if (d.link?.trim() && !link) {
    return { ok: false, error: "Invalid link URL" };
  }
  try {
    await createAd({
      title: d.title,
      type: d.type as AdType,
      imageUrl,
      description: d.description ?? null,
      link,
      regionTarget: d.regionTarget?.trim() || null,
      pageTarget: d.pageTarget as PageTarget,
      isActive: d.isActive ?? true,
      maxViewsPerUser: d.maxViewsPerUser === undefined ? 3 : d.maxViewsPerUser,
      popupDelayMs: d.popupDelayMs ?? 0,
    });
    revalidatePath("/admin/ads");
    return { ok: true };
  } catch (e) {
    console.error("createAdminAdAction:", e);
    return { ok: false, error: "Database unavailable" };
  }
}

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(["banner", "popup", "text"]).optional(),
  imageUrl: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  link: z.string().optional().nullable(),
  regionTarget: z.string().optional().nullable(),
  pageTarget: z.enum(["home", "products", "store"]).optional(),
  isActive: z.boolean().optional(),
  maxViewsPerUser: z.number().int().min(0).nullable().optional(),
  popupDelayMs: z.number().int().min(0).optional(),
});

export async function updateAdminAdAction(
  id: string,
  raw: z.infer<typeof patchSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await requireAdminSession())) {
    return { ok: false, error: "Unauthorized — sign in at /admin/login" };
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid payload" };
  }
  const d = parsed.data;
  const patch: Partial<AdInput> = {};
  if (d.title !== undefined) patch.title = d.title;
  if (d.type !== undefined) patch.type = d.type as AdType;
  if (d.imageUrl !== undefined) {
    const img = !String(d.imageUrl).trim() ? null : safeAdImageUrl(d.imageUrl);
    if (String(d.imageUrl).trim() && img === null) {
      return { ok: false, error: "Invalid image URL" };
    }
    patch.imageUrl = img;
  }
  if (d.description !== undefined) patch.description = d.description;
  if (d.link !== undefined) {
    const lk = !String(d.link).trim() ? null : safeHttpUrl(d.link);
    if (String(d.link).trim() && lk === null) {
      return { ok: false, error: "Invalid link URL" };
    }
    patch.link = lk;
  }
  if (d.regionTarget !== undefined) patch.regionTarget = d.regionTarget;
  if (d.pageTarget !== undefined) patch.pageTarget = d.pageTarget as PageTarget;
  if (d.isActive !== undefined) patch.isActive = d.isActive;
  if (d.maxViewsPerUser !== undefined) patch.maxViewsPerUser = d.maxViewsPerUser;
  if (d.popupDelayMs !== undefined) patch.popupDelayMs = d.popupDelayMs;

  try {
    const ad = await updateAd(id, patch);
    if (!ad) return { ok: false, error: "Not found" };
    revalidatePath("/admin/ads");
    return { ok: true };
  } catch (e) {
    console.error("updateAdminAdAction:", e);
    return { ok: false, error: "Database unavailable" };
  }
}

export async function deleteAdminAdAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await requireAdminSession())) {
    return { ok: false, error: "Unauthorized — sign in at /admin/login" };
  }
  try {
    const ok = await deleteAd(id);
    if (!ok) return { ok: false, error: "Not found" };
    revalidatePath("/admin/ads");
    return { ok: true };
  } catch (e) {
    console.error("deleteAdminAdAction:", e);
    return { ok: false, error: "Database unavailable" };
  }
}

const ALLOWED = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_BYTES = 3 * 1024 * 1024;

function extForMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

export async function uploadAdminAdImageAction(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!(await requireAdminSession())) {
    return { ok: false, error: "Unauthorized — sign in at /admin/login" };
  }

  const fileEntry = formData.get("file");
  const file =
    fileEntry && typeof fileEntry !== "string" && "arrayBuffer" in fileEntry ? (fileEntry as File) : null;
  if (!file || file.size === 0) {
    return { ok: false, error: "No file" };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File too large (max 3MB)" };
  }

  const mime = file.type || "";
  if (!ALLOWED.has(mime)) {
    return { ok: false, error: "Use JPEG, PNG, GIF, or WebP" };
  }

  const ext = extForMime(mime);
  if (ext === "bin") {
    return { ok: false, error: "Invalid image type" };
  }

  try {
    const name = `${randomUUID()}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", "ads");
    await mkdir(dir, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, name), buf);
    const url = `/uploads/ads/${name}`;
    revalidatePath("/admin/ads");
    return { ok: true, url };
  } catch (e) {
    console.error("uploadAdminAdImageAction:", e);
    return { ok: false, error: "Upload failed" };
  }
}

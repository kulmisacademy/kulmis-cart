import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { safeAdImageUrl } from "@/lib/ads-image-url";
import {
  deleteAd,
  getAdById,
  getAnalyticsForAd,
  updateAd,
  type AdInput,
  type AdType,
  type PageTarget,
} from "@/lib/ads-db";
import { getAdminSessionCookieName, verifyAdminSession } from "@/lib/admin-session";

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

function safeHttpUrl(s: string | null | undefined): string | null {
  if (!s?.trim()) return null;
  try {
    const u = new URL(s.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? s.trim() : null;
  } catch {
    return null;
  }
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const cookieStore = await cookies();
    if (!verifyAdminSession(cookieStore.get(getAdminSessionCookieName())?.value)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const ad = await getAdById(id);
    if (!ad) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const stats = await getAnalyticsForAd(id);
    const ctr = stats.views > 0 ? (stats.clicks / stats.views) * 100 : 0;
    return NextResponse.json({ ad, ...stats, ctr });
  } catch (e) {
    console.error("admin ad GET:", e);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const cookieStore = await cookies();
    if (!verifyAdminSession(cookieStore.get(getAdminSessionCookieName())?.value)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const json = await request.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const d = parsed.data;
    const patch: Partial<AdInput> = {};
    if (d.title !== undefined) patch.title = d.title;
    if (d.type !== undefined) patch.type = d.type as AdType;
    if (d.imageUrl !== undefined) {
      const img = !String(d.imageUrl).trim() ? null : safeAdImageUrl(d.imageUrl);
      if (String(d.imageUrl).trim() && img === null) {
        return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
      }
      patch.imageUrl = img;
    }
    if (d.description !== undefined) patch.description = d.description;
    if (d.link !== undefined) {
      const lk = !String(d.link).trim() ? null : safeHttpUrl(d.link);
      if (String(d.link).trim() && lk === null) {
        return NextResponse.json({ error: "Invalid link URL" }, { status: 400 });
      }
      patch.link = lk;
    }
    if (d.regionTarget !== undefined) patch.regionTarget = d.regionTarget;
    if (d.pageTarget !== undefined) patch.pageTarget = d.pageTarget as PageTarget;
    if (d.isActive !== undefined) patch.isActive = d.isActive;
    if (d.maxViewsPerUser !== undefined) patch.maxViewsPerUser = d.maxViewsPerUser;
    if (d.popupDelayMs !== undefined) patch.popupDelayMs = d.popupDelayMs;

    const ad = await updateAd(id, patch);
    if (!ad) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ad });
  } catch (e) {
    console.error("admin ad PATCH:", e);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const cookieStore = await cookies();
    if (!verifyAdminSession(cookieStore.get(getAdminSessionCookieName())?.value)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const ok = await deleteAd(id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin ad DELETE:", e);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

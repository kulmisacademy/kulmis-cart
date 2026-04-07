import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createAd,
  getAnalyticsAll,
  listAllAds,
  type AdType,
  type PageTarget,
} from "@/lib/ads-db";
import { safeAdImageUrl } from "@/lib/ads-image-url";
import { getAdminSessionCookieName, verifyAdminSession } from "@/lib/admin-session";

const bodySchema = z.object({
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

export async function GET() {
  try {
    const cookieStore = await cookies();
    if (!verifyAdminSession(cookieStore.get(getAdminSessionCookieName())?.value)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const [ads, analytics] = await Promise.all([listAllAds(), getAnalyticsAll()]);
    const payload = ads.map((a) => {
      const s = analytics.get(a.id) ?? { views: 0, clicks: 0 };
      const ctr = s.views > 0 ? (s.clicks / s.views) * 100 : 0;
      return { ...a, views: s.views, clicks: s.clicks, ctr };
    });
    return NextResponse.json({ ads: payload });
  } catch (e) {
    console.error("admin ads GET:", e);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    if (!verifyAdminSession(cookieStore.get(getAdminSessionCookieName())?.value)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const d = parsed.data;
    const imageUrl = safeAdImageUrl(d.imageUrl ?? null);
    const link = safeHttpUrl(d.link ?? null);
    if (d.imageUrl?.trim() && !imageUrl) {
      return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
    }
    if (d.link?.trim() && !link) {
      return NextResponse.json({ error: "Invalid link URL" }, { status: 400 });
    }
    const ad = await createAd({
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
    return NextResponse.json({ ad });
  } catch (e) {
    console.error("admin ads POST:", e);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

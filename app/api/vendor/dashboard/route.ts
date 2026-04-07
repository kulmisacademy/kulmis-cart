import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { findApprovedVendorById, patchApprovedVendorStorefrontById } from "@/lib/approved-vendors";
import { uiPlanFromEntitlements } from "@/lib/entitlements";
import { getEntitlementsForStore } from "@/lib/platform-db";
import { countProductVideos } from "@/lib/plan-limits";
import { loadDashboard, saveDashboard } from "@/lib/vendor-dashboard-repository";
import { getVendorSessionCookieName, verifyVendorSession } from "@/lib/vendor-session";
import { MAX_PRODUCT_VIDEO_DATA_URL_LENGTH } from "@/lib/video-embed";
const dashboardSchema = z.object({
  products: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      price: z.number().nonnegative(),
      oldPrice: z.number().nonnegative().optional(),
      image: z.string(),
      images: z.array(z.string()).optional(),
      videoUrl: z.string().max(MAX_PRODUCT_VIDEO_DATA_URL_LENGTH).optional(),
      createdAt: z.string(),
      category: z.string(),
      region: z.string(),
      features: z.string().optional(),
      stockStatus: z.enum(["in-stock", "limited"]).optional(),
    }),
  ),
  orders: z.array(
    z.object({
      id: z.string(),
      createdAt: z.string(),
      customerName: z.string(),
      customerPhone: z.string(),
      status: z.enum(["pending", "accepted", "completed"]),
      items: z.array(
        z.object({
          productId: z.string(),
          title: z.string(),
          qty: z.number().int().positive(),
          price: z.number().nonnegative(),
        }),
      ),
      total: z.number().nonnegative(),
    }),
  ),
  settings: z.object({
    storeName: z.string(),
    logoMime: z.string().optional(),
    logoDataBase64: z.string().optional(),
    bannerMime: z.string().optional(),
    bannerDataBase64: z.string().optional(),
    phone: z.string(),
    whatsAppNumber: z.string(),
    region: z.string(),
    district: z.string(),
    description: z.string(),
  }),
  subscriptionPlan: z.enum(["free", "pro", "premium"]),
  analytics: z
    .object({
      totalViews: z.number().nonnegative(),
      productClicks: z.number().nonnegative(),
    })
    .optional(),
});

async function getVendorFromCookie() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(getVendorSessionCookieName())?.value;
  const session = verifyVendorSession(raw);
  if (!session) return null;
  const vendor = await findApprovedVendorById(session.vid);
  if (!vendor) return null;
  return { session, vendor };
}

export async function GET() {
  const ctx = await getVendorFromCookie();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const state = await loadDashboard(ctx.vendor);
  return NextResponse.json(state);
}

export async function PUT(request: Request) {
  const ctx = await getVendorFromCookie();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = dashboardSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const ent = await getEntitlementsForStore(ctx.vendor.storeSlug);
  const productCount = parsed.data.products.length;
  const videoCount = countProductVideos(parsed.data.products);
  if (ent.productLimit != null && productCount > ent.productLimit) {
    return NextResponse.json(
      { error: `Product limit reached for your plan (${ent.productLimit} max).` },
      { status: 403 },
    );
  }
  if (ent.videoLimit != null && videoCount > ent.videoLimit) {
    return NextResponse.json(
      { error: `Video limit reached for your plan (${ent.videoLimit} product videos max).` },
      { status: 403 },
    );
  }

  const planUi = uiPlanFromEntitlements(ent);
  const { subscriptionPlan, ...rest } = parsed.data;
  void subscriptionPlan;
  await saveDashboard(ctx.vendor.id, { ...rest, subscriptionPlan: planUi });
  const s = rest.settings;
  try {
    await patchApprovedVendorStorefrontById(ctx.vendor.id, {
      storeName: s.storeName,
      storePhone: s.phone,
      whatsAppNumber: s.whatsAppNumber,
      region: s.region,
      district: s.district,
      logoMime: s.logoMime,
      logoDataBase64: s.logoDataBase64,
      bannerMime: s.bannerMime,
      bannerDataBase64: s.bannerDataBase64,
    });
  } catch (e) {
    console.error("patchApprovedVendorStorefrontById", e);
    return NextResponse.json({ error: "Saved dashboard but failed to update store registry" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, subscriptionPlan: planUi });
}

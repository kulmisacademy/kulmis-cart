import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSessionCookieName, verifyAdminSession } from "@/lib/admin-session";
import { listPlanDefinitions, updatePlanDefinition } from "@/lib/platform-db";

export async function GET() {
  const cookieStore = await cookies();
  if (!verifyAdminSession(cookieStore.get(getAdminSessionCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const plans = await listPlanDefinitions();
  return NextResponse.json({ plans });
}

const patchSchema = z.object({
  planId: z.string().min(1),
  name: z.string().min(1).optional(),
  price_monthly_cents: z.number().int().nonnegative().optional(),
  product_limit: z.number().int().nonnegative().nullable().optional(),
  video_limit: z.number().int().nonnegative().nullable().optional(),
  ai_enabled: z.boolean().optional(),
  /** Max AI assists per UTC day; empty / null = unlimited (when AI enabled). */
  ai_per_day: z.number().int().nonnegative().nullable().optional(),
  featured_priority: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  if (!verifyAdminSession(cookieStore.get(getAdminSessionCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { planId, ...patch } = parsed.data;
  try {
    await updatePlanDefinition(planId, patch);
    const plans = await listPlanDefinitions();
    return NextResponse.json({ plans });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 503 });
  }
}

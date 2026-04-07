import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSessionCookieName, verifyAdminSession } from "@/lib/admin-session";
import { getPlatformSettings, updatePlatformSettings } from "@/lib/platform-db";

export async function GET() {
  const cookieStore = await cookies();
  if (!verifyAdminSession(cookieStore.get(getAdminSessionCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await getPlatformSettings();
  return NextResponse.json({ settings });
}

const patchSchema = z.object({
  verification_fee_cents: z.number().int().nonnegative(),
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
  try {
    await updatePlatformSettings(parsed.data);
    const settings = await getPlatformSettings();
    return NextResponse.json({ settings });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

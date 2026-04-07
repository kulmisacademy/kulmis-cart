import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSessionCookieName, verifyAdminSession } from "@/lib/admin-session";
import { approvePendingVendor } from "@/lib/vendor-approval";

const bodySchema = z.object({
  pendingId: z.string().min(1),
});

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = verifyAdminSession(cookieStore.get(getAdminSessionCookieName())?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await approvePendingVendor(parsed.data.pendingId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

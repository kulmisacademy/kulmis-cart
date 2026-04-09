import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSessionCookieName, verifyAdminSession } from "@/lib/admin-session";
import {
  approveUpgradeRequest,
  listUpgradeRequests,
  rejectUpgradeRequest,
} from "@/lib/platform-db";

export async function GET() {
  const cookieStore = await cookies();
  if (!verifyAdminSession(cookieStore.get(getAdminSessionCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const requests = await listUpgradeRequests();
    return NextResponse.json({ requests });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

const postSchema = z.object({
  requestId: z.string().min(1),
  action: z.enum(["approve", "reject"]),
});

export async function POST(request: Request) {
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
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { requestId, action } = parsed.data;
  try {
    if (action === "approve") {
      await approveUpgradeRequest(requestId);
    } else {
      await rejectUpgradeRequest(requestId);
    }
    const requests = await listUpgradeRequests();
    return NextResponse.json({ ok: true, requests });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Action failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

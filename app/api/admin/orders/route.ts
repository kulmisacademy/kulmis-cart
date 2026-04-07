import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAdminSessionCookieName, verifyAdminSession } from "@/lib/admin-session";
import { listOrdersForAdmin } from "@/lib/customer/db";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const session = verifyAdminSession(cookieStore.get(getAdminSessionCookieName())?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone") ?? undefined;

  try {
    const orders = await listOrdersForAdmin(phone ?? undefined);
    return NextResponse.json({ orders });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

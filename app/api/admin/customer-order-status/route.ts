import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminSessionCookieName, verifyAdminSession } from "@/lib/admin-session";
import { updateCustomerOrderStatus } from "@/lib/customer/db";
import { notifyCustomerOrderStatusChange } from "@/lib/notifications/service";

const bodySchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(["pending", "accepted", "completed"]),
});

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const admin = verifyAdminSession(cookieStore.get(getAdminSessionCookieName())?.value);
  if (!admin) {
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
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const ok = await updateCustomerOrderStatus(parsed.data.orderId, parsed.data.status);
    if (!ok) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    revalidatePath("/account");
    revalidatePath("/stores");
    if (parsed.data.status === "accepted" || parsed.data.status === "completed") {
      void notifyCustomerOrderStatusChange(parsed.data.orderId, parsed.data.status);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}

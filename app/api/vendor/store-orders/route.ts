import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { findApprovedVendorById } from "@/lib/approved-vendors";
import { listVendorOrderLines, updateOrderLineStatusForStore } from "@/lib/customer/db";
import { notifyCustomerOrderStatusChange } from "@/lib/notifications/service";
import { getVendorSessionCookieName, verifyVendorSession } from "@/lib/vendor-session";

const patchSchema = z.object({
  orderLineId: z.string().min(1),
  status: z.enum(["pending", "accepted", "completed"]),
});

export async function GET(request: Request) {
  const upstream = process.env.LAAS24_BACKEND_URL?.trim();
  if (upstream) {
    try {
      const r = await fetch(`${upstream.replace(/\/$/, "")}/api/vendor/store-orders`, {
        headers: { cookie: request.headers.get("cookie") ?? "" },
      });
      const data = await r.json().catch(() => ({}));
      return NextResponse.json(data, { status: r.status });
    } catch (e) {
      console.error("[vendor/store-orders GET] LAAS24_BACKEND_URL delegate failed:", e);
    }
  }

  const cookieStore = await cookies();
  const session = verifyVendorSession(cookieStore.get(getVendorSessionCookieName())?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vendor = await findApprovedVendorById(session.vid);
  if (!vendor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orders = await listVendorOrderLines(vendor.storeSlug);
    return NextResponse.json({ orders });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const upstream = process.env.LAAS24_BACKEND_URL?.trim();
  if (upstream) {
    try {
      const r = await fetch(`${upstream.replace(/\/$/, "")}/api/vendor/store-orders`, {
        method: "PATCH",
        headers: {
          "Content-Type": request.headers.get("content-type") ?? "application/json",
          cookie: request.headers.get("cookie") ?? "",
        },
        body: await request.clone().text(),
      });
      const data = await r.json().catch(() => ({}));
      return NextResponse.json(data, { status: r.status });
    } catch (e) {
      console.error("[vendor/store-orders PATCH] LAAS24_BACKEND_URL delegate failed:", e);
    }
  }

  const cookieStore = await cookies();
  const session = verifyVendorSession(cookieStore.get(getVendorSessionCookieName())?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vendor = await findApprovedVendorById(session.vid);
  if (!vendor) {
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
    const ok = await updateOrderLineStatusForStore(
      parsed.data.orderLineId,
      vendor.storeSlug,
      parsed.data.status,
    );
    if (!ok) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (parsed.data.status === "accepted" || parsed.data.status === "completed") {
      void notifyCustomerOrderStatusChange(parsed.data.orderLineId, parsed.data.status);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not update" }, { status: 503 });
  }
}

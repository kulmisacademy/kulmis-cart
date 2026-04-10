import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findApprovedVendorById, listApprovedVendors } from "@/lib/approved-vendors";
import { isVendorAreaReferer } from "@/lib/chat-role-from-request";
import { fallbackListCustomerThreads, fallbackListStoreThreads } from "@/lib/chat-fallback";
import { listCustomerChatThreads, listVendorChatThreads } from "@/lib/customer/db";
import { getCustomerSessionCookieName, verifyCustomerSession } from "@/lib/customer-session";
import { getVendorSessionCookieName, verifyVendorSession } from "@/lib/vendor-session";

export async function GET(request: Request) {
  const upstream = process.env.LAAS24_BACKEND_URL?.trim();
  if (upstream) {
    try {
      const url = new URL(request.url);
      const q = url.searchParams.toString();
      const r = await fetch(`${upstream.replace(/\/$/, "")}/api/chat/threads${q ? `?${q}` : ""}`, {
        headers: {
          cookie: request.headers.get("cookie") ?? "",
          referer: request.headers.get("referer") ?? "",
        },
      });
      if (r.ok) {
        const body = await r.json();
        return NextResponse.json(body);
      }
    } catch (e) {
      console.error("[chat/threads] LAAS24_BACKEND_URL delegate failed:", e);
    }
  }

  try {
    const dbAvailable = Boolean(process.env.DATABASE_URL?.trim());
    const { searchParams } = new URL(request.url);
    const roleHint = searchParams.get("role")?.toLowerCase();
    const cookieStore = await cookies();
    const customer = verifyCustomerSession(cookieStore.get(getCustomerSessionCookieName())?.value);
    const vendor = verifyVendorSession(cookieStore.get(getVendorSessionCookieName())?.value);
    if (!customer && !vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const useVendorList =
      vendor &&
      (!customer || roleHint === "vendor" || (roleHint !== "customer" && isVendorAreaReferer(request)));

    if (useVendorList) {
      const approved = await findApprovedVendorById(vendor.vid);
      if (!approved) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const threads = !dbAvailable
        ? fallbackListStoreThreads(approved.storeSlug).map((t) => ({
            id: t.id,
            customerId: t.customerId,
            customerName: "Customer",
            storeSlug: t.storeSlug,
            updatedAt: t.updatedAt,
            lastMessage: t.lastMessage,
          }))
        : await (async () => {
            try {
              return await listVendorChatThreads(approved.storeSlug);
            } catch {
              return fallbackListStoreThreads(approved.storeSlug).map((t) => ({
                id: t.id,
                customerId: t.customerId,
                customerName: "Customer",
                storeSlug: t.storeSlug,
                updatedAt: t.updatedAt,
                lastMessage: t.lastMessage,
              }));
            }
          })();
      const threadsWithMeta = threads.map((t) => ({
        ...t,
        storeName: approved.storeName,
      }));
      return NextResponse.json({ threads: threadsWithMeta, role: "vendor" as const });
    }

    if (customer) {
      const threads = !dbAvailable
        ? fallbackListCustomerThreads(customer.cid).map((t) => ({
            id: t.id,
            customerId: t.customerId,
            customerName: "Customer",
            storeSlug: t.storeSlug,
            updatedAt: t.updatedAt,
            lastMessage: t.lastMessage,
          }))
        : await (async () => {
            try {
              return await listCustomerChatThreads(customer.cid);
            } catch {
              return fallbackListCustomerThreads(customer.cid).map((t) => ({
                id: t.id,
                customerId: t.customerId,
                customerName: "Customer",
                storeSlug: t.storeSlug,
                updatedAt: t.updatedAt,
                lastMessage: t.lastMessage,
              }));
            }
          })();
      const slugSet = new Set(threads.map((t) => t.storeSlug));
      const vendorSlugToName = new Map(
        (await listApprovedVendors())
          .filter((v) => slugSet.has(v.storeSlug))
          .map((v) => [v.storeSlug, v.storeName] as const),
      );
      const threadsWithMeta = threads.map((t) => ({
        ...t,
        storeName: vendorSlugToName.get(t.storeSlug) ?? t.storeSlug,
      }));
      return NextResponse.json({ threads: threadsWithMeta, role: "customer" as const });
    }
  } catch (e) {
    console.error("chat/threads error:", e);
    return NextResponse.json({ error: "Chat threads unavailable" }, { status: 503 });
  }
}

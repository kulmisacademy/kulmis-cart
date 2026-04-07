import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { findApprovedVendorByStoreSlug } from "@/lib/approved-vendors";
import { fallbackGetOrCreateThread } from "@/lib/chat-fallback";
import { getOrCreateChatThread } from "@/lib/customer/db";
import { getCustomerSessionCookieName, verifyCustomerSession } from "@/lib/customer-session";

const bodySchema = z.object({
  storeSlug: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const dbAvailable = Boolean(process.env.DATABASE_URL?.trim());
    const cookieStore = await cookies();
    const customerSession = verifyCustomerSession(cookieStore.get(getCustomerSessionCookieName())?.value);
    if (!customerSession) {
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
    const storeSlug = parsed.data.storeSlug.trim();

    let threadId: string;
    let persistence: "database" | "memory" = "database";
    if (!dbAvailable) {
      const vendor = await findApprovedVendorByStoreSlug(storeSlug);
      if (!vendor) return NextResponse.json({ error: "Store not found" }, { status: 404 });
      threadId = fallbackGetOrCreateThread(customerSession.cid, storeSlug);
      persistence = "memory";
    } else {
      const vendor = await findApprovedVendorByStoreSlug(storeSlug);
      if (!vendor) return NextResponse.json({ error: "Store not found" }, { status: 404 });
      try {
        threadId = await getOrCreateChatThread(customerSession.cid, storeSlug);
      } catch {
        threadId = fallbackGetOrCreateThread(customerSession.cid, storeSlug);
        persistence = "memory";
      }
    }
    return NextResponse.json({ threadId, role: "customer" as const, persistence });
  } catch (e) {
    console.error("chat/thread error:", e);
    const msg = "Chat service temporarily unavailable.";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}

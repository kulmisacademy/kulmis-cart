import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { findApprovedVendorById } from "@/lib/approved-vendors";
import {
  getOrCreateChatThread,
  listCustomerChatThreads,
  listVendorChatThreads,
} from "@/lib/customer/db";
import { getCustomerSessionCookieName, verifyCustomerSession } from "@/lib/customer-session";
import { getVendorSessionCookieName, verifyVendorSession } from "@/lib/vendor-session";

const postSchema = z.object({
  storeSlug: z.string().min(1),
});

export async function GET() {
  const cStore = await cookies();
  const vCookie = cStore.get(getVendorSessionCookieName())?.value;
  const cCookie = cStore.get(getCustomerSessionCookieName())?.value;

  const vSession = verifyVendorSession(vCookie);
  if (vSession) {
    const vendor = await findApprovedVendorById(vSession.vid);
    if (!vendor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      const conversations = await listVendorChatThreads(vendor.storeSlug);
      return NextResponse.json({ conversations, role: "vendor" as const });
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }
  }

  const cSession = verifyCustomerSession(cCookie);
  if (cSession) {
    try {
      const conversations = await listCustomerChatThreads(cSession.cid);
      return NextResponse.json({ conversations, role: "customer" as const });
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  const cStore = await cookies();
  const cSession = verifyCustomerSession(cStore.get(getCustomerSessionCookieName())?.value);
  if (!cSession) {
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

  try {
    const conversationId = await getOrCreateChatThread(cSession.cid, parsed.data.storeSlug.trim());
    return NextResponse.json({ conversationId, storeSlug: parsed.data.storeSlug.trim() });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not open conversation" }, { status: 503 });
  }
}

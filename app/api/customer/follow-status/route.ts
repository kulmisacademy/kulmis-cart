import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCustomerSessionCookieName, verifyCustomerSession } from "@/lib/customer-session";
import {
  getFollowerCountForStore,
  isCustomerFollowingStore,
} from "@/lib/customer/db";
import { getStoreBySlug } from "@/lib/marketplace-catalog";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeSlug = searchParams.get("storeSlug")?.trim();
  if (!storeSlug) {
    return NextResponse.json({ error: "Missing storeSlug" }, { status: 400 });
  }

  const store = await getStoreBySlug(storeSlug);
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const followerCount = await getFollowerCountForStore(storeSlug);

  const cookieStore = await cookies();
  const session = verifyCustomerSession(cookieStore.get(getCustomerSessionCookieName())?.value);
  if (!session) {
    return NextResponse.json({ followerCount, following: false, authenticated: false });
  }

  const following = await isCustomerFollowingStore(session.cid, storeSlug);
  return NextResponse.json({ followerCount, following, authenticated: true });
}

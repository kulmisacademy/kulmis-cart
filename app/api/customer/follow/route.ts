import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerSessionCookieName, verifyCustomerSession } from "@/lib/customer-session";
import {
  followStore,
  getFollowerCountForStore,
  isCustomerFollowingStore,
  unfollowStore,
} from "@/lib/customer/db";
import { getStoreBySlug } from "@/lib/marketplace-catalog";
import { revalidateStorePublicPaths } from "@/lib/revalidate-store-paths";

const bodySchema = z.object({
  storeSlug: z.string().min(1).max(200),
  follow: z.boolean(),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const session = verifyCustomerSession(cookieStore.get(getCustomerSessionCookieName())?.value);
  if (!session) {
    return NextResponse.json({ error: "Sign in to follow stores." }, { status: 401 });
  }

  const { storeSlug, follow } = parsed.data;
  const slug = storeSlug.trim();
  const store = await getStoreBySlug(slug);
  if (!store) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  try {
    if (follow) {
      await followStore(session.cid, slug);
    } else {
      await unfollowStore(session.cid, slug);
    }
    const followerCount = await getFollowerCountForStore(slug);
    const following = await isCustomerFollowingStore(session.cid, slug);
    await revalidateStorePublicPaths(slug);
    return NextResponse.json({ ok: true, followerCount, following });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not update follow." }, { status: 503 });
  }
}

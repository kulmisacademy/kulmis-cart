import "server-only";
import { cookies } from "next/headers";
import { getCustomerSessionCookieName, verifyCustomerSession } from "@/lib/customer-session";
import { getCustomerById } from "@/lib/customer/db";
import type { CustomerPublic } from "@/lib/customer/db";

export async function getCustomerFromCookies(): Promise<CustomerPublic | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(getCustomerSessionCookieName())?.value;
  const session = verifyCustomerSession(raw);
  if (!session) return null;
  return getCustomerById(session.cid);
}

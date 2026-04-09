import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminLoginUrl } from "@/lib/admin-login-path";
import { getAdminSessionCookieName, verifyAdminSession } from "@/lib/admin-session";

export async function requireAdminSession() {
  const cookieStore = await cookies();
  const session = verifyAdminSession(cookieStore.get(getAdminSessionCookieName())?.value);
  if (!session) {
    redirect(getAdminLoginUrl());
  }
  return session;
}

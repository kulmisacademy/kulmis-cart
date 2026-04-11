"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getAdminSessionCookieName, verifyAdminSession } from "@/lib/admin-session";
import { approvePendingVendor } from "@/lib/vendor-approval";

export async function approvePendingVendorAction(
  pendingId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!pendingId?.trim()) {
    return { ok: false, error: "Invalid request." };
  }

  const cookieStore = await cookies();
  const session = verifyAdminSession(cookieStore.get(getAdminSessionCookieName())?.value);
  if (!session) {
    return { ok: false, error: "Unauthorized" };
  }

  const result = await approvePendingVendor(pendingId);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/vendors");
  return { ok: true };
}

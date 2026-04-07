import { revalidatePath } from "next/cache";
import { findApprovedVendorByStoreSlug } from "@/lib/approved-vendors";
import { loadDashboard } from "@/lib/vendor-dashboard-repository";
import { buildPublicStorePathSegment } from "@/lib/store-public-path";

/** Revalidate listing, legacy slug route, and canonical store profile after store-scoped mutations. */
export async function revalidateStorePublicPaths(storeSlug: string): Promise<void> {
  const slug = storeSlug.trim();
  if (!slug) return;
  revalidatePath("/stores");
  revalidatePath(`/stores/${slug}`);
  const v = await findApprovedVendorByStoreSlug(slug);
  if (!v) return;
  const state = await loadDashboard(v);
  const displayName = state.settings.storeName?.trim() || v.storeName;
  const seg = buildPublicStorePathSegment(displayName, v.id);
  revalidatePath(`/store/${seg}`);
}

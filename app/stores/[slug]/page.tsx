import { notFound, redirect } from "next/navigation";
import { findApprovedVendorByStoreSlug } from "@/lib/approved-vendors";
import { loadDashboard } from "@/lib/vendor-dashboard-repository";
import { buildPublicStorePathSegment, parseVendorIdFromPublicStoreParam } from "@/lib/store-public-path";

/** Legacy `/stores/{slug}` → canonical `/store/{name}-{vendorId}`. */
export default async function LegacyStoreSlugRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw ?? "").trim();
  if (!slug) notFound();

  if (parseVendorIdFromPublicStoreParam(slug)) {
    redirect(`/store/${encodeURIComponent(slug)}`);
  }

  const vendor = await findApprovedVendorByStoreSlug(slug);
  if (!vendor) notFound();
  const state = await loadDashboard(vendor);
  const displayName = state.settings.storeName?.trim() || vendor.storeName;
  const canonical = buildPublicStorePathSegment(displayName, vendor.id);
  redirect(`/store/${encodeURIComponent(canonical)}`);
}

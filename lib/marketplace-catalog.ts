import "server-only";
import { cache } from "react";
import { findApprovedVendorById, listApprovedVendors, type ApprovedVendorRecord } from "@/lib/approved-vendors";
import type { Product, Store } from "@/lib/data";
import { getFeaturedPriorityMap, getStoreVerified, getVerifiedSlugSet } from "@/lib/platform-db";
import { loadDashboard } from "@/lib/vendor-dashboard-repository";
import type { VendorDashboardState } from "@/lib/vendor-types";
import { buildPublicStorePathSegment, parseVendorIdFromPublicStoreParam } from "@/lib/store-public-path";

/** One parallel load of all vendor dashboards per server request (dedupes home/products/stores). */
const getVendorsWithDashboardStates = cache(async () => {
  const vendors = await listApprovedVendors();
  if (vendors.length === 0) return [];
  const states = await Promise.all(vendors.map((v) => loadDashboard(v)));
  return vendors.map((vendor, i) => ({ vendor, state: states[i]! }));
});

/** One `loadDashboard` per store slug per request (dedupes store detail page). */
const getDashboardRowByStoreSlug = cache(async (storeSlug: string) => {
  const vendors = await listApprovedVendors();
  const vendor = vendors.find((x) => x.storeSlug === storeSlug);
  if (!vendor) return null;
  const state = await loadDashboard(vendor);
  return { vendor, state };
});

const getDashboardRowByVendorId = cache(async (vendorId: string) => {
  const vendor = await findApprovedVendorById(vendorId);
  if (!vendor) return null;
  const state = await loadDashboard(vendor);
  return { vendor, state };
});

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ST";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function vendorToStore(v: ApprovedVendorRecord, state: VendorDashboardState, isVerified: boolean): Store {
  const s = state.settings;
  const name = s.storeName?.trim() || v.storeName;
  const description = s.description?.trim() ?? "";
  const phone = s.phone?.trim() || v.storePhone;
  const region = s.region?.trim() || v.region;
  const district = s.district?.trim() || v.district;

  const logoUrl =
    s.logoDataBase64 && s.logoMime
      ? `data:${s.logoMime};base64,${s.logoDataBase64}`
      : v.logoDataBase64 && v.logoMime
        ? `data:${v.logoMime};base64,${v.logoDataBase64}`
        : undefined;
  const bannerImage =
    s.bannerDataBase64 && s.bannerMime
      ? `data:${s.bannerMime};base64,${s.bannerDataBase64}`
      : v.bannerDataBase64 && v.bannerMime
        ? `data:${v.bannerMime};base64,${v.bannerDataBase64}`
        : undefined;

  return {
    slug: v.storeSlug,
    vendorId: v.id,
    name,
    logo: initialsFromName(name),
    logoUrl,
    phone,
    region,
    district,
    description,
    bannerImage,
    rating: 0,
    totalReviews: 0,
    isVerified,
    badges: undefined,
  };
}

function vendorProductToProduct(
  p: import("@/lib/vendor-types").VendorDashboardProduct,
  v: ApprovedVendorRecord,
  state: VendorDashboardState,
  storeVerified: boolean,
): Product {
  const s = state.settings;
  return {
    ...p,
    vendorId: v.id,
    storeSlug: v.storeSlug,
    storeName: s.storeName?.trim() || v.storeName,
    district: s.district?.trim() || v.district,
    storeVerified,
  };
}

export async function getMarketplaceStores(): Promise<Store[]> {
  const rows = await getVendorsWithDashboardStates();
  const verified = await getVerifiedSlugSet();
  return rows.map(({ vendor, state }) => vendorToStore(vendor, state, verified.has(vendor.storeSlug)));
}

export async function getStoresByRating(): Promise<Store[]> {
  const list = await getMarketplaceStores();
  const priority = await getFeaturedPriorityMap();
  return [...list].sort(
    (a, b) =>
      (priority[b.slug] ?? 0) - (priority[a.slug] ?? 0) ||
      b.rating - a.rating ||
      b.totalReviews - a.totalReviews,
  );
}

export async function getMarketplaceProducts(): Promise<Product[]> {
  const rows = await getVendorsWithDashboardStates();
  const verified = await getVerifiedSlugSet();
  const products: Product[] = [];
  for (const { vendor, state } of rows) {
    const storeVerified = verified.has(vendor.storeSlug);
    for (const p of state.products) {
      products.push(vendorProductToProduct(p, vendor, state, storeVerified));
    }
  }
  return products.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/** Lighter than `getMarketplaceProducts` when only IDs are needed (e.g. cart validation). */
export async function getMarketplaceProductIds(): Promise<string[]> {
  const rows = await getVendorsWithDashboardStates();
  const ids: string[] = [];
  for (const { state } of rows) {
    for (const p of state.products) ids.push(p.id);
  }
  return ids;
}

/** One merged dashboard scan per request — avoids N sequential `loadDashboard` calls. */
export const getProductById = cache(async function getProductById(id: string): Promise<Product | undefined> {
  const rows = await getVendorsWithDashboardStates();
  const verified = await getVerifiedSlugSet();
  for (const { vendor, state } of rows) {
    const p = state.products.find((x) => x.id === id);
    if (p) return vendorProductToProduct(p, vendor, state, verified.has(vendor.storeSlug));
  }
  return undefined;
});

export async function getProductsByStoreSlug(slug: string): Promise<Product[]> {
  const row = await getDashboardRowByStoreSlug(slug);
  if (!row) return [];
  const storeVerified = await getStoreVerified(slug);
  return row.state.products.map((p) => vendorProductToProduct(p, row.vendor, row.state, storeVerified));
}

export async function getStoreBySlug(slug: string): Promise<Store | undefined> {
  const row = await getDashboardRowByStoreSlug(slug);
  if (!row) return undefined;
  const isVerified = await getStoreVerified(slug);
  return vendorToStore(row.vendor, row.state, isVerified);
}

/**
 * Resolve a storefront from `/store/[segment]`: UUID suffix or legacy plain storeSlug.
 * Products are always scoped via the resolved vendor’s dashboard (single store).
 */
export async function resolveStoreFromPublicRouteSegment(segment: string): Promise<{
  store: Store;
  canonicalSegment: string;
} | null> {
  const decoded = decodeURIComponent(segment.trim());
  if (!decoded) return null;

  const vendorId = parseVendorIdFromPublicStoreParam(decoded);
  const row = vendorId
    ? await getDashboardRowByVendorId(vendorId)
    : await getDashboardRowByStoreSlug(decoded);

  if (!row) return null;

  const displayName = row.state.settings.storeName?.trim() || row.vendor.storeName;
  const canonicalSegment = buildPublicStorePathSegment(displayName, row.vendor.id);
  const isVerified = await getStoreVerified(row.vendor.storeSlug);
  const store = vendorToStore(row.vendor, row.state, isVerified);

  return { store, canonicalSegment };
}

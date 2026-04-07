import type { StoreEntitlements } from "@/lib/platform-db";

/** Legacy defaults when entitlements are unavailable (matches seeded Free plan). */
export const VENDOR_FREE_MAX_PRODUCTS = 20;
export const VENDOR_FREE_MAX_VIDEOS = 5;

export function countProductVideos(products: { videoUrl?: string }[]): number {
  return products.filter((p) => Boolean(p.videoUrl?.trim())).length;
}

export function canAddProduct(entitlements: StoreEntitlements, currentProductCount: number): boolean {
  const lim = entitlements.productLimit;
  if (lim == null) return true;
  return currentProductCount < lim;
}

export function canAddVideo(entitlements: StoreEntitlements, products: { videoUrl?: string }[]): boolean {
  const lim = entitlements.videoLimit;
  if (lim == null) return true;
  return countProductVideos(products) < lim;
}

/** @deprecated Use `canAddProduct` with entitlements */
export function canAddProductFreeTier(currentProductCount: number): boolean {
  return currentProductCount < VENDOR_FREE_MAX_PRODUCTS;
}

/** @deprecated Use `canAddVideo` with entitlements */
export function canAddVideoFreeTier(products: { videoUrl?: string }[]): boolean {
  return countProductVideos(products) < VENDOR_FREE_MAX_VIDEOS;
}

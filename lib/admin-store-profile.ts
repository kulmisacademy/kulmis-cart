import "server-only";
import { findApprovedVendorByStoreSlug } from "@/lib/approved-vendors";
import {
  getFollowerCountForStore,
  getStoreRatingSummaries,
  listVendorOrderLines,
  type VendorOrderLineRow,
} from "@/lib/customer/db";
import { getEntitlementsForStore, getStoreVerified } from "@/lib/platform-db";
import { loadDashboard } from "@/lib/vendor-dashboard-repository";

export type AdminStoreOwnerPublic = {
  storeSlug: string;
  storeName: string;
  email: string;
  phone: string;
  whatsApp: string;
  region: string;
  district: string;
  vendorId: string;
};

export type AdminStoreProfile = {
  owner: AdminStoreOwnerPublic;
  description: string;
  isVerified: boolean;
  planName: string;
  planSlug: string;
  productCount: number;
  products: Array<{ id: string; title: string; price: number; category: string; region: string }>;
  followerCount: number;
  ratingAverage: number;
  ratingCount: number;
  orders: VendorOrderLineRow[];
  ordersTotal: number;
};

export async function getAdminStoreProfile(storeSlug: string): Promise<AdminStoreProfile | null> {
  const vendor = await findApprovedVendorByStoreSlug(storeSlug.trim());
  if (!vendor) return null;

  const state = await loadDashboard(vendor);
  const [isVerified, ent, ratingMap] = await Promise.all([
    getStoreVerified(vendor.storeSlug),
    getEntitlementsForStore(vendor.storeSlug),
    getStoreRatingSummaries([vendor.storeSlug]).catch(() => ({} as Record<string, { average: number; count: number }>)),
  ]);

  let followerCount = 0;
  let orders: VendorOrderLineRow[] = [];
  try {
    ;[followerCount, orders] = await Promise.all([
      getFollowerCountForStore(vendor.storeSlug),
      listVendorOrderLines(vendor.storeSlug),
    ]);
  } catch {
    followerCount = 0;
    orders = [];
  }

  const live = ratingMap[vendor.storeSlug];
  const ratingAverage = live?.count ? live.average : 0;
  const ratingCount = live?.count ?? 0;

  const products = state.products.map((p) => ({
    id: p.id,
    title: p.title,
    price: p.price,
    category: p.category,
    region: p.region,
  }));

  const s = state.settings;
  return {
    owner: {
      storeSlug: vendor.storeSlug,
      storeName: s.storeName?.trim() || vendor.storeName,
      email: vendor.email,
      phone: s.phone?.trim() || vendor.storePhone,
      whatsApp: s.whatsAppNumber?.trim() || vendor.whatsAppNumber,
      region: s.region?.trim() || vendor.region,
      district: s.district?.trim() || vendor.district,
      vendorId: vendor.id,
    },
    description: state.settings.description?.trim() ?? "",
    isVerified,
    planName: ent.planName,
    planSlug: ent.planSlug,
    productCount: products.length,
    products,
    followerCount,
    ratingAverage,
    ratingCount,
    orders: orders.slice(0, 40),
    ordersTotal: orders.length,
  };
}

import { promises as fs } from "fs";
import path from "path";
import type { ApprovedVendorRecord } from "@/lib/approved-vendors";
import type { VendorDashboardProduct, VendorDashboardState, VendorOrder } from "@/lib/vendor-types";

const DASH_DIR = path.join(process.cwd(), "data", "vendor-dashboard");

function dashboardPath(vendorId: string) {
  return path.join(DASH_DIR, `${vendorId}.json`);
}

/**
 * New vendors start with an empty catalog and no sample orders — real data only.
 */
export function buildDefaultDashboard(vendor: ApprovedVendorRecord): VendorDashboardState {
  const settings = {
    storeName: vendor.storeName,
    phone: vendor.storePhone,
    whatsAppNumber: vendor.whatsAppNumber,
    region: vendor.region,
    district: vendor.district.trim(),
    description: "",
    ...(vendor.logoDataBase64 && vendor.logoMime
      ? { logoMime: vendor.logoMime, logoDataBase64: vendor.logoDataBase64 }
      : {}),
    ...(vendor.bannerDataBase64 && vendor.bannerMime
      ? { bannerMime: vendor.bannerMime, bannerDataBase64: vendor.bannerDataBase64 }
      : {}),
  };

  return {
    products: [] as VendorDashboardProduct[],
    orders: [] as VendorOrder[],
    settings,
    subscriptionPlan: vendor.plan,
    analytics: {
      totalViews: 0,
      productClicks: 0,
    },
  };
}

export async function loadDashboard(vendor: ApprovedVendorRecord): Promise<VendorDashboardState> {
  const defaults = buildDefaultDashboard(vendor);
  try {
    const raw = await fs.readFile(dashboardPath(vendor.id), "utf-8");
    const parsed = JSON.parse(raw) as Partial<VendorDashboardState>;
    if (!parsed || !Array.isArray(parsed.products) || !Array.isArray(parsed.orders)) {
      return defaults;
    }
    const baseAnalytics = defaults.analytics ?? { totalViews: 0, productClicks: 0 };
    return {
      ...defaults,
      ...parsed,
      settings: { ...defaults.settings, ...parsed.settings },
      analytics: {
        totalViews: parsed.analytics?.totalViews ?? baseAnalytics.totalViews,
        productClicks: parsed.analytics?.productClicks ?? baseAnalytics.productClicks,
      },
    };
  } catch {
    return defaults;
  }
}

export async function saveDashboard(vendorId: string, state: VendorDashboardState): Promise<void> {
  await fs.mkdir(DASH_DIR, { recursive: true });
  await fs.writeFile(dashboardPath(vendorId), JSON.stringify(state, null, 2), "utf-8");
}

import { promises as fs } from "fs";
import path from "path";
import type { ApprovedVendorRecord } from "@/lib/approved-vendors";
import { getSql } from "@/lib/db";
import type { VendorDashboardProduct, VendorDashboardState, VendorOrder } from "@/lib/vendor-types";

const DASH_DIR = path.join(process.cwd(), "data", "vendor-dashboard");

function dashboardPath(vendorId: string) {
  return path.join(DASH_DIR, `${vendorId}.json`);
}

function usePostgres(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

let ensureTablePromise: Promise<void> | null = null;

async function ensureVendorDashboardsTable(): Promise<void> {
  if (!usePostgres()) return;
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      const sql = getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS sc_vendor_dashboards (
          vendor_id TEXT PRIMARY KEY,
          state_json TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
    })();
  }
  await ensureTablePromise;
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

function mergeLoadedState(defaults: VendorDashboardState, parsed: Partial<VendorDashboardState>): VendorDashboardState {
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
}

async function readStateFromFile(vendor: ApprovedVendorRecord): Promise<VendorDashboardState | null> {
  const defaults = buildDefaultDashboard(vendor);
  try {
    const raw = await fs.readFile(dashboardPath(vendor.id), "utf-8");
    const parsed = JSON.parse(raw) as Partial<VendorDashboardState>;
    return mergeLoadedState(defaults, parsed);
  } catch {
    return null;
  }
}

export async function loadDashboard(vendor: ApprovedVendorRecord): Promise<VendorDashboardState> {
  const defaults = buildDefaultDashboard(vendor);

  if (usePostgres()) {
    await ensureVendorDashboardsTable();
    const sql = getSql();
    const rows = (await sql`
      SELECT state_json FROM sc_vendor_dashboards WHERE vendor_id = ${vendor.id} LIMIT 1
    `) as { state_json: string }[];
    const row = rows[0];
    if (row?.state_json) {
      try {
        const parsed = JSON.parse(row.state_json) as Partial<VendorDashboardState>;
        return mergeLoadedState(defaults, parsed);
      } catch {
        return defaults;
      }
    }
    /* No DB row: hydrate from legacy JSON file if present, then seed Postgres */
    const fromFile = await readStateFromFile(vendor);
    const merged = fromFile ?? defaults;
    try {
      await sql`
        INSERT INTO sc_vendor_dashboards (vendor_id, state_json, updated_at)
        VALUES (${vendor.id}, ${JSON.stringify(merged)}, now())
        ON CONFLICT (vendor_id) DO UPDATE SET state_json = EXCLUDED.state_json, updated_at = now()
      `;
    } catch (e) {
      console.error("vendor-dashboard: seed failed", vendor.id, e);
    }
    return merged;
  }

  const fromFile = await readStateFromFile(vendor);
  return fromFile ?? defaults;
}

export async function saveDashboard(vendorId: string, state: VendorDashboardState): Promise<void> {
  const payload = JSON.stringify(state);

  if (usePostgres()) {
    await ensureVendorDashboardsTable();
    const sql = getSql();
    await sql`
      INSERT INTO sc_vendor_dashboards (vendor_id, state_json, updated_at)
      VALUES (${vendorId}, ${payload}, now())
      ON CONFLICT (vendor_id) DO UPDATE SET state_json = EXCLUDED.state_json, updated_at = now()
    `;
    return;
  }

  await fs.mkdir(DASH_DIR, { recursive: true });
  await fs.writeFile(dashboardPath(vendorId), payload, "utf-8");
}

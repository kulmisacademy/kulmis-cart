import "server-only";
import { randomUUID } from "crypto";
import { getSql, pgTableExists } from "@/lib/db";

let ensurePromise: Promise<void> | null = null;

export type PlanDefinitionRow = {
  id: string;
  slug: string;
  name: string;
  price_monthly_cents: number;
  product_limit: number | null;
  video_limit: number | null;
  ai_enabled: boolean;
  featured_priority: number;
  is_active: boolean;
};

export type PlatformSettingsRow = {
  verification_fee_cents: number;
};

export type VerificationRequestRow = {
  id: string;
  store_slug: string;
  status: "pending" | "approved" | "rejected";
  payment_status: "unpaid" | "paid" | "waived";
  created_at: string;
  resolved_at: string | null;
};

export type StoreEntitlements = {
  planSlug: string;
  planName: string;
  productLimit: number | null;
  videoLimit: number | null;
  aiEnabled: boolean;
  featuredPriority: number;
  priceMonthlyCents: number;
};

function dbAvailable(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function ensurePlatformTables(): Promise<void> {
  if (!dbAvailable()) return;
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const sql = getSql();
      if (await pgTableExists("sc_store_subscriptions")) {
        return;
      }
      await sql`
        CREATE TABLE IF NOT EXISTS sc_platform_settings (
          id TEXT PRIMARY KEY DEFAULT 'default',
          verification_fee_cents INTEGER NOT NULL DEFAULT 1000
        )
      `;
      await sql`INSERT INTO sc_platform_settings (id, verification_fee_cents) VALUES ('default', 1000) ON CONFLICT (id) DO NOTHING`;

      await sql`
        CREATE TABLE IF NOT EXISTS sc_plan_definitions (
          id TEXT PRIMARY KEY,
          slug TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          price_monthly_cents INTEGER NOT NULL DEFAULT 0,
          product_limit INTEGER,
          video_limit INTEGER,
          ai_enabled BOOLEAN NOT NULL DEFAULT FALSE,
          featured_priority INTEGER NOT NULL DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS sc_store_subscriptions (
          store_slug TEXT PRIMARY KEY,
          plan_id TEXT NOT NULL REFERENCES sc_plan_definitions(id),
          expires_at TIMESTAMPTZ
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS sc_store_flags (
          store_slug TEXT PRIMARY KEY,
          is_verified BOOLEAN NOT NULL DEFAULT FALSE
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS sc_verification_requests (
          id TEXT PRIMARY KEY,
          store_slug TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
          payment_status TEXT NOT NULL CHECK (payment_status IN ('unpaid', 'paid', 'waived')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          resolved_at TIMESTAMPTZ
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS sc_verification_requests_slug_idx ON sc_verification_requests(store_slug)`;

      await sql`
        INSERT INTO sc_plan_definitions (id, slug, name, price_monthly_cents, product_limit, video_limit, ai_enabled, featured_priority)
        VALUES
          ('plan_free', 'free', 'Free', 0, 20, 5, false, 0),
          ('plan_pro', 'pro', 'Pro', 1000, NULL, NULL, true, 10),
          ('plan_premium', 'premium', 'Premium', 2999, NULL, NULL, true, 100)
        ON CONFLICT (id) DO NOTHING
      `;
    })();
  }
  try {
    await ensurePromise;
  } catch (err) {
    ensurePromise = null;
    throw err;
  }
}

export async function getPlatformSettings(): Promise<PlatformSettingsRow> {
  const fallback = { verification_fee_cents: 1000 };
  if (!dbAvailable()) return fallback;
  try {
    await ensurePlatformTables();
    const sql = getSql();
    const rows = (await sql`
      SELECT verification_fee_cents FROM sc_platform_settings WHERE id = 'default' LIMIT 1
    `) as { verification_fee_cents: number }[];
    return rows[0] ?? fallback;
  } catch {
    return fallback;
  }
}

export async function updatePlatformSettings(patch: { verification_fee_cents: number }): Promise<void> {
  if (!dbAvailable()) throw new Error("Database not configured");
  await ensurePlatformTables();
  const sql = getSql();
  await sql`
    INSERT INTO sc_platform_settings (id, verification_fee_cents)
    VALUES ('default', ${patch.verification_fee_cents})
    ON CONFLICT (id) DO UPDATE SET verification_fee_cents = EXCLUDED.verification_fee_cents
  `;
}

export async function listPlanDefinitions(): Promise<PlanDefinitionRow[]> {
  if (!dbAvailable()) return [];
  await ensurePlatformTables();
  const sql = getSql();
  const rows = (await sql`
    SELECT id, slug, name, price_monthly_cents, product_limit, video_limit, ai_enabled, featured_priority, is_active
    FROM sc_plan_definitions
    ORDER BY featured_priority ASC, slug ASC
  `) as PlanDefinitionRow[];
  return rows;
}

export async function updatePlanDefinition(
  planId: string,
  patch: Partial<
    Pick<
      PlanDefinitionRow,
      "name" | "price_monthly_cents" | "product_limit" | "video_limit" | "ai_enabled" | "featured_priority" | "is_active"
    >
  >,
): Promise<void> {
  await ensurePlatformTables();
  const sql = getSql();
  const cur = (await sql`
    SELECT id FROM sc_plan_definitions WHERE id = ${planId} LIMIT 1
  `) as { id: string }[];
  if (!cur.length) throw new Error("Plan not found");

  if (patch.name !== undefined) await sql`UPDATE sc_plan_definitions SET name = ${patch.name}, updated_at = now() WHERE id = ${planId}`;
  if (patch.price_monthly_cents !== undefined) {
    await sql`UPDATE sc_plan_definitions SET price_monthly_cents = ${patch.price_monthly_cents}, updated_at = now() WHERE id = ${planId}`;
  }
  if (patch.product_limit !== undefined) {
    await sql`UPDATE sc_plan_definitions SET product_limit = ${patch.product_limit}, updated_at = now() WHERE id = ${planId}`;
  }
  if (patch.video_limit !== undefined) {
    await sql`UPDATE sc_plan_definitions SET video_limit = ${patch.video_limit}, updated_at = now() WHERE id = ${planId}`;
  }
  if (patch.ai_enabled !== undefined) {
    await sql`UPDATE sc_plan_definitions SET ai_enabled = ${patch.ai_enabled}, updated_at = now() WHERE id = ${planId}`;
  }
  if (patch.featured_priority !== undefined) {
    await sql`UPDATE sc_plan_definitions SET featured_priority = ${patch.featured_priority}, updated_at = now() WHERE id = ${planId}`;
  }
  if (patch.is_active !== undefined) {
    await sql`UPDATE sc_plan_definitions SET is_active = ${patch.is_active}, updated_at = now() WHERE id = ${planId}`;
  }
}

export async function ensureStoreSubscriptionRow(storeSlug: string): Promise<void> {
  if (!dbAvailable()) return;
  try {
    await ensurePlatformTables();
    const sql = getSql();
    await sql`
      INSERT INTO sc_store_subscriptions (store_slug, plan_id)
      VALUES (${storeSlug}, 'plan_free')
      ON CONFLICT (store_slug) DO NOTHING
    `;
  } catch {
    /* ignore */
  }
}

export async function setStorePlan(storeSlug: string, planId: string): Promise<void> {
  await ensurePlatformTables();
  const sql = getSql();
  const plan = (await sql`SELECT id FROM sc_plan_definitions WHERE id = ${planId} LIMIT 1`) as { id: string }[];
  if (!plan.length) throw new Error("Invalid plan");
  await sql`
    INSERT INTO sc_store_subscriptions (store_slug, plan_id, expires_at)
    VALUES (${storeSlug}, ${planId}, NULL)
    ON CONFLICT (store_slug) DO UPDATE SET plan_id = EXCLUDED.plan_id, expires_at = EXCLUDED.expires_at
  `;
}

export async function getEntitlementsForStore(storeSlug: string): Promise<StoreEntitlements> {
  const fallback: StoreEntitlements = {
    planSlug: "free",
    planName: "Free",
    productLimit: 20,
    videoLimit: 5,
    aiEnabled: false,
    featuredPriority: 0,
    priceMonthlyCents: 0,
  };
  if (!dbAvailable()) return fallback;
  try {
    await ensurePlatformTables();
    const sql = getSql();
    // One round-trip: ensure default row exists, then read plan (was INSERT + SELECT).
    const rows = (await sql`
      WITH _ensure AS (
        INSERT INTO sc_store_subscriptions (store_slug, plan_id)
        VALUES (${storeSlug}, 'plan_free')
        ON CONFLICT (store_slug) DO NOTHING
        RETURNING 1
      )
      SELECT
        p.slug AS plan_slug,
        p.name AS plan_name,
        p.product_limit,
        p.video_limit,
        p.ai_enabled,
        p.featured_priority,
        p.price_monthly_cents
      FROM sc_store_subscriptions s
      JOIN sc_plan_definitions p ON p.id = s.plan_id
      WHERE s.store_slug = ${storeSlug}
      LIMIT 1
    `) as {
      plan_slug: string;
      plan_name: string;
      product_limit: number | null;
      video_limit: number | null;
      ai_enabled: boolean;
      featured_priority: number;
      price_monthly_cents: number;
    }[];
    const r = rows[0];
    if (!r) return fallback;
    return {
      planSlug: r.plan_slug,
      planName: r.plan_name,
      productLimit: r.product_limit,
      videoLimit: r.video_limit,
      aiEnabled: r.ai_enabled,
      featuredPriority: r.featured_priority,
      priceMonthlyCents: r.price_monthly_cents,
    };
  } catch {
    return fallback;
  }
}

export async function getStoreVerified(storeSlug: string): Promise<boolean> {
  if (!dbAvailable()) return false;
  try {
    await ensurePlatformTables();
    const sql = getSql();
    const rows = (await sql`
      SELECT is_verified FROM sc_store_flags WHERE store_slug = ${storeSlug} LIMIT 1
    `) as { is_verified: boolean }[];
    return rows[0]?.is_verified ?? false;
  } catch {
    return false;
  }
}

export async function getVerifiedSlugSet(): Promise<Set<string>> {
  if (!dbAvailable()) return new Set();
  try {
    await ensurePlatformTables();
    const sql = getSql();
    const rows = (await sql`
      SELECT store_slug FROM sc_store_flags WHERE is_verified = true
    `) as { store_slug: string }[];
    return new Set(rows.map((r) => r.store_slug));
  } catch {
    return new Set();
  }
}

export async function getFeaturedPriorityMap(): Promise<Record<string, number>> {
  if (!dbAvailable()) return {};
  try {
    await ensurePlatformTables();
    const sql = getSql();
    const rows = (await sql`
      SELECT s.store_slug, p.featured_priority
      FROM sc_store_subscriptions s
      JOIN sc_plan_definitions p ON p.id = s.plan_id
    `) as { store_slug: string; featured_priority: number }[];
    const out: Record<string, number> = {};
    for (const r of rows) out[r.store_slug] = r.featured_priority;
    return out;
  } catch {
    return {};
  }
}

export async function setStoreVerified(storeSlug: string, isVerified: boolean): Promise<void> {
  if (!dbAvailable()) throw new Error("Database not configured");
  await ensurePlatformTables();
  const sql = getSql();
  await sql`
    INSERT INTO sc_store_flags (store_slug, is_verified)
    VALUES (${storeSlug}, ${isVerified})
    ON CONFLICT (store_slug) DO UPDATE SET is_verified = EXCLUDED.is_verified
  `;
}

export async function listVerificationRequests(): Promise<VerificationRequestRow[]> {
  if (!dbAvailable()) return [];
  await ensurePlatformTables();
  const sql = getSql();
  return (await sql`
    SELECT id, store_slug, status, payment_status, created_at::text, resolved_at::text
    FROM sc_verification_requests
    ORDER BY created_at DESC
  `) as VerificationRequestRow[];
}

export async function createVerificationRequest(storeSlug: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await ensurePlatformTables();
    const sql = getSql();
    const pending = (await sql`
      SELECT id FROM sc_verification_requests
      WHERE store_slug = ${storeSlug} AND status = 'pending'
      LIMIT 1
    `) as { id: string }[];
    if (pending.length) {
      return { ok: false, error: "You already have a pending verification request." };
    }
    const id = randomUUID();
    await sql`
      INSERT INTO sc_verification_requests (id, store_slug, status, payment_status)
      VALUES (${id}, ${storeSlug}, 'pending', 'unpaid')
    `;
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Request failed";
    return { ok: false, error: msg };
  }
}

export async function setVerificationPaymentStatus(
  requestId: string,
  paymentStatus: "paid" | "waived",
): Promise<void> {
  await ensurePlatformTables();
  const sql = getSql();
  await sql`
    UPDATE sc_verification_requests
    SET payment_status = ${paymentStatus}
    WHERE id = ${requestId} AND status = 'pending'
  `;
}

export async function approveVerificationRequest(requestId: string): Promise<void> {
  await ensurePlatformTables();
  const sql = getSql();
  const rows = (await sql`
    SELECT store_slug, payment_status, status FROM sc_verification_requests WHERE id = ${requestId} LIMIT 1
  `) as { store_slug: string; payment_status: string; status: string }[];
  const row = rows[0];
  if (!row || row.status !== "pending") throw new Error("Invalid request");
  if (row.payment_status === "unpaid") {
    throw new Error("Payment must be received or waived before approval.");
  }
  await sql`
    UPDATE sc_verification_requests
    SET status = 'approved', resolved_at = now()
    WHERE id = ${requestId}
  `;
  await setStoreVerified(row.store_slug, true);
}

export async function rejectVerificationRequest(requestId: string): Promise<void> {
  await ensurePlatformTables();
  const sql = getSql();
  await sql`
    UPDATE sc_verification_requests
    SET status = 'rejected', resolved_at = now()
    WHERE id = ${requestId} AND status = 'pending'
  `;
}

/** Mark payment waived and approve in one step (admin convenience). */
export async function waiveAndApproveVerificationRequest(requestId: string): Promise<void> {
  await ensurePlatformTables();
  const sql = getSql();
  const rows = (await sql`
    SELECT store_slug, status FROM sc_verification_requests WHERE id = ${requestId} LIMIT 1
  `) as { store_slug: string; status: string }[];
  const row = rows[0];
  if (!row || row.status !== "pending") throw new Error("Invalid request");
  await sql`
    UPDATE sc_verification_requests
    SET payment_status = 'waived', status = 'approved', resolved_at = now()
    WHERE id = ${requestId}
  `;
  await setStoreVerified(row.store_slug, true);
}

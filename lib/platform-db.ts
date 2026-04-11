import "server-only";
import { randomUUID } from "crypto";
import { cache } from "react";
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
  /** Max AI listing assists per UTC day; null = unlimited (when ai_enabled). */
  ai_per_day: number | null;
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
  /** Daily AI cap (UTC); null = unlimited when aiEnabled. */
  aiPerDay: number | null;
  featuredPriority: number;
  priceMonthlyCents: number;
};

function dbAvailable(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/** True when Postgres is configured (enforces subscription usage in API routes). */
export function isPlatformDatabaseConfigured(): boolean {
  return dbAvailable();
}

function utcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Idempotent ALTERs for existing deployments (runs even when base tables already exist). */
async function runPlatformSchemaMigrations(): Promise<void> {
  if (!dbAvailable()) return;
  const sql = getSql();
  await sql`ALTER TABLE sc_plan_definitions ADD COLUMN IF NOT EXISTS ai_per_day INTEGER`;
  await sql`
    CREATE TABLE IF NOT EXISTS sc_vendor_ai_usage (
      store_slug TEXT PRIMARY KEY REFERENCES sc_store_subscriptions (store_slug) ON DELETE CASCADE,
      ai_used_today INTEGER NOT NULL DEFAULT 0,
      last_reset_date DATE NOT NULL
    )
  `;
  await sql`
    UPDATE sc_plan_definitions
    SET ai_per_day = COALESCE(ai_per_day, 1)
    WHERE id = 'plan_free' AND ai_per_day IS NULL
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS sc_upgrade_requests (
      id TEXT PRIMARY KEY,
      vendor_id TEXT NOT NULL,
      store_slug TEXT NOT NULL,
      store_name TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL,
      plan_id TEXT NOT NULL REFERENCES sc_plan_definitions (id),
      message TEXT,
      status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      resolved_at TIMESTAMPTZ
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS sc_upgrade_requests_status_idx ON sc_upgrade_requests(status)`;
  await sql`CREATE INDEX IF NOT EXISTS sc_upgrade_requests_vendor_idx ON sc_upgrade_requests(vendor_id)`;
}

export async function ensurePlatformTables(): Promise<void> {
  if (!dbAvailable()) return;
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const sql = getSql();
      const fresh = !(await pgTableExists("sc_store_subscriptions"));
      if (fresh) {
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
          ai_per_day INTEGER,
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
        INSERT INTO sc_plan_definitions (id, slug, name, price_monthly_cents, product_limit, video_limit, ai_enabled, featured_priority, ai_per_day)
        VALUES
          ('plan_free', 'free', 'Free', 0, 20, 5, true, 0, 1),
          ('plan_pro', 'pro', 'Pro', 1000, NULL, NULL, true, 10, NULL),
          ('plan_premium', 'premium', 'Premium', 2999, NULL, NULL, true, 100, NULL)
        ON CONFLICT (id) DO NOTHING
      `;
      }
      await runPlatformSchemaMigrations();
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
    SELECT id, slug, name, price_monthly_cents, product_limit, video_limit, ai_enabled, ai_per_day, featured_priority, is_active
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
      | "name"
      | "price_monthly_cents"
      | "product_limit"
      | "video_limit"
      | "ai_enabled"
      | "ai_per_day"
      | "featured_priority"
      | "is_active"
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
  if (patch.ai_per_day !== undefined) {
    await sql`UPDATE sc_plan_definitions SET ai_per_day = ${patch.ai_per_day}, updated_at = now() WHERE id = ${planId}`;
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
    aiEnabled: true,
    aiPerDay: 1,
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
        p.ai_per_day,
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
      ai_per_day: number | null;
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
      aiPerDay: r.ai_per_day,
      featuredPriority: r.featured_priority,
      priceMonthlyCents: r.price_monthly_cents,
    };
  } catch {
    return fallback;
  }
}

function pgDateToUtcString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

/** AI assists used today (UTC calendar day), for dashboard display. */
export async function getAiUsageToday(storeSlug: string): Promise<number> {
  if (!dbAvailable()) return 0;
  try {
    await ensurePlatformTables();
    const sql = getSql();
    const today = utcDateString();
    const rows = (await sql`
      SELECT ai_used_today, last_reset_date
      FROM sc_vendor_ai_usage
      WHERE store_slug = ${storeSlug}
      LIMIT 1
    `) as { ai_used_today: number; last_reset_date: unknown }[];
    const r = rows[0];
    if (!r) return 0;
    if (pgDateToUtcString(r.last_reset_date) < today) return 0;
    return r.ai_used_today;
  } catch {
    return 0;
  }
}

/**
 * Records one successful AI listing assist for the UTC day. Returns false if the daily cap is reached.
 * Caller must pass a positive finite daily limit (plan ai_per_day when capped).
 */
export async function consumeAiDailyCredit(storeSlug: string, dailyLimit: number): Promise<boolean> {
  if (!dbAvailable() || !Number.isFinite(dailyLimit) || dailyLimit < 1) return false;
  try {
    await ensurePlatformTables();
    const sql = getSql();
    const today = utcDateString();
    await sql`
      INSERT INTO sc_vendor_ai_usage (store_slug, ai_used_today, last_reset_date)
      VALUES (${storeSlug}, 0, ${today}::date)
      ON CONFLICT (store_slug) DO NOTHING
    `;
    const updated = (await sql`
      UPDATE sc_vendor_ai_usage AS u
      SET
        last_reset_date = CASE
          WHEN u.last_reset_date < ${today}::date THEN ${today}::date
          ELSE u.last_reset_date
        END,
        ai_used_today = CASE
          WHEN u.last_reset_date < ${today}::date THEN 1
          WHEN u.ai_used_today < ${dailyLimit} THEN u.ai_used_today + 1
          ELSE u.ai_used_today
        END
      WHERE u.store_slug = ${storeSlug}
        AND (u.last_reset_date < ${today}::date OR u.ai_used_today < ${dailyLimit})
      RETURNING u.ai_used_today
    `) as { ai_used_today: number }[];
    return updated.length > 0;
  } catch {
    return false;
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

export const getVerifiedSlugSet = cache(async function getVerifiedSlugSet(): Promise<Set<string>> {
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
});

export const getFeaturedPriorityMap = cache(async function getFeaturedPriorityMap(): Promise<
  Record<string, number>
> {
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
});

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

export type UpgradeRequestRow = {
  id: string;
  vendor_id: string;
  store_slug: string;
  store_name: string;
  email: string;
  phone: string;
  plan_id: string;
  plan_name: string;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  resolved_at: string | null;
};

export async function createUpgradeRequest(input: {
  vendorId: string;
  storeSlug: string;
  storeName: string;
  email: string;
  phone: string;
  planId: string;
  message?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!dbAvailable()) return { ok: false, error: "Database not configured." };
  try {
    await ensurePlatformTables();
    const sql = getSql();
    const plans = await listPlanDefinitions();
    const target = plans.find((p) => p.id === input.planId && p.is_active);
    if (!target) {
      return { ok: false, error: "Unknown or inactive plan." };
    }
    const ent = await getEntitlementsForStore(input.storeSlug);
    if (ent.planSlug === target.slug) {
      return { ok: false, error: "You are already on this plan." };
    }
    const pending = (await sql`
      SELECT id FROM sc_upgrade_requests
      WHERE vendor_id = ${input.vendorId} AND status = 'pending'
      LIMIT 1
    `) as { id: string }[];
    if (pending.length) {
      return { ok: false, error: "You already have a pending upgrade request." };
    }
    const id = randomUUID();
    const msg = input.message?.trim() || null;
    await sql`
      INSERT INTO sc_upgrade_requests (
        id, vendor_id, store_slug, store_name, email, phone, plan_id, message, status
      )
      VALUES (
        ${id},
        ${input.vendorId},
        ${input.storeSlug},
        ${input.storeName},
        ${input.email.trim()},
        ${input.phone.trim()},
        ${input.planId},
        ${msg},
        'pending'
      )
    `;
    return { ok: true, id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Request failed";
    return { ok: false, error: msg };
  }
}

export async function listUpgradeRequests(): Promise<UpgradeRequestRow[]> {
  if (!dbAvailable()) return [];
  await ensurePlatformTables();
  const sql = getSql();
  return (await sql`
    SELECT
      r.id,
      r.vendor_id,
      r.store_slug,
      r.store_name,
      r.email,
      r.phone,
      r.plan_id,
      p.name AS plan_name,
      r.message,
      r.status,
      r.created_at::text,
      r.resolved_at::text
    FROM sc_upgrade_requests r
    JOIN sc_plan_definitions p ON p.id = r.plan_id
    ORDER BY
      CASE r.status WHEN 'pending' THEN 0 ELSE 1 END,
      r.created_at DESC
  `) as UpgradeRequestRow[];
}

export async function approveUpgradeRequest(requestId: string): Promise<void> {
  if (!dbAvailable()) throw new Error("Database not configured");
  await ensurePlatformTables();
  const sql = getSql();
  const rows = (await sql`
    SELECT store_slug, plan_id, status
    FROM sc_upgrade_requests
    WHERE id = ${requestId}
    LIMIT 1
  `) as { store_slug: string; plan_id: string; status: string }[];
  const row = rows[0];
  if (!row || row.status !== "pending") {
    throw new Error("Request not found or already resolved.");
  }
  await setStorePlan(row.store_slug, row.plan_id);
  await sql`
    UPDATE sc_upgrade_requests
    SET status = 'approved', resolved_at = now()
    WHERE id = ${requestId}
  `;
}

export async function rejectUpgradeRequest(requestId: string): Promise<void> {
  if (!dbAvailable()) throw new Error("Database not configured");
  await ensurePlatformTables();
  const sql = getSql();
  const rows = (await sql`
    UPDATE sc_upgrade_requests
    SET status = 'rejected', resolved_at = now()
    WHERE id = ${requestId} AND status = 'pending'
    RETURNING id
  `) as { id: string }[];
  if (!rows.length) throw new Error("Request not found or already resolved.");
}

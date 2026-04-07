import "server-only";
import { randomUUID } from "crypto";
import { getSql, pgTableExists } from "@/lib/db";

export type AdType = "banner" | "popup" | "text";
export type PageTarget = "home" | "products" | "store";

export type AdRow = {
  id: string;
  title: string;
  type: AdType;
  imageUrl: string | null;
  description: string | null;
  link: string | null;
  regionTarget: string | null;
  pageTarget: PageTarget;
  isActive: boolean;
  maxViewsPerUser: number | null;
  popupDelayMs: number;
  createdAt: string;
  updatedAt: string;
};

export type AdAnalyticsRow = {
  adId: string;
  views: number;
  clicks: number;
};

let ensurePromise: Promise<void> | null = null;

function dbAvailable(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function ensureAdsTables(): Promise<void> {
  if (!dbAvailable()) return;
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const sql = getSql();
      if (await pgTableExists("sc_ads")) {
        return;
      }
      await sql`
        CREATE TABLE IF NOT EXISTS sc_ads (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('banner', 'popup', 'text')),
          image_url TEXT,
          description TEXT,
          link TEXT,
          region_target TEXT,
          page_target TEXT NOT NULL CHECK (page_target IN ('home', 'products', 'store')),
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          max_views_per_user INTEGER,
          popup_delay_ms INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS sc_ads_active_page_idx ON sc_ads(is_active, page_target)`;

      await sql`
        CREATE TABLE IF NOT EXISTS sc_ad_events (
          id TEXT PRIMARY KEY,
          ad_id TEXT NOT NULL REFERENCES sc_ads(id) ON DELETE CASCADE,
          customer_id TEXT NOT NULL,
          event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS sc_ad_events_ad_idx ON sc_ad_events(ad_id)`;
      await sql`CREATE INDEX IF NOT EXISTS sc_ad_events_ad_customer_idx ON sc_ad_events(ad_id, customer_id)`;
    })();
  }
  try {
    await ensurePromise;
  } catch (err) {
    ensurePromise = null;
    throw err;
  }
}

function rowToAd(r: Record<string, unknown>): AdRow {
  return {
    id: r.id as string,
    title: r.title as string,
    type: r.type as AdType,
    imageUrl: (r.image_url as string | null) ?? null,
    description: (r.description as string | null) ?? null,
    link: (r.link as string | null) ?? null,
    regionTarget: (r.region_target as string | null) ?? null,
    pageTarget: r.page_target as PageTarget,
    isActive: Boolean(r.is_active),
    maxViewsPerUser:
      r.max_views_per_user === null || r.max_views_per_user === undefined
        ? null
        : Number(r.max_views_per_user),
    popupDelayMs: Number(r.popup_delay_ms ?? 0),
    createdAt: new Date(r.created_at as string).toISOString(),
    updatedAt: new Date(r.updated_at as string).toISOString(),
  };
}

export async function listAllAds(): Promise<AdRow[]> {
  if (!dbAvailable()) return [];
  await ensureAdsTables();
  const sql = getSql();
  const rows = (await sql`
    SELECT id, title, type, image_url, description, link, region_target, page_target,
           is_active, max_views_per_user, popup_delay_ms, created_at, updated_at
    FROM sc_ads
    ORDER BY created_at DESC
  `) as Record<string, unknown>[];
  return rows.map(rowToAd);
}

export async function getAdById(id: string): Promise<AdRow | null> {
  if (!dbAvailable()) return null;
  await ensureAdsTables();
  const sql = getSql();
  const rows = (await sql`
    SELECT id, title, type, image_url, description, link, region_target, page_target,
           is_active, max_views_per_user, popup_delay_ms, created_at, updated_at
    FROM sc_ads WHERE id = ${id} LIMIT 1
  `) as Record<string, unknown>[];
  return rows[0] ? rowToAd(rows[0]) : null;
}

export type AdInput = {
  title: string;
  type: AdType;
  imageUrl?: string | null;
  description?: string | null;
  link?: string | null;
  regionTarget?: string | null;
  pageTarget: PageTarget;
  isActive?: boolean;
  maxViewsPerUser?: number | null;
  popupDelayMs?: number;
};

export async function createAd(input: AdInput): Promise<AdRow> {
  await ensureAdsTables();
  const sql = getSql();
  const id = randomUUID();
  const now = new Date().toISOString();
  await sql`
    INSERT INTO sc_ads (
      id, title, type, image_url, description, link, region_target, page_target,
      is_active, max_views_per_user, popup_delay_ms, created_at, updated_at
    )
    VALUES (
      ${id},
      ${input.title.trim()},
      ${input.type},
      ${input.imageUrl?.trim() || null},
      ${input.description?.trim() || null},
      ${input.link?.trim() || null},
      ${input.regionTarget?.trim() || null},
      ${input.pageTarget},
      ${input.isActive ?? true},
      ${input.maxViewsPerUser === undefined ? 3 : input.maxViewsPerUser},
      ${input.popupDelayMs ?? 0},
      ${now},
      ${now}
    )
  `;
  return (await getAdById(id))!;
}

export async function updateAd(id: string, input: Partial<AdInput>): Promise<AdRow | null> {
  const existing = await getAdById(id);
  if (!existing) return null;
  await ensureAdsTables();
  const sql = getSql();
  const now = new Date().toISOString();
  const title = input.title !== undefined ? input.title.trim() : existing.title;
  const type = input.type ?? existing.type;
  const imageUrl = input.imageUrl !== undefined ? input.imageUrl?.trim() || null : existing.imageUrl;
  const description =
    input.description !== undefined ? input.description?.trim() || null : existing.description;
  const link = input.link !== undefined ? input.link?.trim() || null : existing.link;
  const regionTarget =
    input.regionTarget !== undefined ? input.regionTarget?.trim() || null : existing.regionTarget;
  const pageTarget = input.pageTarget ?? existing.pageTarget;
  const isActive = input.isActive ?? existing.isActive;
  const maxViewsPerUser =
    input.maxViewsPerUser !== undefined ? input.maxViewsPerUser : existing.maxViewsPerUser;
  const popupDelayMs = input.popupDelayMs ?? existing.popupDelayMs;

  await sql`
    UPDATE sc_ads SET
      title = ${title},
      type = ${type},
      image_url = ${imageUrl},
      description = ${description},
      link = ${link},
      region_target = ${regionTarget},
      page_target = ${pageTarget},
      is_active = ${isActive},
      max_views_per_user = ${maxViewsPerUser},
      popup_delay_ms = ${popupDelayMs},
      updated_at = ${now}
    WHERE id = ${id}
  `;
  return getAdById(id);
}

export async function deleteAd(id: string): Promise<boolean> {
  await ensureAdsTables();
  const sql = getSql();
  const rows = (await sql`DELETE FROM sc_ads WHERE id = ${id} RETURNING id`) as { id: string }[];
  return rows.length > 0;
}

function regionMatches(adRegion: string | null, customerRegion: string): boolean {
  if (adRegion == null || String(adRegion).trim() === "") return true;
  return adRegion.trim().toLowerCase() === customerRegion.trim().toLowerCase();
}

export async function getEligibleAdsForCustomer(
  customerId: string,
  customerRegion: string,
  page: PageTarget,
): Promise<AdRow[]> {
  if (!dbAvailable()) return [];
  try {
    await ensureAdsTables();
    const sql = getSql();
    /** One round-trip: ads + per-ad view counts (was N+1 COUNT queries per ad). */
    const rows = (await sql`
    SELECT a.id, a.title, a.type, a.image_url, a.description, a.link, a.region_target, a.page_target,
           a.is_active, a.max_views_per_user, a.popup_delay_ms, a.created_at, a.updated_at,
           COALESCE(v.c, 0)::int AS view_count
    FROM sc_ads a
    LEFT JOIN (
      SELECT ad_id, COUNT(*)::int AS c
      FROM sc_ad_events
      WHERE customer_id = ${customerId} AND event_type = 'view'
      GROUP BY ad_id
    ) v ON v.ad_id = a.id
    WHERE a.is_active = TRUE AND a.page_target = ${page}
  `) as Record<string, unknown>[];

  const eligible: AdRow[] = [];
  for (const r of rows) {
    const views = Number(r.view_count ?? 0);
    const ad = rowToAd(r);
    if (!regionMatches(ad.regionTarget, customerRegion)) continue;

    const max = ad.maxViewsPerUser;
    if (max === 0) continue;
    if (max != null && max > 0 && views >= max) continue;

    eligible.push(ad);
  }
    return eligible;
  } catch {
    return [];
  }
}

export async function recordAdEvent(
  adId: string,
  customerId: string,
  eventType: "view" | "click",
): Promise<void> {
  if (!dbAvailable()) return;
  await ensureAdsTables();
  const sql = getSql();
  const id = randomUUID();
  await sql`
    INSERT INTO sc_ad_events (id, ad_id, customer_id, event_type)
    VALUES (${id}, ${adId}, ${customerId}, ${eventType})
  `;
}

export async function getAnalyticsForAd(adId: string): Promise<{ views: number; clicks: number }> {
  if (!dbAvailable()) return { views: 0, clicks: 0 };
  await ensureAdsTables();
  const sql = getSql();
  const rows = (await sql`
    SELECT
      COUNT(*) FILTER (WHERE event_type = 'view')::int AS views,
      COUNT(*) FILTER (WHERE event_type = 'click')::int AS clicks
    FROM sc_ad_events
    WHERE ad_id = ${adId}
  `) as { views: number; clicks: number }[];
  return {
    views: Number(rows[0]?.views ?? 0),
    clicks: Number(rows[0]?.clicks ?? 0),
  };
}

export async function getAnalyticsAll(): Promise<Map<string, { views: number; clicks: number }>> {
  if (!dbAvailable()) return new Map();
  await ensureAdsTables();
  const sql = getSql();
  const rows = (await sql`
    SELECT ad_id,
      COUNT(*) FILTER (WHERE event_type = 'view')::int AS views,
      COUNT(*) FILTER (WHERE event_type = 'click')::int AS clicks
    FROM sc_ad_events
    GROUP BY ad_id
  `) as { ad_id: string; views: number; clicks: number }[];
  const m = new Map<string, { views: number; clicks: number }>();
  for (const r of rows) {
    m.set(r.ad_id, { views: Number(r.views), clicks: Number(r.clicks) });
  }
  return m;
}

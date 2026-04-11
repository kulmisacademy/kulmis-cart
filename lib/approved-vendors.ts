import { promises as fs } from "fs";
import path from "path";
import { getSql } from "@/lib/db";
import type { NeonSql } from "@/lib/db";

const DATA_FILE = path.join(process.cwd(), "data", "approved-vendors.json");

/** Safe to pass to client components (no credentials). */
export type VendorPublic = Omit<ApprovedVendorRecord, "passwordHash">;

export type ApprovedVendorRecord = {
  id: string;
  submittedAt: string;
  status: "approved";
  storeSlug: string;
  storeName: string;
  storePhone: string;
  whatsAppNumber: string;
  region: string;
  district: string;
  email: string;
  passwordHash: string;
  logoMime?: string;
  logoDataBase64?: string;
  bannerMime?: string;
  bannerDataBase64?: string;
  plan: "free" | "pro" | "premium";
};

function usePostgres(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

let readAllInflight: Promise<ApprovedVendorRecord[]> | null = null;
/** True after legacy JSON → Postgres migration has been attempted (success or skip). */
let pgJsonMigrationAttempted = false;

async function ensureApprovedVendorsTable(sql: NeonSql): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS sc_approved_vendors (
      id TEXT PRIMARY KEY,
      submitted_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved',
      store_slug TEXT NOT NULL UNIQUE,
      store_name TEXT NOT NULL,
      store_phone TEXT NOT NULL,
      whatsapp_number TEXT NOT NULL,
      region TEXT NOT NULL,
      district TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      logo_mime TEXT,
      logo_data_base64 TEXT,
      banner_mime TEXT,
      banner_data_base64 TEXT,
      plan TEXT NOT NULL DEFAULT 'free'
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS sc_approved_vendors_email_lower_idx ON sc_approved_vendors (lower(email))`;
}

function rowToRecord(row: {
  id: string;
  submitted_at: string | Date;
  status: string;
  store_slug: string;
  store_name: string;
  store_phone: string;
  whatsapp_number: string;
  region: string;
  district: string;
  email: string;
  password_hash: string;
  logo_mime: string | null;
  logo_data_base64: string | null;
  banner_mime: string | null;
  banner_data_base64: string | null;
  plan: string;
}): ApprovedVendorRecord {
  const submittedAt =
    row.submitted_at instanceof Date ? row.submitted_at.toISOString() : String(row.submitted_at);
  const plan = row.plan === "pro" || row.plan === "premium" ? row.plan : "free";
  return {
    id: row.id,
    submittedAt,
    status: "approved",
    storeSlug: row.store_slug,
    storeName: row.store_name,
    storePhone: row.store_phone,
    whatsAppNumber: row.whatsapp_number,
    region: row.region,
    district: row.district,
    email: row.email,
    passwordHash: row.password_hash,
    logoMime: row.logo_mime ?? undefined,
    logoDataBase64: row.logo_data_base64 ?? undefined,
    bannerMime: row.banner_mime ?? undefined,
    bannerDataBase64: row.banner_data_base64 ?? undefined,
    plan,
  };
}

async function insertVendorRowPg(sql: NeonSql, record: ApprovedVendorRecord): Promise<void> {
  await sql`
    INSERT INTO sc_approved_vendors (
      id,
      submitted_at,
      status,
      store_slug,
      store_name,
      store_phone,
      whatsapp_number,
      region,
      district,
      email,
      password_hash,
      logo_mime,
      logo_data_base64,
      banner_mime,
      banner_data_base64,
      plan
    ) VALUES (
      ${record.id},
      ${record.submittedAt},
      ${record.status},
      ${record.storeSlug},
      ${record.storeName},
      ${record.storePhone},
      ${record.whatsAppNumber},
      ${record.region},
      ${record.district},
      ${record.email.toLowerCase()},
      ${record.passwordHash},
      ${record.logoMime ?? null},
      ${record.logoDataBase64 ?? null},
      ${record.bannerMime ?? null},
      ${record.bannerDataBase64 ?? null},
      ${record.plan}
    )
  `;
}

/** One-time: copy legacy JSON file into Postgres when the table is empty (e.g. after enabling DATABASE_URL on prod). */
async function migrateJsonToPostgresIfNeeded(sql: NeonSql): Promise<void> {
  if (pgJsonMigrationAttempted) return;
  try {
    const cnt = (await sql`
      SELECT count(*)::int AS c FROM sc_approved_vendors
    `) as { c: number }[];
    if ((cnt[0]?.c ?? 0) > 0) return;

    let fileRows: ApprovedVendorRecord[] = [];
    try {
      const raw = await fs.readFile(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) fileRows = parsed as ApprovedVendorRecord[];
    } catch {
      return;
    }
    for (const r of fileRows) {
      try {
        await insertVendorRowPg(sql, r);
      } catch (e: unknown) {
        const code = (e as { code?: string })?.code;
        if (code === "23505") continue;
        console.error("approved-vendors: migrate legacy JSON row failed", r.id, e);
      }
    }
  } catch (e) {
    console.error("approved-vendors: migration step failed", e);
  } finally {
    pgJsonMigrationAttempted = true;
  }
}

async function readAllFromPostgres(): Promise<ApprovedVendorRecord[]> {
  const sql = getSql();
  await ensureApprovedVendorsTable(sql);
  await migrateJsonToPostgresIfNeeded(sql);
  const rows = (await sql`
    SELECT
      id,
      submitted_at,
      status,
      store_slug,
      store_name,
      store_phone,
      whatsapp_number,
      region,
      district,
      email,
      password_hash,
      logo_mime,
      logo_data_base64,
      banner_mime,
      banner_data_base64,
      plan
    FROM sc_approved_vendors
    ORDER BY submitted_at ASC
  `) as Parameters<typeof rowToRecord>[0][];
  return rows.map((row) => rowToRecord(row));
}

async function readAllFromFile(): Promise<ApprovedVendorRecord[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function readAll(): Promise<ApprovedVendorRecord[]> {
  if (readAllInflight) return readAllInflight;
  readAllInflight = (async () => {
    if (usePostgres()) {
      return readAllFromPostgres();
    }
    return readAllFromFile();
  })();
  try {
    return await readAllInflight;
  } finally {
    readAllInflight = null;
  }
}

export async function findApprovedVendorByEmail(
  email: string,
): Promise<ApprovedVendorRecord | undefined> {
  const e = email.trim().toLowerCase();
  const all = await readAll();
  return all.find((r) => r.email.toLowerCase() === e);
}

export async function findApprovedVendorById(id: string): Promise<ApprovedVendorRecord | undefined> {
  const all = await readAll();
  return all.find((r) => r.id === id);
}

export async function findApprovedVendorByStoreSlug(
  storeSlug: string,
): Promise<ApprovedVendorRecord | undefined> {
  const s = storeSlug.trim();
  if (!s) return undefined;
  const all = await readAll();
  return all.find((r) => r.storeSlug === s);
}

/** All approved vendors — source of truth for public store listings (with dashboard data). */
export async function listApprovedVendors(): Promise<ApprovedVendorRecord[]> {
  return readAll();
}

export async function getApprovedStoreSlugs(): Promise<string[]> {
  const all = await readAll();
  return all.map((r) => r.storeSlug);
}

export async function appendApprovedVendor(record: ApprovedVendorRecord): Promise<void> {
  if (usePostgres()) {
    const sql = getSql();
    await ensureApprovedVendorsTable(sql);
    await migrateJsonToPostgresIfNeeded(sql);
    const dup = await findApprovedVendorByEmail(record.email);
    if (dup) {
      throw new Error("Email already approved");
    }
    try {
      await insertVendorRowPg(sql, record);
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === "23505") {
        throw new Error("Email already approved");
      }
      throw e;
    }
    return;
  }

  const all = await readAll();
  if (all.some((r) => r.email.toLowerCase() === record.email.toLowerCase())) {
    throw new Error("Email already approved");
  }
  all.push(record);
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(all, null, 2), "utf-8");
}

export async function updateApprovedVendorPasswordHash(vendorId: string, passwordHash: string): Promise<boolean> {
  if (usePostgres()) {
    const sql = getSql();
    await ensureApprovedVendorsTable(sql);
    const rows = (await sql`
      UPDATE sc_approved_vendors
      SET password_hash = ${passwordHash}
      WHERE id = ${vendorId}
      RETURNING id
    `) as { id: string }[];
    return rows.length > 0;
  }

  const all = await readAll();
  const idx = all.findIndex((r) => r.id === vendorId);
  if (idx < 0) return false;
  const cur = all[idx]!;
  all[idx] = { ...cur, passwordHash };
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(all, null, 2), "utf-8");
  return true;
}

/** Keep JSON registry aligned with dashboard storefront fields (name, contacts, media, location). */
export async function patchApprovedVendorStorefrontById(
  vendorId: string,
  patch: {
    storeName: string;
    storePhone: string;
    whatsAppNumber: string;
    region: string;
    district: string;
    logoMime?: string;
    logoDataBase64?: string;
    bannerMime?: string;
    bannerDataBase64?: string;
  },
): Promise<void> {
  const cur = await findApprovedVendorById(vendorId);
  if (!cur) {
    throw new Error("Vendor not found");
  }
  const next: ApprovedVendorRecord = {
    ...cur,
    storeName: patch.storeName.trim() || cur.storeName,
    storePhone: patch.storePhone.trim() || cur.storePhone,
    whatsAppNumber: patch.whatsAppNumber.trim() || cur.whatsAppNumber,
    region: patch.region.trim() || cur.region,
    district: patch.district.trim() || cur.district,
  };
  if (patch.logoMime && patch.logoDataBase64) {
    next.logoMime = patch.logoMime;
    next.logoDataBase64 = patch.logoDataBase64;
  }
  if (patch.bannerMime && patch.bannerDataBase64) {
    next.bannerMime = patch.bannerMime;
    next.bannerDataBase64 = patch.bannerDataBase64;
  }

  if (usePostgres()) {
    const sql = getSql();
    await ensureApprovedVendorsTable(sql);
    await sql`
      UPDATE sc_approved_vendors
      SET
        store_name = ${next.storeName},
        store_phone = ${next.storePhone},
        whatsapp_number = ${next.whatsAppNumber},
        region = ${next.region},
        district = ${next.district},
        logo_mime = ${next.logoMime ?? null},
        logo_data_base64 = ${next.logoDataBase64 ?? null},
        banner_mime = ${next.bannerMime ?? null},
        banner_data_base64 = ${next.bannerDataBase64 ?? null}
      WHERE id = ${vendorId}
    `;
    return;
  }

  const all = await readAll();
  const idx = all.findIndex((r) => r.id === vendorId);
  if (idx < 0) {
    throw new Error("Vendor not found");
  }
  all[idx] = next;
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(all, null, 2), "utf-8");
}

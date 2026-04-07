import { promises as fs } from "fs";
import path from "path";

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

let readAllInflight: Promise<ApprovedVendorRecord[]> | null = null;

async function readAll(): Promise<ApprovedVendorRecord[]> {
  if (readAllInflight) return readAllInflight;
  readAllInflight = (async () => {
    try {
      const raw = await fs.readFile(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
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
  const all = await readAll();
  if (all.some((r) => r.email.toLowerCase() === record.email.toLowerCase())) {
    throw new Error("Email already approved");
  }
  all.push(record);
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(all, null, 2), "utf-8");
}

export async function updateApprovedVendorPasswordHash(vendorId: string, passwordHash: string): Promise<boolean> {
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
  const all = await readAll();
  const idx = all.findIndex((r) => r.id === vendorId);
  if (idx < 0) {
    throw new Error("Vendor not found");
  }
  const cur = all[idx]!;
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
  all[idx] = next;
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(all, null, 2), "utf-8");
}

import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "pending-vendors.json");

export type PendingVendorRecord = {
  id: string;
  submittedAt: string;
  status: "pending";
  storeName: string;
  storePhone: string;
  whatsAppNumber: string;
  region: string;
  district: string;
  email: string;
  passwordHash: string;
  logoMime: string;
  logoDataBase64: string;
  /** Optional wide banner for store header (JPG/PNG). */
  bannerMime?: string;
  bannerDataBase64?: string;
};

async function readAll(): Promise<PendingVendorRecord[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getPendingVendors(): Promise<PendingVendorRecord[]> {
  return readAll();
}

export async function removePendingVendorById(id: string): Promise<void> {
  const all = await readAll();
  const next = all.filter((r) => r.id !== id);
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(next, null, 2), "utf-8");
}

/** Remove any legacy pending row for this email (instant registration replaces it). */
export async function removePendingVendorByEmail(email: string): Promise<void> {
  const e = email.trim().toLowerCase();
  const all = await readAll();
  const next = all.filter((r) => r.email.toLowerCase() !== e);
  if (next.length === all.length) return;
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(next, null, 2), "utf-8");
}

export async function isEmailTaken(email: string): Promise<boolean> {
  const e = email.trim().toLowerCase();
  const all = await readAll();
  return all.some((r) => r.email.toLowerCase() === e);
}

export async function savePendingVendor(
  data: Omit<PendingVendorRecord, "id" | "submittedAt" | "status">,
): Promise<PendingVendorRecord> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const all = await readAll();
  const record: PendingVendorRecord = {
    id: randomUUID(),
    submittedAt: new Date().toISOString(),
    status: "pending",
    ...data,
  };
  all.push(record);
  await fs.writeFile(DATA_FILE, JSON.stringify(all, null, 2), "utf-8");
  return record;
}

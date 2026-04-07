import { randomUUID } from "crypto";
import type { ApprovedVendorRecord } from "@/lib/approved-vendors";
import {
  appendApprovedVendor,
  findApprovedVendorByEmail,
  getApprovedStoreSlugs,
} from "@/lib/approved-vendors";
import { ensureStoreSubscriptionRow } from "@/lib/platform-db";
import type { PendingVendorRecord } from "@/lib/pending-vendors";
import { getPendingVendors, removePendingVendorByEmail, removePendingVendorById } from "@/lib/pending-vendors";

function slugify(input: string): string {
  const s = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return s || "store";
}

function uniqueStoreSlug(storeName: string, existing: Set<string>): string {
  const base = slugify(storeName);
  let candidate = base;
  let n = 0;
  while (existing.has(candidate)) {
    n += 1;
    candidate = `${base}-${randomUUID().slice(0, 6)}`;
    if (n > 20) candidate = `store-${randomUUID().slice(0, 8)}`;
  }
  existing.add(candidate);
  return candidate;
}

export async function approvePendingVendor(pendingId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const pendingList = await getPendingVendors();
  const pending = pendingList.find((p) => p.id === pendingId);
  if (!pending) {
    return { ok: false, error: "Pending vendor not found." };
  }

  const dup = await findApprovedVendorByEmail(pending.email);
  if (dup) {
    return { ok: false, error: "This email is already approved." };
  }

  const slugs = await getApprovedStoreSlugs();
  const slugSet = new Set(slugs);
  const storeSlug = uniqueStoreSlug(pending.storeName, slugSet);

  const approved: ApprovedVendorRecord = {
    id: randomUUID(),
    submittedAt: pending.submittedAt,
    status: "approved",
    storeSlug,
    storeName: pending.storeName,
    storePhone: pending.storePhone,
    whatsAppNumber: pending.whatsAppNumber,
    region: pending.region,
    district: pending.district,
    email: pending.email,
    passwordHash: pending.passwordHash,
    logoMime: pending.logoMime,
    logoDataBase64: pending.logoDataBase64,
    bannerMime: pending.bannerMime,
    bannerDataBase64: pending.bannerDataBase64,
    plan: "free",
  };

  try {
    await appendApprovedVendor(approved);
  } catch {
    return { ok: false, error: "Could not save approved vendor (duplicate email?)." };
  }
  await ensureStoreSubscriptionRow(approved.storeSlug);
  await removePendingVendorById(pendingId);
  return { ok: true };
}

export async function getPendingForAdmin(): Promise<PendingVendorRecord[]> {
  return getPendingVendors();
}

/**
 * PRD: vendors get instant dashboard access — no admin approval step.
 * Writes directly to approved vendors (free plan).
 */
export async function registerVendorInstant(
  data: Omit<PendingVendorRecord, "id" | "submittedAt" | "status">,
): Promise<{ ok: true; storeSlug: string } | { ok: false; error: string }> {
  const email = data.email.trim().toLowerCase();
  if (await findApprovedVendorByEmail(email)) {
    return { ok: false, error: "This email is already registered." };
  }
  await removePendingVendorByEmail(email);

  const slugs = await getApprovedStoreSlugs();
  const slugSet = new Set(slugs);
  const storeSlug = uniqueStoreSlug(data.storeName, slugSet);

  const approved: ApprovedVendorRecord = {
    id: randomUUID(),
    submittedAt: new Date().toISOString(),
    status: "approved",
    storeSlug,
    storeName: data.storeName,
    storePhone: data.storePhone,
    whatsAppNumber: data.whatsAppNumber,
    region: data.region,
    district: data.district,
    email,
    passwordHash: data.passwordHash,
    logoMime: data.logoMime,
    logoDataBase64: data.logoDataBase64,
    bannerMime: data.bannerMime,
    bannerDataBase64: data.bannerDataBase64,
    plan: "free",
  };

  try {
    await appendApprovedVendor(approved);
  } catch {
    return { ok: false, error: "Could not complete registration." };
  }
  await ensureStoreSubscriptionRow(approved.storeSlug);
  return { ok: true, storeSlug };
}

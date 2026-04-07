import "server-only";
import { randomUUID } from "crypto";
import { getSql } from "@/lib/db";

let ensurePromise: Promise<void> | null = null;

export async function ensurePasswordResetTable(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const sql = getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS sc_password_resets (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('customer', 'vendor')),
          customer_id TEXT,
          vendor_id TEXT,
          otp_hash TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          verified BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS sc_password_resets_email_role_idx ON sc_password_resets(email, role)`;
      await sql`ALTER TABLE sc_password_resets ADD COLUMN IF NOT EXISTS customer_id TEXT`;
      await sql`ALTER TABLE sc_password_resets ADD COLUMN IF NOT EXISTS vendor_id TEXT`;
    })();
  }
  try {
    await ensurePromise;
  } catch (e) {
    ensurePromise = null;
    throw e;
  }
}

export type PasswordResetRow = {
  id: string;
  email: string;
  role: "customer" | "vendor";
  customer_id: string | null;
  vendor_id: string | null;
  otp_hash: string;
  expires_at: Date | string;
  verified: boolean;
};

const OTP_TTL_MS = 10 * 60 * 1000;

export async function createPasswordResetRequest(input: {
  emailNorm: string;
  role: "customer" | "vendor";
  customerId: string | null;
  vendorId: string | null;
  otpHash: string;
}): Promise<string> {
  await ensurePasswordResetTable();
  const sql = getSql();
  await sql`
    DELETE FROM sc_password_resets
    WHERE lower(email) = lower(${input.emailNorm})
      AND role = ${input.role}
      AND verified = FALSE
  `;
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await sql`
    INSERT INTO sc_password_resets (
      id, email, role, customer_id, vendor_id, otp_hash, expires_at, verified
    )
    VALUES (
      ${id},
      ${input.emailNorm},
      ${input.role},
      ${input.customerId},
      ${input.vendorId},
      ${input.otpHash},
      ${expiresAt.toISOString()},
      FALSE
    )
  `;
  return id;
}

export async function findPendingResetForOtp(input: {
  emailNorm: string;
  role: "customer" | "vendor";
}): Promise<PasswordResetRow | null> {
  await ensurePasswordResetTable();
  const sql = getSql();
  const rows = (await sql`
    SELECT id, email, role, customer_id, vendor_id, otp_hash, expires_at, verified
    FROM sc_password_resets
    WHERE lower(email) = lower(${input.emailNorm})
      AND role = ${input.role}
      AND verified = FALSE
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1
  `) as PasswordResetRow[];
  return rows[0] ?? null;
}

export async function markPasswordResetVerified(resetId: string): Promise<void> {
  await ensurePasswordResetTable();
  const sql = getSql();
  await sql`
    UPDATE sc_password_resets SET verified = TRUE WHERE id = ${resetId}
  `;
}

export async function getVerifiedPasswordResetById(resetId: string): Promise<PasswordResetRow | null> {
  await ensurePasswordResetTable();
  const sql = getSql();
  const rows = (await sql`
    SELECT id, email, role, customer_id, vendor_id, otp_hash, expires_at, verified
    FROM sc_password_resets
    WHERE id = ${resetId}
      AND verified = TRUE
    LIMIT 1
  `) as PasswordResetRow[];
  return rows[0] ?? null;
}

export async function deletePasswordResetById(resetId: string): Promise<void> {
  await ensurePasswordResetTable();
  const sql = getSql();
  await sql`DELETE FROM sc_password_resets WHERE id = ${resetId}`;
}

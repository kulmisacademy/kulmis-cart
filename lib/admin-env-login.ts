import { createHash, timingSafeEqual } from "crypto";

/** Constant-time string equality via SHA-256 (avoids length leaks on raw compares). */
function sha256Equal(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

const ENV_ADMIN_ID = "env-admin";

export function getEnvAdminCredentials(): { email: string; password: string } | null {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || password === undefined || password === "") return null;
  return { email, password };
}

export function matchesEnvAdmin(inputEmail: string, inputPassword: string): boolean {
  const creds = getEnvAdminCredentials();
  if (!creds) return false;
  const emailOk = sha256Equal(inputEmail.trim().toLowerCase(), creds.email.toLowerCase());
  const passOk = sha256Equal(inputPassword, creds.password);
  return emailOk && passOk;
}

export function envAdminSessionIdentity(): { aid: string; email: string } {
  const creds = getEnvAdminCredentials();
  const email = creds?.email.toLowerCase() ?? "admin@localhost";
  return { aid: ENV_ADMIN_ID, email };
}

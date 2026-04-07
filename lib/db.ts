import "server-only";
import { neon } from "@neondatabase/serverless";

let sqlSingleton: ReturnType<typeof neon> | null = null;

/**
 * Neon serverless SQL client (use only in Server Components, Route Handlers, Server Actions).
 * Reuse one `neon()` per process — recreating it on every query adds latency with serverless DB.
 * Set `DATABASE_URL` in `.env.local` (see `.env.example`). Prefer Neon pooler URL if available.
 */
export function getSql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is not configured");
  }
  if (!sqlSingleton) {
    sqlSingleton = neon(url);
  }
  return sqlSingleton;
}

export type NeonSql = ReturnType<typeof getSql>;

/** Avoid repeated catalog hits in one Node process once we know a table is there. */
const pgTableExistsTrueCache = new Set<string>();

/**
 * True if `public.<name>` exists — fast `pg_catalog` probe (cheaper than `information_schema.tables`).
 * Positive results are cached for the lifetime of the process.
 */
export async function pgTableExists(tableName: string): Promise<boolean> {
  if (!/^[a-z][a-z0-9_]*$/i.test(tableName)) {
    throw new Error("Invalid table name");
  }
  if (pgTableExistsTrueCache.has(tableName)) {
    return true;
  }
  const sql = getSql();
  const rows = (await sql`
    SELECT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class c
      INNER JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = ${tableName}
        AND c.relkind IN ('r', 'p')
    ) AS ok
  `) as { ok: boolean }[];
  const ok = Boolean(rows[0]?.ok);
  if (ok) pgTableExistsTrueCache.add(tableName);
  return ok;
}

/** Neon/fetch could not reach Postgres — retry may work; do not treat as 403 Forbidden. */
export function isDatabaseConnectivityError(e: unknown, depth = 0): boolean {
  if (!e || typeof e !== "object" || depth > 6) return false;
  const name = "name" in e ? String((e as { name?: string }).name) : "";
  if (name === "NeonDbError") return true;
  const msg = "message" in e ? String((e as { message?: unknown }).message) : "";
  if (/fetch failed|Error connecting to database|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN/i.test(msg)) return true;
  const code = "code" in e ? String((e as { code?: string }).code) : "";
  if (code === "EACCES" || code === "ECONNREFUSED" || code === "ENOTFOUND") return true;
  const cause = (e as { cause?: unknown }).cause;
  if (cause && isDatabaseConnectivityError(cause, depth + 1)) return true;
  const sourceError = (e as { sourceError?: unknown }).sourceError;
  if (sourceError && isDatabaseConnectivityError(sourceError, depth + 1)) return true;
  const errors = (e as { errors?: unknown }).errors;
  if (Array.isArray(errors)) {
    for (const x of errors) {
      if (x && typeof x === "object" && "code" in x) {
        const c = String((x as { code?: string }).code);
        if (c === "EACCES" || c === "ECONNREFUSED" || c === "ENOTFOUND") return true;
      }
    }
  }
  return false;
}

import "server-only";
import { randomUUID } from "crypto";
import { ensureCustomerTables } from "@/lib/customer/db";
import { getSql } from "@/lib/db";
import { ensureAppNotificationTables } from "@/lib/notifications/ensure-tables";
import type { AppNotificationAudience, InAppNotificationRow } from "@/lib/notifications/types";

export async function listInAppNotifications(
  audience: AppNotificationAudience,
  recipientKey: string,
  limit = 30,
): Promise<InAppNotificationRow[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];
  await ensureCustomerTables();
  const sql = getSql();
  await ensureAppNotificationTables(sql);
  const rows = (await sql`
    SELECT id, type, title, message, link, is_read, created_at
    FROM sc_app_notifications
    WHERE audience = ${audience} AND recipient_key = ${recipientKey}
    ORDER BY created_at DESC
    LIMIT ${Math.min(100, Math.max(1, limit))}
  `) as {
    id: string;
    type: string;
    title: string;
    message: string;
    link: string | null;
    is_read: boolean;
    created_at: Date | string;
  }[];
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    message: r.message,
    link: r.link,
    isRead: r.is_read,
    createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
  }));
}

export async function countUnreadNotifications(
  audience: AppNotificationAudience,
  recipientKey: string,
): Promise<number> {
  if (!process.env.DATABASE_URL?.trim()) return 0;
  await ensureCustomerTables();
  const sql = getSql();
  await ensureAppNotificationTables(sql);
  const rows = (await sql`
    SELECT COUNT(*)::int AS c FROM sc_app_notifications
    WHERE audience = ${audience} AND recipient_key = ${recipientKey} AND is_read = false
  `) as { c: number }[];
  return rows[0]?.c ?? 0;
}

export async function markNotificationRead(
  audience: AppNotificationAudience,
  recipientKey: string,
  notificationId: string,
): Promise<boolean> {
  if (!process.env.DATABASE_URL?.trim()) return false;
  await ensureCustomerTables();
  const sql = getSql();
  await ensureAppNotificationTables(sql);
  const rows = (await sql`
    UPDATE sc_app_notifications SET is_read = true
    WHERE id = ${notificationId} AND audience = ${audience} AND recipient_key = ${recipientKey}
    RETURNING id
  `) as { id: string }[];
  return rows.length > 0;
}

export async function markAllNotificationsRead(
  audience: AppNotificationAudience,
  recipientKey: string,
): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  await ensureCustomerTables();
  const sql = getSql();
  await ensureAppNotificationTables(sql);
  await sql`
    UPDATE sc_app_notifications SET is_read = true
    WHERE audience = ${audience} AND recipient_key = ${recipientKey} AND is_read = false
  `;
}

export async function listFcmTokensForRecipient(
  audience: AppNotificationAudience,
  recipientKey: string,
): Promise<string[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];
  await ensureCustomerTables();
  const sql = getSql();
  await ensureAppNotificationTables(sql);
  const rows = (await sql`
    SELECT token FROM sc_fcm_tokens
    WHERE audience = ${audience} AND recipient_key = ${recipientKey}
  `) as { token: string }[];
  return rows.map((r) => r.token);
}

export async function upsertFcmToken(
  audience: AppNotificationAudience,
  recipientKey: string,
  token: string,
): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  await ensureCustomerTables();
  const sql = getSql();
  await ensureAppNotificationTables(sql);
  const id = randomUUID();
  await sql`
    INSERT INTO sc_fcm_tokens (id, audience, recipient_key, token, created_at, updated_at)
    VALUES (${id}, ${audience}, ${recipientKey}, ${token}, now(), now())
    ON CONFLICT (audience, recipient_key, token) DO UPDATE SET updated_at = now()
  `;
}

import type { NeonSql } from "@/lib/db";

export async function ensureAppNotificationTables(sql: NeonSql): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS sc_app_notifications (
      id TEXT PRIMARY KEY,
      audience TEXT NOT NULL,
      recipient_key TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS sc_app_notifications_recipient_idx ON sc_app_notifications (audience, recipient_key, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS sc_app_notifications_unread_idx ON sc_app_notifications (audience, recipient_key, is_read)`;

  await sql`
    CREATE TABLE IF NOT EXISTS sc_fcm_tokens (
      id TEXT PRIMARY KEY,
      audience TEXT NOT NULL,
      recipient_key TEXT NOT NULL,
      token TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (audience, recipient_key, token)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS sc_fcm_tokens_recipient_idx ON sc_fcm_tokens (audience, recipient_key)`;
}

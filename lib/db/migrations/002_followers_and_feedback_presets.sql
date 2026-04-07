-- Applied via ensureCustomerTables() at runtime; keep in sync for manual DBA use.

CREATE TABLE IF NOT EXISTS sc_store_followers (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES sc_customers(id) ON DELETE CASCADE,
  store_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, store_slug)
);

CREATE INDEX IF NOT EXISTS sc_store_followers_slug_idx ON sc_store_followers(store_slug);

ALTER TABLE sc_store_feedback ADD COLUMN IF NOT EXISTS preset_option TEXT;

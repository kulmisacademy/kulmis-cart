-- SOMCART customer system (also auto-created by ensureCustomerTables on first API use)
-- Run manually in Neon SQL Editor if you prefer explicit migrations.

CREATE TABLE IF NOT EXISTS sc_customers (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  region TEXT NOT NULL,
  district TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sc_customer_orders (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES sc_customers(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  store_slug TEXT NOT NULL,
  store_name TEXT NOT NULL,
  product_title TEXT NOT NULL,
  product_url TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_region TEXT NOT NULL,
  customer_district TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sc_customer_orders_customer_idx ON sc_customer_orders(customer_id);
CREATE INDEX IF NOT EXISTS sc_customer_orders_store_slug_idx ON sc_customer_orders(store_slug);

CREATE TABLE IF NOT EXISTS sc_store_feedback (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES sc_customers(id) ON DELETE CASCADE,
  store_slug TEXT NOT NULL,
  order_id TEXT NOT NULL REFERENCES sc_customer_orders(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

CREATE INDEX IF NOT EXISTS sc_store_feedback_store_slug_idx ON sc_store_feedback(store_slug);

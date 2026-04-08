import "server-only";
import { randomUUID } from "crypto";
import { findApprovedVendorByEmail } from "@/lib/approved-vendors";
import { getSql, pgTableExists } from "@/lib/db";
import { ensureAppNotificationTables } from "@/lib/notifications/ensure-tables";

let ensurePromise: Promise<void> | null = null;

type Sql = ReturnType<typeof getSql>;

/**
 * Chat DDL + backfill — runs whenever sc_customers exists (including existing Neon DBs where the
 * main bootstrap short-circuited and never created chat tables).
 * Aligns sc_conversations with sc_chat_threads and sc_chat_messages.conversation_id (PRD: every message belongs to a conversation).
 */
async function ensureChatTables(sql: Sql): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS sc_chat_threads (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES sc_customers(id) ON DELETE CASCADE,
      store_slug TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_message TEXT,
      UNIQUE (customer_id, store_slug)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS sc_chat_threads_store_slug_idx ON sc_chat_threads(store_slug)`;

  await sql`
    CREATE TABLE IF NOT EXISTS sc_conversations (
      id TEXT PRIMARY KEY,
      store_slug TEXT NOT NULL,
      customer_id TEXT NOT NULL REFERENCES sc_customers(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (store_slug, customer_id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS sc_conversations_store_idx ON sc_conversations(store_slug)`;

  await sql`
    CREATE TABLE IF NOT EXISTS sc_chat_messages (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES sc_chat_threads(id) ON DELETE CASCADE,
      sender_type TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      message_type TEXT NOT NULL,
      message_text TEXT,
      product_json TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'sc_chat_messages' AND column_name = 'threadId'
      ) THEN
        ALTER TABLE sc_chat_messages RENAME COLUMN "threadId" TO thread_id;
      END IF;
    END $$;
  `;
  await sql`ALTER TABLE sc_chat_messages ADD COLUMN IF NOT EXISTS thread_id TEXT`;
  await sql`ALTER TABLE sc_chat_messages ADD COLUMN IF NOT EXISTS sender_type TEXT`;
  await sql`ALTER TABLE sc_chat_messages ADD COLUMN IF NOT EXISTS sender_id TEXT`;
  await sql`ALTER TABLE sc_chat_messages ADD COLUMN IF NOT EXISTS message_type TEXT`;
  await sql`ALTER TABLE sc_chat_messages ADD COLUMN IF NOT EXISTS message_text TEXT`;
  await sql`ALTER TABLE sc_chat_messages ADD COLUMN IF NOT EXISTS product_json TEXT`;
  await sql`ALTER TABLE sc_chat_messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now()`;
  await sql`ALTER TABLE sc_chat_messages ADD COLUMN IF NOT EXISTS conversation_id TEXT`;
  await sql`ALTER TABLE sc_chat_messages ADD COLUMN IF NOT EXISTS sender_role TEXT`;
  await sql`ALTER TABLE sc_chat_messages ADD COLUMN IF NOT EXISTS body TEXT`;

  await sql`CREATE INDEX IF NOT EXISTS sc_chat_messages_thread_idx ON sc_chat_messages(thread_id, created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS sc_chat_messages_conv_idx ON sc_chat_messages(conversation_id, created_at)`;

  await sql`
    INSERT INTO sc_conversations (id, store_slug, customer_id, created_at)
    SELECT t.id, t.store_slug, t.customer_id, t.created_at
    FROM sc_chat_threads t
    WHERE NOT EXISTS (
      SELECT 1 FROM sc_conversations c
      WHERE c.store_slug = t.store_slug AND c.customer_id = t.customer_id
    )
  `;

  await sql`
    UPDATE sc_chat_messages m
    SET
      conversation_id = COALESCE(m.conversation_id, m.thread_id),
      sender_role = COALESCE(m.sender_role, m.sender_type),
      body = COALESCE(
        NULLIF(TRIM(COALESCE(m.body, '')), ''),
        NULLIF(TRIM(COALESCE(m.message_text, '')), ''),
        CASE
          WHEN m.product_json IS NOT NULL AND length(trim(COALESCE(m.product_json, ''))) > 0 THEN '[product]'
          ELSE ''
        END
      )
    WHERE m.thread_id IS NOT NULL
      AND (
        m.conversation_id IS NULL
        OR m.sender_role IS NULL
        OR m.body IS NULL
        OR trim(COALESCE(m.body, '')) = ''
      )
  `;
}

/** Canonical conversation row for a thread (sc_conversations.id); may differ from thread id only on legacy DBs. */
async function resolveConversationIdForThread(sql: Sql, threadId: string): Promise<string> {
  const rows = (await sql`
    SELECT id, store_slug, customer_id FROM sc_chat_threads WHERE id = ${threadId} LIMIT 1
  `) as { id: string; store_slug: string; customer_id: string }[];
  const t = rows[0];
  if (!t) {
    throw new Error("Chat thread not found");
  }
  await sql`
    INSERT INTO sc_conversations (id, store_slug, customer_id, created_at)
    VALUES (${t.id}, ${t.store_slug}, ${t.customer_id}, now())
    ON CONFLICT (store_slug, customer_id) DO NOTHING
  `;
  const c = (await sql`
    SELECT id FROM sc_conversations
    WHERE store_slug = ${t.store_slug} AND customer_id = ${t.customer_id}
    LIMIT 1
  `) as { id: string }[];
  return c[0]?.id ?? t.id;
}

export async function ensureCustomerTables(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const sql = getSql();
      // If the probe fails (e.g. Neon "fetch failed", EACCES), rethrow — do not run DDL; it will fail the same way.
      if (!(await pgTableExists("sc_customers"))) {
        await sql`
        CREATE TABLE IF NOT EXISTS sc_customers (
          id TEXT PRIMARY KEY,
          full_name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          phone TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          region TEXT NOT NULL,
          district TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`
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
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS sc_store_feedback (
          id TEXT PRIMARY KEY,
          customer_id TEXT NOT NULL REFERENCES sc_customers(id) ON DELETE CASCADE,
          store_slug TEXT NOT NULL,
          order_id TEXT NOT NULL REFERENCES sc_customer_orders(id) ON DELETE CASCADE,
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          comment TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE(order_id)
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS sc_customer_orders_customer_idx ON sc_customer_orders(customer_id)`;
      await sql`CREATE INDEX IF NOT EXISTS sc_customer_orders_store_slug_idx ON sc_customer_orders(store_slug)`;
      await sql`CREATE INDEX IF NOT EXISTS sc_customer_orders_customer_created_idx ON sc_customer_orders(customer_id, created_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS sc_customer_orders_store_created_idx ON sc_customer_orders(store_slug, created_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS sc_customer_orders_customer_checkout_idx ON sc_customer_orders(customer_id, checkout_id)`;
      await sql`CREATE INDEX IF NOT EXISTS sc_store_feedback_store_slug_idx ON sc_store_feedback(store_slug)`;

      await sql`
        CREATE TABLE IF NOT EXISTS sc_checkouts (
          id TEXT PRIMARY KEY,
          customer_id TEXT NOT NULL REFERENCES sc_customers(id) ON DELETE CASCADE,
          full_name TEXT NOT NULL,
          phone TEXT NOT NULL,
          region TEXT NOT NULL,
          district TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS sc_checkouts_customer_idx ON sc_checkouts(customer_id)`;
      await sql`CREATE INDEX IF NOT EXISTS sc_checkouts_phone_idx ON sc_checkouts(phone)`;

      await sql`ALTER TABLE sc_customer_orders ADD COLUMN IF NOT EXISTS checkout_id TEXT`;
      await sql`ALTER TABLE sc_customer_orders ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1`;
      await sql`ALTER TABLE sc_customer_orders ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12, 2)`;

      await sql`
        CREATE TABLE IF NOT EXISTS sc_store_followers (
          id TEXT PRIMARY KEY,
          customer_id TEXT NOT NULL REFERENCES sc_customers(id) ON DELETE CASCADE,
          store_slug TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (customer_id, store_slug)
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS sc_store_followers_slug_idx ON sc_store_followers(store_slug)`;
      await sql`ALTER TABLE sc_store_feedback ADD COLUMN IF NOT EXISTS preset_option TEXT`;

      await sql`
        CREATE TABLE IF NOT EXISTS sc_vendor_invoices (
          id TEXT PRIMARY KEY,
          invoice_no TEXT NOT NULL UNIQUE,
          store_slug TEXT NOT NULL,
          order_line_id TEXT NOT NULL REFERENCES sc_customer_orders(id) ON DELETE CASCADE,
          customer_name TEXT NOT NULL,
          customer_phone TEXT NOT NULL,
          store_name TEXT NOT NULL,
          total NUMERIC(12, 2) NOT NULL,
          invoice_date DATE NOT NULL,
          payload_json TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS sc_vendor_invoices_store_slug_idx ON sc_vendor_invoices(store_slug)`;

      await sql`
        CREATE TABLE IF NOT EXISTS sc_store_views (
          store_slug TEXT PRIMARY KEY,
          views BIGINT NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      }

      if (await pgTableExists("sc_customers")) {
        await ensureChatTables(sql);
        await ensureAppNotificationTables(sql);
      }
    })();
  }
  try {
    await ensurePromise;
  } catch (err) {
    ensurePromise = null;
    throw err;
  }
}

export type CustomerPublic = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  region: string;
  district: string;
};

export type CustomerOrderListItem = {
  id: string;
  checkoutId: string | null;
  quantity: number;
  productId: string;
  storeSlug: string;
  storeName: string;
  productTitle: string;
  productUrl: string;
  status: "pending" | "accepted" | "completed";
  createdAt: string;
  hasFeedback: boolean;
  unitPrice: number | null;
};

type CustomerRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  password_hash: string;
  region: string;
  district: string;
};

function mapPublic(row: Omit<CustomerRow, "password_hash">): CustomerPublic {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    region: row.region,
    district: row.district,
  };
}

export async function insertCustomer(input: {
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  region: string;
  district: string;
}): Promise<CustomerPublic> {
  await ensureCustomerTables();
  const sql = getSql();
  const id = randomUUID();
  const email = input.email.trim().toLowerCase();
  if (await findApprovedVendorByEmail(email)) {
    const err = new Error("EMAIL_TAKEN");
    (err as Error & { code: string }).code = "EMAIL_TAKEN";
    throw err;
  }
  try {
    await sql`
      INSERT INTO sc_customers (id, full_name, email, phone, password_hash, region, district)
      VALUES (
        ${id},
        ${input.fullName.trim()},
        ${email},
        ${input.phone.trim()},
        ${input.passwordHash},
        ${input.region},
        ${input.district.trim()}
      )
    `;
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "23505") {
      const err = new Error("EMAIL_TAKEN");
      (err as Error & { code: string }).code = "EMAIL_TAKEN";
      throw err;
    }
    throw e;
  }
  return {
    id,
    fullName: input.fullName.trim(),
    email,
    phone: input.phone.trim(),
    region: input.region,
    district: input.district.trim(),
  };
}

export async function findCustomerByEmail(email: string): Promise<CustomerRow | null> {
  await ensureCustomerTables();
  const sql = getSql();
  const rows = (await sql`
    SELECT id, full_name, email, phone, password_hash, region, district
    FROM sc_customers
    WHERE lower(email) = ${email.trim().toLowerCase()}
    LIMIT 1
  `) as CustomerRow[];
  return rows[0] ?? null;
}

export async function updateCustomerPasswordHash(customerId: string, passwordHash: string): Promise<boolean> {
  await ensureCustomerTables();
  const sql = getSql();
  const rows = (await sql`
    UPDATE sc_customers SET password_hash = ${passwordHash} WHERE id = ${customerId}
    RETURNING id
  `) as { id: string }[];
  return rows.length > 0;
}

export async function getCustomerById(id: string): Promise<CustomerPublic | null> {
  await ensureCustomerTables();
  const sql = getSql();
  const rows = (await sql`
    SELECT id, full_name, email, phone, password_hash, region, district
    FROM sc_customers
    WHERE id = ${id}
    LIMIT 1
  `) as CustomerRow[];
  const row = rows[0];
  if (!row) return null;
  return mapPublic({
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    region: row.region,
    district: row.district,
  });
}

export async function insertCustomerOrder(input: {
  customerId: string;
  productId: string;
  storeSlug: string;
  storeName: string;
  productTitle: string;
  productUrl: string;
  customerName: string;
  customerPhone: string;
  customerRegion: string;
  customerDistrict: string;
}): Promise<string> {
  await ensureCustomerTables();
  const sql = getSql();
  const id = randomUUID();
  await sql`
    INSERT INTO sc_customer_orders (
      id, customer_id, product_id, store_slug, store_name, product_title, product_url,
      customer_name, customer_phone, customer_region, customer_district, status
    )
    VALUES (
      ${id},
      ${input.customerId},
      ${input.productId},
      ${input.storeSlug},
      ${input.storeName},
      ${input.productTitle},
      ${input.productUrl},
      ${input.customerName},
      ${input.customerPhone},
      ${input.customerRegion},
      ${input.customerDistrict},
      'pending'
    )
  `;
  return id;
}

type OrderRow = {
  id: string;
  checkout_id: string | null;
  quantity: number | null;
  unit_price: string | number | null;
  product_id: string;
  store_slug: string;
  store_name: string;
  product_title: string;
  product_url: string;
  status: string;
  created_at: Date | string;
  has_feedback: boolean;
};

export async function listCustomerOrders(
  customerId: string,
  limit?: number,
): Promise<CustomerOrderListItem[]> {
  await ensureCustomerTables();
  const sql = getSql();
  const lim = limit != null && limit > 0 ? Math.min(500, Math.floor(limit)) : null;
  let rows: OrderRow[];
  if (lim != null) {
    rows = (await sql`
    SELECT
      o.id,
      o.checkout_id,
      o.quantity,
      o.unit_price,
      o.product_id,
      o.store_slug,
      o.store_name,
      o.product_title,
      o.product_url,
      o.status,
      o.created_at,
      EXISTS (SELECT 1 FROM sc_store_feedback f WHERE f.order_id = o.id) AS has_feedback
    FROM sc_customer_orders o
    WHERE o.customer_id = ${customerId}
    ORDER BY o.created_at DESC
    LIMIT ${lim}
  `) as OrderRow[];
  } else {
    rows = (await sql`
    SELECT
      o.id,
      o.checkout_id,
      o.quantity,
      o.unit_price,
      o.product_id,
      o.store_slug,
      o.store_name,
      o.product_title,
      o.product_url,
      o.status,
      o.created_at,
      EXISTS (SELECT 1 FROM sc_store_feedback f WHERE f.order_id = o.id) AS has_feedback
    FROM sc_customer_orders o
    WHERE o.customer_id = ${customerId}
    ORDER BY o.created_at DESC
  `) as OrderRow[];
  }
  return rows.map((r) => ({
    id: r.id,
    checkoutId: r.checkout_id,
    quantity: r.quantity ?? 1,
    productId: r.product_id,
    storeSlug: r.store_slug,
    storeName: r.store_name,
    productTitle: r.product_title,
    productUrl: r.product_url,
    status: r.status as CustomerOrderListItem["status"],
    createdAt: new Date(r.created_at).toISOString(),
    hasFeedback: r.has_feedback,
    unitPrice: r.unit_price != null ? Number(r.unit_price) : null,
  }));
}

export async function getCustomerOrderForCustomer(
  orderId: string,
  customerId: string,
): Promise<{ status: string; storeSlug: string } | null> {
  await ensureCustomerTables();
  const sql = getSql();
  const rows = (await sql`
    SELECT status, store_slug FROM sc_customer_orders
    WHERE id = ${orderId} AND customer_id = ${customerId}
    LIMIT 1
  `) as { status: string; store_slug: string }[];
  const r = rows[0];
  if (!r) return null;
  return { status: r.status, storeSlug: r.store_slug };
}

export async function insertStoreFeedback(input: {
  customerId: string;
  storeSlug: string;
  orderId: string;
  rating: number;
  comment: string;
  /** Required for new feedback UI (preset chips). Legacy rows may be null. */
  presetOption: string | null;
}): Promise<void> {
  await ensureCustomerTables();
  const sql = getSql();
  const id = randomUUID();
  await sql`
    INSERT INTO sc_store_feedback (id, customer_id, store_slug, order_id, rating, comment, preset_option)
    VALUES (
      ${id},
      ${input.customerId},
      ${input.storeSlug},
      ${input.orderId},
      ${input.rating},
      ${input.comment.trim()},
      ${input.presetOption}
    )
  `;
}

export type StoreRatingSummary = { average: number; count: number };

export async function getStoreRatingSummaries(
  slugs: string[],
): Promise<Record<string, StoreRatingSummary>> {
  if (slugs.length === 0) return {};
  await ensureCustomerTables();
  const sql = getSql();
  const slugSet = new Set(slugs);
  const rows = (await sql`
    SELECT store_slug, AVG(rating)::float AS avg, COUNT(*)::int AS cnt
    FROM sc_store_feedback
    GROUP BY store_slug
  `) as { store_slug: string; avg: string | number; cnt: string | number }[];
  const out: Record<string, StoreRatingSummary> = {};
  for (const r of rows) {
    if (!slugSet.has(r.store_slug)) continue;
    out[r.store_slug] = {
      average: Math.round(Number(r.avg) * 10) / 10,
      count: Number(r.cnt),
    };
  }
  return out;
}

export type PublicStoreFeedbackItem = {
  rating: number;
  comment: string;
  /** Preset label when submitted via chips flow */
  presetOption: string | null;
  author: string;
  createdAt: string;
};

export async function listPublicFeedbackForStore(
  storeSlug: string,
  limit: number,
): Promise<PublicStoreFeedbackItem[]> {
  await ensureCustomerTables();
  const sql = getSql();
  const rows = (await sql`
    SELECT f.rating, f.comment, f.preset_option, c.full_name, f.created_at
    FROM sc_store_feedback f
    JOIN sc_customers c ON c.id = f.customer_id
    WHERE f.store_slug = ${storeSlug}
    ORDER BY f.created_at DESC
    LIMIT ${limit}
  `) as {
    rating: number;
    comment: string;
    preset_option: string | null;
    full_name: string;
    created_at: Date | string;
  }[];
  return rows.map((r) => ({
    rating: r.rating,
    comment: r.comment,
    presetOption: r.preset_option,
    author: r.full_name,
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

export async function updateCustomerOrderStatus(
  orderId: string,
  status: "pending" | "accepted" | "completed",
): Promise<boolean> {
  await ensureCustomerTables();
  const sql = getSql();
  const rows = (await sql`
    UPDATE sc_customer_orders SET status = ${status} WHERE id = ${orderId}
    RETURNING id
  `) as { id: string }[];
  return rows.length > 0;
}

export async function createCheckoutWithLines(input: {
  customerId: string;
  fullName: string;
  phone: string;
  region: string;
  district: string;
  lines: Array<{
    productId: string;
    quantity: number;
    storeSlug: string;
    storeName: string;
    productTitle: string;
    productUrl: string;
    unitPrice: number;
  }>;
}): Promise<{ checkoutId: string }> {
  await ensureCustomerTables();
  const sql = getSql();
  const checkoutId = randomUUID();
  await sql`
    INSERT INTO sc_checkouts (id, customer_id, full_name, phone, region, district)
    VALUES (
      ${checkoutId},
      ${input.customerId},
      ${input.fullName.trim()},
      ${input.phone.trim()},
      ${input.region},
      ${input.district.trim()}
    )
  `;
  for (const line of input.lines) {
    const lineId = randomUUID();
    const qty = Math.max(1, Math.floor(line.quantity));
    await sql`
      INSERT INTO sc_customer_orders (
        id, customer_id, checkout_id, product_id, quantity, unit_price,
        store_slug, store_name, product_title, product_url,
        customer_name, customer_phone, customer_region, customer_district, status
      )
      VALUES (
        ${lineId},
        ${input.customerId},
        ${checkoutId},
        ${line.productId},
        ${qty},
        ${line.unitPrice},
        ${line.storeSlug},
        ${line.storeName},
        ${line.productTitle},
        ${line.productUrl},
        ${input.fullName.trim()},
        ${input.phone.trim()},
        ${input.region},
        ${input.district.trim()},
        'pending'
      )
    `;
  }
  return { checkoutId };
}

export type VendorOrderLineRow = {
  id: string;
  checkoutId: string | null;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerRegion: string;
  customerDistrict: string;
  productId: string;
  productTitle: string;
  productUrl: string;
  quantity: number;
  unitPrice: number | null;
  status: "pending" | "accepted" | "completed";
  storeName: string;
};

export async function listVendorOrderLines(storeSlug: string): Promise<VendorOrderLineRow[]> {
  await ensureCustomerTables();
  const sql = getSql();
  const rows = (await sql`
    SELECT
      o.id,
      o.checkout_id,
      o.created_at,
      o.customer_name,
      o.customer_phone,
      o.customer_region,
      o.customer_district,
      o.product_id,
      o.product_title,
      o.product_url,
      o.quantity,
      o.unit_price,
      o.status,
      o.store_name
    FROM sc_customer_orders o
    WHERE o.store_slug = ${storeSlug}
    ORDER BY o.created_at DESC
  `) as {
    id: string;
    checkout_id: string | null;
    created_at: Date | string;
    customer_name: string;
    customer_phone: string;
    customer_region: string;
    customer_district: string;
    product_id: string;
    product_title: string;
    product_url: string;
    quantity: number | null;
    unit_price: string | number | null;
    status: string;
    store_name: string;
  }[];
  return rows.map((r) => ({
    id: r.id,
    checkoutId: r.checkout_id,
    createdAt: new Date(r.created_at).toISOString(),
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    customerRegion: r.customer_region,
    customerDistrict: r.customer_district,
    productId: r.product_id,
    productTitle: r.product_title,
    productUrl: r.product_url,
    quantity: r.quantity ?? 1,
    unitPrice: r.unit_price != null ? Number(r.unit_price) : null,
    status: r.status as VendorOrderLineRow["status"],
    storeName: r.store_name,
  }));
}

export async function updateOrderLineStatusForStore(
  orderLineId: string,
  storeSlug: string,
  status: "pending" | "accepted" | "completed",
): Promise<boolean> {
  await ensureCustomerTables();
  const sql = getSql();
  const rows = (await sql`
    UPDATE sc_customer_orders SET status = ${status}
    WHERE id = ${orderLineId} AND store_slug = ${storeSlug}
    RETURNING id
  `) as { id: string }[];
  return rows.length > 0;
}

export type AdminOrderRow = {
  checkoutId: string | null;
  orderLineId: string;
  phone: string;
  fullName: string;
  region: string;
  district: string;
  productTitle: string;
  storeName: string;
  status: string;
  createdAt: string;
};

/** All checkout line rows (admin dashboard total). */
export async function countCustomerOrderLines(): Promise<number> {
  await ensureCustomerTables();
  const sql = getSql();
  const rows = (await sql`SELECT count(*)::bigint AS c FROM sc_customer_orders`) as { c: bigint }[];
  return Number(rows[0]?.c ?? 0);
}

export async function listOrdersForAdmin(phoneSearch?: string): Promise<AdminOrderRow[]> {
  await ensureCustomerTables();
  const sql = getSql();
  const q = phoneSearch?.trim();
  const rows = q
    ? ((await sql`
        SELECT
          o.checkout_id,
          o.id AS order_line_id,
          o.customer_phone,
          o.customer_name,
          o.customer_region,
          o.customer_district,
          o.product_title,
          o.store_name,
          o.status,
          o.created_at
        FROM sc_customer_orders o
        WHERE o.customer_phone ILIKE ${"%" + q + "%"}
        ORDER BY o.created_at DESC
        LIMIT 200
      `) as Record<string, unknown>[])
    : ((await sql`
        SELECT
          o.checkout_id,
          o.id AS order_line_id,
          o.customer_phone,
          o.customer_name,
          o.customer_region,
          o.customer_district,
          o.product_title,
          o.store_name,
          o.status,
          o.created_at
        FROM sc_customer_orders o
        ORDER BY o.created_at DESC
        LIMIT 200
      `) as Record<string, unknown>[]);

  return rows.map((r) => ({
    checkoutId: (r.checkout_id as string | null) ?? null,
    orderLineId: r.order_line_id as string,
    phone: r.customer_phone as string,
    fullName: r.customer_name as string,
    region: r.customer_region as string,
    district: r.customer_district as string,
    productTitle: r.product_title as string,
    storeName: r.store_name as string,
    status: r.status as string,
    createdAt: new Date(r.created_at as Date | string).toISOString(),
  }));
}

export type CheckoutDetail = {
  id: string;
  fullName: string;
  phone: string;
  region: string;
  district: string;
  createdAt: string;
  lines: CustomerOrderListItem[];
};

export async function getCheckoutDetailForCustomer(
  checkoutId: string,
  customerId: string,
): Promise<CheckoutDetail | null> {
  await ensureCustomerTables();
  const sql = getSql();
  const heads = (await sql`
    SELECT id, full_name, phone, region, district, created_at
    FROM sc_checkouts
    WHERE id = ${checkoutId} AND customer_id = ${customerId}
    LIMIT 1
  `) as {
    id: string;
    full_name: string;
    phone: string;
    region: string;
    district: string;
    created_at: Date | string;
  }[];
  const h = heads[0];
  if (!h) return null;
  const lineRows = (await sql`
    SELECT
      o.id,
      o.checkout_id,
      o.quantity,
      o.unit_price,
      o.product_id,
      o.store_slug,
      o.store_name,
      o.product_title,
      o.product_url,
      o.status,
      o.created_at,
      EXISTS (SELECT 1 FROM sc_store_feedback f WHERE f.order_id = o.id) AS has_feedback
    FROM sc_customer_orders o
    WHERE o.customer_id = ${customerId} AND o.checkout_id = ${checkoutId}
    ORDER BY o.created_at ASC
  `) as OrderRow[];
  const mine = lineRows.map((r) => ({
    id: r.id,
    checkoutId: r.checkout_id,
    quantity: r.quantity ?? 1,
    productId: r.product_id,
    storeSlug: r.store_slug,
    storeName: r.store_name,
    productTitle: r.product_title,
    productUrl: r.product_url,
    status: r.status as CustomerOrderListItem["status"],
    createdAt: new Date(r.created_at).toISOString(),
    hasFeedback: r.has_feedback,
    unitPrice: r.unit_price != null ? Number(r.unit_price) : null,
  }));
  if (mine.length === 0) return null;
  return {
    id: h.id,
    fullName: h.full_name,
    phone: h.phone,
    region: h.region,
    district: h.district,
    createdAt: new Date(h.created_at).toISOString(),
    lines: mine,
  };
}

export async function getFollowerCountForStore(storeSlug: string): Promise<number> {
  await ensureCustomerTables();
  const sql = getSql();
  const rows = (await sql`
    SELECT COUNT(*)::int AS c FROM sc_store_followers WHERE store_slug = ${storeSlug}
  `) as { c: number }[];
  return rows[0]?.c ?? 0;
}

/** Batch follower counts for listing pages (slugs with no rows count as 0). */
export async function getFollowerCountsForStores(slugs: string[]): Promise<Record<string, number>> {
  if (slugs.length === 0) return {};
  await ensureCustomerTables();
  const sql = getSql();
  const slugSet = new Set(slugs);
  const rows = (await sql`
    SELECT store_slug, COUNT(*)::int AS c
    FROM sc_store_followers
    GROUP BY store_slug
  `) as { store_slug: string; c: number }[];
  const out: Record<string, number> = {};
  for (const s of slugs) out[s] = 0;
  for (const r of rows) {
    if (!slugSet.has(r.store_slug)) continue;
    out[r.store_slug] = r.c;
  }
  return out;
}

export async function isCustomerFollowingStore(
  customerId: string,
  storeSlug: string,
): Promise<boolean> {
  await ensureCustomerTables();
  const sql = getSql();
  const rows = (await sql`
    SELECT 1 FROM sc_store_followers
    WHERE customer_id = ${customerId} AND store_slug = ${storeSlug}
    LIMIT 1
  `) as unknown[];
  return rows.length > 0;
}

export async function followStore(customerId: string, storeSlug: string): Promise<void> {
  await ensureCustomerTables();
  const sql = getSql();
  const id = randomUUID();
  await sql`
    INSERT INTO sc_store_followers (id, customer_id, store_slug)
    VALUES (${id}, ${customerId}, ${storeSlug})
    ON CONFLICT (customer_id, store_slug) DO NOTHING
  `;
}

export async function unfollowStore(customerId: string, storeSlug: string): Promise<void> {
  await ensureCustomerTables();
  const sql = getSql();
  await sql`
    DELETE FROM sc_store_followers
    WHERE customer_id = ${customerId} AND store_slug = ${storeSlug}
  `;
}

export type VendorFeedbackRow = {
  author: string;
  rating: number;
  presetOption: string | null;
  comment: string;
  createdAt: string;
};

export async function listFeedbackForVendorStore(
  storeSlug: string,
  limit: number,
): Promise<VendorFeedbackRow[]> {
  await ensureCustomerTables();
  const sql = getSql();
  const rows = (await sql`
    SELECT f.rating, f.comment, f.preset_option, c.full_name, f.created_at
    FROM sc_store_feedback f
    JOIN sc_customers c ON c.id = f.customer_id
    WHERE f.store_slug = ${storeSlug}
    ORDER BY f.created_at DESC
    LIMIT ${limit}
  `) as {
    rating: number;
    comment: string;
    preset_option: string | null;
    full_name: string;
    created_at: Date | string;
  }[];
  return rows.map((r) => ({
    author: r.full_name,
    rating: r.rating,
    presetOption: r.preset_option,
    comment: r.comment,
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

export type VendorInvoiceRecord = {
  id: string;
  invoiceNo: string;
  storeSlug: string;
  orderLineId: string;
  customerName: string;
  customerPhone: string;
  storeName: string;
  total: number;
  invoiceDate: string;
  payloadJson: string;
  createdAt: string;
};

export async function createInvoiceForOrderLine(
  storeSlug: string,
  orderLineId: string,
): Promise<VendorInvoiceRecord | null> {
  await ensureCustomerTables();
  const sql = getSql();
  const existing = (await sql`
    SELECT id, invoice_no, store_slug, order_line_id, customer_name, customer_phone, store_name, total, invoice_date, payload_json, created_at
    FROM sc_vendor_invoices
    WHERE store_slug = ${storeSlug} AND order_line_id = ${orderLineId}
    LIMIT 1
  `) as Record<string, unknown>[];
  if (existing[0]) {
    const r = existing[0];
    return {
      id: String(r.id),
      invoiceNo: String(r.invoice_no),
      storeSlug: String(r.store_slug),
      orderLineId: String(r.order_line_id),
      customerName: String(r.customer_name),
      customerPhone: String(r.customer_phone),
      storeName: String(r.store_name),
      total: Number(r.total ?? 0),
      invoiceDate: String(r.invoice_date),
      payloadJson: String(r.payload_json),
      createdAt: new Date(r.created_at as string).toISOString(),
    };
  }
  const rows = (await sql`
    SELECT
      id, store_slug, store_name, customer_name, customer_phone, product_title, quantity, unit_price, created_at
    FROM sc_customer_orders
    WHERE id = ${orderLineId} AND store_slug = ${storeSlug}
    LIMIT 1
  `) as {
    id: string;
    store_slug: string;
    store_name: string;
    customer_name: string;
    customer_phone: string;
    product_title: string;
    quantity: number;
    unit_price: string | number | null;
    created_at: Date | string;
  }[];
  const o = rows[0];
  if (!o) return null;
  const unitPrice = o.unit_price == null ? 0 : Number(o.unit_price);
  const total = unitPrice * (o.quantity || 1);
  const id = randomUUID();
  const invoiceNo = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${id.slice(0, 6).toUpperCase()}`;
  const invoiceDate = new Date().toISOString().slice(0, 10);
  const payload = JSON.stringify({
    invoiceId: invoiceNo,
    storeName: o.store_name,
    customerName: o.customer_name,
    phone: o.customer_phone,
    products: [{ name: o.product_title, quantity: o.quantity || 1, price: unitPrice }],
    total,
    date: invoiceDate,
  });
  await sql`
    INSERT INTO sc_vendor_invoices (
      id, invoice_no, store_slug, order_line_id, customer_name, customer_phone, store_name, total, invoice_date, payload_json
    )
    VALUES (
      ${id}, ${invoiceNo}, ${storeSlug}, ${orderLineId}, ${o.customer_name}, ${o.customer_phone},
      ${o.store_name}, ${total}, ${invoiceDate}, ${payload}
    )
  `;
  return {
    id,
    invoiceNo,
    storeSlug,
    orderLineId,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    storeName: o.store_name,
    total,
    invoiceDate,
    payloadJson: payload,
    createdAt: new Date().toISOString(),
  };
}

export async function getVendorInvoiceById(
  storeSlug: string,
  invoiceId: string,
): Promise<VendorInvoiceRecord | null> {
  await ensureCustomerTables();
  const sql = getSql();
  const rows = (await sql`
    SELECT id, invoice_no, store_slug, order_line_id, customer_name, customer_phone, store_name, total, invoice_date, payload_json, created_at
    FROM sc_vendor_invoices
    WHERE id = ${invoiceId} AND store_slug = ${storeSlug}
    LIMIT 1
  `) as Record<string, unknown>[];
  const r = rows[0];
  if (!r) return null;
  return {
    id: String(r.id),
    invoiceNo: String(r.invoice_no),
    storeSlug: String(r.store_slug),
    orderLineId: String(r.order_line_id),
    customerName: String(r.customer_name),
    customerPhone: String(r.customer_phone),
    storeName: String(r.store_name),
    total: Number(r.total ?? 0),
    invoiceDate: String(r.invoice_date),
    payloadJson: String(r.payload_json),
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

export async function listVendorInvoices(storeSlug: string): Promise<VendorInvoiceRecord[]> {
  await ensureCustomerTables();
  const sql = getSql();
  const rows = (await sql`
    SELECT id, invoice_no, store_slug, order_line_id, customer_name, customer_phone, store_name, total, invoice_date, payload_json, created_at
    FROM sc_vendor_invoices
    WHERE store_slug = ${storeSlug}
    ORDER BY created_at DESC
    LIMIT 200
  `) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id),
    invoiceNo: String(r.invoice_no),
    storeSlug: String(r.store_slug),
    orderLineId: String(r.order_line_id),
    customerName: String(r.customer_name),
    customerPhone: String(r.customer_phone),
    storeName: String(r.store_name),
    total: Number(r.total ?? 0),
    invoiceDate: String(r.invoice_date),
    payloadJson: String(r.payload_json),
    createdAt: new Date(r.created_at as string).toISOString(),
  }));
}

export async function incrementStoreView(storeSlug: string): Promise<void> {
  await ensureCustomerTables();
  const sql = getSql();
  await sql`
    INSERT INTO sc_store_views (store_slug, views, updated_at)
    VALUES (${storeSlug}, 1, now())
    ON CONFLICT (store_slug) DO UPDATE SET
      views = sc_store_views.views + 1,
      updated_at = now()
  `;
}

export async function getStoreViews(storeSlug: string): Promise<number> {
  await ensureCustomerTables();
  const sql = getSql();
  const rows = (await sql`SELECT views::bigint AS v FROM sc_store_views WHERE store_slug = ${storeSlug} LIMIT 1`) as {
    v: number;
  }[];
  return Number(rows[0]?.v ?? 0);
}

/** Default page size for chat history (newest-first window). */
export const CHAT_MESSAGES_DEFAULT_LIMIT = 50;

export type ChatMessageRecord = {
  id: string;
  threadId: string;
  senderType: "customer" | "vendor";
  senderId: string;
  messageType: "text" | "product";
  messageText: string | null;
  productJson: string | null;
  createdAt: string;
};

export async function getOrCreateChatThread(customerId: string, storeSlug: string): Promise<string> {
  await ensureCustomerTables();
  const sql = getSql();
  const id = randomUUID();
  const rows = (await sql`
    INSERT INTO sc_chat_threads (id, customer_id, store_slug)
    VALUES (${id}, ${customerId}, ${storeSlug})
    ON CONFLICT (customer_id, store_slug) DO UPDATE SET store_slug = EXCLUDED.store_slug
    RETURNING id
  `) as { id: string }[];
  const tid = rows[0]!.id;
  await sql`
    INSERT INTO sc_conversations (id, store_slug, customer_id, created_at)
    VALUES (${tid}, ${storeSlug}, ${customerId}, now())
    ON CONFLICT (store_slug, customer_id) DO NOTHING
  `;
  return tid;
}

export async function canVendorAccessThread(threadId: string, storeSlug: string): Promise<boolean> {
  await ensureCustomerTables();
  const sql = getSql();
  const rows = (await sql`
    SELECT 1 FROM sc_chat_threads WHERE id = ${threadId} AND store_slug = ${storeSlug} LIMIT 1
  `) as unknown[];
  return rows.length > 0;
}

export async function canCustomerAccessThread(threadId: string, customerId: string): Promise<boolean> {
  await ensureCustomerTables();
  const sql = getSql();
  const rows = (await sql`
    SELECT 1 FROM sc_chat_threads WHERE id = ${threadId} AND customer_id = ${customerId} LIMIT 1
  `) as unknown[];
  return rows.length > 0;
}

export async function getChatThreadParticipantKeys(
  threadId: string,
): Promise<{ customerId: string; storeSlug: string } | null> {
  await ensureCustomerTables();
  if (!process.env.DATABASE_URL?.trim()) return null;
  const sql = getSql();
  const rows = (await sql`
    SELECT customer_id, store_slug FROM sc_chat_threads WHERE id = ${threadId} LIMIT 1
  `) as { customer_id: string; store_slug: string }[];
  const r = rows[0];
  return r ? { customerId: r.customer_id, storeSlug: r.store_slug } : null;
}

export async function getOrderLineCustomerBrief(
  orderLineId: string,
): Promise<{ customerId: string; productTitle: string } | null> {
  await ensureCustomerTables();
  if (!process.env.DATABASE_URL?.trim()) return null;
  const sql = getSql();
  const rows = (await sql`
    SELECT customer_id, product_title FROM sc_customer_orders WHERE id = ${orderLineId} LIMIT 1
  `) as { customer_id: string; product_title: string }[];
  const r = rows[0];
  return r ? { customerId: r.customer_id, productTitle: r.product_title } : null;
}

export async function appendChatMessage(input: {
  threadId: string;
  senderType: "customer" | "vendor";
  senderId: string;
  messageType: "text" | "product";
  messageText?: string | null;
  productJson?: string | null;
}): Promise<ChatMessageRecord> {
  await ensureCustomerTables();
  const sql = getSql();
  const conversationId = await resolveConversationIdForThread(sql, input.threadId);
  const id = randomUUID();
  const lastMessagePreview = input.messageType === "text" ? input.messageText ?? "" : "[product]";
  const body =
    input.messageType === "text" ? (input.messageText?.trim() ?? "") : "[product]";
  const rows = (await sql`
    WITH ins AS (
      INSERT INTO sc_chat_messages (
        id, thread_id, conversation_id, sender_type, sender_role, sender_id,
        message_type, message_text, product_json, body
      )
      VALUES (
        ${id}, ${input.threadId}, ${conversationId}, ${input.senderType}, ${input.senderType}, ${input.senderId},
        ${input.messageType}, ${input.messageText ?? null}, ${input.productJson ?? null}, ${body}
      )
      RETURNING id, thread_id, sender_type, sender_id, message_type, message_text, product_json, created_at
    ),
    _upd AS (
      UPDATE sc_chat_threads t
      SET updated_at = now(), last_message = ${lastMessagePreview}
      FROM ins
      WHERE t.id = ${input.threadId}
      RETURNING 1
    )
    SELECT id, thread_id, sender_type, sender_id, message_type, message_text, product_json, created_at FROM ins
  `) as {
    id: string;
    thread_id: string;
    sender_type: "customer" | "vendor";
    sender_id: string;
    message_type: "text" | "product";
    message_text: string | null;
    product_json: string | null;
    created_at: Date | string;
  }[];
  const r = rows[0]!;
  return {
    id: r.id,
    threadId: r.thread_id,
    senderType: r.sender_type,
    senderId: r.sender_id,
    messageType: r.message_type,
    messageText: r.message_text,
    productJson: r.product_json,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

function mapChatMessageRows(
  rows: {
    id: string;
    thread_id: string;
    sender_type: string | null;
    sender_id: string;
    message_type: string | null;
    message_text: string | null;
    product_json: string | null;
    created_at: Date | string;
  }[],
): ChatMessageRecord[] {
  return rows.map((r) => ({
    id: r.id,
    threadId: r.thread_id,
    senderType: r.sender_type === "vendor" ? "vendor" : "customer",
    senderId: r.sender_id,
    messageType: r.message_type === "product" ? "product" : "text",
    messageText: r.message_text,
    productJson: r.product_json,
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

export async function listChatMessages(
  threadId: string,
  limit = CHAT_MESSAGES_DEFAULT_LIMIT,
): Promise<ChatMessageRecord[]> {
  await ensureCustomerTables();
  const sql = getSql();
  /** Newest first in SQL, then chronological for the UI (was ASC+LIMIT = oldest page only). */
  const rows = (await sql`
    SELECT
      m.id,
      m.thread_id,
      COALESCE(m.sender_type, m.sender_role) AS sender_type,
      m.sender_id,
      m.message_type,
      m.message_text,
      m.product_json,
      m.created_at
    FROM sc_chat_messages m
    WHERE (
      m.thread_id = ${threadId}
      OR m.conversation_id = ${threadId}
      OR m.conversation_id IN (
        SELECT c.id FROM sc_conversations c
        INNER JOIN sc_chat_threads t ON t.store_slug = c.store_slug AND t.customer_id = c.customer_id
        WHERE t.id = ${threadId}
      )
    )
    ORDER BY m.created_at DESC
    LIMIT ${limit}
  `) as {
    id: string;
    thread_id: string;
    sender_type: "customer" | "vendor";
    sender_id: string;
    message_type: "text" | "product";
    message_text: string | null;
    product_json: string | null;
    created_at: Date | string;
  }[];
  return mapChatMessageRows(rows.slice().reverse());
}

/**
 * One query when the thread has messages; one cheap follow-up when empty (new thread vs forbidden).
 * Replaces separate canAccess + listChatMessages round-trips.
 */
export async function getChatMessagesIfAuthorized(
  threadId: string,
  role: { type: "customer"; customerId: string } | { type: "vendor"; storeSlug: string },
  limit = CHAT_MESSAGES_DEFAULT_LIMIT,
): Promise<{ forbidden: true } | { forbidden: false; messages: ChatMessageRecord[] }> {
  await ensureCustomerTables();
  const sql = getSql();

  const rows = (await (role.type === "customer"
    ? sql`
        SELECT
          m.id,
          m.thread_id,
          COALESCE(m.sender_type, m.sender_role) AS sender_type,
          m.sender_id,
          m.message_type,
          m.message_text,
          m.product_json,
          m.created_at
        FROM sc_chat_messages m
        INNER JOIN sc_chat_threads t ON t.id = ${threadId} AND t.customer_id = ${role.customerId}
        WHERE (
          m.thread_id = t.id
          OR m.conversation_id = t.id
          OR m.conversation_id IN (
            SELECT c.id FROM sc_conversations c
            WHERE c.store_slug = t.store_slug AND c.customer_id = t.customer_id
          )
        )
        ORDER BY m.created_at DESC
        LIMIT ${limit}
      `
    : sql`
        SELECT
          m.id,
          m.thread_id,
          COALESCE(m.sender_type, m.sender_role) AS sender_type,
          m.sender_id,
          m.message_type,
          m.message_text,
          m.product_json,
          m.created_at
        FROM sc_chat_messages m
        INNER JOIN sc_chat_threads t ON t.id = ${threadId} AND t.store_slug = ${role.storeSlug}
        WHERE (
          m.thread_id = t.id
          OR m.conversation_id = t.id
          OR m.conversation_id IN (
            SELECT c.id FROM sc_conversations c
            WHERE c.store_slug = t.store_slug AND c.customer_id = t.customer_id
          )
        )
        ORDER BY m.created_at DESC
        LIMIT ${limit}
      `)) as {
    id: string;
    thread_id: string;
    sender_type: "customer" | "vendor";
    sender_id: string;
    message_type: "text" | "product";
    message_text: string | null;
    product_json: string | null;
    created_at: Date | string;
  }[];

  if (rows.length > 0) {
    return { forbidden: false, messages: mapChatMessageRows(rows.slice().reverse()) };
  }

  const access = (await (role.type === "customer"
    ? sql`
        SELECT 1 FROM sc_chat_threads t
        WHERE t.id = ${threadId} AND t.customer_id = ${role.customerId}
        LIMIT 1
      `
    : sql`
        SELECT 1 FROM sc_chat_threads t
        WHERE t.id = ${threadId} AND t.store_slug = ${role.storeSlug}
        LIMIT 1
      `)) as unknown[];
  if (access.length === 0) return { forbidden: true };
  return { forbidden: false, messages: [] };
}

export type ChatThreadSummary = {
  id: string;
  customerId: string;
  customerName: string;
  storeSlug: string;
  updatedAt: string;
  lastMessage: string | null;
};

export async function listVendorChatThreads(storeSlug: string): Promise<ChatThreadSummary[]> {
  await ensureCustomerTables();
  const sql = getSql();
  const rows = (await sql`
    SELECT t.id, t.customer_id, c.full_name, t.store_slug, t.updated_at, t.last_message
    FROM sc_chat_threads t
    JOIN sc_customers c ON c.id = t.customer_id
    WHERE t.store_slug = ${storeSlug}
    ORDER BY t.updated_at DESC
    LIMIT 300
  `) as {
    id: string;
    customer_id: string;
    full_name: string;
    store_slug: string;
    updated_at: Date | string;
    last_message: string | null;
  }[];
  return rows.map((r) => ({
    id: r.id,
    customerId: r.customer_id,
    customerName: r.full_name,
    storeSlug: r.store_slug,
    updatedAt: new Date(r.updated_at).toISOString(),
    lastMessage: r.last_message,
  }));
}

export async function listCustomerChatThreads(customerId: string): Promise<ChatThreadSummary[]> {
  await ensureCustomerTables();
  const sql = getSql();
  const rows = (await sql`
    SELECT t.id, t.customer_id, c.full_name, t.store_slug, t.updated_at, t.last_message
    FROM sc_chat_threads t
    JOIN sc_customers c ON c.id = t.customer_id
    WHERE t.customer_id = ${customerId}
    ORDER BY t.updated_at DESC
    LIMIT 300
  `) as {
    id: string;
    customer_id: string;
    full_name: string;
    store_slug: string;
    updated_at: Date | string;
    last_message: string | null;
  }[];
  return rows.map((r) => ({
    id: r.id,
    customerId: r.customer_id,
    customerName: r.full_name,
    storeSlug: r.store_slug,
    updatedAt: new Date(r.updated_at).toISOString(),
    lastMessage: r.last_message,
  }));
}

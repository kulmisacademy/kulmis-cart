import "server-only";
import { randomUUID } from "crypto";
import { findApprovedVendorByStoreSlug } from "@/lib/approved-vendors";
import { getSql } from "@/lib/db";
import { ensureCustomerTables, getChatThreadParticipantKeys, getOrderLineCustomerBrief } from "@/lib/customer/db";
import { ensureAppNotificationTables } from "@/lib/notifications/ensure-tables";
import { sendFcmToRecipient } from "@/lib/notifications/fcm-push";
import { notifySocketNotificationRoom } from "@/lib/notifications/socket-broadcast";
import type { AppNotificationAudience } from "@/lib/notifications/types";

function notifyRoomForAudience(audience: AppNotificationAudience, recipientKey: string): string {
  return `notify:${audience}:${recipientKey}`;
}

async function withDb<T>(fn: () => Promise<T>): Promise<T | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  try {
    return await fn();
  } catch (e) {
    console.error("[notifications]", e);
    return null;
  }
}

export async function createInAppNotification(input: {
  audience: AppNotificationAudience;
  recipientKey: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
}): Promise<string | null> {
  return withDb(async () => {
    await ensureCustomerTables();
    const sql = getSql();
    await ensureAppNotificationTables(sql);
    const id = randomUUID();
    await sql`
      INSERT INTO sc_app_notifications (id, audience, recipient_key, type, title, message, link)
      VALUES (
        ${id},
        ${input.audience},
        ${input.recipientKey},
        ${input.type},
        ${input.title},
        ${input.message},
        ${input.link ?? null}
      )
    `;
    return id;
  });
}

export async function dispatchInAppNotification(input: {
  audience: AppNotificationAudience;
  recipientKey: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
}): Promise<void> {
  const id = await createInAppNotification(input);
  const room = notifyRoomForAudience(input.audience, input.recipientKey);
  notifySocketNotificationRoom(room, {
    id,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link ?? null,
    createdAt: new Date().toISOString(),
  });
  void sendFcmToRecipient({
    audience: input.audience,
    recipientKey: input.recipientKey,
    title: input.title,
    body: input.message,
    link: input.link ?? null,
  });
}

export async function notifyVendorsNewOrders(params: {
  checkoutId: string;
  /** One entry per affected store */
  stores: { storeSlug: string; storeName: string; lineCount: number }[];
}): Promise<void> {
  for (const s of params.stores) {
    const vendor = await findApprovedVendorByStoreSlug(s.storeSlug);
    if (!vendor) continue;
    await dispatchInAppNotification({
      audience: "vendor",
      recipientKey: vendor.id,
      type: "order",
      title: "New order",
      message: `${s.lineCount} line(s) in checkout for ${s.storeName}. Open Orders to view.`,
      link: "/vendor/orders",
    });
  }
}

export async function notifyChatCounterpart(params: {
  threadId: string;
  senderType: "customer" | "vendor";
  senderId: string;
  preview: string;
}): Promise<void> {
  const meta = await getChatThreadParticipantKeys(params.threadId);
  if (!meta) return;

  if (params.senderType === "customer") {
    const vendor = await findApprovedVendorByStoreSlug(meta.storeSlug);
    if (!vendor || vendor.id === params.senderId) return;
    await dispatchInAppNotification({
      audience: "vendor",
      recipientKey: vendor.id,
      type: "chat",
      title: "New message",
      message: params.preview.slice(0, 200) || "New chat message",
      link: "/vendor/messages",
    });
  } else {
    if (meta.customerId === params.senderId) return;
    await dispatchInAppNotification({
      audience: "customer",
      recipientKey: meta.customerId,
      type: "chat",
      title: "New message",
      message: params.preview.slice(0, 200) || "New chat message",
      link: `/chat/${encodeURIComponent(meta.storeSlug)}`,
    });
  }
}

export async function notifyCustomerOrderStatusChange(orderLineId: string, status: string): Promise<void> {
  const row = await getOrderLineCustomerBrief(orderLineId);
  if (!row) return;
  const label =
    status === "accepted" ? "accepted" : status === "completed" ? "completed" : "updated";
  await dispatchInAppNotification({
    audience: "customer",
    recipientKey: row.customerId,
    type: "order_status",
    title: "Order update",
    message: `Your order for “${row.productTitle}” was ${label}.`,
    link: "/account#orders",
  });
}

export async function notifyAdminsNewVendorRegistered(storeName: string): Promise<void> {
  await dispatchInAppNotification({
    audience: "admin",
    recipientKey: "global",
    type: "vendor_register",
    title: "New store registration",
    message: `${storeName} registered on the platform.`,
    link: "/admin/vendors",
  });
}

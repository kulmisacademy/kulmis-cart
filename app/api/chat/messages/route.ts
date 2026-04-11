import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fallbackAppendMessage, fallbackGetThread, fallbackListMessages } from "@/lib/chat-fallback";
import { notifySocketThreadOfNewMessage } from "@/lib/chat-socket-broadcast";
import { notifyChatCounterpart } from "@/lib/notifications/service";
import {
  appendChatMessage,
  canCustomerAccessThread,
  canVendorAccessThread,
  CHAT_MESSAGES_DEFAULT_LIMIT,
  getChatMessagesIfAuthorized,
  listChatMessages,
} from "@/lib/customer/db";
import { isDatabaseConnectivityError } from "@/lib/db";
import { isVendorAreaReferer } from "@/lib/chat-role-from-request";
import { getCustomerSessionCookieName, verifyCustomerSession } from "@/lib/customer-session";
import { getVendorSessionCookieName, verifyVendorSession } from "@/lib/vendor-session";

const postSchema = z.object({
  threadId: z.string().min(1),
  messageType: z.enum(["text", "product"]),
  /** When both role cookies exist, required for correct sender (vendor dashboard vs storefront). */
  contextRole: z.enum(["customer", "vendor"]).optional(),
  messageText: z.string().optional(),
  product: z
    .object({
      productId: z.string(),
      name: z.string(),
      price: z.number(),
      image: z.string(),
      link: z.string(),
      region: z.string().optional(),
      storeName: z.string().optional(),
    })
    .optional(),
});

export async function GET(request: Request) {
  const upstream = process.env.LAAS24_BACKEND_URL?.trim();
  if (upstream) {
    try {
      const url = new URL(request.url);
      const q = url.searchParams.toString();
      const r = await fetch(`${upstream.replace(/\/$/, "")}/api/chat/messages${q ? `?${q}` : ""}`, {
        headers: {
          cookie: request.headers.get("cookie") ?? "",
          referer: request.headers.get("referer") ?? "",
        },
      });
      if (r.ok) {
        const body = await r.json();
        return NextResponse.json(body);
      }
    } catch (e) {
      console.error("[chat/messages GET] LAAS24_BACKEND_URL delegate failed:", e);
    }
  }

  try {
    const dbAvailable = Boolean(process.env.DATABASE_URL?.trim());
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get("threadId") ?? "";
    if (!threadId) return NextResponse.json({ error: "threadId required" }, { status: 400 });
    const cookieStore = await cookies();
    const customerSession = verifyCustomerSession(cookieStore.get(getCustomerSessionCookieName())?.value);
    const vendorSession = verifyVendorSession(cookieStore.get(getVendorSessionCookieName())?.value);
    if (!customerSession && !vendorSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    /** Both cookies: resolve by thread (vendor dashboard chat failed when customer session “won”). */
    if (customerSession && vendorSession) {
      if (!dbAvailable) {
        const ft = fallbackGetThread(threadId);
        if (ft?.customerId === customerSession.cid) {
          return NextResponse.json({ messages: fallbackListMessages(threadId) });
        }
        if (ft?.storeSlug === vendorSession.storeSlug) {
          return NextResponse.json({ messages: fallbackListMessages(threadId) });
        }
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      try {
        const rc = await getChatMessagesIfAuthorized(threadId, {
          type: "customer",
          customerId: customerSession.cid,
        });
        if (!rc.forbidden) return NextResponse.json({ messages: rc.messages });
      } catch (e) {
        if (isDatabaseConnectivityError(e)) throw e;
        const ok =
          (await canCustomerAccessThread(threadId, customerSession.cid).catch(() => false)) ||
          fallbackGetThread(threadId)?.customerId === customerSession.cid;
        if (ok) {
          try {
            return NextResponse.json({ messages: await listChatMessages(threadId, CHAT_MESSAGES_DEFAULT_LIMIT) });
          } catch {
            return NextResponse.json({ messages: fallbackListMessages(threadId) });
          }
        }
      }
      try {
        const rv = await getChatMessagesIfAuthorized(threadId, {
          type: "vendor",
          storeSlug: vendorSession.storeSlug,
        });
        if (!rv.forbidden) return NextResponse.json({ messages: rv.messages });
      } catch (e) {
        if (isDatabaseConnectivityError(e)) throw e;
        const ok =
          (await canVendorAccessThread(threadId, vendorSession.storeSlug).catch(() => false)) ||
          fallbackGetThread(threadId)?.storeSlug === vendorSession.storeSlug;
        if (ok) {
          try {
            return NextResponse.json({ messages: await listChatMessages(threadId, CHAT_MESSAGES_DEFAULT_LIMIT) });
          } catch {
            return NextResponse.json({ messages: fallbackListMessages(threadId) });
          }
        }
      }
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let messages: Awaited<ReturnType<typeof listChatMessages>> | ReturnType<typeof fallbackListMessages>;

    if (customerSession) {
      if (!dbAvailable) {
        if (fallbackGetThread(threadId)?.customerId !== customerSession.cid) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        messages = fallbackListMessages(threadId);
      } else {
        try {
          const r = await getChatMessagesIfAuthorized(threadId, {
            type: "customer",
            customerId: customerSession.cid,
          });
          if (r.forbidden) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
          messages = r.messages;
        } catch (e) {
          if (isDatabaseConnectivityError(e)) throw e;
          const ok =
            (await canCustomerAccessThread(threadId, customerSession.cid).catch(() => false)) ||
            fallbackGetThread(threadId)?.customerId === customerSession.cid;
          if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
          try {
            messages = await listChatMessages(threadId, CHAT_MESSAGES_DEFAULT_LIMIT);
          } catch {
            messages = fallbackListMessages(threadId);
          }
        }
      }
    } else {
      const v = vendorSession!;
      if (!dbAvailable) {
        if (fallbackGetThread(threadId)?.storeSlug !== v.storeSlug) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        messages = fallbackListMessages(threadId);
      } else {
        try {
          const r = await getChatMessagesIfAuthorized(threadId, {
            type: "vendor",
            storeSlug: v.storeSlug,
          });
          if (r.forbidden) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
          messages = r.messages;
        } catch (e) {
          if (isDatabaseConnectivityError(e)) throw e;
          try {
            const ok =
              (await canVendorAccessThread(threadId, v.storeSlug).catch(() => false)) ||
              fallbackGetThread(threadId)?.storeSlug === v.storeSlug;
            if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            messages = await listChatMessages(threadId, CHAT_MESSAGES_DEFAULT_LIMIT);
          } catch {
            messages = fallbackListMessages(threadId);
          }
        }
      }
    }

    return NextResponse.json({ messages });
  } catch (e) {
    console.error("chat/messages GET error:", e);
    return NextResponse.json({ error: "Chat messages unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const upstream = process.env.LAAS24_BACKEND_URL?.trim();
  if (upstream) {
    try {
      const r = await fetch(`${upstream.replace(/\/$/, "")}/api/chat/messages`, {
        method: "POST",
        headers: {
          "Content-Type": request.headers.get("content-type") ?? "application/json",
          cookie: request.headers.get("cookie") ?? "",
          referer: request.headers.get("referer") ?? "",
        },
        body: await request.clone().text(),
      });
      if (r.ok) {
        const data = await r.json().catch(() => ({}));
        return NextResponse.json(data, { status: r.status });
      }
    } catch (e) {
      console.error("[chat/messages POST] LAAS24_BACKEND_URL delegate failed:", e);
    }
  }

  try {
    const dbAvailable = Boolean(process.env.DATABASE_URL?.trim());
    const cookieStore = await cookies();
    const customerSession = verifyCustomerSession(cookieStore.get(getCustomerSessionCookieName())?.value);
    const vendorSession = verifyVendorSession(cookieStore.get(getVendorSessionCookieName())?.value);
    if (!customerSession && !vendorSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = postSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const { threadId, messageType, messageText, product, contextRole } = parsed.data;
    let senderType: "customer" | "vendor" = "customer";
    let senderId = "";
    let allowed = false;

    if (customerSession && vendorSession) {
      const preferVendorFirst =
        contextRole === "vendor" || (contextRole !== "customer" && isVendorAreaReferer(request));
      const tryVendor = async () => {
        if (!dbAvailable) {
          const ft = fallbackGetThread(threadId);
          if (ft?.storeSlug === vendorSession.storeSlug) {
            allowed = true;
            senderType = "vendor";
            senderId = vendorSession.vid;
          }
        } else {
          try {
            if (await canVendorAccessThread(threadId, vendorSession.storeSlug)) {
              allowed = true;
              senderType = "vendor";
              senderId = vendorSession.vid;
            }
          } catch {
            const ft = fallbackGetThread(threadId);
            if (ft?.storeSlug === vendorSession.storeSlug) {
              allowed = true;
              senderType = "vendor";
              senderId = vendorSession.vid;
            }
          }
        }
      };
      const tryCustomer = async () => {
        if (!dbAvailable) {
          const ft = fallbackGetThread(threadId);
          if (ft?.customerId === customerSession.cid) {
            allowed = true;
            senderType = "customer";
            senderId = customerSession.cid;
          }
        } else {
          try {
            if (await canCustomerAccessThread(threadId, customerSession.cid)) {
              allowed = true;
              senderType = "customer";
              senderId = customerSession.cid;
            }
          } catch {
            const ft = fallbackGetThread(threadId);
            if (ft?.customerId === customerSession.cid) {
              allowed = true;
              senderType = "customer";
              senderId = customerSession.cid;
            }
          }
        }
      };

      if (contextRole === "vendor") {
        await tryVendor();
        if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      } else if (contextRole === "customer") {
        await tryCustomer();
        if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      } else if (preferVendorFirst) {
        await tryVendor();
        if (!allowed) await tryCustomer();
      } else {
        await tryCustomer();
        if (!allowed) await tryVendor();
      }
    } else if (customerSession) {
      senderType = "customer";
      senderId = customerSession.cid;
      if (!dbAvailable) {
        allowed = fallbackGetThread(threadId)?.customerId === customerSession.cid;
      } else {
        try {
          allowed = await canCustomerAccessThread(threadId, customerSession.cid);
        } catch {
          allowed = fallbackGetThread(threadId)?.customerId === customerSession.cid;
        }
      }
    } else if (vendorSession) {
      senderType = "vendor";
      senderId = vendorSession.vid;
      if (!dbAvailable) {
        allowed = fallbackGetThread(threadId)?.storeSlug === vendorSession.storeSlug;
      } else {
        try {
          allowed = await canVendorAccessThread(threadId, vendorSession.storeSlug);
        } catch {
          allowed = fallbackGetThread(threadId)?.storeSlug === vendorSession.storeSlug;
        }
      }
    }
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (messageType === "text" && !messageText?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }
    if (messageType === "product" && !product) {
      return NextResponse.json({ error: "Product payload required" }, { status: 400 });
    }
    const msg = !dbAvailable
      ? fallbackAppendMessage({
          threadId,
          senderType,
          senderId,
          messageType,
          messageText: messageType === "text" ? messageText?.trim() ?? "" : null,
          productJson: messageType === "product" ? JSON.stringify(product) : null,
        })
      : await (async () => {
          try {
            return await appendChatMessage({
              threadId,
              senderType,
              senderId,
              messageType,
              messageText: messageType === "text" ? messageText?.trim() ?? "" : null,
              productJson: messageType === "product" ? JSON.stringify(product) : null,
            });
          } catch (persistErr) {
            console.error(
              "chat/messages: DB persist failed — messages may not survive restart. Fix sc_chat_messages / sc_conversations schema.",
              persistErr,
            );
            return fallbackAppendMessage({
              threadId,
              senderType,
              senderId,
              messageType,
              messageText: messageType === "text" ? messageText?.trim() ?? "" : null,
              productJson: messageType === "product" ? JSON.stringify(product) : null,
            });
          }
        })();
    notifySocketThreadOfNewMessage(msg.threadId, msg);
    const preview =
      msg.messageType === "text"
        ? (msg.messageText ?? "").trim()
        : msg.messageType === "product"
          ? "Shared a product"
          : "New message";
    void notifyChatCounterpart({
      threadId: msg.threadId,
      senderType,
      senderId,
      preview,
    });
    return NextResponse.json({ message: msg });
  } catch (e) {
    console.error("chat/messages POST error:", e);
    return NextResponse.json({ error: "Could not send message right now" }, { status: 503 });
  }
}

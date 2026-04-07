import { randomUUID } from "crypto";

type FallbackThread = {
  id: string;
  customerId: string;
  storeSlug: string;
  createdAt: string;
  updatedAt: string;
  lastMessage: string | null;
};

type FallbackMessage = {
  id: string;
  threadId: string;
  senderType: "customer" | "vendor";
  senderId: string;
  messageType: "text" | "product";
  messageText: string | null;
  productJson: string | null;
  createdAt: string;
};

declare global {
  var __chatFallback:
    | {
        threads: Map<string, FallbackThread>;
        threadByPair: Map<string, string>;
        messagesByThread: Map<string, FallbackMessage[]>;
      }
    | undefined;
}

function state() {
  if (!global.__chatFallback) {
    global.__chatFallback = {
      threads: new Map(),
      threadByPair: new Map(),
      messagesByThread: new Map(),
    };
  }
  return global.__chatFallback;
}

function pairKey(customerId: string, storeSlug: string): string {
  return `${customerId}::${storeSlug}`;
}

export function fallbackGetOrCreateThread(customerId: string, storeSlug: string): string {
  const s = state();
  const key = pairKey(customerId, storeSlug);
  const existing = s.threadByPair.get(key);
  if (existing) return existing;
  const id = randomUUID();
  const now = new Date().toISOString();
  s.threadByPair.set(key, id);
  s.threads.set(id, {
    id,
    customerId,
    storeSlug,
    createdAt: now,
    updatedAt: now,
    lastMessage: null,
  });
  s.messagesByThread.set(id, []);
  return id;
}

export function fallbackGetThread(threadId: string): FallbackThread | null {
  return state().threads.get(threadId) ?? null;
}

export function fallbackAppendMessage(input: {
  threadId: string;
  senderType: "customer" | "vendor";
  senderId: string;
  messageType: "text" | "product";
  messageText?: string | null;
  productJson?: string | null;
}): FallbackMessage {
  const s = state();
  const now = new Date().toISOString();
  const msg: FallbackMessage = {
    id: randomUUID(),
    threadId: input.threadId,
    senderType: input.senderType,
    senderId: input.senderId,
    messageType: input.messageType,
    messageText: input.messageText ?? null,
    productJson: input.productJson ?? null,
    createdAt: now,
  };
  const list = s.messagesByThread.get(input.threadId) ?? [];
  list.push(msg);
  s.messagesByThread.set(input.threadId, list);
  const th = s.threads.get(input.threadId);
  if (th) {
    th.updatedAt = now;
    th.lastMessage = input.messageType === "text" ? (input.messageText ?? "") : "[product]";
    s.threads.set(input.threadId, th);
  }
  return msg;
}

export function fallbackListMessages(threadId: string): FallbackMessage[] {
  return [...(state().messagesByThread.get(threadId) ?? [])];
}

export function fallbackListCustomerThreads(customerId: string): FallbackThread[] {
  const out: FallbackThread[] = [];
  for (const t of state().threads.values()) {
    if (t.customerId === customerId) out.push(t);
  }
  out.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return out;
}

export function fallbackListStoreThreads(storeSlug: string): FallbackThread[] {
  const out: FallbackThread[] = [];
  for (const t of state().threads.values()) {
    if (t.storeSlug === storeSlug) out.push(t);
  }
  out.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return out;
}

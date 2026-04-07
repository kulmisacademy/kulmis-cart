import "server-only";
import { listFcmTokensForRecipient } from "@/lib/notifications/inbox";
import type { AppNotificationAudience } from "@/lib/notifications/types";

let initApp: Promise<import("firebase-admin/app").App> | null = null;

async function getFirebaseAdminApp(): Promise<import("firebase-admin/app").App | null> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  if (!initApp) {
    initApp = (async () => {
      const { cert, getApps, initializeApp } = await import("firebase-admin/app");
      const existing = getApps()[0];
      if (existing) return existing;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return initializeApp({
        credential: cert(parsed as Parameters<typeof cert>[0]),
      });
    })();
  }
  try {
    return await initApp;
  } catch (e) {
    console.error("[fcm] Failed to initialize Firebase Admin:", e);
    initApp = null;
    return null;
  }
}

export async function sendFcmToRecipient(input: {
  audience: AppNotificationAudience;
  recipientKey: string;
  title: string;
  body: string;
  link?: string | null;
}): Promise<void> {
  const app = await getFirebaseAdminApp();
  if (!app) return;

  const tokens = await listFcmTokensForRecipient(input.audience, input.recipientKey);
  if (tokens.length === 0) return;

  const { getMessaging } = await import("firebase-admin/messaging");
  const messaging = getMessaging(app);
  const link = input.link?.trim() || "/";

  try {
    const res = await messaging.sendEachForMulticast({
      tokens,
      notification: { title: input.title, body: input.body },
      webpush: {
        fcmOptions: { link },
      },
      data: {
        link,
        title: input.title,
        body: input.body,
      },
    });
    if (res.failureCount > 0) {
      const samples = res.responses
        .map((r, i) => (!r.success ? `${tokens[i]}: ${r.error?.message}` : null))
        .filter(Boolean)
        .slice(0, 3);
      console.warn("[fcm] Partial failure:", res.failureCount, samples);
    }
  } catch (e) {
    console.error("[fcm] sendEachForMulticast:", e);
  }
}

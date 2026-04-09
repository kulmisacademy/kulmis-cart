import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findApprovedVendorById } from "@/lib/approved-vendors";
import {
  consumeAiDailyCredit,
  getAiUsageToday,
  getEntitlementsForStore,
  isPlatformDatabaseConfigured,
} from "@/lib/platform-db";
import { getVendorSessionCookieName, verifyVendorSession } from "@/lib/vendor-session";

export const runtime = "nodejs";
export type AiProductDraft = {
  title: string;
  description: string;
  features: string[];
};

/** Mock draft when no API key — safe for dev. */
function mockDraft(): AiProductDraft {
  return {
    title: "New product listing",
    description:
      "A quality item sourced for your customers. Update this description with specifics about materials, sizing, and delivery.",
    features: ["Carefully selected", "Seller-supported", "Fast WhatsApp support"],
  };
}

/**
 * PRD: AI generates title, description, features from a product photo.
 * Set OPENAI_API_KEY for real vision output; otherwise returns a mock draft.
 */
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = verifyVendorSession(cookieStore.get(getVendorSessionCookieName())?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const vendor = await findApprovedVendorById(session.vid);
  if (!vendor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const storeSlug = vendor.storeSlug;
  const ent = await getEntitlementsForStore(storeSlug);
  if (!ent.aiEnabled) {
    return NextResponse.json(
      { error: "AI listing assist is not included in your plan. Upgrade to unlock.", code: "AI_DISABLED" },
      { status: 403 },
    );
  }

  const cappedDaily = ent.aiPerDay != null;
  if (cappedDaily && !isPlatformDatabaseConfigured()) {
    return NextResponse.json(
      {
        error: "Daily AI limits require a configured database. Add DATABASE_URL to enable this feature.",
        code: "TRACKING_UNAVAILABLE",
      },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = formData.get("image");
  if (!file || typeof file === "string" || !("arrayBuffer" in file)) {
    return NextResponse.json({ error: "Field \"image\" (file) is required" }, { status: 400 });
  }

  if (cappedDaily && ent.aiPerDay != null) {
    const used = await getAiUsageToday(storeSlug);
    if (used >= ent.aiPerDay) {
      return NextResponse.json(
        { error: "Daily AI limit reached for your plan. Try again tomorrow or upgrade.", code: "AI_DAILY_LIMIT" },
        { status: 403 },
      );
    }
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  async function finalizeSuccessResponse(data: Record<string, unknown>) {
    if (cappedDaily && ent.aiPerDay != null) {
      const ok = await consumeAiDailyCredit(storeSlug, ent.aiPerDay);
      if (!ok) {
        return NextResponse.json(
          { error: "Daily AI limit reached for your plan. Try again tomorrow or upgrade.", code: "AI_DAILY_LIMIT" },
          { status: 403 },
        );
      }
    }
    return NextResponse.json(data);
  }

  if (!apiKey) {
    const draft = mockDraft();
    return finalizeSuccessResponse({ ...draft, _mock: true as const });
  }

  try {
    const buf = Buffer.from(await (file as File).arrayBuffer());
    const base64 = buf.toString("base64");
    const mime = (file as File).type || "image/jpeg";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are helping a Somali marketplace seller. From this product image, respond with ONLY valid JSON (no markdown) in this exact shape:
{"title":"string","description":"string (2-4 sentences)","features":["string","string","string"]}
Use English or Somali-appropriate merchant tone. Features list: 3-6 short bullet strings.`,
              },
              {
                type: "image_url",
                image_url: { url: `data:${mime};base64,${base64}` },
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("OpenAI error:", err);
      const draft = mockDraft();
      return finalizeSuccessResponse({ ...draft, _mock: true as const, _fallback: "openai_error" });
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      const draft = mockDraft();
      return finalizeSuccessResponse({ ...draft, _mock: true as const, _fallback: "parse" });
    }
    const parsed = JSON.parse(jsonMatch[0]) as Partial<AiProductDraft>;
    const title = typeof parsed.title === "string" ? parsed.title : mockDraft().title;
    const description = typeof parsed.description === "string" ? parsed.description : mockDraft().description;
    const features = Array.isArray(parsed.features)
      ? parsed.features.filter((x): x is string => typeof x === "string")
      : mockDraft().features;

    return finalizeSuccessResponse({
      title,
      description,
      features: features.length ? features : mockDraft().features,
      _mock: false as const,
    });
  } catch (e) {
    console.error(e);
    const draft = mockDraft();
    return finalizeSuccessResponse({ ...draft, _mock: true as const, _fallback: "exception" });
  }
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCustomerSessionCookieName, verifyCustomerSession } from "@/lib/customer-session";
import { getCustomerOrderForCustomer, insertStoreFeedback } from "@/lib/customer/db";
import { isValidFeedbackPreset, ratingForPreset, type FeedbackPreset } from "@/lib/feedback-presets";
import { revalidateStorePublicPaths } from "@/lib/revalidate-store-paths";

const bodySchema = z
  .object({
    orderId: z.string().min(1),
    presetOption: z.string().min(1),
    comment: z.string().max(2000).optional().default(""),
  })
  .superRefine((val, ctx) => {
    if (!isValidFeedbackPreset(val.presetOption)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid preset option",
        path: ["presetOption"],
      });
    }
  });

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid feedback" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const session = verifyCustomerSession(cookieStore.get(getCustomerSessionCookieName())?.value);
  if (!session) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { orderId, presetOption, comment } = parsed.data;
  const preset = presetOption as FeedbackPreset;

  try {
    const order = await getCustomerOrderForCustomer(orderId, session.cid);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.status !== "completed") {
      return NextResponse.json({ error: "You can leave feedback after the order is completed." }, { status: 403 });
    }

    await insertStoreFeedback({
      customerId: session.cid,
      storeSlug: order.storeSlug,
      orderId,
      rating: ratingForPreset(preset),
      comment: comment ?? "",
      presetOption: preset,
    });

    await revalidateStorePublicPaths(order.storeSlug);
    revalidatePath("/account");

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    const msg = e instanceof Error ? e.message : String(e);
    if (code === "23505" || /unique|duplicate/i.test(msg)) {
      return NextResponse.json({ error: "You already left feedback for this order." }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Could not save feedback" }, { status: 503 });
  }
}

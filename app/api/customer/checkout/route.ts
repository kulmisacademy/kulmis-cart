import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerSessionCookieName, verifyCustomerSession } from "@/lib/customer-session";
import { createCheckoutWithLines, getCustomerById } from "@/lib/customer/db";
import { getProductById, getStoreBySlug } from "@/lib/marketplace-catalog";
import { productUrl } from "@/lib/site";
import { notifyVendorsNewOrders } from "@/lib/notifications/service";
import { createCheckoutWhatsAppLink } from "@/lib/whatsapp";

const bodySchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(3),
  region: z.string().min(1),
  district: z.string().min(1),
  lines: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().positive().max(999),
    }),
  ),
});

export async function POST(request: Request) {
  const upstream = process.env.LAAS24_BACKEND_URL?.trim();
  if (upstream) {
    try {
      const r = await fetch(`${upstream.replace(/\/$/, "")}/api/customer/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": request.headers.get("content-type") ?? "application/json",
          cookie: request.headers.get("cookie") ?? "",
        },
        body: await request.clone().text(),
      });
      const data = await r.json().catch(() => ({}));
      return NextResponse.json(data, { status: r.status });
    } catch (e) {
      console.error("[customer/checkout] LAAS24_BACKEND_URL delegate failed:", e);
    }
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checkout data" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const session = verifyCustomerSession(cookieStore.get(getCustomerSessionCookieName())?.value);
  if (!session) {
    return NextResponse.json({ error: "Sign in to place an order." }, { status: 401 });
  }

  const customer = await getCustomerById(session.cid);
  if (!customer) {
    return NextResponse.json({ error: "Session expired." }, { status: 401 });
  }

  const { fullName, phone, region, district, lines } = parsed.data;
  if (lines.length === 0) {
    return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
  }

  type Resolved = {
    productId: string;
    quantity: number;
    storeSlug: string;
    storeName: string;
    productTitle: string;
    productUrl: string;
    unitPrice: number;
  };

  const resolved: Resolved[] = [];

  for (const line of lines) {
    const product = await getProductById(line.productId);
    if (!product) {
      return NextResponse.json(
        {
          error:
            "One or more items are no longer on the marketplace (for example after a store reset). Open your cart, remove unavailable items, and add products again from the store.",
        },
        { status: 404 },
      );
    }
    resolved.push({
      productId: product.id,
      quantity: line.quantity,
      storeSlug: product.storeSlug,
      storeName: product.storeName,
      productTitle: product.title,
      productUrl: productUrl(product.id),
      unitPrice: product.price,
    });
  }

  try {
    const { checkoutId } = await createCheckoutWithLines({
      customerId: customer.id,
      fullName: fullName.trim() || customer.fullName,
      phone: phone.trim(),
      region,
      district: district.trim(),
      lines: resolved,
    });

    const ctx = {
      fullName: fullName.trim() || customer.fullName,
      phone: phone.trim(),
      region,
      district: district.trim(),
    };

    const byStore = new Map<
      string,
      {
        storeName: string;
        sellerPhone: string;
        lines: { title: string; quantity: number; unitPrice: number }[];
      }
    >();

    for (const r of resolved) {
      const store = await getStoreBySlug(r.storeSlug);
      const sellerPhone = store?.phone?.trim();
      if (!sellerPhone) continue;
      const cur = byStore.get(r.storeSlug) ?? {
        storeName: r.storeName,
        sellerPhone,
        lines: [] as { title: string; quantity: number; unitPrice: number }[],
      };
      cur.lines.push({
        title: r.productTitle,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
      });
      byStore.set(r.storeSlug, cur);
    }

    const whatsappUrls: { storeSlug: string; storeName: string; url: string }[] = [];
    for (const [storeSlug, g] of byStore) {
      const url = createCheckoutWhatsAppLink(
        g.sellerPhone,
        g.storeName,
        g.lines,
        ctx,
        checkoutId,
      );
      whatsappUrls.push({ storeSlug, storeName: g.storeName, url });
    }

    const perStore = new Map<string, { storeName: string; lineCount: number }>();
    for (const r of resolved) {
      const cur = perStore.get(r.storeSlug) ?? { storeName: r.storeName, lineCount: 0 };
      cur.lineCount += 1;
      perStore.set(r.storeSlug, cur);
    }
    void notifyVendorsNewOrders({
      checkoutId,
      stores: [...perStore.entries()].map(([storeSlug, v]) => ({
        storeSlug,
        storeName: v.storeName,
        lineCount: v.lineCount,
      })),
    });

    return NextResponse.json({ checkoutId, whatsappUrls });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not save order." }, { status: 503 });
  }
}

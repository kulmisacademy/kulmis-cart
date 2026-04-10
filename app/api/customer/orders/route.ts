import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerSessionCookieName, verifyCustomerSession } from "@/lib/customer-session";
import { getCustomerById, insertCustomerOrder } from "@/lib/customer/db";
import { getProductById, getStoreBySlug } from "@/lib/marketplace-catalog";
import { productUrl } from "@/lib/site";
import { createWhatsAppOrderLink } from "@/lib/whatsapp";

const bodySchema = z.object({
  productId: z.string().min(1),
});

export async function POST(request: Request) {
  const upstream = process.env.LAAS24_BACKEND_URL?.trim();
  if (upstream) {
    try {
      const r = await fetch(`${upstream.replace(/\/$/, "")}/api/customer/orders`, {
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
      console.error("[customer/orders] LAAS24_BACKEND_URL delegate failed:", e);
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
    return NextResponse.json({ error: "Invalid product" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const session = verifyCustomerSession(cookieStore.get(getCustomerSessionCookieName())?.value);
  if (!session) {
    return NextResponse.json({ error: "Sign in to place an order." }, { status: 401 });
  }

  try {
    const customer = await getCustomerById(session.cid);
    if (!customer) {
      return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
    }

    const product = await getProductById(parsed.data.productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const store = await getStoreBySlug(product.storeSlug);
    const phone = store?.phone?.trim();
    if (!phone) {
      return NextResponse.json({ error: "Store contact is not available." }, { status: 422 });
    }

    const url = productUrl(product.id);
    await insertCustomerOrder({
      customerId: customer.id,
      productId: product.id,
      storeSlug: product.storeSlug,
      storeName: product.storeName,
      productTitle: product.title,
      productUrl: url,
      customerName: customer.fullName,
      customerPhone: customer.phone,
      customerRegion: customer.region,
      customerDistrict: customer.district,
    });

    const whatsappUrl = createWhatsAppOrderLink(product, phone, {
      fullName: customer.fullName,
      phone: customer.phone,
      region: customer.region,
      district: customer.district,
    });

    return NextResponse.json({ whatsappUrl });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not create order." }, { status: 503 });
  }
}
